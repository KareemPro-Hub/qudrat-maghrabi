import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

type ApiRequest = {
  method?: string
  body?: Record<string, unknown>
  headers: { authorization?: string }
}

type ApiResponse = {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { videoId, courseId } = req.body ?? {}
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

  // لا نوقّع أي فيديو قبل التأكد أنه تابع فعلًا للكورس المطلوب.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id, is_free_preview, is_published')
    .eq('video_id', videoId)
    .eq('course_id', courseId)
    .eq('is_published', true)
    .maybeSingle()

  const { data: course } = await supabase
    .from('courses')
    .select('price, is_published')
    .eq('id', courseId)
    .maybeSingle()

  if (!lesson || !course?.is_published) {
    return res.status(404).json({ error: 'Video is not available' })
  }

  // الاشتراك صالح فقط إذا كان مدفوعًا ولم تنتهِ مدته.
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, expires_at')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .eq('payment_status', 'paid')
    .maybeSingle()

  const enrollmentExpiresAt = enrollment?.expires_at
    ? new Date(enrollment.expires_at).getTime()
    : null
  const hasActiveEnrollment = !!enrollment
    && (enrollmentExpiresAt === null || enrollmentExpiresAt > Date.now())
  const isFreePreview = lesson.is_free_preview === true
  const isFreeCourse = course?.is_published === true && Number(course?.price) === 0

  if (!hasActiveEnrollment && !isFreePreview && !isFreeCourse) {
    return res.status(403).json({ error: 'Not enrolled in this course' })
  }

  // توليد توكن Bunny Stream موقّع محليًا
  const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID
  const TOKEN_KEY = process.env.BUNNY_STREAM_TOKEN_KEY
  if (!LIBRARY_ID || !TOKEN_KEY) return res.status(500).json({ error: 'Bunny Stream not configured' })

  try {
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 // صالح لبدء جلسة المشاهدة لمدة ساعة
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
