import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap, Users, LogIn, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type Mode = 'login' | 'signup'
type SocialProvider = 'google' | 'facebook' | 'apple'

const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple',
}

type LoginError = {
  code?: string
  message?: string
  status?: number
}

function getLoginErrorMessage(error: LoginError) {
  switch (error.code) {
    case 'invalid_credentials':
      return 'بيانات الدخول غير صحيحة. تأكد من كلمة المرور أو أعد تعيينها'
    case 'email_not_confirmed':
      return 'يرجى تأكيد البريد الإلكتروني أولًا'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'محاولات كثيرة، انتظر قليلًا ثم حاول مجددًا'
    case 'user_banned':
      return 'هذا الحساب موقوف. تواصل مع إدارة المنصة'
    default:
      if (error.message?.toLowerCase().includes('fetch')) {
        return 'تعذّر الاتصال بخدمة تسجيل الدخول. تحقق من الإنترنت وحاول مجددًا'
      }
      return 'تعذّر تسجيل الدخول الآن. حاول مجددًا'
  }
}

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

  // Social auth state — provider availability is read live from Supabase so
  // these controls start working automatically once credentials are enabled.
  const [enabledSocialProviders, setEnabledSocialProviders] = useState<Record<SocialProvider, boolean> | null>(null)
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null)
  useEffect(() => {
    // reset transient state visually when switching tabs (not required functionally, keeps UX clean)
  }, [mode])

  useEffect(() => {
    let cancelled = false

    async function loadProviderAvailability() {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        })
        if (!response.ok) throw new Error(`Auth settings request failed: ${response.status}`)

        const settings = await response.json()
        if (!cancelled) {
          setEnabledSocialProviders({
            google: settings.external?.google === true,
            facebook: settings.external?.facebook === true,
            apple: settings.external?.apple === true,
          })
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Could not load social auth settings', error)
        if (!cancelled) setEnabledSocialProviders({ google: false, facebook: false, apple: false })
      }
    }

    loadProviderAvailability()
    return () => { cancelled = true }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const email = loginEmail.trim().toLowerCase()
    if (!email || !loginPassword) return toast.error('يرجى تعبئة جميع الحقول')

    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      })

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Login failed', { code: error.code, status: error.status })
        }
        toast.error(getLoginErrorMessage(error))
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user!.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        toast.error('تم التحقق من الحساب لكن تعذّر تحديد صلاحياته. حاول مجددًا')
        return
      }

      toast.success('مرحبًا بك !')
      const adminRoles = ['admin', 'teacher', 'content_manager', 'student_manager', 'quiz_manager']
      if (adminRoles.includes(profile.role)) {
        navigate('/admin')
      } else if (profile.role === 'parent') {
        navigate('/parent')
      } else {
        navigate('/dashboard')
      }
    } catch {
      toast.error('تعذّر الاتصال بخدمة تسجيل الدخول. حاول مجددًا')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) return toast.error('يرجى تعبئة جميع الحقول المطلوبة')
    if (form.password !== form.confirm) return toast.error('كلمتا المرور غير متطابقتين')
    if (form.password.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    if (!agreeTerms) return toast.error('يرجى الموافقة على الشروط وسياسة الخصوصية')

    setSignupLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
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

  async function handleSocialLogin(provider: SocialProvider) {
    const label = SOCIAL_PROVIDER_LABELS[provider]

    if (!enabledSocialProviders) {
      toast('جارٍ تجهيز خيارات تسجيل الدخول، حاول بعد لحظة', { icon: '⏳' })
      return
    }

    if (!enabledSocialProviders[provider]) {
      toast.error(`تسجيل الدخول عبر ${label} غير متاح حاليًا. استخدم البريد الإلكتروني وكلمة المرور`)
      return
    }

    setSocialLoading(provider)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        if (import.meta.env.DEV) console.error('Social login failed', { provider, message: error.message })
        toast.error(`تعذّر تسجيل الدخول عبر ${label}. حاول مجددًا`)
        return
      }

      if (!data.url) {
        toast.error(`تعذّر بدء تسجيل الدخول عبر ${label}. حاول مجددًا`)
      }
    } catch {
      toast.error('تعذّر الاتصال بخدمة تسجيل الدخول. تحقق من الإنترنت وحاول مجددًا')
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <div className="auth-shell" dir="rtl" data-mode={mode}>
      <div className="auth-mobile-tabs-wrap">
        <div className="auth-mobile-tabs">
          <Link to="/login" className={mode === 'login' ? 'active' : ''} aria-current={mode === 'login' ? 'page' : undefined}>
            <LogIn size={18} />
            <span>تسجيل الدخول</span>
          </Link>
          <Link to="/register" className={mode === 'signup' ? 'active' : ''} aria-current={mode === 'signup' ? 'page' : undefined}>
            <UserPlus size={18} />
            <span>إنشاء حساب</span>
          </Link>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-forms">
          {/* Signup panel */}
          <div className="auth-panel auth-panel-signup">
            <div className="auth-panel-inner">
              <Link to="/" className="auth-logo-link"><img src="/logo.png" alt="قدرات المغربي" className="auth-logo-signup" /></Link>
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
                  <button type="button" className="auth-social" onClick={() => handleSocialLogin('google')} disabled={socialLoading !== null} aria-busy={socialLoading === 'google'}><span className="auth-social-g">G</span>Google</button>
                  <button type="button" className="auth-social" onClick={() => handleSocialLogin('facebook')} disabled={socialLoading !== null} aria-busy={socialLoading === 'facebook'}><span className="auth-social-f">f</span>Facebook</button>
                  <button type="button" className="auth-social" onClick={() => handleSocialLogin('apple')} disabled={socialLoading !== null} aria-busy={socialLoading === 'apple'}>
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
              <Link to="/" className="auth-logo-link"><img src="/logo.png" alt="قدرات المغربي" className="auth-logo-login" /></Link>
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
                  <button type="button" className="auth-social" onClick={() => handleSocialLogin('google')} disabled={socialLoading !== null} aria-busy={socialLoading === 'google'}><span className="auth-social-g">G</span>Google</button>
                  <button type="button" className="auth-social" onClick={() => handleSocialLogin('facebook')} disabled={socialLoading !== null} aria-busy={socialLoading === 'facebook'}><span className="auth-social-f">f</span>Facebook</button>
                  <button type="button" className="auth-social" onClick={() => handleSocialLogin('apple')} disabled={socialLoading !== null} aria-busy={socialLoading === 'apple'}>
                      <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#090909" stroke="none" d="M16.7 12.8c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-1-3.3-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.5-3 1.5-3.1-.1 0-3.3-1.3-3.3-4.2ZM14.2 5.7c.7-.9 1.2-2.1 1.1-3.2-1.1.1-2.4.7-3.2 1.5-.7.8-1.3 2-1.2 3.1 1.2.1 2.5-.6 3.3-1.4Z" /></svg>
                      Apple
                  </button>
                </div>
              </div>

              <div className="auth-switch">
                ليس لديك حساب؟ <Link to="/register">إنشاء حساب</Link>
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
            <Link to="/login" className={`auth-tab${mode === 'login' ? ' active' : ''}`} aria-current={mode === 'login' ? 'page' : undefined}>تسجيل دخول</Link>
            <Link to="/register" className={`auth-tab${mode === 'signup' ? ' active' : ''}`} aria-current={mode === 'signup' ? 'page' : undefined}>إنشاء حساب</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
