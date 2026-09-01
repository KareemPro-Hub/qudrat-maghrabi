import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { User, Phone, Mail, Save, Lock, Trash2, AlertTriangle, Fingerprint } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isPasskeySupported, passkeyErrorMessage } from '../lib/passkeys'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const DELETE_CONFIRM_PHRASE = 'حذف حسابي'
// الحذف الذاتي متاح لحسابات المستخدمين النهائيين فقط ، أما حسابات الإدارة
// وفريق العمل فتُدار عبر الدعم حتى لا يُترك محتوى المنصة بلا مالك.
const SELF_DELETABLE_ROLES = ['student', 'parent']

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple',
  azure: 'Microsoft',
  twitter: 'X',
}

type LoginIdentitySource = {
  identities?: { provider?: string }[] | null
  app_metadata?: { provider?: string; providers?: string[] } | null
}

// استخراج مزوّدي تسجيل الدخول المرتبطين بالحساب من الجلسة الحالية.
export function resolveLoginProviders(source: LoginIdentitySource | null | undefined): string[] {
  const fromIdentities = (source?.identities ?? [])
    .map(identity => identity?.provider)
    .filter((provider): provider is string => !!provider)
  if (fromIdentities.length) return fromIdentities

  const metadataProviders = source?.app_metadata?.providers
  if (Array.isArray(metadataProviders) && metadataProviders.length) {
    return metadataProviders.filter(provider => !!provider)
  }

  const singleProvider = source?.app_metadata?.provider
  return singleProvider ? [singleProvider] : []
}

// حسابات البريد وكلمة المرور تُؤكَّد بكلمة المرور ، وحسابات الدخول الاجتماعي
// لا تملك كلمة مرور فتُؤكَّد بكتابة البريد المرتبط بالحساب.
// عند تعذّر تحديد المزوّد نطلب كلمة المرور احتياطًا وهو الخيار الأكثر تحفظًا.
export function requiresPasswordConfirmation(providers: string[]): boolean {
  if (!providers.length) return true
  return providers.includes('email')
}

export function describeSocialProviders(providers: string[]): string {
  const labels = providers
    .filter(provider => provider !== 'email')
    .map(provider => PROVIDER_LABELS[provider] || provider)
  return labels.length ? labels.join(' و') : 'مزوّد خارجي'
}

