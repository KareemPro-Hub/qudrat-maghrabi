import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Lock, TicketPercent } from 'lucide-react'
import CurrencySymbol from '../components/CurrencySymbol'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Course } from '../types'
import toast from 'react-hot-toast'

export default function Checkout() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }
    if (!authLoading && user && courseId) {
      fetchCourse()
    }
  }, [user, authLoading, courseId])

  async function fetchCourse() {
    const { data } = await supabase.from('courses').select('*').eq('id', courseId).single()
    if (!data) { navigate('/courses'); return }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id, payment_status')
      .eq('student_id', user!.id)
      .eq('course_id', courseId!)
      .single()

    if (existing?.payment_status === 'paid') {
      toast('أنت مشترك بالفعل في هذا الكورس')
      navigate(`/learn/${courseId}`)
      return
    }

    setCourse(data)
    setLoading(false)
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim() || !courseId) return
    setRedeeming(true)
    const { data, error } = await supabase.rpc('redeem_discount_code', { p_code: couponCode.trim(), p_course_id: courseId })
    setRedeeming(false)
    if (error) {
      toast.error('حدث خطأ أثناء تطبيق الكود، حاول مرة أخرى')
      return
    }
    if (data?.success) {
      toast.success('تم تفعيل الكود ✅ جاري تفعيل اشتراكك مجانًا')
      navigate(`/payment/success?source=coupon&courseId=${courseId}`)
    } else {
      toast.error(data?.message || 'كود الخصم غير صالح')
    }
  }

  async function handleStartPayment() {
    if (!courseId || paymentLoading) return
    setPaymentLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      const response = await fetch('/api/paymob/create-intention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ courseId }),
      })
      const result = await response.json().catch(() => ({}))

      if (response.status === 409 && result.error === 'ALREADY_ENROLLED') {
        toast('أنت مشترك بالفعل في هذا الكورس')
        navigate(`/learn/${courseId}`)
        return
      }
      if (!response.ok || !result.checkoutUrl || !result.attemptId) {
        const message = result.error === 'PAYMENT_NOT_CONFIGURED'
          ? 'بوابة الدفع قيد التجهيز، حاول بعد قليل'
          : result.error === 'STUDENT_ACCOUNT_REQUIRED'
            ? 'الدفع متاح من حساب الطالب'
            : result.error === 'PAYMENT_CURRENCY_MISMATCH'
              ? 'عملة الكورس غير متوافقة مع بوابة الدفع، تواصل مع إدارة المنصة'
            : 'تعذّر بدء عملية الدفع، حاول مرة أخرى'
        toast.error(message)
        return
      }

      sessionStorage.setItem('paymob_attempt_id', result.attemptId)
      sessionStorage.setItem('paymob_course_id', courseId)
      window.location.assign(result.checkoutUrl)
    } catch {
      toast.error('تعذّر الاتصال ببوابة الدفع، تحقق من الإنترنت وحاول مجددًا')
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading || authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )

  if (!course) return null

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">

        <div className="mb-8 text-right">
          <Link to={`/courses/${courseId}`} className="text-brand-pink text-sm font-bold hover:underline">
            ← العودة للكورس
          </Link>
          <h1 className="text-3xl font-black text-brand-navy mt-2">إتمام الاشتراك</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Payment Form */}
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
                  <p className="text-sm text-gray-500 leading-7">
                    ستنتقل إلى صفحة Paymob المؤمّنة لاختيار وسيلة الدفع المناسبة وإتمام العملية، ثم تعود للمنصة تلقائيًا.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-right">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-brand-purple">
                    <TicketPercent size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-brand-navy">لديك كود خصم؟</h3>
                    <p className="mt-0.5 text-xs leading-5 text-gray-400">اكتبه قبل الدفع لتفعيل العرض المخصص لحسابك.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder="اكتب كود الخصم"
                    aria-label="كود الخصم"
                    dir="auto"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-gray-200 px-4 text-start text-sm font-bold uppercase outline-none transition focus:border-brand-purple focus:ring-4 focus:ring-purple-100"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={redeeming || !couponCode.trim()}
                    className="h-12 shrink-0 rounded-xl bg-brand-navy px-7 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {redeeming ? 'جاري التحقق...' : 'تطبيق الكود'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartPayment}
                disabled={paymentLoading}
                className="qm-primary w-full mt-6 py-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {paymentLoading ? 'جاري تجهيز الدفع...' : (
                  <>
                    ادفع الآن {course.price} <CurrencySymbol currency={course.currency} />
                  </>
                )}
              </button>
            </div>

            <p className="mt-5 text-xs text-gray-400 leading-6 text-right">
              لا تحفظ المنصة بيانات بطاقتك. تتم معالجة بيانات الدفع بالكامل داخل بوابة Paymob الآمنة.
            </p>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h2 className="text-lg font-black text-brand-navy mb-5 text-right">ملخص الطلب</h2>

              <div className="rounded-xl overflow-hidden mb-4" style={{aspectRatio: '16/9'}}>
                {(course as any).thumbnail_url ? (
                  <img src={(course as any).thumbnail_url} alt={course.title} className="w-full h-full object-contain bg-black" />
                ) : (
                  <div className="gradient-bg w-full h-full flex items-center justify-center">
                    <span className="text-white font-black text-center px-4 text-sm">{course.title}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm text-right">
                <div className="flex justify-between items-center">
                  <span className="font-black text-brand-navy">{course.price} <CurrencySymbol currency={course.currency} /></span>
                  <span className="text-gray-500">سعر الكورس</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-bold">مجانًا</span>
                  <span>ضريبة القيمة المضافة</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                  <span className="font-black text-xl gradient-text">{course.price} <CurrencySymbol currency={course.currency} /></span>
                  <span className="font-black text-brand-navy">الإجمالي</span>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-gray-400 text-xs justify-center">
                <ShieldCheck size={14} />
                <span>مدفوعات آمنة عبر Paymob</span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-center text-xs text-gray-400 font-semibold mb-3">وسائل الدفع المقبولة</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    ['visa.png', 'Visa'], ['mastercard.png', 'Mastercard'], ['apple-pay.png', 'Apple Pay'],
                    ['paymob.png', 'Paymob'],
                  ].map(([file, alt]) => (
                    <span key={file} className="h-9 px-3 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-lg">
                      <img src={`/payments/${file}`} alt={alt} loading="lazy" className="h-4 w-auto object-contain" />
                    </span>
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
