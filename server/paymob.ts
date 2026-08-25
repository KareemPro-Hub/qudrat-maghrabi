import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export type ApiRequest = {
  method?: string
  body?: unknown
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
}

export type ApiResponse = {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
}

export type PaymobConfig = {
  baseUrl: string
  secretKey: string
  publicKey: string
  hmacSecret: string
  integrationIds: number[]
  currency: string
  countryCode: string
}

export type PaymentConversion = {
  displayAmountMinor: number
  displayCurrency: string
  processingAmountMinor: number
  processingCurrency: string
  exchangeRate: number
}

export class ConfigurationError extends Error {}

// The default follows the Central Bank of Egypt SAR selling rate published on
// 24 Aug 2026, rounded to two decimals. It can be updated without a code change
// through PAYMOB_SAR_TO_EGP_RATE in the deployment environment.
const DEFAULT_SAR_TO_EGP_RATE = 13.55

export function convertPaymentAmount(
  displayAmountMinor: number,
  displayCurrency: string,
  processingCurrency: string,
): PaymentConversion {
  const normalizedDisplayCurrency = displayCurrency.trim().toUpperCase()
  const normalizedProcessingCurrency = processingCurrency.trim().toUpperCase()

  if (!Number.isSafeInteger(displayAmountMinor) || displayAmountMinor < 0) {
    throw new ConfigurationError('Payment display amount is invalid')
  }

  if (normalizedDisplayCurrency === normalizedProcessingCurrency) {
    return {
      displayAmountMinor,
      displayCurrency: normalizedDisplayCurrency,
      processingAmountMinor: displayAmountMinor,
      processingCurrency: normalizedProcessingCurrency,
      exchangeRate: 1,
    }
  }

  if (normalizedDisplayCurrency !== 'SAR' || normalizedProcessingCurrency !== 'EGP') {
    throw new ConfigurationError('The configured payment currency conversion is not supported')
  }

  const configuredRate = Number(process.env.PAYMOB_SAR_TO_EGP_RATE || DEFAULT_SAR_TO_EGP_RATE)
  if (!Number.isFinite(configuredRate) || configuredRate <= 0) {
    throw new ConfigurationError('PAYMOB_SAR_TO_EGP_RATE is invalid')
  }

  const processingAmountMinor = displayAmountMinor === 0
    ? 0
    : Math.max(1, Math.round(displayAmountMinor * configuredRate))

  if (!Number.isSafeInteger(processingAmountMinor)) {
    throw new ConfigurationError('Converted payment amount is invalid')
  }

  return {
    displayAmountMinor,
    displayCurrency: normalizedDisplayCurrency,
    processingAmountMinor,
    processingCurrency: normalizedProcessingCurrency,
    exchangeRate: configuredRate,
  }
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new ConfigurationError('Supabase server credentials are not configured')
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getPaymobConfig(): PaymobConfig {
  const secretKey = process.env.PAYMOB_SECRET_KEY?.trim()
  const publicKey = process.env.PAYMOB_PUBLIC_KEY?.trim()
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET?.trim()
  const currency = process.env.PAYMOB_CURRENCY?.trim().toUpperCase()
  const countryCode = process.env.PAYMOB_COUNTRY_CODE?.trim().toUpperCase()
  const integrationIds = (process.env.PAYMOB_INTEGRATION_IDS || '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isSafeInteger(value) && value > 0)

  if (
    !secretKey
    || !publicKey
    || !hmacSecret
    || integrationIds.length === 0
    || !currency
    || !/^[A-Z]{3}$/.test(currency)
    || !countryCode
    || !/^[A-Z]{2}$/.test(countryCode)
  ) {
    throw new ConfigurationError('Paymob credentials are not configured')
  }

  return {
    baseUrl: (process.env.PAYMOB_BASE_URL?.trim() || 'https://accept.paymob.com').replace(/\/+$/, ''),
    secretKey,
    publicKey,
    hmacSecret,
    integrationIds,
    currency,
    countryCode,
  }
}

export function getRequestHeader(req: ApiRequest, name: string) {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

export function getQueryValue(req: ApiRequest, name: string) {
  const value = req.query?.[name]
  return Array.isArray(value) ? value[0] : value
}

export function getBearerToken(req: ApiRequest) {
  const authorization = getRequestHeader(req, 'authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function parseBody<T>(body: unknown): T | null {
  if (body && typeof body === 'object') return body as T
  if (typeof body !== 'string') return null

  try {
    return JSON.parse(body) as T
  } catch {
    return null
  }
}

export function toMinorUnits(amount: unknown) {
  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null

  const minorUnits = Math.round((numericAmount + Number.EPSILON) * 100)
  return Number.isSafeInteger(minorUnits) && minorUnits > 0 ? minorUnits : null
}

export function splitCustomerName(fullName: string | null | undefined) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || 'طالب',
    lastName: parts.slice(1).join(' ') || 'قدرات المغربي',
  }
}

const TRANSACTION_HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const

function readNestedValue(source: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, source)
}

export function verifyTransactionHmac(
  transaction: Record<string, unknown>,
  receivedHmac: string,
  hmacSecret: string,
) {
  if (!/^[0-9a-f]{128}$/i.test(receivedHmac)) return false

  const concatenated = TRANSACTION_HMAC_FIELDS
    .map((field) => {
      const value = readNestedValue(transaction, field)
      return value === null || value === undefined ? '' : String(value)
    })
    .join('')

  const expectedHmac = crypto
    .createHmac('sha512', hmacSecret)
    .update(concatenated)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expectedHmac, 'hex'),
    Buffer.from(receivedHmac, 'hex'),
  )
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

