import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { SectionToolbar, Spinner, EmptyState } from '../../components/admin/lightKit'

type LogItem = { key: string; title: string; body: string; type: string; created_at: string; recipients: number }

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
  const [courses, setCourses] = useState<any[]>([])
  const [courseId, setCourseId] = useState('')
  const [sending, setSending] = useState(false)
  const [log, setLog] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('courses').select('id, title').order('title').then(({ data }) => setCourses(data || []))
    fetchLog()
  }, [])

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

  async function resolveRecipients(): Promise<string[]> {
    if (audience === 'students') {
      const { data } = await supabase.from('profiles').select('id').eq('role', 'student')
      return (data || []).map((r: any) => r.id)
    }
    if (audience === 'team') {
      const { data } = await supabase.from('profiles').select('id').in('role', ['admin', 'teacher', 'content_manager', 'student_manager'])
      return (data || []).map((r: any) => r.id)
    }
    if (audience === 'course' && courseId) {
      const { data } = await supabase.from('enrollments').select('student_id').eq('payment_status', 'paid').eq('course_id', courseId)
      return (data || []).map((r: any) => r.student_id)
    }
    return []
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !body) return toast.error('العنوان والرسالة مطلوبان')
    if (audience === 'course' && !courseId) return toast.error('اختر الكورس المستهدف')
    setSending(true)
    const recipients = await resolveRecipients()
    if (recipients.length === 0) {
      toast.error('لا يوجد مستلمون مطابقون لهذا الاستهداف')
      setSending(false)
      return
    }
    const rows = recipients.map((uid) => ({ user_id: uid, title, body, type }))
    const { error } = await supabase.from('notifications').insert(rows)
    if (error) toast.error('حدث خطأ أثناء الإرسال')
    else {
      toast.success(`تم إرسال الإشعار إلى ${recipients.length} مستخدم ✅`)
      setTitle(''); setBody('')
      fetchLog()
    }
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
