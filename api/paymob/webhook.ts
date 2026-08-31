import {
  ApiRequest,
  ApiResponse,
  ConfigurationError,
  asBoolean,
  asString,
  extractAttemptId,
  getPaymobConfig,
  getQueryValue,
  getSupabaseAdmin,
  getTransactionIntegrationId,
  parseBody,
  sendEnrollmentEmail,
  verifyTransactionHmac,
} from '../../server/paymob.js'

type PaymobWebhook = {
  type?: string
  obj?: Record<string, unknown>
}

type FinalizedPayment = {
  student_id: string
  course_id: string
  enrollment_id: string
  already_paid: boolean
}

function getPaymentMethod(transaction: Record<string, unknown>) {
  const sourceData = transaction.source_data && typeof transaction.source_data === 'object'
    ? transaction.source_data as Record<string, unknown>
    : {}
  return asString(sourceData.sub_type) || asString(sourceData.type) || 'paymob'
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  const payload = parseBody<PaymobWebhook>(req.body)
  const transaction = payload?.obj && typeof payload.obj === 'object'
    ? payload.obj
    : req.body && typeof req.body === 'object'
      ? req.body as Record<string, unknown>
      : null
  const receivedHmac = getQueryValue(req, 'hmac')

  if (!transaction || !receivedHmac) {
    return res.status(400).json({ error: 'INVALID_CALLBACK' })
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

  if (!verifyTransactionHmac(transaction, receivedHmac, paymob.hmacSecret)) {
    console.warn('Rejected Paymob callback with invalid HMAC')
    return res.status(401).json({ error: 'INVALID_SIGNATURE' })
  }

  const transactionId = asString(transaction.id)
  const order = transaction.order && typeof transaction.order === 'object'
    ? transaction.order as Record<string, unknown>
    : {}
  const providerOrderId = asString(order.id)
  const attemptId = extractAttemptId(transaction)

  if (!transactionId) return res.status(400).json({ error: 'MISSING_TRANSACTION_ID' })

  let attemptQuery = supabase
    .from('payment_attempts')
    .select('id, status, amount_minor, currency, student_id, course_id, enrollment_id, discount_code_id')
    .eq('provider', 'paymob')

  if (attemptId) {
    attemptQuery = attemptQuery.eq('id', attemptId)
  } else if (providerOrderId) {
    attemptQuery = attemptQuery.eq('provider_order_id', providerOrderId)
  } else {
    return res.status(400).json({ error: 'MISSING_PAYMENT_REFERENCE' })
  }

  const { data: attempt, error: attemptError } = await attemptQuery.maybeSingle()
  if (attemptError) {
    console.error('Payment attempt lookup failed', attemptError)
    return res.status(500).json({ error: 'CALLBACK_PROCESSING_FAILED' })
  }
  if (!attempt) return res.status(404).json({ error: 'PAYMENT_ATTEMPT_NOT_FOUND' })

  const callbackAmount = Number(transaction.amount_cents)
  const callbackCurrency = asString(transaction.currency)?.toUpperCase()
  const callbackIntegrationId = getTransactionIntegrationId(transaction)

  if (
    !Number.isSafeInteger(callbackAmount)
    || callbackAmount !== Number(attempt.amount_minor)
    || callbackCurrency !== String(attempt.currency).toUpperCase()
    || !paymob.integrationIds.includes(callbackIntegrationId)
  ) {
    console.warn('Rejected Paymob callback with mismatched payment data', {
      attemptId: attempt.id,
      amountMatches: callbackAmount === Number(attempt.amount_minor),
      currencyMatches: callbackCurrency === String(attempt.currency).toUpperCase(),
      integrationMatches: paymob.integrationIds.includes(callbackIntegrationId),
    })
    return res.status(409).json({ error: 'PAYMENT_DATA_MISMATCH' })
  }

  const succeeded = asBoolean(transaction.success)
    && !asBoolean(transaction.pending)
    && !asBoolean(transaction.error_occured)
    && !asBoolean(transaction.is_voided)
    && !asBoolean(transaction.is_refunded)

  if (!succeeded) {
    if (attempt.status !== 'paid') {
      const reason = asString(transaction.data)
        || asString(transaction.error_occured)
        || 'payment_declined'
      await supabase
        .from('payment_attempts')
        .update({
          status: 'failed',
          provider_transaction_id: transactionId,
          provider_order_id: providerOrderId,
          payment_method: getPaymentMethod(transaction),
          failure_reason: reason.slice(0, 500),
        })
        .eq('id', attempt.id)

      if (attempt.discount_code_id) {
        const { error: releaseError } = await supabase.rpc(
          'release_discount_code_reservation',
          { p_attempt_id: attempt.id },
        )
        if (releaseError) console.error('Discount reservation release failed', releaseError)
      }
    }
    return res.status(200).json({ received: true, status: 'failed' })
  }

  if (attempt.status === 'paid') {
    return res.status(200).json({ received: true, status: 'paid', idempotent: true })
  }

  const { data: finalized, error: finalizeError } = await supabase
    .rpc('finalize_paymob_payment', {
      p_attempt_id: attempt.id,
      p_transaction_id: transactionId,
      p_order_id: providerOrderId,
      p_method: getPaymentMethod(transaction),
    })
    .single()

  if (finalizeError || !finalized) {
    console.error('Payment finalization failed', finalizeError)
    return res.status(500).json({ error: 'PAYMENT_FINALIZATION_FAILED' })
  }

  const finalizedPayment = finalized as FinalizedPayment

  if (!finalizedPayment.already_paid) {
    const [{ data: profile }, { data: course }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', finalizedPayment.student_id)
        .maybeSingle(),
      supabase
        .from('courses')
        .select('title')
        .eq('id', finalizedPayment.course_id)
        .maybeSingle(),
    ])

    await sendEnrollmentEmail({
      email: profile?.email,
      studentName: profile?.full_name,
      courseName: course?.title,
      courseId: finalizedPayment.course_id,
    })
  }

  return res.status(200).json({ received: true, status: 'paid' })
}
