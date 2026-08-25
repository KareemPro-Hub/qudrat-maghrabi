type ApiRequest = {
  method?: string
  headers?: { authorization?: string }
  body?: {
    action?: 'preview' | 'send'
    audience?: 'students' | 'course'
    courseId?: string
    title?: string
    body?: string
    confirmedOptIn?: boolean
  }
}

type ApiResponse = {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
}

type Recipient = {
  id: string
  phone: string
  fullName: string
}

type ProfileRow = {
  id?: string
  phone?: string | null
  full_name?: string | null
}

type EnrollmentRow = {
  profiles?: ProfileRow | ProfileRow[] | null
}

function normalizePhone(value: string | null | undefined) {
  let digits = (value || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('05') && digits.length === 10) digits = `966${digits.slice(1)}`
  else if (digits.startsWith('5') && digits.length === 9) digits = `966${digits}`
  return /^\d{8,15}$/.test(digits) ? digits : ''
}

async function getAdminContext(req: ApiRequest) {
  const authorization = req.headers?.authorization || ''
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!authorization.startsWith('Bearer ') || !supabaseUrl || !supabaseAnonKey) return null

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: supabaseAnonKey },
  })
  if (!userResponse.ok) return null
  const user = await userResponse.json() as { id?: string }
  if (!user.id) return null

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`,
    { headers: { Authorization: authorization, apikey: supabaseAnonKey } },
  )
  if (!profileResponse.ok) return null
  const profiles = await profileResponse.json() as Array<{ role?: string }>
  if (profiles.length !== 1 || profiles[0].role !== 'admin') return null

  return { authorization, supabaseUrl, supabaseAnonKey }
}

async function resolveRecipients(
  context: NonNullable<Awaited<ReturnType<typeof getAdminContext>>>,
  audience: 'students' | 'course',
  courseId?: string,
) {
  const headers = {
    Authorization: context.authorization,
    apikey: context.supabaseAnonKey,
  }

  let rows: ProfileRow[] = []
  if (audience === 'course') {
    if (!courseId) throw new Error('COURSE_REQUIRED')
    const query = new URLSearchParams({
      select: 'profiles(id,phone,full_name)',
      course_id: `eq.${courseId}`,
      payment_status: 'eq.paid',
    })
    const response = await fetch(`${context.supabaseUrl}/rest/v1/enrollments?${query}`, { headers })
    if (!response.ok) throw new Error('RECIPIENTS_FETCH_FAILED')
    const enrollments = await response.json() as EnrollmentRow[]
    rows = enrollments.flatMap((item) => {
      if (!item.profiles) return []
      return Array.isArray(item.profiles) ? item.profiles : [item.profiles]
    })
  } else {
    const query = new URLSearchParams({ select: 'id,phone,full_name', role: 'eq.student' })
    const response = await fetch(`${context.supabaseUrl}/rest/v1/profiles?${query}`, { headers })
    if (!response.ok) throw new Error('RECIPIENTS_FETCH_FAILED')
    rows = await response.json() as ProfileRow[]
  }

  const seen = new Set<string>()
  const recipients: Recipient[] = []
  let missingPhone = 0
  let duplicates = 0
  for (const row of rows) {
    const phone = normalizePhone(row.phone)
    if (!phone) {
      missingPhone++
      continue
    }
    if (seen.has(phone)) {
      duplicates++
      continue
    }
    seen.add(phone)
    recipients.push({ id: row.id || '', phone, fullName: row.full_name || 'طالبنا العزيز' })
  }
  return { recipients, total: rows.length, missingPhone, duplicates }
}

function providerConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME
  return {
    token,
    phoneNumberId,
    templateName,
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'ar',
    apiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0',
    configured: Boolean(token && phoneNumberId && templateName),
  }
}

async function sendTemplateMessage(recipient: Recipient, title: string, body: string) {
  const config = providerConfig()
  const response = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient.phone,
        type: 'template',
        template: {
          name: config.templateName,
          language: { code: config.language },
          components: [{
            type: 'body',
            parameters: [{ type: 'text', text: `${title}\n${body}`.slice(0, 900) }],
          }],
        },
      }),
    },
  )
  const result = await response.json().catch(() => null) as { messages?: Array<{ id?: string }>; error?: { message?: string } } | null
  return { ok: response.ok, id: result?.messages?.[0]?.id, error: result?.error?.message }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const context = await getAdminContext(req)
  if (!context) return res.status(401).json({ error: 'غير مصرح لك بتنفيذ هذا الإجراء.' })

  const action = req.body?.action || 'preview'
  const audience = req.body?.audience === 'course' ? 'course' : 'students'

  try {
    const summary = await resolveRecipients(context, audience, req.body?.courseId)
    const config = providerConfig()
    if (action === 'preview') {
      return res.status(200).json({
        configured: config.configured,
        eligible: summary.recipients.length,
        total: summary.total,
        missingPhone: summary.missingPhone,
        duplicates: summary.duplicates,
      })
    }

    const title = req.body?.title?.trim() || ''
    const body = req.body?.body?.trim() || ''
    if (!title || !body) return res.status(400).json({ error: 'العنوان ونص الرسالة مطلوبان.' })
    if (!req.body?.confirmedOptIn) {
      return res.status(400).json({ error: 'يجب تأكيد موافقة الطلاب على استقبال رسائل واتساب.' })
    }
    if (!config.configured) {
      return res.status(503).json({
        code: 'WHATSAPP_NOT_CONFIGURED',
        error: 'يلزم إكمال ربط حساب واتساب للأعمال مرة واحدة قبل الإرسال.',
      })
    }
    if (summary.recipients.length === 0) {
      return res.status(400).json({ error: 'لا توجد أرقام جوال صالحة ضمن الفئة المختارة.' })
    }

    const results = await mapWithConcurrency(summary.recipients, 5, (recipient) =>
      sendTemplateMessage(recipient, title, body),
    )
    const sent = results.filter((item) => item.ok).length
    const failed = results.length - sent
    if (sent === 0) {
      console.error('WhatsApp broadcast rejected', { failed, firstError: results[0]?.error })
      return res.status(502).json({ error: 'رفض مزوّد واتساب عملية الإرسال. راجع القالب وإعدادات الحساب.' })
    }

    return res.status(200).json({ success: true, sent, failed, missingPhone: summary.missingPhone })
  } catch (error) {
    console.error('WhatsApp broadcast failed', { error })
    if (error instanceof Error && error.message === 'COURSE_REQUIRED') {
      return res.status(400).json({ error: 'اختر الكورس المستهدف.' })
    }
    return res.status(500).json({ error: 'تعذّر تجهيز قائمة الطلاب أو إرسال الرسائل.' })
  }
}
