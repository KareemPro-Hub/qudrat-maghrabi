import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { videoId, courseId } = req.body
  if (!videoId || !courseId) return res.status(400).json({ error: 'videoId and courseId required' })

  // التحقق من الجلسة
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // التحقق من المستخدم
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid token' })

  // التحقق من الاشتراك المدفوع
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .eq('payment_status', 'paid')
    .single()

  // التحقق من صلاحية الدرس المجاني أو الاشتراك
  const { data: lesson } = await supabase
    .from('lessons')
    .select('is_free_preview')
    .eq('video_id', videoId)
    .single()

  const isFreePreview = lesson?.is_free_preview === true

  if (!enrollment && !isFreePreview) {
    return res.status(403).json({ error: 'Not enrolled in this course' })
  }

  // طلب OTP من VdoCipher
  const VDOCIPHER_API_KEY = process.env.VDOCIPHER_API_KEY
  if (!VDOCIPHER_API_KEY) return res.status(500).json({ error: 'VdoCipher not configured' })

  try {
    const response = await fetch(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Apisecret ${VDOCIPHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // علامة مائية بالإيميل
        annotate: JSON.stringify([{
          type: 'rtext',
          text: user.email,
          alpha: '0.5',
          color: '0xFFFFFF',
          size: '12',
          interval: '5000',
        }])
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'VdoCipher error')

    return res.status(200).json({ otp: data.otp, playbackInfo: data.playbackInfo })
  } catch (err: any) {
    console.error('VdoCipher OTP error:', err)
    return res.status(500).json({ error: 'Failed to get video token' })
  }
}
