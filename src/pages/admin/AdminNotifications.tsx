import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { SectionToolbar, Spinner, EmptyState } from '../../components/admin/lightKit'

type LogItem = { key: string; title: string; body: string; type: string; created_at: string; recipients: number }
type WhatsAppPreview = { configured: boolean; eligible: number; total: number; missingPhone: number; duplicates: number }

const TYPE_ICON: Record<string, { cls: string; glyph: string }> = {
  info: { cls: 'purple', glyph: '↗' },
  success: { cls: 'green', glyph: '✓' },
  warning: { cls: 'orange', glyph: '!' },
  enrollment: { cls: 'pink', glyph: '★' },
  payment: { cls: 'green', glyph: '₪' },
}

export default function AdminNotifications() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'students' | 'team' | 'course'>('students')
  const [type, setType] = useState('info')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendInApp, setSendInApp] = useState(true)
  const [sendWhatsApp, setSendWhatsApp] = useState(false)
  const [whatsAppPreview, setWhatsAppPreview] = useState<WhatsAppPreview | null>(null)
  const [previewingWhatsApp, setPreviewingWhatsApp] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [courseId, setCourseId] = useState('')
  const [sending, setSending] = useState(false)
  const [log, setLog] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('courses').select('id, title').order('title').then(({ data }) => setCourses(data || []))
    fetchLog()
  }, [])

  useEffect(() => {
    if (!sendWhatsApp || (audience === 'course' && !courseId) || audience === 'team') {
      setWhatsAppPreview(null)
      return
    }
    const timer = window.setTimeout(() => previewWhatsAppRecipients(), 250)
    return () => window.clearTimeout(timer)
  }, [sendWhatsApp, audience, courseId])

  async function whatsappRequest(payload: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('انتهت جلسة الدخول. سجّل الدخول مرة أخرى.')
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'تعذّر الاتصال بخدمة واتساب.')
    return result
  }

  async function previewWhatsAppRecipients() {
    setPreviewingWhatsApp(true)
    try {
      const result = await whatsappRequest({ action: 'preview', audience, courseId: courseId || undefined })
      setWhatsAppPreview(result as WhatsAppPreview)
    } catch (error) {
      setWhatsAppPreview(null)
      toast.error(error instanceof Error ? error.message : 'تعذّرت معاينة أرقام الطلاب')
    } finally {
      setPreviewingWhatsApp(false)
    }
  }

  async function fetchLog() {
    setLoading(true)
    const { data } = await supabase.from('notifications').select('title, body, type, created_at').order('created_at', { ascending: false }).limit(60)
    const groups: Record<string, LogItem> = {}
    ;(data || []).forEach((n: any) => {
      const minuteKey = n.created_at.slice(0, 16) // group by same title+minute = one "send"
      const key = `${n.title}__${minuteKey}`
      if (!groups[key]) groups[key] = { key, title: n.title, body: n.body, type: n.type, created_at: n.created_at, recipients: 0 }
      groups[key].recipients++
    })
    setLog(Object.values(groups).slice(0, 10))
    setLoading(false)
  }

  type Recipient = { id: string; email: string | null; full_name: string | null }

  async function resolveRecipients(): Promise<Recipient[]> {
    if (audience === 'students') {
      const { data } = await supabase.from('profiles').select('id, email, full_name').eq('role', 'student')
      return data || []
    }
    if (audience === 'team') {
      const { data } = await supabase.from('profiles').select('id, email, full_name').in('role', ['admin', 'teacher', 'content_manager', 'student_manager'])
      return data || []
    }
    if (audience === 'course' && courseId) {
      const { data } = await supabase.from('enrollments').select('profiles(id, email, full_name)').eq('payment_status', 'paid').eq('course_id', courseId)
      return (data || []).map((r: any) => r.profiles).filter(Boolean)
    }
    return []
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !body) return toast.error('العنوان والرسالة مطلوبان')
    if (audience === 'course' && !courseId) return toast.error('اختر الكورس المستهدف')
    if (!sendInApp && !sendEmail && !sendWhatsApp) return toast.error('اختر وسيلة إرسال واحدة على الأقل')
    if (sendWhatsApp && audience === 'team') return toast.error('إرسال واتساب متاح للطلاب فقط')
    if (sendWhatsApp && !whatsAppPreview?.configured) return toast.error('أكمل ربط واتساب للأعمال أولًا')
    if (sendWhatsApp && !window.confirm(`سيتم إرسال الرسالة عبر واتساب إلى ${whatsAppPreview?.eligible || 0} طالب. هل تؤكد أن هؤلاء الطلاب وافقوا على استقبال الرسائل ؟`)) return
    setSending(true)
    const recipients = await resolveRecipients()
    if (recipients.length === 0) {
      toast.error('لا يوجد مستلمون مطابقون لهذا الاستهداف')
      setSending(false)
      return
    }
    if (sendInApp) {
      const rows = recipients.map((r) => ({ user_id: r.id, title, body, type }))
      const { error } = await supabase.from('notifications').insert(rows)
      if (error) {
        toast.error('حدث خطأ أثناء إرسال إشعارات المنصة')
        setSending(false)
        return
      }
      toast.success(`تم إرسال الإشعار إلى ${recipients.length} مستخدم ✅`)
    }

    // إرسال إيميل حقيقي لكل مستلم كمان (غير معطّل لإتمام العملية لو فشل بريد واحد)
    if (sendEmail) {
      let emailsOk = 0
      await Promise.all(
        recipients
          .filter((r) => r.email)
          .map((r) =>
            supabase.auth.getSession().then(({ data: sessionData }) => fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) },
              body: JSON.stringify({
                to: r.email,
                type: 'admin_broadcast',
                data: { studentName: r.full_name, title, body },
              }),
            })).then((res) => { if (res.ok) emailsOk++ }).catch(() => {})
          )
      )
      if (emailsOk > 0) toast.success(`تم إرسال إيميل فعلي لـ ${emailsOk} مستلم ✅`)
    }

    if (sendWhatsApp) {
      try {
        const result = await whatsappRequest({
          action: 'send', audience, courseId: courseId || undefined, title, body, confirmedOptIn: true,
        })
        toast.success(`تم إرسال واتساب إلى ${result.sent} طالب ✅`)
        if (result.failed > 0) toast.error(`تعذّر الإرسال إلى ${result.failed} رقم`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'تعذّر إرسال رسائل واتساب')
      }
    }

    setTitle(''); setBody('')
    fetchLog()
    setSending(false)
  }

  return (
    <>
      <SectionToolbar title="مركز الإشعارات" subtitle="تواصل مع الطلاب والفريق من مكان واحد." />

      <div className="notification-layout">
        <article className="admin-card compose-card">
          <header className="card-head"><div><h3>إرسال إشعار جديد</h3><p>سيظهر الإشعار داخل حسابات المستلمين</p></div><span className="compose-icon">✦</span></header>
          <form className="admin-form" onSubmit={handleSend}>
            <label>العنوان<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اكتب عنوان الإشعار" /></label>
            <label>الفئة المستهدفة
              <select value={audience} onChange={(e) => setAudience(e.target.value as any)}>
                <option value="students">جميع الطلاب</option>
                <option value="course">طلاب كورس محدد</option>
                <option value="team">فريق العمل</option>
              </select>
            </label>
            {audience === 'course' && (
              <label>الكورس
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <option value="">اختر الكورس</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
            )}
            <label>نوع الإشعار
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="info">عام</option>
                <option value="success">إيجابي</option>
                <option value="warning">تنبيه</option>
                <option value="enrollment">اشتراك</option>
                <option value="payment">دفع</option>
              </select>
            </label>
            <label>نص الرسالة<textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب رسالتك هنا..." /></label>
            <div style={{ display: 'grid', gap: 9 }}>
              <strong style={{ fontSize: 13, color: '#75687d' }}>وسائل الإرسال</strong>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#faf8fd', border: '1px solid #e9e2ef' }}>
                <input type="checkbox" checked={sendInApp} onChange={(e) => setSendInApp(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span><b style={{ display: 'block', fontSize: 12 }}>داخل المنصة</b><small style={{ color: '#8a7d91', fontSize: 10 }}>يظهر في مركز إشعارات الطالب</small></span>
              </label>
            <div className="form-row" style={{ padding: '10px 12px', borderRadius: 12, background: '#f2fbf6', border: '1px solid #d9f1e7' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span>
                  <b style={{ display: 'block', fontSize: 12 }}>إرسال إيميل حقيقي كمان</b>
                  <small style={{ display: 'block', color: '#8a7d91', fontSize: 10 }}>يوصل لصندوق بريد المستلم مش داخل المنصة بس</small>
                </span>
              </label>
            </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', borderRadius: 12, background: '#f2fff7', border: '1px solid #ccebd7' }}>
                <input type="checkbox" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} disabled={audience === 'team'} style={{ width: 16, height: 16, marginTop: 2 }} />
                <span style={{ flex: 1 }}>
                  <b style={{ display: 'block', fontSize: 12, color: '#18794e' }}>إرسال جماعي عبر واتساب</b>
                  {!sendWhatsApp ? <small style={{ color: '#668577', fontSize: 10 }}>إرسال آمن عبر حساب واتساب للأعمال الرسمي</small> : previewingWhatsApp ? <small style={{ color: '#668577', fontSize: 10 }}>جاري فحص أرقام الطلاب...</small> : whatsAppPreview ? (
                    <small style={{ display: 'block', color: whatsAppPreview.configured ? '#39715b' : '#a15c20', fontSize: 10, lineHeight: 1.7 }}>
                      {whatsAppPreview.eligible} رقم صالح من أصل {whatsAppPreview.total}
                      {whatsAppPreview.missingPhone > 0 ? ` · ${whatsAppPreview.missingPhone} بدون رقم صالح` : ''}
                      {!whatsAppPreview.configured ? ' · يلزم ربط واتساب للأعمال مرة واحدة' : ''}
                    </small>
                  ) : <small style={{ color: '#a15c20', fontSize: 10 }}>تعذّرت معاينة الأرقام</small>}
                </span>
              </label>
            </div>
            <div className="form-row">
              <span />
              <button type="submit" className="primary-admin" disabled={sending}>{sending ? 'جاري الإرسال...' : 'إرسال الإشعار'}</button>
            </div>
          </form>
        </article>

        <article className="admin-card notifications-list" data-searchable>
          <header className="card-head"><div><h3>آخر الإشعارات</h3><p>سجل آخر الإشعارات المُرسلة من لوحة التحكم</p></div></header>
          {loading ? <Spinner /> : log.length === 0 ? <EmptyState text="لا توجد إشعارات مرسلة بعد" /> : (
            <div className="notice-items">
              {log.map((n) => {
                const icon = TYPE_ICON[n.type] || TYPE_ICON.info
                return (
                  <div className="notice" key={n.key}>
                    <span className={`notice-icon ${icon.cls}`}>{icon.glyph}</span>
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <small>{new Date(n.created_at).toLocaleString('ar-SA')} · أُرسل إلى {n.recipients} مستخدم</small>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </div>
    </>
  )
}
