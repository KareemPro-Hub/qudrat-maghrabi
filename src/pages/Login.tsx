import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error('يرجى تعبئة جميع الحقول')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } else {
      // جلب الـ role وتوجيه المستخدم للمكان الصح
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user!.id)
        .single()

      toast.success('مرحباً بك!')
      const adminRoles = ['admin', 'teacher', 'content_manager', 'student_manager']
      if (profile && adminRoles.includes(profile.role)) {
        navigate('/admin')
      } else if (profile && profile.role === 'parent') {
        navigate('/parent')
      } else {
        navigate('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{background: 'linear-gradient(135deg, #1B1B5E 0%, #3D1070 100%)'}}>
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-brand-lg p-8 md:p-10">

          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="قدرات المغربي" className="h-20 w-auto object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-brand-navy">تسجيل الدخول</h1>
            <p className="text-gray-500 text-sm mt-1">أهلاً بعودتك في منصة قدرات المغربي</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10 pl-10"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-pink">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => setRemember(!remember)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer
                    ${remember ? 'border-brand-pink' : 'border-gray-300'}`}
                  style={remember ? {background: 'linear-gradient(135deg, #FF8008, #E91E8C)'} : {}}
                >
                  {remember && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-600">تذكرني</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-brand-pink hover:underline font-semibold">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full text-center py-4 text-lg mt-2">
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="font-bold text-brand-pink hover:underline">
              سجّل الآن
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
