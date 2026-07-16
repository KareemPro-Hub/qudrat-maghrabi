import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const enrollmentId = searchParams.get('enrollmentId')
  const courseId = searchParams.get('courseId')
  const paymentId = searchParams.get('id')
  const status = searchParams.get('status')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (enrollmentId && status === 'paid') {
      activateEnrollment()
    } else {
      setDone(true)
    }
  }, [])

  async function activateEnrollment() {
    // تفعيل الاشتراك
    await supabase
      .from('enrollments')
      .update({ payment_status: 'paid' })
      .eq('id', enrollmentId!)

    // جلب بيانات الطالب والكورس لإرسال الإيميل
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*, profiles(full_name, email), courses(title)')
      .eq('id', enrollmentId!)
      .single()

    if (enrollment?.profiles?.email) {
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: enrollment.profiles.email,
            type: 'enrollment',
            data: {
              studentName: enrollment.profiles.full_name,
              courseName: enrollment.courses?.title,
            }
          })
        })
      } catch (e) {
        // الإيميل اختياري — مش هيوقف التفعيل لو فشل
        console.log('Email notification skipped')
      }
    }

    setDone(true)
  }

  if (!done) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #2D174B 0%, #3D1070 100%)' }}>
      <div className="bg-white rounded-3xl shadow-brand-lg p-10 max-w-md w-full text-center">

        <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-white" />
        </div>

        <h1 className="text-2xl font-black text-brand-navy mb-2">تم الاشتراك بنجاح ! 🎉</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          مبروك ! تم تفعيل الكورس في حسابك. تحقق من بريدك للتأكيد.
        </p>

        {paymentId && (
          <p className="text-xs text-gray-400 mb-6">رقم العملية: <span className="font-mono">{paymentId}</span></p>
        )}

        <div className="space-y-3">
          {courseId && (
            <Link to={`/learn/${courseId}`} className="btn-primary w-full py-4 text-lg block text-center">
              ابدأ الدراسة الآن ←
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
