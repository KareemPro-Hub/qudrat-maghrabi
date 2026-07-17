import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

  // الكورس المجاني بالكامل (سعر 0 ومنشور): كل دروسه متاحة
  const { data: course } = await supabase
    .from('courses')
    .select('price, is_published')
    .eq('id', courseId)
    .single()

  const isFreePreview = lesson?.is_free_preview === true
  const isFreeCourse = course?.is_published === true && Number(course?.price) === 0

  if (!enrollment && !isFreePreview && !isFreeCourse) {
    return res.status(403).json({ error: 'Not enrolled in this course' })
  }

  // توليد توكن Bunny Stream موقّع محليًا
  const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID
  const TOKEN_KEY = process.env.BUNNY_STREAM_TOKEN_KEY
  if (!LIBRARY_ID || !TOKEN_KEY) return res.status(500).json({ error: 'Bunny Stream not configured' })

  try {
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 4 // صالح 4 ساعات
    const hashSource = `${TOKEN_KEY}${videoId}${expires}`
    const signedToken = crypto.createHash('sha256').update(hashSource).digest('hex')

    return res.status(200).json({
      libraryId: LIBRARY_ID,
      token: signedToken,
      expires,
    })
  } catch (err: any) {
    console.error('Bunny token error:', err)
    return res.status(500).json({ error: 'Failed to get video token' })
  }
}
