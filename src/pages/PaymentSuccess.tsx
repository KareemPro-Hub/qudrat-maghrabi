import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, BookOpen, Clock3, RefreshCw, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type PaymentState = 'checking' | 'paid' | 'pending' | 'failed' | 'error'

function isAttemptId(value: string | null) {
  return !!value
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const couponSuccess = searchParams.get('source') === 'coupon'
  const queryAttemptId = [
    searchParams.get('attemptId'),
    searchParams.get('special_reference'),
    searchParams.get('merchant_order_id'),
  ].find(isAttemptId) || null
  const [state, setState] = useState<PaymentState>(couponSuccess ? 'paid' : 'checking')
  const [courseId, setCourseId] = useState<string | null>(
    searchParams.get('courseId') || sessionStorage.getItem('paymob_course_id'),
  )
  const [planCode, setPlanCode] = useState<string | null>(
    searchParams.get('plan') || sessionStorage.getItem('paymob_plan_code'),
  )
  const [paymentId, setPaymentId] = useState<string | null>(searchParams.get('id'))

  const checkPayment = useCallback(async (poll = false) => {
    const attemptId = queryAttemptId || sessionStorage.getItem('paymob_attempt_id')
    if (!attemptId) {
      setState('error')
      return
    }

    setState('checking')
    const maxChecks = poll ? 10 : 1

    for (let check = 0; check < maxChecks; check++) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setState('error')
        return
      }

      try {
        const response = await fetch(`/api/paymob/status?attemptId=${encodeURIComponent(attemptId)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          setState('error')
          return
        }

        setCourseId(result.courseId || null)
        setPlanCode(result.planCode || null)
        setPaymentId(result.paymentId || null)
        if (result.status === 'paid') {
          sessionStorage.removeItem('paymob_attempt_id')
          sessionStorage.removeItem('paymob_course_id')
          sessionStorage.removeItem('paymob_plan_code')
          setState('paid')
          return
        }
        if (result.status === 'failed') {
          setState('failed')
          return
        }
      } catch {
        setState('error')
        return
      }

      if (check < maxChecks - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1800))
      }
    }

    setState('pending')
  }, [queryAttemptId])

  useEffect(() => {
    if (!couponSuccess) {
      void checkPayment(true)
      return
    }
    sessionStorage.removeItem('paymob_attempt_id')
    sessionStorage.removeItem('paymob_course_id')
    sessionStorage.removeItem('paymob_plan_code')
  }, [checkPayment, couponSuccess])

  if (state === 'checking') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin mx-auto mb-4" />
        <p className="font-black text-brand-navy">جاري تأكيد الدفع بأمان...</p>
        <p className="text-sm text-gray-400 mt-2">لا تغلق الصفحة، يستغرق ذلك ثوانٍ قليلة</p>
      </div>
    </div>
  )

  const paid = state === 'paid'
  const failed = state === 'failed'

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #2D174B 0%, #3D1070 100%)' }}>
      <div className="bg-white rounded-3xl shadow-brand-lg p-10 max-w-md w-full text-center">

        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${paid ? 'gradient-bg' : failed ? 'bg-red-100' : 'bg-amber-100'}`}>
          {paid
            ? <CheckCircle size={40} className="text-white" />
            : failed
              ? <XCircle size={40} className="text-red-500" />
              : <Clock3 size={40} className="text-amber-600" />}
        </div>

        <h1 className="text-2xl font-black text-brand-navy mb-2">
          {paid ? 'تم الاشتراك بنجاح! 🎉' : failed ? 'لم تكتمل عملية الدفع' : 'الدفع قيد التأكيد'}
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          {paid
            ? 'مبروك! تم تأكيد الاشتراك وتفعيل باقتك في حسابك، ويمكنك البدء الآن.'
            : failed
              ? 'لم تؤكد بوابة الدفع العملية. يمكنك العودة والمحاولة مجددًا دون أي تفعيل مكرر.'
              : state === 'pending'
                ? 'استلمنا عودتك من بوابة الدفع، لكن التأكيد النهائي لم يصل بعد. أعد التحقق بعد لحظات.'
                : 'تعذّر التحقق من العملية الآن. أعد المحاولة، وإن تم الخصم سيُفعّل الكورس تلقائيًا فور وصول التأكيد.'}
        </p>

        {paid && paymentId && (
          <p className="text-xs text-gray-400 mb-6">رقم العملية: <span className="font-mono">{paymentId}</span></p>
        )}

        <div className="space-y-3">
          {paid && courseId && (
            <Link to={`/learn/${courseId}`} className="btn-primary w-full py-4 text-lg block text-center">
              ابدأ الدراسة الآن ←
            </Link>
          )}
          {!paid && (
            <button type="button" onClick={() => void checkPayment(false)} className="qm-primary w-full py-4">
              <RefreshCw size={17} />
              تحقق مرة أخرى
            </button>
          )}
          {failed && (planCode || courseId) && (
            <Link to={planCode ? `/checkout?plan=${encodeURIComponent(planCode)}` : `/checkout/${courseId}`} className="btn-outline w-full py-3 block text-center">
              العودة للدفع
            </Link>
          )}
          <Link to="/dashboard" className="btn-outline w-full py-3 block text-center">
            <BookOpen size={16} className="inline ml-1" />
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  )
}
