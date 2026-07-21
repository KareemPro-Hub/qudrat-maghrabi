import { createClient } from '@supabase/supabase-js'

type ApiRequest = {
  method?: string
  body?: Record<string, unknown>
  headers: { authorization?: string }
}

type ApiResponse = {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
}

const ALLOWED_ROLES = ['admin', 'teacher', 'content_manager']

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { videoId } = req.body ?? {}
  if (!videoId || typeof videoId !== 'string') return res.status(400).json({ error: 'videoId required' })

  // التحقق من الجلسة وصلاحية الأدمن
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) return res.status(403).json({ error: 'غير مصرح لك بهذا الإجراء' })

  const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID
  const API_KEY = process.env.BUNNY_STREAM_API_KEY
  if (!LIBRARY_ID || !API_KEY) return res.status(500).json({ error: 'مفتاح Bunny API مش متضبط في إعدادات السيرفر' })

  try {
    // جلب مدة الفيديو من Bunny Stream فقط — الغلاف بقى بيترفع مباشرة من لوحة الإدارة
    const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`, {
      headers: { AccessKey: API_KEY, accept: 'application/json' },
    })
    if (!bunnyRes.ok) return res.status(404).json({ error: 'الفيديو مش موجود على Bunny، تأكد من الرقم' })
    const video: any = await bunnyRes.json()

    const duration_minutes = video.length ? Math.round(video.length / 60) : null

    return res.status(200).json({ duration_minutes })
  } catch (err: any) {
    console.error('Bunny video info error:', err)
    return res.status(500).json({ error: 'فشل جلب بيانات الفيديو من Bunny' })
  }
}
