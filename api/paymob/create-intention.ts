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
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })

  const body = parseBody<CreateIntentionBody>(req.body)
  if (!isUuid(body?.courseId)) {
    return res.status(400).json({ error: 'INVALID_COURSE' })
  }

  let supabase
  let paymob
  try {
    supabase = getSupabaseAdmin()
    paymob = getPaymobConfig()
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message)
      return res.status(503).json({ error: 'PAYMENT_NOT_CONFIGURED' })
    }
    throw error
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'UNAUTHORIZED' })

  const [{ data: course, error: courseError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, price, currency, is_published')
      .eq('id', body.courseId)
      .eq('is_published', true)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, is_active')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (courseError || !course) return res.status(404).json({ error: 'COURSE_NOT_FOUND' })
  if (profileError || !profile || profile.is_active === false || profile.role !== 'student') {
    return res.status(403).json({ error: 'STUDENT_ACCOUNT_REQUIRED' })
  }

  const amountMinor = toMinorUnits(course.price)
  const currency = String(course.currency || '').toUpperCase()
  if (!amountMinor) return res.status(400).json({ error: 'COURSE_IS_FREE' })
  if (currency !== paymob.currency) {
    console.error('Course currency does not match the configured Paymob integration', {
      courseId: course.id,
      courseCurrency: currency,
      paymobCurrency: paymob.currency,
    })
    return res.status(409).json({ error: 'PAYMENT_CURRENCY_MISMATCH' })
  }

  const { data: existingEnrollment, error: enrollmentReadError } = await supabase
    .from('enrollments')
    .select('id, payment_status')
    .eq('student_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (enrollmentReadError) {
    console.error('Enrollment lookup failed', enrollmentReadError)
    return res.status(500).json({ error: 'PAYMENT_SETUP_FAILED' })
  }
  if (existingEnrollment?.payment_status === 'paid') {
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
      currency,
    })
    .select('id')
    .single()

  if (attemptError || !attempt) {
    console.error('Payment attempt creation failed', attemptError)
    return res.status(500).json({ error: 'PAYMENT_SETUP_FAILED' })
  }

  const { firstName, lastName } = splitCustomerName(profile.full_name)

  try {
    const intention = await createPaymobIntention(paymob, {
      amount: amountMinor,
      currency,
      payment_methods: paymob.integrationIds,
      items: [{
        name: course.title,
        amount: amountMinor,
        description: `اشتراك كورس ${course.title}`,
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
    })
  } catch (error) {
    console.error('Paymob intention creation failed', error)
    await supabase
      .from('payment_attempts')
      .update({ status: 'failed', failure_reason: 'intention_creation_failed' })
      .eq('id', attempt.id)

    return res.status(502).json({ error: 'PAYMOB_UNAVAILABLE' })
  }
}
