import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' })
  const [role, setRole] = useState<'student' | 'parent'>('student')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) return toast.error('يرجى تعبئة جميع الحقول المطلوبة')
    if (form.password !== form.confirm) return toast.error('كلمتا المرور غير متطابقتين')
    if (form.password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, role },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      toast.error(error.message === 'User already registered' ? 'البريد الإلكتروني مسجل مسبقاً' : 'حدث خطأ، حاول مجدداً')
    } else {
      toast.success('تم التسجيل! تحقق من بريدك لتأكيد الحساب')
      navigate('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{background: 'linear-gradient(135deg, #2D174B 0%, #3D1070 100%)'}}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-brand-lg p-8 md:p-10">

          {/* Logo */}
          <div className="text-center mb-6">
            <img src="/logo.png" alt="قدرات المغربي" className="h-16 w-auto object-contain mx-auto mb-3" />
            <h1 className="text-2xl font-black text-brand-navy">إنشاء حساب جديد</h1>
            <p className="text-gray-500 text-sm mt-1">ابدأ رحلتك نحو التفوق في القدرات</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                role === 'student'
                  ? 'border-brand-pink bg-pink-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'student' ? 'gradient-bg' : 'bg-gray-100'}`}>
                <GraduationCap size={20} className={role === 'student' ? 'text-white' : 'text-gray-400'} />
              </div>
              <span className={`text-sm font-black ${role === 'student' ? 'text-brand-pink' : 'text-gray-500'}`}>طالب</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('parent')}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                role === 'parent'
                  ? 'border-brand-purple bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'parent' ? 'bg-brand-purple' : 'bg-gray-100'}`}>
                <Users size={20} className={role === 'parent' ? 'text-white' : 'text-gray-400'} />
              </div>
              <span className={`text-sm font-black ${role === 'parent' ? 'text-brand-purple' : 'text-gray-500'}`}>ولي أمر</span>
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">

            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">الاسم الكامل <span className="text-brand-pink">*</span></label>
              <div className="relative">
                <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="full_name" type="text" value={form.full_name} onChange={handleChange} placeholder="محمد أحمد" className="input-field pr-10" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">البريد الإلكتروني <span className="text-brand-pink">*</span></label>
              <div className="relative">
                <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="example@email.com" className="input-field pr-10" dir="ltr" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">رقم الجوال</label>
              <div className="relative">
                <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="05xxxxxxxx" className="input-field pr-10" dir="ltr" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">كلمة المرور <span className="text-brand-pink">*</span></label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="٨ أحرف على الأقل" className="input-field pr-10 pl-10" dir="ltr" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">تأكيد كلمة المرور <span className="text-brand-pink">*</span></label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="أعد كتابة كلمة المرور" className="input-field pr-10" dir="ltr" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full text-center py-4 text-lg mt-2">
              {loading ? 'جاري التسجيل...' : 'إنشاء الحساب ←'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="font-bold text-brand-pink hover:underline">تسجيل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
