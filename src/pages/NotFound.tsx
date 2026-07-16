import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center py-16">
      <div className="max-w-lg mx-auto px-4 text-center">
        <div className="text-7xl font-black gradient-text mb-4">404</div>
        <h1 className="text-2xl font-black text-brand-navy mb-3">الصفحة غير موجودة</h1>
        <p className="text-gray-500 mb-8">
          الرابط اللي فتحته مش موجود أو اتنقل لمكان تاني. تقدر ترجع للرئيسية أو تتصفح الكورسات.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/" className="btn-primary py-3 px-6">الرئيسية</Link>
          <Link to="/courses" className="btn-outline py-3 px-6">الكورسات</Link>
        </div>
      </div>
    </div>
  )
}