export default function Profile() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteForm, setDeleteForm] = useState({ password: '', email: '', phrase: '' })
  const [deleting, setDeleting] = useState(false)
  const [passkeys, setPasskeys] = useState<{ id: string; friendly_name?: string; created_at: string }[]>([])
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const passkeyAvailable = isPasskeySupported()

  const loadPasskeys = useCallback(async () => {
    if (!passkeyAvailable) return
    try {
      const { data, error } = await supabase.auth.passkey.list()
      if (!error && data) setPasskeys(data)
    } catch {
      // القائمة تحسين إضافي فقط، مفيش داعي نكسر الصفحة لو فشلت
    }
  }, [passkeyAvailable])

  useEffect(() => {
    if (user) void loadPasskeys()
  }, [user, loadPasskeys])

  async function handleAddPasskey() {
    if (passkeyBusy) return
    setPasskeyBusy(true)
    try {
      const { error } = await supabase.auth.registerPasskey()
      if (error) {
        const message = passkeyErrorMessage(error, 'تعذّر تفعيل الدخول بالبصمة. حاول مجددًا')
        if (message) toast.error(message)
        return
      }
      toast.success('تم تفعيل الدخول بالبصمة على هذا الجهاز !')
      await loadPasskeys()
    } catch (error) {
      const message = passkeyErrorMessage(error, 'تعذّر تفعيل الدخول بالبصمة. حاول مجددًا')
      if (message) toast.error(message)
    } finally {
      setPasskeyBusy(false)
    }
  }

  async function handleRemovePasskey(passkeyId: string) {
    if (passkeyBusy) return
    setPasskeyBusy(true)
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId })
      if (error) {
        toast.error('تعذّر حذف البصمة. حاول مجددًا')
        return
      }
      toast.success('تم حذف البصمة')
      await loadPasskeys()
    } catch {
      toast.error('تعذّر حذف البصمة. حاول مجددًا')
    } finally {
      setPasskeyBusy(false)
    }
  }

  if (!initialized && profile) {
    setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
    setInitialized(true)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" />

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name) return toast.error('الاسم مطلوب')
    setSavingProfile(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name, phone: form.phone })
      .eq('id', user!.id)
    if (error) toast.error('حدث خطأ')
    else toast.success('تم حفظ البيانات ✅')
    setSavingProfile(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwords.newPass || !passwords.confirm) return toast.error('يرجى تعبئة جميع الحقول')
    if (passwords.newPass !== passwords.confirm) return toast.error('كلمتا المرور غير متطابقتين')
    if (passwords.newPass.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')

    // كلمة المرور الحالية كانت بتتكتب من غير ما تتحقق، فأي حد يلاقي الجهاز
    // مفتوح كان يقدر يغيّرها ويستولي على الحساب. بنتحقق منها الأول.
    const email = user?.email || profile?.email
    if (needsPassword) {
      if (!passwords.current) return toast.error('يرجى إدخال كلمة المرور الحالية')
      if (!email) return toast.error('تعذّر تحديد البريد المرتبط بالحساب')
      setSavingPass(true)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: passwords.current,
      })
      if (authError) {
        setSavingPass(false)
        return toast.error('كلمة المرور الحالية غير صحيحة')
      }
    } else {
      setSavingPass(true)
    }

    const { error } = await supabase.auth.updateUser({ password: passwords.newPass })
    if (error) toast.error('حدث خطأ في تغيير كلمة المرور')
    else {
      toast.success('تم تغيير كلمة المرور ✅')
      setPasswords({ current: '', newPass: '', confirm: '' })
    }
    setSavingPass(false)
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    const email = user?.email || profile?.email
    if (!email) return toast.error('تعذّر تحديد البريد المرتبط بالحساب')
    if (deleteForm.phrase.trim() !== DELETE_CONFIRM_PHRASE) {
      return toast.error(`اكتب «${DELETE_CONFIRM_PHRASE}» للتأكيد`)
    }

    if (needsPassword) {
      if (!deleteForm.password) return toast.error('يرجى إدخال كلمة المرور للتأكيد')
    } else if (deleteForm.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return toast.error('البريد الإلكتروني غير مطابق للحساب')
    }

    setDeleting(true)

    // إعادة التحقق من الهوية قبل تنفيذ عملية غير قابلة للتراجع.
    // حسابات كلمة المرور تُتحقّق بها ، أما حسابات الدخول الاجتماعي فلا كلمة مرور
    // لها ، لذلك نتحقّق من صلاحية الجلسة نفسها بعد مطابقة البريد.
    if (needsPassword) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: deleteForm.password,
      })
      if (authError) {
        setDeleting(false)
        return toast.error('كلمة المرور غير صحيحة')
      }
    } else {
      const { data: freshUser, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || freshUser?.user?.id !== user!.id) {
        setDeleting(false)
        return toast.error('انتهت صلاحية الجلسة ، يرجى تسجيل الدخول مرة أخرى')
      }
    }

    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setDeleting(false)
      return toast.error(error.message || 'تعذّر حذف الحساب ، يرجى التواصل مع الدعم')
    }

    await supabase.auth.signOut()
    setDeleting(false)
    toast.success('تم حذف حسابك وجميع بياناته نهائيًا')
    navigate('/', { replace: true })
  }

  // بلا افتراض للدور: لا يظهر خيار الحذف قبل تحميل الملف الشخصي فعليًا.
  const canSelfDelete = SELF_DELETABLE_ROLES.includes(profile?.role ?? '')
  const loginProviders = resolveLoginProviders(user)
  const needsPassword = requiresPasswordConfirmation(loginProviders)

  const roleLabel: Record<string, string> = {
    student: 'طالب', parent: 'ولي أمر', teacher: 'مدرس',
    admin: 'مدير المنصة', content_manager: 'مسؤول محتوى', student_manager: 'مسؤول طلاب'
  }

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-2xl mx-auto px-4">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-brand-navy">الملف الشخصي</h1>
          <p className="text-gray-500 mt-1">إدارة بياناتك الشخصية وكلمة المرور</p>
        </div>

        {/* Avatar & Info */}
        <div className="card mb-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center text-white font-black text-3xl flex-shrink-0">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-black text-brand-navy">{profile?.full_name}</h2>
            <p className="text-gray-400 text-sm">{profile?.email}</p>
            <span className="inline-block mt-1 bg-purple-100 text-brand-purple text-xs font-bold px-3 py-1 rounded-full">
              {roleLabel[profile?.role || 'student'] || 'طالب'}
            </span>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="card mb-6">
          <h2 className="text-lg font-black text-brand-navy mb-5">تعديل البيانات الشخصية</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">الاسم الكامل</label>
              <div className="relative">
                <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="input-field pr-10"
                  placeholder="اسمك الكامل"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">رقم الجوال</label>
              <div className="relative">
                <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input-field pr-10"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={profile?.email || ''}
                  disabled
                  className="input-field pr-10 opacity-60 cursor-not-allowed"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">لا يمكن تغيير البريد الإلكتروني</p>
            </div>
            <button type="submit" disabled={savingProfile} className="btn-primary flex items-center gap-2 py-3 px-6">
              <Save size={16} />
              {savingProfile ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card">
          <h2 className="text-lg font-black text-brand-navy mb-5">تغيير كلمة المرور</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {needsPassword && (
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">كلمة المرور الحالية</label>
                <div className="relative">
                  <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={passwords.current}
                    onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                    className="input-field pr-10"
                    placeholder="كلمة المرور الحالية"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">كلمة المرور الجديدة</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={passwords.newPass}
                  onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
                  className="input-field pr-10"
                  placeholder="٨ أحرف على الأقل"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="input-field pr-10"
                  placeholder="أعد كتابة كلمة المرور"
                  dir="ltr"
                />
              </div>
            </div>
            <button type="submit" disabled={savingPass} className="btn-primary flex items-center gap-2 py-3 px-6">
              <Lock size={16} />
              {savingPass ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
          </form>
        </div>

        {/* Passkey */}
        {passkeyAvailable && (
        <div className="card mt-6">
          <h2 className="text-lg font-black text-brand-navy mb-2 flex items-center gap-2">
            <Fingerprint size={18} />
            الدخول بالبصمة
          </h2>
          <p className="text-sm text-gray-500 leading-7 mb-4">
            فعّلها على هذا الجهاز لتدخل حسابك ببصمتك أو وجهك بدل كتابة كلمة المرور.
          </p>

          {passkeys.length > 0 && (
            <ul className="space-y-2 mb-4">
              {passkeys.map(passkey => (
                <li key={passkey.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-brand-navy truncate">{passkey.friendly_name || 'جهاز مسجّل'}</p>
                    <p className="text-xs text-gray-400">
                      أُضيف في {new Date(passkey.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePasskey(passkey.id)}
                    disabled={passkeyBusy}
                    className="text-sm font-bold text-red-600 hover:underline disabled:opacity-50"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleAddPasskey}
            disabled={passkeyBusy}
            className="btn-primary flex items-center gap-2 py-3 px-6"
          >
            <Fingerprint size={16} />
            {passkeyBusy ? 'جاري التفعيل...' : 'تفعيل البصمة على هذا الجهاز'}
          </button>
        </div>
        )}

        {/* Delete Account */}
        {canSelfDelete && (
        <div className="card mt-6 border border-red-200">
          <h2 className="text-lg font-black text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} />
            حذف الحساب نهائيًا
          </h2>
          <p className="text-sm text-gray-500 leading-7 mb-4">
            سيتم حذف حسابك وملفك الشخصي واشتراكاتك وتقدّمك في الدروس ونتائج الاختبارات
            والإشعارات وروابط ولي الأمر بشكل نهائي ، ولا يمكن التراجع عن هذه الخطوة.
          </p>

          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition"
            >
              <Trash2 size={16} />
              أريد حذف حسابي
            </button>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {needsPassword ? (
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">كلمة المرور الحالية</label>
                  <div className="relative">
                    <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={deleteForm.password}
                      onChange={e => setDeleteForm({ ...deleteForm, password: e.target.value })}
                      className="input-field pr-10"
                      placeholder="كلمة المرور"
                      dir="ltr"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">
                    اكتب بريد الحساب للتأكيد
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={deleteForm.email}
                      onChange={e => setDeleteForm({ ...deleteForm, email: e.target.value })}
                      className="input-field pr-10"
                      placeholder={user?.email || profile?.email || ''}
                      dir="ltr"
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    حسابك مسجّل عبر {describeSocialProviders(loginProviders)} ولا يملك كلمة مرور ،
                    لذلك نؤكد هويتك بمطابقة البريد.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">
                  اكتب «{DELETE_CONFIRM_PHRASE}» للتأكيد
                </label>
                <input
                  value={deleteForm.phrase}
                  onChange={e => setDeleteForm({ ...deleteForm, phrase: e.target.value })}
                  className="input-field"
                  placeholder={DELETE_CONFIRM_PHRASE}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-60"
                >
                  <Trash2 size={16} />
                  {deleting ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteOpen(false); setDeleteForm({ password: '', email: '', phrase: '' }) }}
                  className="py-3 px-6 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>
        )}

      </div>
    </div>
  )
}
