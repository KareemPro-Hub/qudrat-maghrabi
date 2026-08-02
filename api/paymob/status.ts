import {
  ApiRequest,
  ApiResponse,
  ConfigurationError,
  getBearerToken,
  getQueryValue,
  getSupabaseAdmin,
  isUuid,
} from '../../server/paymob.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })

  const attemptId = getQueryValue(req, 'attemptId')
  if (!isUuid(attemptId)) return res.status(400).json({ error: 'INVALID_ATTEMPT' })

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

  const { data: attempt, error } = await supabase
    .from('payment_attempts')
    .select('id, status, course_id, enrollment_id, provider_transaction_id, failure_reason, created_at, metadata')
    .eq('id', attemptId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Payment status lookup failed', error)
    return res.status(500).json({ error: 'STATUS_LOOKUP_FAILED' })
  }
  if (!attempt) return res.status(404).json({ error: 'ATTEMPT_NOT_FOUND' })

  res.status(200).json({
    attemptId: attempt.id,
    status: attempt.status,
    courseId: attempt.course_id,
    enrollmentId: attempt.enrollment_id,
    paymentId: attempt.provider_transaction_id,
    failureReason: attempt.failure_reason,
    planCode: attempt.metadata && typeof attempt.metadata === 'object'
      ? (attempt.metadata as Record<string, unknown>).plan_code || null
      : null,
  })
}
