import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_ROLES = ['admin', 'teacher', 'content_manager', 'student_manager', 'quiz_manager']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, full_name, role } = req.body || {}
  if (!email || !full_name || !role) {
    return res.status(400).json({ error: 'البريد الإلكتروني والاسم والدور مطلوبون' })
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: 'دور غير صالح' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // التحقق من هوية المستخدم المرسل للطلب
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid token' })

  // التحقق من إن المستخدم مدير منصة فعلاً — فقط الأدمن يقدر يضيف أعضاء فريق
  const { data: callerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || callerProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك بإضافة أعضاء فريق' })
  }

  // إرسال دعوة عبر الإيميل — المستخدم يظبط كلمة المرور بنفسه من خلال الرابط
  const origin = (req.headers.origin as string) || 'https://qudrat-maghrabi.vercel.app'

  const { data: created, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name },
    redirectTo: `${origin}/reset-password`,
  })

  if (inviteError) {
    const msg = inviteError.message?.includes('already been registered') || inviteError.message?.includes('already registered')
      ? 'هذا البريد الإلكتروني مسجّل بالفعل على المنصة'
      : 'حدث خطأ أثناء إرسال الدعوة'
    return res.status(400).json({ error: msg })
  }

  return res.status(200).json({ success: true, userId: created.user?.id })
}