export function extractAttemptId(transaction: Record<string, unknown>) {
  const order = transaction.order && typeof transaction.order === 'object'
    ? transaction.order as Record<string, unknown>
    : {}
  const intention = transaction.intention && typeof transaction.intention === 'object'
    ? transaction.intention as Record<string, unknown>
    : {}

  const candidate = firstString(
    order.merchant_order_id,
    order.special_reference,
    transaction.special_reference,
    transaction.merchant_order_id,
    intention.special_reference,
  )

  return isUuid(candidate) ? candidate : null
}

export function asString(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

export function asBoolean(value: unknown) {
  return value === true || value === 'true'
}

export async function createPaymobIntention(
  config: PaymobConfig,
  payload: Record<string, unknown>,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(`${config.baseUrl}/v1/intention/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const result = await response.json().catch(() => null) as Record<string, unknown> | unknown[] | null
    if (!response.ok || !result) {
      console.error('Paymob intention rejected', {
        status: response.status,
        response: result || 'Empty Paymob response',
      })
      throw new Error('Paymob rejected the payment intention')
    }

    if (Array.isArray(result)) throw new Error('Paymob returned an invalid intention response')

    const clientSecret = asString(result.client_secret)
    if (!clientSecret) throw new Error('Paymob response did not include a client secret')

    const checkoutUrl = new URL('/unifiedcheckout/', config.baseUrl)
    checkoutUrl.searchParams.set('publicKey', config.publicKey)
    checkoutUrl.searchParams.set('clientSecret', clientSecret)

    return {
      checkoutUrl: checkoutUrl.toString(),
      intentionId: asString(result.id) || asString(result.intention_id),
      orderId: asString(result.intention_order_id) || asString(result.order_id),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendEnrollmentEmail(input: {
  email?: string | null
  studentName?: string | null
  courseName?: string | null
  courseId: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !input.email) return

  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character)

  const studentName = escapeHtml(input.studentName || 'طالبنا العزيز')
  const courseName = escapeHtml(input.courseName || 'الكورس')
  const courseUrl = `https://www.qudratmaghrabi.com/learn/${encodeURIComponent(input.courseId)}`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'قدرات المغربي <noreply@qudratmaghrabi.com>',
        to: [input.email],
        subject: 'تم تفعيل اشتراكك بنجاح 🎉 — قدرات المغربي',
        html: `
          <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#f3eff8;padding:24px">
            <div style="background:#fff;border-radius:22px;overflow:hidden;border:1px solid #e8e0f1">
              <div style="background:linear-gradient(135deg,#3d1070,#7428af,#d52f8c);padding:30px;text-align:center">
                <img src="https://www.qudratmaghrabi.com/home/brand/logo.png" width="118" alt="قدرات المغربي" style="background:#fff;padding:10px 18px;border-radius:16px;height:auto">
                <h1 style="color:#fff;font-size:28px;margin:22px 0 5px">اشتراكك أصبح جاهزًا</h1>
                <p style="color:#eadff5;margin:0">ابدأ رحلتك نحو الدرجة التي تستحقها</p>
              </div>
              <div style="padding:34px">
                <p style="color:#281a3d;font-size:19px;font-weight:700">أهلًا ${studentName}،</p>
                <p style="color:#655a70;line-height:1.9">تم تأكيد الدفع وتفعيل اشتراكك في <strong>${courseName}</strong> بنجاح. جميع الدروس أصبحت متاحة لك الآن.</p>
                <a href="${courseUrl}" style="display:block;margin-top:26px;padding:16px;text-align:center;background:#ffc337;color:#432d35;border-radius:13px;text-decoration:none;font-weight:800">ابدأ الدراسة الآن</a>
              </div>
            </div>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      console.error('Enrollment email failed', { status: response.status })
    }
  } catch (error) {
    console.error('Enrollment email request failed', error)
  }
}
