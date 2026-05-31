import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase يتعامل مع الـ hash تلقائياً عند فتح الصفحة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        toast('أدخل كلمة مرور جديدة', { icon: '🔐' })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !confirm) return toast.error('يرجى تعبئة جميع الحقول')
    if (password !== confirm) return toast.error('كلمتا المرور غير متطابقتين')
    if (password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('حدث خطأ، حاول مجدداً')
    } else {
      toast.success('تم تغيير كلمة المرور بنجاح ✅')
      navigate('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #1B1B5E 0%, #3D1070 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-brand-lg p-8 md:p-10">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="قدرات المغربي" className="h-16 w-auto object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-black text-brand-navy">تعيين كلمة مرور جديدة</h1>
            <p className="text-gray-500 text-sm mt-1">أدخل كلمة مرور قوية وسهلة التذكر</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">كلمة المرور الجديدة</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="٨ أحرف على الأقل"
                  className="input-field pr-10 pl-10"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="input-field pr-10"
                  dir="ltr"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg mt-2">
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة ←'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
