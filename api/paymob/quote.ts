import {
  ApiRequest,
  ApiResponse,
  ConfigurationError,
  convertPaymentAmount,
  getBearerToken,
  getPaymobConfig,
  getSupabaseAdmin,
  isUuid,
  parseBody,
  toMinorUnits,
} from '../../server/paymob.js'

type QuoteBody = {
  courseId?: string
  planCode?: string
  discountPercent?: number
}

const PLAN_CODES = new Set(['monthly', 'quarterly', 'semiannual'])
const DISCOUNT_PERCENTAGES = new Set([0, 25, 50, 75, 100])

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })

  const body = parseBody<QuoteBody>(req.body)
  const planCode = typeof body?.planCode === 'string' ? body.planCode.trim().toLowerCase() : ''
  const hasPlan = PLAN_CODES.has(planCode)
  const hasCourse = isUuid(body?.courseId)
  const discountPercent = Number(body?.discountPercent || 0)

  if ((!hasPlan && !hasCourse) || !DISCOUNT_PERCENTAGES.has(discountPercent)) {
    return res.status(400).json({ error: 'INVALID_QUOTE' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const paymob = getPaymobConfig()
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return res.status(401).json({ error: 'UNAUTHORIZED' })

    let originalAmountMinor: number | null = null
    let displayCurrency = ''

    if (hasPlan) {
      const { data: plan, error } = await supabase
        .from('store_subscription_plans')
        .select('web_price_minor, web_currency')
        .eq('plan_code', planCode)
        .eq('is_active', true)
        .maybeSingle()

      if (error || !plan) return res.status(404).json({ error: 'PLAN_NOT_FOUND' })
      originalAmountMinor = Number(plan.web_price_minor)
      displayCurrency = String(plan.web_currency || '').toUpperCase()
    } else {
      const { data: course, error } = await supabase
        .from('courses')
        .select('price, currency')
        .eq('id', body!.courseId!)
        .eq('is_published', true)
        .maybeSingle()

      if (error || !course) return res.status(404).json({ error: 'COURSE_NOT_FOUND' })
      originalAmountMinor = toMinorUnits(course.price)
      displayCurrency = String(course.currency || '').toUpperCase()
    }

    if (!originalAmountMinor || !Number.isSafeInteger(originalAmountMinor)) {
      return res.status(400).json({ error: 'SUBSCRIPTION_PRICE_INVALID' })
    }

    const discountedAmountMinor = Math.max(
      0,
      Math.round(originalAmountMinor * (100 - discountPercent) / 100),
    )
    const quote = convertPaymentAmount(discountedAmountMinor, displayCurrency, paymob.currency)

    return res.status(200).json(quote)
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message)
      return res.status(503).json({ error: 'PAYMENT_NOT_CONFIGURED' })
    }
    console.error('Payment quote failed', error)
    return res.status(500).json({ error: 'QUOTE_FAILED' })
  }
}
