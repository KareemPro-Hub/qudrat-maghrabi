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
  if (
    typeof videoId !== 'string'
    || typeof courseId !== 'string'
    || videoId.trim().length === 0
    || courseId.trim().length === 0
  ) {
    return res.status(400).json({ error: 'videoId and courseId required' })
  }
  const safeVideoId = videoId.trim()
  const safeCourseId = courseId.trim()

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

  // المشاهدة من حساب الطالب فقط؛ لا تكفي جلسة صحيحة لحساب إداري أو ولي أمر.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'student' || profile.is_active === false) {
    return res.status(403).json({ error: 'Student access required' })
  }

  // لا نوقّع أي فيديو قبل التأكد أنه تابع فعلًا للكورس المطلوب.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id, is_free_preview, is_published')
    .eq('video_id', safeVideoId)
    .eq('course_id', safeCourseId)
    .eq('is_published', true)
    .maybeSingle()

  const { data: course } = await supabase
    .from('courses')
    .select('is_published')
    .eq('id', safeCourseId)
    .maybeSingle()

  if (!lesson || !course?.is_published) {
    return res.status(404).json({ error: 'Video is not available' })
  }

  // فحص موحّد: اشتراك مباشر، اشتراك حزمة رئيسية نشط، أو كورس مجاني كامل.
  const { data: hasCourseAccess, error: accessError } = await supabase.rpc(
    'has_active_course_access',
    { p_student_id: user.id, p_course_id: safeCourseId },
  )
  if (accessError) {
    console.error('Course access verification failed', accessError)
    return res.status(500).json({ error: 'Failed to verify course access' })
  }

  const isFreePreview = lesson.is_free_preview === true
  if (hasCourseAccess !== true && !isFreePreview) {
    return res.status(403).json({ error: 'Not enrolled in this course' })
  }

  // توليد توكن Bunny Stream موقّع محليًا
  const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID
  const TOKEN_KEY = process.env.BUNNY_STREAM_TOKEN_KEY
  if (!LIBRARY_ID || !TOKEN_KEY) return res.status(500).json({ error: 'Bunny Stream not configured' })

  // تشخيص واضح بدل صفحة 404 الصامتة جوّه المشغّل:
  // نتأكد إن الفيديو موجود فعلًا في المكتبة وإن الترميز خلص قبل ما نوقّع التوكن.
  const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY
  if (BUNNY_API_KEY) {
    try {
      const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${safeVideoId}`, {
        headers: { AccessKey: BUNNY_API_KEY, accept: 'application/json' },
      })

      if (bunnyRes.status === 404) {
        console.error('Bunny video missing', { libraryId: LIBRARY_ID, videoId: safeVideoId })
        return res.status(404).json({
          error: 'الفيديو مش موجود في مكتبة Bunny — راجع رقم الفيديو في لوحة الإدارة أو رقم المكتبة في إعدادات السيرفر',
        })
      }

      if (bunnyRes.ok) {
        const video: any = await bunnyRes.json()
        // status: 0 queued · 1 processing · 2 encoding · 3 finished · 4 resolution finished · 5 failed
        if (video?.status === 5) {
          console.error('Bunny video failed encoding', { libraryId: LIBRARY_ID, videoId: safeVideoId })
          return res.status(409).json({ error: 'الفيديو فشل في المعالجة على Bunny — لازم يترفع تاني' })
        }
        if (typeof video?.status === 'number' && video.status < 3) {
          return res.status(409).json({ error: 'الفيديو لسه بيتعالج على Bunny، جرّب بعد شوية' })
        }
      } else if (bunnyRes.status === 401) {
        console.error('Bunny API key rejected', { libraryId: LIBRARY_ID, status: bunnyRes.status })
      }
    } catch (probeErr) {
      // فشل الفحص مش سبب لمنع المشاهدة — نكمل ونوقّع التوكن عادي.
      console.error('Bunny video probe failed', probeErr)
    }
  }

  try {
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 // صالح لبدء جلسة المشاهدة لمدة ساعة
    const hashSource = `${TOKEN_KEY}${safeVideoId}${expires}`
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
