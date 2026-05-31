import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { User, Phone, Mail, Save, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, profile, loading } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [initialized, setInitialized] = useState(false)

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
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.newPass })
    if (error) toast.error('حدث خطأ في تغيير كلمة المرور')
    else {
      toast.success('تم تغيير كلمة المرور ✅')
      setPasswords({ current: '', newPass: '', confirm: '' })
    }
    setSavingPass(false)
  }

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

      </div>
    </div>
  )
}
