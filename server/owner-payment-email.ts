export const OWNER_PAYMENT_RECIPIENT = 'mr.ali.maths1@gmail.com'
export type OwnerPaymentEmail = {
  id: string; event_key: string; source: 'paymob' | 'apple' | 'google';
  student_name: string; student_email: string; course_name: string;
  amount_minor: number | null; currency: string | null; paid_at: string;
  status: string; attempts: number; provider_email_id: string | null; is_test: boolean;
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character] || character)

export function buildOwnerPaymentMessage(row: OwnerPaymentEmail) {
  const source = { paymob: 'الموقع — Paymob', apple: 'التطبيق — App Store', google: 'التطبيق — Google Play' }[row.source]
  const amount = row.amount_minor !== null && row.currency
    ? `${(Number(row.amount_minor) / 100).toFixed(2)} ${row.currency}`
    : 'المبلغ غير متاح في بيانات المتجر؛ راجع تقرير المعاملة في المتجر'
  const fields = [
    ['الطالب', row.student_name || 'طالب'], ['بريد الطالب', row.student_email],
    ['الكورس / الباقة', row.course_name], ['القيمة', amount], ['طريقة الدفع', source],
    ['تاريخ الدفع', row.paid_at], ['مرجع العملية', row.event_key],
  ]
  const subject = row.is_test ? 'اختبار إشعارات الدفع — قدرات المغربي' : 'تأكيد اشتراك مدفوع — قدرات المغربي'
  const note = row.is_test ? 'هذه رسالة اختبار للإشعارات فقط؛ لم يتم خصم أو تسجيل أي دفعة حقيقية.' : 'تم تأكيد الدفع وتفعيل الاشتراك. هذا إشعار للإدارة وليس فاتورة ضريبية.'
  return {
    to: [OWNER_PAYMENT_RECIPIENT], subject,
    text: `${subject}\n${note}\n` + fields.map(([key, value]) => `${key}: ${value}`).join('\n'),
    html: `<div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;max-width:620px;margin:auto;background:#f7f3fc;padding:24px;color:#261638"><h1 style="color:#7428af;font-size:24px">${escapeHtml(subject)}</h1><p>${escapeHtml(note)}</p><table style="width:100%;background:white;border-radius:16px;padding:16px">${fields.map(([key, value]) => `<tr><th style="text-align:right;vertical-align:top;padding:10px">${escapeHtml(key)}</th><td style="padding:10px;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join('')}</table><p><a href="https://www.qudratmaghrabi.com/admin/enrollments">عرض الاشتراكات في لوحة التحكم</a></p></div>`,
  }
}

type Dependencies = {
  find: (id: string, token: string) => Promise<OwnerPaymentEmail | null>
  claim: (id: string, token: string) => Promise<OwnerPaymentEmail | null>
  markSent: (id: string, providerId: string) => Promise<void>
  markFailed: (id: string, reason: string) => Promise<void>
  markDelivery: (id: string, event: string) => Promise<void>
  send: (row: OwnerPaymentEmail) => Promise<string>
  delivery: (providerId: string) => Promise<string>
}

export async function processOwnerPaymentEmail(input: unknown, dependencies: Dependencies) {
  const body = input as { notification_id?: unknown; token?: unknown; action?: unknown } | null
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (typeof body?.notification_id !== 'string' || !uuid.test(body.notification_id) || typeof body.token !== 'string' || !uuid.test(body.token)) return { status: 401, body: { error: 'UNAUTHORIZED' } }
  const row = await dependencies.find(body.notification_id, body.token)
  if (!row) return { status: 401, body: { error: 'UNAUTHORIZED' } }
  if (body.action === 'status') {
    if (!row.provider_email_id) return { status: 200, body: { state: row.status } }
    const event = await dependencies.delivery(row.provider_email_id)
    await dependencies.markDelivery(row.id, event)
    return { status: 200, body: { state: row.status, delivery: event } }
  }
  if (body.action !== undefined && body.action !== 'send') return { status: 400, body: { error: 'INVALID_ACTION' } }
  if (row.status === 'sent') return { status: 200, body: { state: 'sent', duplicate: true } }
  const claimed = await dependencies.claim(row.id, body.token)
  if (!claimed) return { status: 200, body: { state: 'not_due' } }
  try {
    const providerId = await dependencies.send(claimed)
    await dependencies.markSent(claimed.id, providerId)
    return { status: 200, body: { state: 'sent' } }
  } catch {
    // Keep errors bounded and secret-free; payment activation has already committed.
    await dependencies.markFailed(claimed.id, 'EMAIL_SEND_OR_ACK_FAILED')
    return { status: 502, body: { state: 'retry_pending' } }
  }
}
