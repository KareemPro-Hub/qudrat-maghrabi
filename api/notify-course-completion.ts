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

const PLATFORM_URL = 'https://www.qudratmaghrabi.com'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character)
}

const baseStyle = 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 12px;'

const header = `
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#1B1B5E;font-size:26px;margin:0;">قدرات المغربي</h1>
    <p style="color:#E91E8C;font-size:14px;margin:4px 0 0;">منصتك للتفوق في القدرات</p>
  </div>
`

const footer = '<p style="color:#aaa;font-size:12px;text-align:center;margin-top:20px;">منصة قدرات المغربي | qudratmaghrabi.com</p>'

function ctaButton(label: string, href: string) {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${href}" style="background:linear-gradient(135deg,#FF8008,#E91E8C);color:white;padding:14px 40px;border-radius:25px;text-decoration:none;font-weight:bold;font-size:16px;">
        ${label}
      </a>
    </div>`
}

export function buildStudentCompletionEmail(studentName: string, courseName: string) {
  const safeStudent = escapeHtml(studentName)
  const safeCourse = escapeHtml(courseName)

  return `
    <div dir="rtl" style="${baseStyle}">
      ${header}
      <div style="background:white;padding:28px;border-radius:10px;border-right:4px solid #22c55e;">
        <h2 style="color:#1B1B5E;">أنهيت الكورس 🎓</h2>
        <p style="color:#444;line-height:1.9;">
          مبروك <strong>${safeStudent}</strong> !<br/>
          أنهيت كورس <strong>${safeCourse}</strong> كاملًا — والتزامك هذا هو الفرق بين طالب يتمنى وطالب يستحق.<br/>
          ما تعلمته هنا صار مهارة، والمهارة لا تُنسى. راجع نقاط ضعفك، وادخل الاختبار وأنت واثق.
        </p>
        ${ctaButton('راجع دروسك الآن ←', `${PLATFORM_URL}/dashboard`)}
        <p style="color:#888;font-size:13px;text-align:center;">نحن فخورون فيك، وننتظر بشارتك 🎯</p>
      </div>
      ${footer}
    </div>`
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'قدرات المغربي <noreply@qudratmaghrabi.com>',
      to: [to],
      subject,
      html,
    }),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { message?: string } | null
    console.error('Resend rejected completion email', { status: response.status, message: detail?.message })
    return false
  }
  return true
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const courseId = typeof req.body?.courseId === 'string' ? req.body.courseId : ''
  if (!courseId) return res.status(400).json({ error: 'courseId required' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.replace('Bearer ', '')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return res.status(500).json({ error: 'Server not configured' })

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid token' })

  // مصدر الحقيقة هو قاعدة البيانات: لا نرسل إلا لإتمام مسجّل فعليًا ولم يُرسل من قبل.
  const { data: completion } = await supabase
    .from('course_completions')
    .select('id, emails_sent_at')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!completion) return res.status(200).json({ sent: false, reason: 'not_completed' })
  if (completion.emails_sent_at) return res.status(200).json({ sent: false, reason: 'already_sent' })

  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Email service not configured' })

  const [{ data: student }, { data: course }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    supabase.from('courses').select('title').eq('id', courseId).maybeSingle(),
  ])

  const studentName = student?.full_name?.trim() || 'طالبنا العزيز'
  const courseName = course?.title?.trim() || 'الكورس'

  // نختم السجل أولًا حتى لا يتسبب أي تكرار متزامن في إرسال مضاعف
  const { data: claimed } = await supabase
    .from('course_completions')
    .update({ emails_sent_at: new Date().toISOString() })
    .eq('id', completion.id)
    .is('emails_sent_at', null)
    .select('id')
    .maybeSingle()

  if (!claimed) return res.status(200).json({ sent: false, reason: 'already_sent' })

  let studentEmailSent = false

  if (student?.email) {
    studentEmailSent = await sendEmail(
      student.email,
      `أنهيت الكورس 🎓 — ${courseName}`,
      buildStudentCompletionEmail(studentName, courseName),
    )
  }

  // لو فشل الإرسال بالكامل نُعيد فتح السجل حتى تُعاد المحاولة لاحقًا
  if (!studentEmailSent) {
    await supabase.from('course_completions').update({ emails_sent_at: null }).eq('id', completion.id)
    return res.status(502).json({ sent: false, error: 'تعذّر إرسال إيميلات إتمام الكورس' })
  }

  return res.status(200).json({ sent: true, studentEmailSent })
}
