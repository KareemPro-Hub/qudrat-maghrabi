import { useSearchParams, Link } from 'react-router-dom'
import { XCircle } from 'lucide-react'

export default function PaymentFailed() {
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1B1B5E 0%, #3D1070 100%)' }}>
      <div className="bg-white rounded-3xl shadow-brand-lg p-10 max-w-md w-full text-center">

        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-black text-brand-navy mb-2">فشلت عملية الدفع</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          لم تتم عملية الدفع. يمكنك المحاولة مجدداً أو التواصل مع الدعم.
        </p>

        <div className="space-y-3">
          {courseId && (
            <Link to={`/checkout/${courseId}`} className="btn-primary w-full py-4 text-lg block text-center">
              حاول مجدداً
            </Link>
          )}
          <Link to="/courses" className="btn-outline w-full py-3 block text-center">
            العودة للكورسات
          </Link>
        </div>
      </div>
    </div>
  )
}
