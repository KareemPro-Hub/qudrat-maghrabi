import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type LinkStatus = 'checking' | 'ready' | 'invalid'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('checking')
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') {
        toast('أدخل كلمة مرور جديدة', { icon: '🔐' })
      }
      if (session) setLinkStatus('ready')
    })

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return
      setLinkStatus(!error && session ? 'ready' : 'invalid')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !confirm) return toast.error('يرجى تعبئة جميع الحقول')
    if (password !== confirm) return toast.error('كلمتا المرور غير متطابقتين')
    if (password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLinkStatus('invalid')
      toast.error('رابط تعيين كلمة المرور غير صالح أو انتهت صلاحيته')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message.toLowerCase().includes('same password')
        ? 'اختر كلمة مرور مختلفة عن كلمة المرور الحالية'
        : 'تعذّر حفظ كلمة المرور، حاول مجددًا')
    } else {
      toast.success('تم تغيير كلمة المرور بنجاح ✅')
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      const adminRoles = ['admin', 'teacher', 'content_manager', 'student_manager', 'quiz_manager']
      if (profile && adminRoles.includes(profile.role)) navigate('/admin')
      else if (profile?.role === 'parent') navigate('/login')
      else navigate('/dashboard')
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
            <h1 className="text-2xl font-black text-brand-navy">تعيين كلمة مرور جديدة</h1>
            <p className="text-gray-500 text-sm mt-1">
              {linkStatus === 'invalid' ? 'رابط تعيين كلمة المرور غير صالح أو انتهت صلاحيته' : 'أدخل كلمة مرور قوية وسهلة التذكر'}
            </p>
          </div>

          {linkStatus === 'checking' ? (
            <div className="py-10 flex justify-center" aria-label="جاري التحقق من الرابط">
              <div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
            </div>
          ) : linkStatus === 'invalid' ? (
            <div className="space-y-3">
              <Link to="/forgot-password" className="btn-primary w-full py-4 text-lg text-center block">
                طلب رابط جديد
              </Link>
              <Link to="/login" className="block text-center text-brand-purple font-bold">
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}
