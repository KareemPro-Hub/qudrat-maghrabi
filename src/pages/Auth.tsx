import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type Mode = 'login' | 'signup'

export default function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const mode: Mode = location.pathname === '/register' ? 'signup' : 'login'

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)

  // Signup state
  const [role, setRole] = useState<'student' | 'parent'>('student')
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' })
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)

  useEffect(() => {
    // reset transient state visually when switching tabs (not required functionally, keeps UX clean)
  }, [mode])

  function showLogin() { navigate('/login') }
  function showSignup() { navigate('/register') }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail || !loginPassword) return toast.error('يرجى تعبئة جميع الحقول')
    setLoginLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) {
      toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user!.id)
        .single()

      toast.success('مرحبًا بك !')
      const adminRoles = ['admin', 'teacher', 'content_manager', 'student_manager']
      if (profile && adminRoles.includes(profile.role)) {
        navigate('/admin')
      } else if (profile && profile.role === 'parent') {
        navigate('/parent')
      } else {
        navigate('/dashboard')
      }
    }
    setLoginLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) return toast.error('يرجى تعبئة جميع الحقول المطلوبة')
    if (form.password !== form.confirm) return toast.error('كلمتا المرور غير متطابقتين')
    if (form.password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    if (!agreeTerms) return toast.error('يرجى الموافقة على الشروط وسياسة الخصوصية')

    setSignupLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone, role },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      toast.error(error.message === 'User already registered' ? 'البريد الإلكتروني مسجل مسبقًا' : 'حدث خطأ، حاول مجددًا')
    } else {
      toast.success('تم التسجيل ! تحقق من بريدك لتأكيد الحساب')
      navigate('/login')
    }
    setSignupLoading(false)
  }

  return (
    <div className="auth-shell" dir="rtl" data-mode={mode}>
      <div className="auth-mobile-tabs-wrap">
        <div className="auth-mobile-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={showLogin}>تسجيل دخول</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={showSignup}>إنشاء حساب</button>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-forms">
          {/* Signup panel */}
          <div className="auth-panel auth-panel-signup">
            <div className="auth-panel-inner">
              <img src="/logo.png" alt="قدرات المغربي" className="auth-logo-signup" />
              <div className="auth-head">
                <h1>أنشئ حسابك</h1>
                <p>ابدأ رحلتك بثقة نحو أعلى الدرجات</p>
              </div>

              <div className="auth-role-grid">
                <button type="button" className={`auth-role${role === 'student' ? ' active' : ''}`} onClick={() => setRole('student')}>
                  <span>
                    <GraduationCap size={16} color={role === 'student' ? '#fff' : '#898091'} />
                  </span>
                  <b>طالب</b>
                </button>
                <button type="button" className={`auth-role${role === 'parent' ? ' active' : ''}`} onClick={() => setRole('parent')}>
                  <span>
                    <Users size={16} color={role === 'parent' ? '#fff' : '#898091'} />
                  </span>
                  <b>ولي أمر</b>
                </button>
              </div>

              <form onSubmit={handleRegister}>
                <div className="auth-fields">
                  <div className="auth-field full">
                    <User size={17} strokeWidth={1.9} />
                    <input name="full_name" type="text" value={form.full_name} onChange={handleChange} placeholder="محمد أحمد" />
                  </div>
                  <div className="auth-field">
                    <Mail size={17} strokeWidth={1.9} />
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="name@example.com" dir="ltr" />
                  </div>
                  <div className="auth-field">
                    <Phone size={17} strokeWidth={1.9} />
                    <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="05xxxxxxxx" dir="ltr" />
                  </div>
                  <div className="auth-field">
                    <Lock size={17} strokeWidth={1.9} />
                    <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="8 أحرف على الأقل" dir="ltr" />
                  </div>
                  <div className="auth-field">
                    <Lock size={17} strokeWidth={1.9} />
                    <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="أعد كتابة كلمة المرور" dir="ltr" />
                  </div>
                </div>

                <label className="auth-check auth-check-signup">
                  <span
                    className={`auth-check-box${agreeTerms ? ' checked' : ''}`}
                    onClick={(e) => { e.preventDefault(); setAgreeTerms(!agreeTerms) }}
                  >
                    {agreeTerms && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="auth-terms-links">
                    أوافق على <Link to="/terms" onClick={(e) => e.stopPropagation()}>الشروط</Link> و<Link to="/privacy" onClick={(e) => e.stopPropagation()}>سياسة الخصوصية</Link>
                  </span>
                </label>

                <button type="submit" className="auth-submit" disabled={signupLoading}>
                  {signupLoading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#321b42" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 7 9 12l5 5" /></svg>
                </button>
              </form>

              <div>
                <div className="auth-divider"><span /> أو تابع باستخدام <span /></div>
                <div className="auth-socials">
                  <button type="button" className="auth-social"><span className="auth-social-g">G</span>Google</button>
                  <button type="button" className="auth-social"><span className="auth-social-f">f</span>Facebook</button>
                  <button type="button" className="auth-social">
                    <svg width="19" height="19" viewBox="0 0 24 24"><path fill="#090909" stroke="none" d="M16.7 12.8c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-1-3.3-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.5-3 1.5-3.1-.1 0-3.3-1.3-3.3-4.2ZM14.2 5.7c.7-.9 1.2-2.1 1.1-3.2-1.1.1-2.4.7-3.2 1.5-.7.8-1.3 2-1.2 3.1 1.2.1 2.5-.6 3.3-1.4Z" /></svg>
                    Apple
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Login panel */}
          <div className="auth-panel auth-panel-login">
            <div className="auth-panel-inner">
              <img src="/logo.png" alt="قدرات المغربي" className="auth-logo-login" />
              <div className="auth-head">
                <h1>أهلًا بعودتك</h1>
                <p>سجّل دخولك وكمّل رحلتك نحو الـ <b>95+</b></p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="auth-fields-login">
                  <div>
                    <div className="auth-field-login-label">البريد الإلكتروني</div>
                    <div className="auth-field-login">
                      <Mail size={19} strokeWidth={1.9} />
                      <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="name@example.com" dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <div className="auth-field-login-label">كلمة المرور</div>
                    <div className="auth-field-login">
                      <Lock size={19} strokeWidth={1.9} />
                      <input type={showLoginPass ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="أدخل كلمة المرور" dir="ltr" />
                      <button type="button" onClick={() => setShowLoginPass(!showLoginPass)}>
                        {showLoginPass ? <EyeOff size={19} strokeWidth={1.9} /> : <Eye size={19} strokeWidth={1.9} />}
                      </button>
                    </div>
                  </div>
                  <div className="auth-remember-row">
                    <label className="auth-check">
                      <span
                        className={`auth-check-box${remember ? ' checked' : ''}`}
                        onClick={(e) => { e.preventDefault(); setRemember(!remember) }}
                      >
                        {remember && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      تذكّرني
                    </label>
                    <Link to="/forgot-password" className="auth-forgot">نسيت كلمة المرور؟</Link>
                  </div>
                  <button type="submit" className="auth-submit" disabled={loginLoading}>
                    {loginLoading ? 'جاري الدخول...' : 'تسجيل دخول'}
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#321b42" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 7 9 12l5 5" /></svg>
                  </button>
                </div>
              </form>

              <div>
                <div className="auth-divider"><span /> أو تابع باستخدام <span /></div>
                <div className="auth-socials">
                  <button type="button" className="auth-social"><span className="auth-social-g">G</span>Google</button>
                  <button type="button" className="auth-social"><span className="auth-social-f">f</span>Facebook</button>
                  <button type="button" className="auth-social">
                    <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#090909" stroke="none" d="M16.7 12.8c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-1-3.3-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.5-3 1.5-3.1-.1 0-3.3-1.3-3.3-4.2ZM14.2 5.7c.7-.9 1.2-2.1 1.1-3.2-1.1.1-2.4.7-3.2 1.5-.7.8-1.3 2-1.2 3.1 1.2.1 2.5-.6 3.3-1.4Z" /></svg>
                    Apple
                  </button>
                </div>
              </div>

              <div className="auth-switch">
                ليس لديك حساب؟ <a onClick={showSignup}>إنشاء حساب</a>
              </div>
            </div>
          </div>
        </div>

        {/* Visual overlay with open-capsule notch */}
        <div className="auth-visual">
          <img src="/auth/auth-student-clean.png" alt="طالب يستعد لاختبار القدرات" className="auth-visual-img" />
          <div className="auth-visual-tint" />
          <div className="auth-notch" />
          <div className="auth-tabs">
            <button type="button" className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={showLogin}>تسجيل دخول</button>
            <button type="button" className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={showSignup}>إنشاء حساب</button>
          </div>
        </div>
      </div>
    </div>
  )
}
