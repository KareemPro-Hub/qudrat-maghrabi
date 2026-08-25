import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ShieldCheck, Lock, TicketPercent } from 'lucide-react'
import CurrencySymbol from '../components/CurrencySymbol'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Course } from '../types'
import toast from 'react-hot-toast'

type SubscriptionPlan = {
  product_id: string
  plan_code: 'monthly' | 'quarterly' | 'semiannual'
  name_ar: string
  duration_months: number
  bundle_course_id: string
  web_price_minor: number
  web_currency: string
}

type PaymentQuote = {
  displayAmountMinor: number
  displayCurrency: string
  processingAmountMinor: number
  processingCurrency: string
  exchangeRate: number
}

const PLAN_CODES = new Set(['monthly', 'quarterly', 'semiannual'])

export default function Checkout() {
  const { courseId: legacyCourseId } = useParams<{ courseId: string }>()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const requestedPlan = (searchParams.get('plan') || '').trim().toLowerCase()
  const planCode = PLAN_CODES.has(requestedPlan) ? requestedPlan : ''
  const returnPath = `${location.pathname}${location.search}`

  const [course, setCourse] = useState<Course | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [currentExpiry, setCurrentExpiry] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentQuote, setPaymentQuote] = useState<PaymentQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(returnPath)}`, { replace: true })
      return
    }
    if (!planCode && !legacyCourseId) {
      navigate('/#qm-prices', { replace: true })
      return
    }
    void fetchPurchaseDetails()
  }, [user, authLoading, planCode, legacyCourseId, returnPath])

  useEffect(() => {
    if (!user || !course) {
      setPaymentQuote(null)
      return
    }

    const controller = new AbortController()
    const selectedCourseId = course.id
    const selectedPlanCode = plan?.plan_code

    async function fetchPaymentQuote() {
      setQuoteLoading(true)
      setQuoteError(false)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch('/api/paymob/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
          body: JSON.stringify(selectedPlanCode
            ? { planCode: selectedPlanCode, discountPercent: appliedCoupon?.percent || 0 }
            : { courseId: selectedCourseId, discountPercent: appliedCoupon?.percent || 0 }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(String(result.error || 'QUOTE_FAILED'))
        setPaymentQuote(result as PaymentQuote)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setPaymentQuote(null)
        setQuoteError(true)
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false)
      }
    }

    void fetchPaymentQuote()
    return () => controller.abort()
  }, [user, course?.id, plan?.plan_code, appliedCoupon?.percent])

  async function fetchPurchaseDetails() {
    setLoading(true)
    try {
      let selectedPlan: SubscriptionPlan | null = null
      let courseId = legacyCourseId || ''

      if (planCode) {
        const { data, error } = await supabase
          .from('store_subscription_plans')
          .select('product_id, plan_code, name_ar, duration_months, bundle_course_id, web_price_minor, web_currency')
          .eq('plan_code', planCode)
          .eq('is_active', true)
          .maybeSingle()

        if (error || !data || !data.web_price_minor || !data.web_currency) {
          toast.error('هذه الباقة غير متاحة حاليًا')
          navigate('/#qm-prices', { replace: true })
          return
        }
        selectedPlan = data as SubscriptionPlan
        courseId = selectedPlan.bundle_course_id
      }

      const { data: selectedCourse, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('is_published', true)
        .maybeSingle()

      if (courseError || !selectedCourse) {
        toast.error('تعذّر تحميل تفاصيل الاشتراك')
        navigate('/courses', { replace: true })
        return
      }

      const { data: existing } = await supabase
        .from('enrollments')
        .select('id, payment_status, expires_at')
        .eq('student_id', user!.id)
        .eq('course_id', courseId)
        .maybeSingle()

      if (!selectedPlan && existing?.payment_status === 'paid') {
        toast('أنت مشترك بالفعل في هذا الكورس')
        navigate(`/learn/${courseId}`, { replace: true })
        return
      }

      setPlan(selectedPlan)
      setCourse(selectedCourse as Course)
      setCurrentExpiry(existing?.payment_status === 'paid' ? existing.expires_at : null)
    } finally {
      setLoading(false)
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim() || !course) return
    setRedeeming(true)
    const normalizedCode = couponCode.trim().toUpperCase()

    const { data, error } = plan
      ? await supabase.rpc('validate_web_subscription_coupon', {
          p_code: normalizedCode,
          p_plan_code: plan.plan_code,
        })
      : await supabase.rpc('redeem_discount_code', {
          p_code: normalizedCode,
          p_course_id: course.id,
        })

    setRedeeming(false)
    if (error) {
      toast.error('حدث خطأ أثناء التحقق من الكود، حاول مرة أخرى')
      return
    }

    if (!plan && data?.success && Number(data.discount_percent) === 100 && data.redeemed === true) {
      toast.success('تم تفعيل اشتراكك مجانًا ✅')
      navigate(`/payment/success?source=coupon&courseId=${course.id}`)
      return
    }

    const discountPercent = Number(data?.discount_percent)
    if (data?.success && [25, 50, 75, 100].includes(discountPercent)) {
      setCouponCode(normalizedCode)
      setAppliedCoupon({ code: normalizedCode, percent: discountPercent })
      toast.success(`تم تطبيق خصم ${discountPercent}% ✅`)
      return
    }

    setAppliedCoupon(null)
    toast.error(data?.message || 'كود الخصم غير صالح')
  }

  async function handleStartPayment() {
    if (!course || paymentLoading) return
    if (totalPrice > 0 && (!paymentQuote || quoteLoading)) {
      toast.error('انتظر لحظة حتى يظهر المبلغ الذي سيُخصم بالجنيه المصري')
      return
    }
    setPaymentLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate(`/login?returnTo=${encodeURIComponent(returnPath)}`)
        return
      }

      const response = await fetch('/api/paymob/create-intention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(plan
          ? { planCode: plan.plan_code, couponCode: appliedCoupon?.code }
          : { courseId: course.id, couponCode: appliedCoupon?.code }),
      })
      const result = await response.json().catch(() => ({}))

      if (response.status === 409 && result.error === 'ALREADY_ENROLLED') {
        toast('أنت مشترك بالفعل في هذا الكورس')
        navigate(`/learn/${course.id}`)
        return
      }
      if (response.ok && result.free && result.attemptId) {
        sessionStorage.setItem('paymob_attempt_id', result.attemptId)
        sessionStorage.setItem('paymob_course_id', result.courseId || course.id)
        sessionStorage.setItem('paymob_plan_code', result.planCode || plan?.plan_code || '')
        navigate(`/payment/success?source=coupon&attemptId=${encodeURIComponent(result.attemptId)}&courseId=${encodeURIComponent(result.courseId || course.id)}&plan=${encodeURIComponent(result.planCode || plan?.plan_code || '')}`)
        return
      }
      if (!response.ok || !result.checkoutUrl || !result.attemptId) {
        if (String(result.error || '').startsWith('COUPON_')) {
          setAppliedCoupon(null)
          toast.error('تعذّر استخدام كود الخصم. تحقّق منه ثم طبّقه مرة أخرى')
          return
        }
        const message = result.error === 'PAYMENT_NOT_CONFIGURED'
          ? 'بوابة الدفع قيد التجهيز، حاول بعد قليل'
          : result.error === 'STUDENT_ACCOUNT_REQUIRED'
            ? 'الدفع متاح من حساب الطالب فقط'
            : result.error === 'PAYMENT_CURRENCY_MISMATCH'
              ? 'عملة الباقة غير متوافقة مع بوابة الدفع'
              : result.error === 'PLAN_NOT_FOUND'
                ? 'هذه الباقة غير متاحة حاليًا'
                : 'تعذّر بدء عملية الدفع، حاول مرة أخرى'
        toast.error(message)
        return
      }

      sessionStorage.setItem('paymob_attempt_id', result.attemptId)
      sessionStorage.setItem('paymob_course_id', result.courseId || course.id)
      sessionStorage.setItem('paymob_plan_code', result.planCode || plan?.plan_code || '')
      window.location.assign(result.checkoutUrl)
    } catch {
      toast.error('تعذّر الاتصال ببوابة الدفع، تحقق من الإنترنت وحاول مجددًا')
    } finally {
      setPaymentLoading(false)
    }
  }

  const originalPrice = useMemo(() => plan
    ? Number(plan.web_price_minor) / 100
    : Number(course?.price) || 0, [plan, course])
  const currency = plan?.web_currency || course?.currency || 'EGP'
  const discountAmount = appliedCoupon ? originalPrice * appliedCoupon.percent / 100 : 0
  const totalPrice = Math.max(0, originalPrice - discountAmount)
  const formatPrice = (value: number) => value.toLocaleString('ar-EG', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
  const processingPrice = paymentQuote ? paymentQuote.processingAmountMinor / 100 : null
  const processingCurrencyLabel = paymentQuote?.processingCurrency === 'EGP'
    ? 'ج.م'
    : paymentQuote?.processingCurrency || ''

  if (loading || authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )
  if (!course) return null

  const backTo = plan ? '/#qm-prices' : `/courses/${course.id}`
  const title = plan ? `باقة ${plan.name_ar}` : course.title

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-right">
          <Link to={backTo} className="text-brand-pink text-sm font-bold hover:underline">← العودة</Link>
          <h1 className="text-3xl font-black text-brand-navy mt-2">إتمام الاشتراك</h1>
          {plan && <p className="mt-2 text-sm text-gray-500">اشتراك لمدة {plan.duration_months} {plan.duration_months === 1 ? 'شهر' : 'أشهر'} يفتح جميع كورسات المنصة المدفوعة.</p>}
        </div>

        {currentExpiry && plan && (
          <div className="mb-5 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4 text-right text-sm font-bold text-brand-navy">
            لديك اشتراك نشط حتى {new Date(currentExpiry).toLocaleDateString('ar-EG')}، وستُضاف مدة الباقة الجديدة إلى مدته الحالية.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock size={18} className="text-brand-pink" />
              <h2 className="text-lg font-black text-brand-navy">الدفع الآمن</h2>
              <span className="text-xs text-gray-400 mr-auto">مشفّر وآمن ١٠٠٪</span>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-6 text-right">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-purple-100 flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} className="text-brand-purple" />
                </div>
                <div>
                  <h3 className="font-black text-brand-navy mb-1">أكمل الدفع عبر Paymob</h3>
                  <p className="text-sm text-gray-500 leading-7">ستنتقل إلى صفحة Paymob المؤمّنة لإتمام العملية، ثم تعود للمنصة تلقائيًا.</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-right">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-brand-purple"><TicketPercent size={19} /></span>
                  <div>
                    <h3 className="text-sm font-black text-brand-navy">لديك كود خصم ؟</h3>
                    <p className="mt-0.5 text-xs leading-5 text-gray-400">اكتبه قبل الدفع لتفعيل العرض المخصص لحسابك.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={couponCode}
                    onChange={(event) => { setCouponCode(event.target.value); if (appliedCoupon) setAppliedCoupon(null) }}
                    onKeyDown={(event) => event.key === 'Enter' && void handleApplyCoupon()}
                    placeholder="اكتب كود الخصم"
                    aria-label="كود الخصم"
                    dir="auto"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-gray-200 px-4 text-start text-sm font-bold uppercase outline-none transition focus:border-brand-purple focus:ring-4 focus:ring-purple-100"
                  />
                  <button type="button" onClick={() => void handleApplyCoupon()} disabled={redeeming || !couponCode.trim()} className="h-12 shrink-0 rounded-xl bg-brand-navy px-7 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                    {redeeming ? 'جاري التحقق...' : 'تطبيق الكود'}
                  </button>
                </div>
                {appliedCoupon && <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-center text-xs font-black text-green-700">تم تطبيق خصم {appliedCoupon.percent}% على هذه الباقة</p>}
              </div>

              <button type="button" onClick={() => void handleStartPayment()} disabled={paymentLoading || quoteLoading || (totalPrice > 0 && !paymentQuote)} className="qm-primary w-full mt-6 py-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed">
                {paymentLoading ? 'جاري تجهيز الدفع...' : <>ادفع الآن {formatPrice(totalPrice)} <CurrencySymbol currency={currency} /></>}
              </button>
              <div className="mt-3 min-h-6 text-center text-sm font-bold">
                {quoteLoading && <span className="text-gray-500">جاري حساب المبلغ بالجنيه المصري...</span>}
                {!quoteLoading && paymentQuote && processingPrice !== null && (
                  <span className="text-brand-navy">
                    سيُخصم عبر Paymob مبلغ <b className="text-brand-purple">{formatPrice(processingPrice)} {processingCurrencyLabel}</b>، بما يعادل {formatPrice(paymentQuote.displayAmountMinor / 100)} <CurrencySymbol currency={paymentQuote.displayCurrency} />.
                  </span>
                )}
                {!quoteLoading && quoteError && <span className="text-red-600">تعذّر حساب المبلغ بالجنيه المصري. حدّث الصفحة ثم حاول مرة أخرى.</span>}
              </div>
            </div>
            <p className="mt-5 text-xs text-gray-400 leading-6 text-right">لا تحفظ المنصة بيانات بطاقتك. تتم معالجة بيانات الدفع بالكامل داخل بوابة Paymob الآمنة.</p>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h2 className="text-lg font-black text-brand-navy mb-5 text-right">ملخص الطلب</h2>
              <div className="rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                {(course as Course & { thumbnail_url?: string }).thumbnail_url
                  ? <img src={(course as Course & { thumbnail_url?: string }).thumbnail_url} alt={title} className="w-full h-full object-contain bg-black" />
                  : <div className="gradient-bg w-full h-full flex items-center justify-center"><span className="text-white font-black text-center px-4 text-sm">{title}</span></div>}
              </div>
              <h3 className="mb-4 text-right font-black text-brand-navy">{title}</h3>
              <div className="space-y-3 text-sm text-right">
                <div className="flex justify-between items-center"><span className="font-black text-brand-navy">{formatPrice(originalPrice)} <CurrencySymbol currency={currency} /></span><span className="text-gray-500">سعر الباقة</span></div>
                {appliedCoupon && <div className="flex justify-between items-center text-green-600"><span className="font-bold">− {formatPrice(discountAmount)} <CurrencySymbol currency={currency} /></span><span>خصم الكود ({appliedCoupon.percent}%)</span></div>}
                <div className="flex justify-between items-center text-green-600"><span className="font-bold">مجانًا</span><span>ضريبة القيمة المضافة</span></div>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center"><span className="font-black text-xl gradient-text">{formatPrice(totalPrice)} <CurrencySymbol currency={currency} /></span><span className="font-black text-brand-navy">الإجمالي</span></div>
                {paymentQuote && processingPrice !== null && (
                  <div className="rounded-xl bg-purple-50 px-3 py-3 flex justify-between items-center gap-3">
                    <span className="font-black text-brand-purple whitespace-nowrap">{formatPrice(processingPrice)} {processingCurrencyLabel}</span>
                    <span className="text-xs font-bold text-brand-navy">المبلغ الفعلي الذي سيُخصم عبر Paymob</span>
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center gap-2 text-gray-400 text-xs justify-center"><ShieldCheck size={14} /><span>مدفوعات آمنة عبر Paymob</span></div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-center text-xs text-gray-400 font-semibold mb-3">وسائل الدفع المقبولة</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[['visa.png', 'Visa'], ['mastercard.png', 'Mastercard'], ['apple-pay.png', 'Apple Pay'], ['paymob.png', 'Paymob']].map(([file, alt]) => (
                    <span key={file} className="h-9 px-3 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-lg"><img src={`/payments/${file}`} alt={alt} loading="lazy" className="h-4 w-auto object-contain" /></span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
