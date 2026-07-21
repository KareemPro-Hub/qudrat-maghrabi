type ApiRequest = {
  method?: string
  headers?: {
    authorization?: string
  }
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
      memberName?: string
      inviteLink?: string
      roleLabel?: string
    }
  }
}

type ApiResponse = {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
}

type ResendError = {
  message?: string
  name?: string
  statusCode?: number
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

async function isAdminRequest(req: ApiRequest) {
  const authHeader = req.headers?.authorization ?? ''
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!authHeader.startsWith('Bearer ') || !supabaseUrl || !supabaseAnonKey) return false

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey,
    },
  })
  if (!authResponse.ok) return false

  const user = await authResponse.json() as { id?: string }
  if (!user.id) return false

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`,
    {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    },
  )
  if (!profileResponse.ok) return false

  const profiles = await profileResponse.json() as Array<{ role?: string }>
  return profiles.length === 1 && profiles[0].role === 'admin'
}

function isTrustedInviteLink(value: string) {
  try {
    const inviteUrl = new URL(value)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    if (!supabaseUrl) return false
    const expectedOrigin = new URL(supabaseUrl).origin
    return inviteUrl.protocol === 'https:'
      && inviteUrl.origin === expectedOrigin
      && inviteUrl.pathname === '/auth/v1/verify'
  } catch {
    return false
  }
}

export function buildTeamInviteEmail(memberName: string, roleLabel: string, inviteLink: string) {
  const safeMemberName = escapeHtml(memberName)
  const safeRoleLabel = escapeHtml(roleLabel)
  const safeInviteLink = escapeHtml(inviteLink)

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>دعوتك للانضمام إلى فريق قدرات المغربي</title>
    <style>
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      table { border-collapse: collapse !important; }
      @media only screen and (max-width: 640px) {
        .email-shell { width: 100% !important; border-radius: 0 !important; }
        .email-pad { padding-right: 22px !important; padding-left: 22px !important; }
        .email-title { font-size: 27px !important; line-height: 38px !important; }
        .email-button { display: block !important; padding-right: 18px !important; padding-left: 18px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f3eff8;font-family:Arial,Tahoma,sans-serif;color:#2d2140;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      تم إنشاء حسابك في فريق قدرات المغربي — عيّن كلمة المرور وابدأ الآن.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3eff8" style="width:100%;background-color:#f3eff8;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#ffffff" class="email-shell" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #e8e0f1;border-radius:24px;overflow:hidden;box-shadow:0 14px 38px rgba(55,20,95,0.12);">
            <tr>
              <td align="center" bgcolor="#3d1070" style="padding:30px 28px 34px;background-color:#3d1070;background-image:linear-gradient(135deg,#3d1070 0%,#7428af 54%,#d52f8c 100%);">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:18px;">
                  <tr>
                    <td align="center" style="padding:10px 20px;">
                      <img src="${PLATFORM_URL}/home/brand/logo.png" width="118" alt="قدرات المغربي" style="display:block;width:118px;max-width:118px;height:auto;">
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 8px;color:#ffc33d;font-size:13px;line-height:22px;font-weight:700;letter-spacing:.3px;">دعوة خاصة لفريق العمل</p>
                <h1 class="email-title" style="margin:0;color:#ffffff;font-size:32px;line-height:44px;font-weight:800;">مرحبًا بك في فريق قدرات المغربي</h1>
                <p style="margin:10px 0 0;color:#eadff5;font-size:16px;line-height:28px;">حسابك جاهز، ولم يتبقَّ سوى تعيين كلمة المرور.</p>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:36px 42px 14px;text-align:right;">
                <p style="margin:0 0 16px;color:#281a3d;font-size:20px;line-height:32px;font-weight:700;">أهلًا ${safeMemberName}،</p>
                <p style="margin:0;color:#655a70;font-size:16px;line-height:30px;">
                  تمت إضافتك إلى فريق منصة قدرات المغربي. يمكنك الدخول إلى لوحة العمل بالصلاحيات المرتبطة بالدور التالي:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:24px 0;">
                  <tr>
                    <td bgcolor="#fbf7ff" style="padding:18px 20px;background-color:#fbf7ff;border:1px solid #eadff4;border-radius:14px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="color:#776b82;font-size:13px;line-height:22px;">الدور المعيّن</td>
                          <td align="left">
                            <span style="display:inline-block;padding:7px 14px;background-color:#fbe8b7;border:1px solid #f3cf72;border-radius:999px;color:#8c5a00;font-size:14px;line-height:20px;font-weight:700;">${safeRoleLabel}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 24px;color:#655a70;font-size:15px;line-height:28px;">
                  اضغط على الزر التالي لإنشاء كلمة المرور، وبعدها ستنتقل مباشرةً إلى حسابك على المنصة.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                  <tr>
                    <td align="center" bgcolor="#f5ac19" style="background-color:#f5ac19;border-radius:13px;box-shadow:0 8px 20px rgba(245,172,25,.28);">
                      <a href="${safeInviteLink}" class="email-button" style="display:block;padding:16px 28px;color:#2d1643;font-size:16px;line-height:24px;font-weight:800;text-align:center;text-decoration:none;border-radius:13px;">
                        تعيين كلمة المرور والدخول
                      </a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:24px;">
                  <tr>
                    <td bgcolor="#f7f5fa" style="padding:16px 18px;background-color:#f7f5fa;border-right:4px solid #7b31b5;border-radius:10px;color:#776b82;font-size:13px;line-height:24px;">
                      هذا الرابط مخصص لك. حفاظًا على أمان حسابك، لا تشاركه مع أي شخص.
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;color:#94899e;font-size:12px;line-height:22px;text-align:center;">
                  إذا واجهتك مشكلة في الزر،
                  <a href="${safeInviteLink}" style="color:#6e2ca6;font-weight:700;text-decoration:underline;">افتح رابط التعيين مباشرةً</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:22px 42px 34px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #eee8f4;">
                  <tr>
                    <td align="center" style="padding-top:22px;color:#9a90a3;font-size:12px;line-height:22px;">
                      وصلت إليك هذه الرسالة لأن مدير المنصة أضافك إلى فريق العمل.<br>
                      <a href="${PLATFORM_URL}" style="color:#6e2ca6;text-decoration:none;font-weight:700;">منصة قدرات المغربي</a>
                      &nbsp;•&nbsp; طريقك للتفوّق في القدرات
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function providerErrorResponse(result: ResendError | null) {
  const message = result?.message?.toLowerCase() || ''

  if (message.includes('domain') && (message.includes('not verified') || message.includes('associated domain'))) {
    return {
      status: 503,
      body: {
        code: 'EMAIL_DOMAIN_NOT_VERIFIED',
        error: 'تعذّر إرسال الدعوة لأن نطاق البريد لم يكتمل توثيقه بعد. حاول مرة أخرى بعد قليل.',
      },
    }
  }

  if (message.includes('api key') || message.includes('unauthorized')) {
    return {
      status: 503,
      body: {
        code: 'EMAIL_PROVIDER_AUTH_FAILED',
        error: 'خدمة البريد غير متاحة مؤقتًا بسبب مشكلة في إعدادات الإرسال.',
      },
    }
  }

  return {
    status: 502,
    body: {
      code: 'EMAIL_PROVIDER_REJECTED',
      error: 'تعذّر إرسال الإيميل من مزوّد البريد. حاول مرة أخرى بعد قليل.',
    },
  }
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
  const footer = `<p style="color:#aaa;font-size:12px;text-align:center;margin-top:20px;">منصة قدرات المغربي | qudratmaghrabi.com</p>`

  if (type === 'team_invite') {
    if (!await isAdminRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const memberName = data?.memberName?.trim() || ''
    const inviteLink = data?.inviteLink?.trim() || ''
    const roleLabel = data?.roleLabel?.trim() || ''
    if (!memberName || !inviteLink || !roleLabel || !isTrustedInviteLink(inviteLink)) {
      return res.status(400).json({ error: 'Invalid team invitation data' })
    }

    subject = 'دعوة للانضمام إلى فريق قدرات المغربي'
    html = buildTeamInviteEmail(memberName, roleLabel, inviteLink)
  } else if (type === 'enrollment') {
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
            <a href="${PLATFORM_URL}/dashboard"
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
            <a href="${PLATFORM_URL}/courses"
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
            <a href="${PLATFORM_URL}/dashboard"
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
            <a href="${PLATFORM_URL}/learn/${data?.courseId || ''}"
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
            <a href="${PLATFORM_URL}/dashboard"
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
        from: process.env.RESEND_FROM_EMAIL || 'قدرات المغربي <noreply@qudratmaghrabi.com>',
        to: [to],
        subject,
        html,
      }),
    })

    const result = await response.json().catch(() => null) as ({ id?: string } & ResendError) | null
    if (!response.ok) {
      console.error('Resend rejected email', {
        status: response.status,
        name: result?.name,
        message: result?.message,
        type,
      })
      const failure = providerErrorResponse(result)
      return res.status(failure.status).json(failure.body)
    }

    return res.status(200).json({ success: true, id: result.id })
  } catch (error) {
    console.error('Email request failed', { error, type })
    return res.status(502).json({
      code: 'EMAIL_PROVIDER_UNREACHABLE',
      error: 'تعذّر الاتصال بخدمة البريد. حاول مرة أخرى بعد قليل.',
    })
  }
}
