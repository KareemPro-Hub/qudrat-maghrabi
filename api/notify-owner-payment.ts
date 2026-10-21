import { getSupabaseAdmin, type ApiRequest, type ApiResponse } from '../server/paymob.js'
import { buildOwnerPaymentMessage, processOwnerPaymentEmail, type OwnerPaymentEmail } from '../server/owner-payment-email.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  const key = process.env.RESEND_API_KEY
  if (!key) return res.status(503).json({ error: 'EMAIL_NOT_CONFIGURED' })
  try {
    const admin = getSupabaseAdmin()
    const ensure = (error: unknown) => { if (error) throw new Error('Notification persistence failed') }
    const result = await processOwnerPaymentEmail(req.body, {
      async find(id, token) {
        const { data, error } = await admin.from('owner_payment_email_outbox').select('*').eq('id', id).eq('dispatch_token', token).maybeSingle()
        ensure(error)
        return data as OwnerPaymentEmail | null
      },
      async claim(id, token) {
        const { data, error } = await admin.rpc('claim_owner_payment_email', { p_id: id, p_token: token }).maybeSingle()
        ensure(error)
        return data as OwnerPaymentEmail | null
      },
      async markSent(id, providerId) {
        const { error } = await admin.from('owner_payment_email_outbox').update({ status: 'sent', provider_email_id: providerId, sent_at: new Date().toISOString(), last_error: null, locked_until: null }).eq('id', id).eq('status', 'processing')
        ensure(error)
      },
      async markFailed(id, reason) {
        const { error } = await admin.rpc('fail_owner_payment_email', { p_id: id, p_reason: reason })
        ensure(error)
      },
      async markDelivery(id, event) {
        const { error } = await admin.from('owner_payment_email_outbox').update({ delivery_event: event }).eq('id', id)
        ensure(error)
      },
      async send(row) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `owner-payment/${row.id}` },
          body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'قدرات المغربي <noreply@qudratmaghrabi.com>', ...buildOwnerPaymentMessage(row) }),
          signal: AbortSignal.timeout(15000),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || typeof data.id !== 'string') throw new Error('Email provider rejected request')
        return data.id
      },
      async delivery(providerId) {
        const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(providerId)}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) })
        if (!response.ok) return `status_http_${response.status}`
        const data = await response.json()
        const allowed = ['sent', 'delivered', 'delivery_delayed', 'bounced', 'complained', 'opened', 'clicked', 'failed']
        return allowed.includes(data.last_event) ? data.last_event : 'unverified'
      },
    })
    return res.status(result.status).json(result.body)
  } catch {
    return res.status(500).json({ error: 'NOTIFICATION_SERVICE_ERROR' })
  }
}
