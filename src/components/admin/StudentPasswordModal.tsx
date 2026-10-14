import { useRef, useState } from 'react'
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { Modal } from './lightKit'

type Student = { id: string; full_name: string; email: string }

function strongPassword() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), value => alphabet[value & 63]).join('')
}

export default function StudentPasswordModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const inFlight = useRef(false)

  function close() {
    if (!inFlight.current) onClose()
  }

  function generate() {
    const value = strongPassword()
    setPassword(value)
    setConfirmation(value)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current || saved) return
    if (password.length < 8 || password.length > 128) return toast.error('كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا')
    if (password !== confirmation) return toast.error('كلمتا المرور غير متطابقتين')
    inFlight.current = true
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke<{ success?: boolean; student_id?: string }>('reset-student-password', {
        body: { student_id: student.id, password },
      })
      if (error) {
        let message = 'تعذّر تغيير كلمة المرور. حاول مجددًا'
        try {
          const body = await error.context?.json?.()
          if (typeof body?.error === 'string') message = body.error
        } catch { /* Keep a safe fallback for network errors. */ }
        toast.error(message)
        return
      }
      if (!data?.success || data.student_id !== student.id) {
        toast.error('تعذّر تأكيد تغيير كلمة المرور. حاول مجددًا')
        return
      }
      setSaved(true)
      toast.success('تم تعيين كلمة المرور الجديدة ✅')
    } catch {
      toast.error('تعذّر الاتصال. تحقق من الإنترنت وحاول مجددًا')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`البريد الإلكتروني: ${student.email}\nكلمة المرور: ${password}`)
      setCopied(true)
    } catch {
      toast.error('تعذّر النسخ؛ يمكنك نسخ البيانات يدويًا')
    }
  }

  return (
    <Modal title="تعيين كلمة مرور جديدة" onClose={close}>
      <div className="admin-form">
        <p className="adm-hint" style={{ marginTop: 0 }}><b>{student.full_name}</b><br /><span dir="ltr">{student.email}</span></p>
        {saved ? (
          <>
            <p className="adm-hint">تم التغيير بنجاح. الحساب والاشتراكات والتقدّم كما هي. أرسل بيانات الدخول للطالب بشكل خاص.</p>
            <div style={{ padding: 16, borderRadius: 12, background: '#faf7ff', border: '1px solid #e3d7eb', overflowWrap: 'anywhere' }}>
              <small>كلمة المرور الجديدة</small>
              <div dir="ltr" style={{ fontWeight: 800, marginTop: 8 }}>{password}</div>
            </div>
            <div className="form-row">
              <button type="button" className="primary-admin" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'تم النسخ' : 'نسخ بيانات الدخول'}</button>
              <button type="button" className="ghost-button" onClick={close}>تم</button>
            </div>
          </>
        ) : (
          <form className="admin-form" onSubmit={save}>
            <p className="adm-hint" style={{ marginTop: 0 }}>سيتم تغيير كلمة المرور فقط، مع الاحتفاظ بالحساب وكل اشتراكاته وتقدّمه.</p>
            <label>كلمة المرور الجديدة<input type={visible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={128} required autoComplete="new-password" dir="ltr" disabled={saving} /></label>
            <label>تأكيد كلمة المرور<input type={visible ? 'text' : 'password'} value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={8} maxLength={128} required autoComplete="new-password" dir="ltr" disabled={saving} /></label>
            <div className="form-row">
              <button type="button" className="ghost-button" onClick={generate} disabled={saving}><RefreshCw size={16} /> توليد كلمة قوية</button>
              <button type="button" className="ghost-button" onClick={() => setVisible(value => !value)} disabled={saving}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}{visible ? 'إخفاء' : 'إظهار'}</button>
            </div>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}</button>
              <button type="button" className="ghost-button" onClick={close} disabled={saving}>إلغاء</button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
