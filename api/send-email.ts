type ApiRequest = {
  method?: string
  body?: {
    to?: string
    type?: string
    data?: {
      studentName?: string
      courseName?: string
      lessonName?: string
      quizTitle?: string
      score?: string | number
      totalMarks?: string | number
      courseId?: string
      title?: string
      body?: string
    }
  }
}

type ApiResponse = {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, type, data } = req.body ?? {}

  if (!to || !type) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' })
  }

  let subject = ''
  let html = ''

  const baseStyle = `
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: #f9f9f9;
    padding: 30px;
    border-radius: 12px;
  `
  const header = `
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#1B1B5E;font-size:26px;margin:0;">قدرات المغربي</h1>
      <p style="color:#E91E8C;font-size:14px;margin:4px 0 0;">منصتك للتفوق في القدرات</p>
    </div>
  `
  const footer = `<p style="color:#aaa;font-size:12px;text-align:center;margin-top:20px;">منصة قدرات المغربي | qudrat-maghrabi.vercel.app</p>`

  if (type === 'enrollment') {
    subject = 'تم تفعيل اشتراكك بنجاح 🎉 — قدرات المغربي'
    html = `
      <div dir="rtl" style="${baseStyle}">
        ${header}
        <div style="background:white;padding:28px;border-radius:10px;border-right:4px solid #E91E8C;">
          <h2 style="color:#1B1B5E;">مبروك! تم تفعيل اشتراكك 🎉</h2>
          <p style="color:#444;line-height:1.8;">
            أهلاً <strong>${data?.studentName || 'طالبنا العزيز'}</strong>،<br/>
            تم تفعيل اشتراكك في كورس <strong>${data?.courseName || ''}</strong> بنجاح.
            يمكنك الآن الدخول للمنصة والبدء في الدراسة فوراً.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://qudrat-maghrabi.vercel.app/dashboard"
               style="background:linear-gradient(135deg,#FF8008,#E91E8C);color:white;padding:14px 40px;border-radius:25px;text-decoration:none;font-weight:bold;font-size:16px;">
              ابدأ الدراسة الآن ←
            </a>
          </div>
          <p style="color:#888;font-size:13px;text-align:center;">نتمنى لك رحلة تعليمية موفقة ⭐</p>
        </div>
        ${footer}
      </div>`

  } else if (type === 'payment_failed') {
    subject = 'لم تتم عملية الدفع — قدرات المغربي'
    html = `
      <div dir="rtl" style="${baseStyle}">
        ${header}
        <div style="background:white;padding:28px;border-radius:10px;border-right:4px solid #FF8008;">
          <h2 style="color:#1B1B5E;">لم تتم عملية الدفع ⚠️</h2>
          <p style="color:#444;line-height:1.8;">
            أهلاً <strong>${data?.studentName || 'طالبنا العزيز'}</strong>،<br/>
            للأسف لم تتم عملية الدفع لكورس <strong>${data?.courseName || ''}</strong>.
            يمكنك المحاولة مجدداً من خلال الرابط أدناه.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://qudrat-maghrabi.vercel.app/courses"
               style="background:linear-gradient(135deg,#3D1070,#E91E8C);color:white;padding:14px 40px;border-radius:25px;text-decoration:none;font-weight:bold;font-size:16px;">
              حاول مجدداً ←
            </a>
          </div>
        </div>
        ${footer}
      </div>`

  } else if (type === 'new_lesson') {
    subject = `درس جديد متاح الآن — ${data?.courseName || 'قدرات المغربي'}`
    html = `
      <div dir="rtl" style="${baseStyle}">
        ${header}
        <div style="background:white;padding:28px;border-radius:10px;border-right:4px solid #3D1070;">
          <h2 style="color:#1B1B5E;">درس جديد متاح الآن 📚</h2>
          <p style="color:#444;line-height:1.8;">
            أهلاً <strong>${data?.studentName || 'طالبنا العزيز'}</strong>،<br/>
            تم إضافة درس جديد <strong>${data?.lessonName || ''}</strong> في كورس <strong>${data?.courseName || ''}</strong>.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://qudrat-maghrabi.vercel.app/dashboard"
               style="background:linear-gradient(135deg,#FF8008,#E91E8C);color:white;padding:14px 40px;border-radius:25px;text-decoration:none;font-weight:bold;font-size:16px;">
              شاهد الدرس الآن ←
            </a>
          </div>
        </div>
        ${footer}
      </div>`
  } else if (type === 'quiz_passed') {
    subject = `أحسنت! اجتزت اختبار "${data?.quizTitle || ''}" 🎉 — قدرات المغربي`
    html = `
      <div dir="rtl" style="${baseStyle}">
        ${header}
        <div style="background:white;padding:28px;border-radius:10px;border-right:4px solid #22c55e;">
          <h2 style="color:#1B1B5E;">أحسنت! لقد اجتزت الاختبار 🏆</h2>
          <p style="color:#444;line-height:1.8;">
            أهلاً <strong>${data?.studentName || 'طالبنا العزيز'}</strong>،<br/>
            لقد اجتزت اختبار <strong>${data?.quizTitle || ''}</strong> بدرجة <strong>${data?.score || ''} / ${data?.totalMarks || ''}</strong>.
            يمكنك الآن الانتقال للدرس التالي.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://qudrat-maghrabi.vercel.app/learn/${data?.courseId || ''}"
               style="background:linear-gradient(135deg,#FF8008,#E91E8C);color:white;padding:14px 40px;border-radius:25px;text-decoration:none;font-weight:bold;font-size:16px;">
              تابع التعلم الآن ←
            </a>
          </div>
          <p style="color:#888;font-size:13px;text-align:center;">استمر في التفوق ⭐</p>
        </div>
        ${footer}
      </div>`

  } else if (type === 'admin_broadcast') {
    subject = data?.title || 'إشعار جديد — قدرات المغربي'
    html = `
      <div dir="rtl" style="${baseStyle}">
        ${header}
        <div style="background:white;padding:28px;border-radius:10px;border-right:4px solid #3D1070;">
          <h2 style="color:#1B1B5E;">${data?.title || ''}</h2>
          <p style="color:#444;line-height:1.8;white-space:pre-wrap;">
            أهلاً <strong>${data?.studentName || 'طالبنا العزيز'}</strong>،<br/>
            ${data?.body || ''}
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://qudrat-maghrabi.vercel.app/dashboard"
               style="background:linear-gradient(135deg,#FF8008,#E91E8C);color:white;padding:14px 40px;border-radius:25px;text-decoration:none;font-weight:bold;font-size:16px;">
              الذهاب للمنصة ←
            </a>
          </div>
        </div>
        ${footer}
      </div>`

  } else {
    return res.status(400).json({ error: 'Unknown email type' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'قدرات المغربي <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    })

    const result = await response.json()
    if (!response.ok) throw new Error(JSON.stringify(result))
    return res.status(200).json({ success: true, id: result.id })
  } catch (error: any) {
    console.error('Email error:', error)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
