import {
  ApiRequest,
  ApiResponse,
  ConfigurationError,
  createPaymobIntention,
  getBearerToken,
  getPaymobConfig,
  getSupabaseAdmin,
  isUuid,
  parseBody,
  splitCustomerName,
  toMinorUnits,
} from '../../server/paymob.js'

type CreateIntentionBody = {
  courseId?: string
  planCode?: string
  couponCode?: string
}

type WebSubscriptionPlan = {
  product_id: string
  plan_code: string
  name_ar: string
  duration_months: number
  bundle_course_id: string
  web_price_minor: number
  web_currency: string
}

const PLAN_CODES = new Set(['monthly', 'quarterly', 'semiannual'])

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })

  const body = parseBody<CreateIntentionBody>(req.body)
  const planCode = typeof body?.planCode === 'string'
    ? body.planCode.trim().toLowerCase()
    : ''
  const hasPlan = PLAN_CODES.has(planCode)
  const hasLegacyCourse = isUuid(body?.courseId)
  if (!hasPlan && !hasLegacyCourse) {
    return res.status(400).json({ error: 'INVALID_SUBSCRIPTION' })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message)
      return res.status(503).json({ error: 'SERVICE_NOT_CONFIGURED' })
    }
    throw error
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'UNAUTHORIZED' })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.is_active === false || profile.role !== 'student') {
    return res.status(403).json({ error: 'STUDENT_ACCOUNT_REQUIRED' })
  }

  let plan: WebSubscriptionPlan | null = null
  if (hasPlan) {
    const { data, error } = await supabase
      .from('store_subscription_plans')
      .select('product_id, plan_code, name_ar, duration_months, bundle_course_id, web_price_minor, web_currency')
      .eq('plan_code', planCode)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Subscription plan lookup failed', error)
      return res.status(500).json({ error: 'PAYMENT_SETUP_FAILED' })
    }
    if (!data || !data.web_price_minor || !data.web_currency) {
      return res.status(404).json({ error: 'PLAN_NOT_FOUND' })
    }
    plan = data as WebSubscriptionPlan
  }

  const targetCourseId = plan?.bundle_course_id || body!.courseId!
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, price, currency, is_published')
    .eq('id', targetCourseId)
    .eq('is_published', true)
    .maybeSingle()

  if (courseError || !course) return res.status(404).json({ error: 'COURSE_NOT_FOUND' })

  const originalAmountMinor = plan
    ? Number(plan.web_price_minor)
    : toMinorUnits(course.price)
  const currency = String(plan?.web_currency || course.currency || '').toUpperCase()
  if (!originalAmountMinor || !Number.isSafeInteger(originalAmountMinor)) {
    return res.status(400).json({ error: 'SUBSCRIPTION_PRICE_INVALID' })
  }

  const normalizedCouponCode = typeof body?.couponCode === 'string'
    ? body.couponCode.trim().toUpperCase()
    : ''
  let discountCode: { id: string; discount_percent: number } | null = null

  if (normalizedCouponCode) {
    const { data: coupon, error: couponError } = await supabase
      .from('discount_codes')
      .select('id, allowed_email, discount_percent, is_active, max_uses, used_count, expires_at')
      .eq('code', normalizedCouponCode)
      .maybeSingle()

    if (couponError) {
      console.error('Discount code lookup failed', couponError)
      return res.status(500).json({ error: 'COUPON_VALIDATION_FAILED' })
    }

    const accountEmail = String(profile.email || user.email || '').trim().toLowerCase()
    const allowedEmail = String(coupon?.allowed_email || '').trim().toLowerCase()
    const discountPercent = Number(coupon?.discount_percent)
    const expired = coupon?.expires_at ? new Date(coupon.expires_at).getTime() < Date.now() : false
    const exhausted = coupon?.max_uses != null && Number(coupon.used_count) >= Number(coupon.max_uses)

    if (
      !coupon
      || !coupon.is_active
      || !allowedEmail
      || allowedEmail !== accountEmail
      || expired
      || exhausted
      || ![25, 50, 75, 100].includes(discountPercent)
    ) {
      return res.status(400).json({ error: 'COUPON_INVALID' })
    }

    if (discountPercent === 100) {
      if (!plan) return res.status(409).json({ error: 'COUPON_REQUIRES_REDEMPTION' })

      const { data: granted, error: grantError } = await supabase
        .rpc('grant_web_subscription_coupon', {
          p_student_id: user.id,
          p_plan_code: plan.plan_code,
          p_code: normalizedCouponCode,
        })
        .single()

      if (grantError || !granted) {
        console.warn('Free subscription coupon rejected', grantError?.message)
        return res.status(409).json({ error: 'COUPON_INVALID' })
      }

      return res.status(200).json({
        free: true,
        attemptId: granted.attempt_id,
        courseId: granted.course_id,
        planCode: plan.plan_code,
        expiresAt: granted.expires_at,
      })
    }

    discountCode = { id: coupon.id, discount_percent: discountPercent }
  }

  let paymob
  try {
    paymob = getPaymobConfig()
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message)
      return res.status(503).json({ error: 'PAYMENT_NOT_CONFIGURED' })
    }
    throw error
  }

  if (currency !== paymob.currency) {
    console.error('Subscription currency does not match the configured Paymob integration', {
      planCode: plan?.plan_code,
      courseId: course.id,
      subscriptionCurrency: currency,
      paymobCurrency: paymob.currency,
    })
    return res.status(409).json({ error: 'PAYMENT_CURRENCY_MISMATCH' })
  }

  const amountMinor = discountCode
    ? Math.max(1, Math.round(originalAmountMinor * (100 - discountCode.discount_percent) / 100))
    : originalAmountMinor

  const { data: existingEnrollment, error: enrollmentReadError } = await supabase
    .from('enrollments')
    .select('id, payment_status, expires_at')
    .eq('student_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (enrollmentReadError) {
    console.error('Enrollment lookup failed', enrollmentReadError)
    return res.status(500).json({ error: 'PAYMENT_SETUP_FAILED' })
  }
  if (!plan && existingEnrollment?.payment_status === 'paid') {
    return res.status(409).json({ error: 'ALREADY_ENROLLED', courseId: course.id })
  }

  let enrollmentId = existingEnrollment?.id as string | undefined
  if (!enrollmentId) {
    const { data: newEnrollment, error: enrollmentInsertError } = await supabase
      .from('enrollments')
      .insert({
        student_id: user.id,
        course_id: course.id,
        payment_status: 'pending',
        amount_paid: null,
        payment_method: null,
        payment_reference: null,
      })
      .select('id')
      .single()

    if (enrollmentInsertError || !newEnrollment) {
      console.error('Enrollment creation failed', enrollmentInsertError)
      return res.status(500).json({ error: 'PAYMENT_SETUP_FAILED' })
    }
    enrollmentId = newEnrollment.id
  } else if (existingEnrollment?.payment_status === 'failed') {
    const { error: enrollmentResetError } = await supabase
      .from('enrollments')
      .update({ payment_status: 'pending', payment_method: null, payment_reference: null })
      .eq('id', enrollmentId)

    if (enrollmentResetError) {
      console.error('Enrollment reset failed', enrollmentResetError)
      return res.status(500).json({ error: 'PAYMENT_SETUP_FAILED' })
    }
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('payment_attempts')
    .insert({
      student_id: user.id,
      course_id: course.id,
      enrollment_id: enrollmentId,
      provider: 'paymob',
      status: 'pending',
      amount_minor: amountMinor,
      original_amount_minor: discountCode ? originalAmountMinor : null,
      discount_code_id: discountCode?.id || null,
      discount_percent: discountCode?.discount_percent || null,
      currency,
      subscription_product_id: plan?.product_id || null,
      subscription_duration_months: plan?.duration_months || null,
      metadata: plan ? { plan_code: plan.plan_code, plan_name: plan.name_ar } : {},
    })
    .select('id')
    .single()

  if (attemptError || !attempt) {
    console.error('Payment attempt creation failed', attemptError)
    return res.status(500).json({ error: 'PAYMENT_SETUP_FAILED' })
  }

  if (discountCode) {
    const { error: reservationError } = await supabase.rpc(
      'reserve_discount_code_for_payment',
      { p_attempt_id: attempt.id },
    )
    if (reservationError) {
      console.warn('Discount code reservation rejected', reservationError.message)
      await supabase
        .from('payment_attempts')
        .update({ status: 'failed', failure_reason: 'coupon_reservation_rejected' })
        .eq('id', attempt.id)
      return res.status(409).json({ error: 'COUPON_INVALID' })
    }
  }

  const { firstName, lastName } = splitCustomerName(profile.full_name)
  const itemName = plan ? `${plan.name_ar} - ${plan.duration_months} شهر` : course.title

  try {
    const intention = await createPaymobIntention(paymob, {
      amount: amountMinor,
      currency,
      payment_methods: paymob.integrationIds,
      items: [{
        name: itemName,
        amount: amountMinor,
        description: plan ? `اشتراك ${plan.name_ar}` : `اشتراك كورس ${course.title}`,
        quantity: 1,
      }],
      billing_data: {
        first_name: firstName,
        last_name: lastName,
        email: profile.email || user.email || 'NA',
        phone_number: profile.phone?.trim() || 'NA',
        apartment: 'NA',
        floor: 'NA',
        street: 'NA',
        building: 'NA',
        city: 'NA',
        state: 'NA',
        country: paymob.countryCode,
      },
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: profile.email || user.email || 'NA',
      },
      special_reference: attempt.id,
      notification_url: process.env.PAYMOB_NOTIFICATION_URL?.trim()
        || 'https://www.qudratmaghrabi.com/api/paymob/webhook',
      extras: {
        attempt_id: attempt.id,
        enrollment_id: enrollmentId,
        course_id: course.id,
        plan_code: plan?.plan_code || null,
        subscription_duration_months: plan?.duration_months || null,
        discount_percent: discountCode?.discount_percent || 0,
      },
    })

    const { error: updateError } = await supabase
      .from('payment_attempts')
      .update({
        provider_intention_id: intention.intentionId,
        provider_order_id: intention.orderId,
      })
      .eq('id', attempt.id)

    if (updateError) console.error('Payment intention metadata update failed', updateError)

    return res.status(200).json({
      attemptId: attempt.id,
      checkoutUrl: intention.checkoutUrl,
      courseId: course.id,
      planCode: plan?.plan_code || null,
    })
  } catch (error) {
    console.error('Paymob intention creation failed', error)
    if (discountCode) {
      const { error: releaseError } = await supabase.rpc(
        'release_discount_code_reservation',
        { p_attempt_id: attempt.id },
      )
      if (releaseError) console.error('Discount reservation release failed', releaseError)
    }
    await supabase
      .from('payment_attempts')
      .update({ status: 'failed', failure_reason: 'intention_creation_failed' })
      .eq('id', attempt.id)

    return res.status(502).json({ error: 'PAYMOB_UNAVAILABLE' })
  }
}
