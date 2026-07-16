import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error('أدخل بريدك الإلكتروني')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast.error('حدث خطأ، تحقق من البريد الإلكتروني')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #2D174B 0%, #3D1070 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-brand-lg p-8 md:p-10">

          <div className="text-center mb-8">
            <img src="/logo.png" alt="قدرات المغربي" className="h-16 w-auto object-contain mx-auto mb-4" />
            {!sent ? (
              <>
                <h1 className="text-2xl font-black text-brand-navy">نسيت كلمة المرور ؟</h1>
                <p className="text-gray-500 text-sm mt-1">أدخل بريدك وهنبعتلك رابط إعادة التعيين</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-brand-navy">تم الإرسال !</h1>
                <p className="text-gray-500 text-sm mt-1">تحقق من بريدك الإلكتروني واضغط على الرابط</p>
              </>
            )}
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="input-field pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
                {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-6">
                لم يصلك الإيميل ؟{' '}
                <button onClick={() => setSent(false)} className="text-brand-pink font-bold hover:underline">
                  حاول مجددًا
                </button>
              </p>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="font-bold text-brand-pink hover:underline flex items-center justify-center gap-1">
              <ArrowRight size={14} /> العودة لتسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
