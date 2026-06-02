import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Lock } from 'lucide-react'
import SarSymbol from '../components/SarSymbol'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Course } from '../types'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    Moyasar: any
  }
}

export default function Checkout() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [moyasarReady, setMoyasarReady] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }
    if (!authLoading && user && courseId) {
      fetchCourse()
    }
  }, [user, authLoading, courseId])

  useEffect(() => {
    if (course && enrollmentId && !moyasarReady) {
      loadMoyasar()
    }
  }, [course, enrollmentId])

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

    // Create or reuse pending enrollment
    let eid = existing?.id
    if (!eid) {
      const { data: newEnrollment } = await supabase
        .from('enrollments')
        .insert({ student_id: user!.id, course_id: courseId!, payment_status: 'pending', amount_paid: data.price })
        .select('id')
        .single()
      eid = newEnrollment?.id
    }

    setCourse(data)
    setEnrollmentId(eid || null)
    setLoading(false)
  }

  function loadMoyasar() {
    if (!course || !enrollmentId) return

    // Load Moyasar CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.moyasar.com/mpf/1.14.1/moyasar.css'
    document.head.appendChild(link)

    // Load Moyasar JS
    const script = document.createElement('script')
    script.src = 'https://cdn.moyasar.com/mpf/1.14.1/moyasar.js'
    script.onload = () => {
      setMoyasarReady(true)
      window.Moyasar.init({
        element: '.moyasar-form',
        amount: course.price * 100, // halalas
        currency: 'SAR',
        description: course.title,
        publishable_api_key: import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY || 'pk_test_your_key_here',
        callback_url: `${window.location.origin}/payment/success?enrollmentId=${enrollmentId}&courseId=${courseId}`,
        methods: ['creditcard', 'stcpay'],
        on_failure: () => {
          window.location.href = `${window.location.origin}/payment/failed?courseId=${courseId}`
        }
      })
    }
    document.body.appendChild(script)
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
              <h2 className="text-lg font-black text-brand-navy">بيانات الدفع</h2>
              <span className="text-xs text-gray-400 mr-auto">مشفّر وآمن ١٠٠٪</span>
            </div>

            {/* Moyasar Form Container */}
            <div className="moyasar-form"></div>

            {!moyasarReady && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="w-8 h-8 rounded-full border-4 border-brand-pink border-t-transparent animate-spin mb-3" />
                <p className="text-sm font-semibold">جاري تحميل نموذج الدفع...</p>
              </div>
            )}
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
                  <span className="font-black text-brand-navy">{course.price} <SarSymbol /></span>
                  <span className="text-gray-500">سعر الكورس</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-bold">مجانًا</span>
                  <span>ضريبة القيمة المضافة</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                  <span className="font-black text-xl gradient-text">{course.price} <SarSymbol /></span>
                  <span className="font-black text-brand-navy">الإجمالي</span>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-gray-400 text-xs justify-center">
                <ShieldCheck size={14} />
                <span>مدفوعات آمنة عبر Moyasar</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
