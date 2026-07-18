import { useEffect, useState } from 'react'
import { MessageSquare, Ban, UserCheck, BookOpen, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { SectionToolbar, StatusBadge, Spinner, EmptyState, Modal, avatarClass, initials } from '../../components/admin/lightKit'

type StudentRow = {
  id: string
  full_name: string
  email: string
  is_active: boolean
  created_at: string
  courses: number
  lastScore: number | null
  lastActivity: string | null
}

type EnrollmentRow = { id: string; course_title: string; payment_status: string; enrolled_at: string }

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'أمس'
  return `منذ ${days} أيام`
}

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'attention'>('all')

  // رسالة لطالب محدد
  const [messageTarget, setMessageTarget] = useState<StudentRow | null>(null)
  const [msgTitle, setMsgTitle] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgSendEmail, setMsgSendEmail] = useState(true)
  const [sendingMsg, setSendingMsg] = useState(false)

  // اشتراكات طالب محدد (لإلغائها)
  const [enrollTarget, setEnrollTarget] = useState<StudentRow | null>(null)
  const [enrollList, setEnrollList] = useState<EnrollmentRow[]>([])
  const [enrollLoading, setEnrollLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })
    const list = profiles || []
    if (!list.length) { setStudents([]); setLoading(false); return }
    const ids = list.map((s: any) => s.id)

    const [enrollRes, resultsRes, progressRes] = await Promise.all([
      supabase.from('enrollments').select('student_id').eq('payment_status', 'paid').in('student_id', ids),
      supabase.from('quiz_results').select('student_id, score, total_marks, taken_at').in('student_id', ids).order('taken_at', { ascending: false }),
      supabase.from('lesson_progress').select('student_id, last_watched_at').in('student_id', ids).order('last_watched_at', { ascending: false }),
    ])

    const courseCount: Record<string, number> = {}
    ;(enrollRes.data || []).forEach((e: any) => { courseCount[e.student_id] = (courseCount[e.student_id] || 0) + 1 })

    const lastScore: Record<string, number> = {}
    ;(resultsRes.data || []).forEach((r: any) => {
      if (!(r.student_id in lastScore) && r.total_marks) lastScore[r.student_id] = Math.round((r.score / r.total_marks) * 100)
    })

    const lastActivity: Record<string, string> = {}
    ;(progressRes.data || []).forEach((p: any) => {
      if (!(p.student_id in lastActivity)) lastActivity[p.student_id] = p.last_watched_at
    })

    setStudents(list.map((s: any) => ({
      id: s.id,
      full_name: s.full_name,
      email: s.email,
      is_active: s.is_active !== false,
      created_at: s.created_at,
      courses: courseCount[s.id] || 0,
      lastScore: lastScore[s.id] ?? null,
      lastActivity: lastActivity[s.id] ?? null,
    })))
    setLoading(false)
  }

  async function toggleBan(s: StudentRow) {
    const willBan = s.is_active
    if (!confirm(willBan ? `هل تريد حظر الطالب "${s.full_name}" ؟ لن يستطيع تسجيل الدخول أو مشاهدة أي درس.` : `هل تريد إلغاء حظر "${s.full_name}" ؟`)) return
    const { error } = await supabase.from('profiles').update({ is_active: !willBan }).eq('id', s.id)
    if (error) { toast.error('حدث خطأ'); return }
    toast.success(willBan ? 'تم حظر الطالب' : 'تم إلغاء الحظر ✅')
    setStudents((prev) => prev.map((p) => (p.id === s.id ? { ...p, is_active: !willBan } : p)))
  }

  function openMessage(s: StudentRow) {
    setMessageTarget(s)
    setMsgTitle('')
    setMsgBody('')
    setMsgSendEmail(true)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!messageTarget) return
    if (!msgTitle || !msgBody) return toast.error('العنوان والرسالة مطلوبان')
    setSendingMsg(true)
    const { error } = await supabase.from('notifications').insert({ user_id: messageTarget.id, title: msgTitle, body: msgBody, type: 'info' })
    if (error) { toast.error('حدث خطأ أثناء الإرسال'); setSendingMsg(false); return }
    toast.success('تم إرسال الرسالة ✅')
    if (msgSendEmail && messageTarget.email) {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: messageTarget.email, type: 'admin_broadcast', data: { studentName: messageTarget.full_name, title: msgTitle, body: msgBody } }),
      }).catch(() => {})
    }
    setSendingMsg(false)
    setMessageTarget(null)
  }

  async function openEnrollments(s: StudentRow) {
    setEnrollTarget(s)
    setEnrollLoading(true)
    const { data } = await supabase
      .from('enrollments')
      .select('id, payment_status, enrolled_at, courses(title)')
      .eq('student_id', s.id)
      .order('enrolled_at', { ascending: false })
    setEnrollList((data || []).map((e: any) => ({ id: e.id, course_title: e.courses?.title || 'كورس محذوف', payment_status: e.payment_status, enrolled_at: e.enrolled_at })))
    setEnrollLoading(false)
  }

  async function cancelEnrollment(enrollmentId: string) {
    if (!confirm('هل تريد إلغاء هذا الاشتراك ؟ سيفقد الطالب الوصول للكورس فورًا.')) return
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId)
    if (error) { toast.error('حدث خطأ'); return }
    toast.success('تم إلغاء الاشتراك ✅')
    setEnrollList((prev) => prev.filter((e) => e.id !== enrollmentId))
    if (enrollTarget) setStudents((prev) => prev.map((p) => (p.id === enrollTarget.id ? { ...p, courses: Math.max(0, p.courses - 1) } : p)))
  }

  const active = students.filter((s) => s.is_active)
  const needsAttention = students.filter((s) => s.lastScore !== null && s.lastScore < 65)
  const avgScore = students.filter((s) => s.lastScore !== null).length
    ? Math.round(students.filter((s) => s.lastScore !== null).reduce((sum, s) => sum + (s.lastScore || 0), 0) / students.filter((s) => s.lastScore !== null).length)
    : 0

  const visible = filter === 'active' ? active : filter === 'attention' ? needsAttention : students

  return (
    <>
      <SectionToolbar title="إدارة الطلاب" subtitle="تابع رحلة كل طالب وتقدمه ونتائجه في مكان واحد." />

      <div className="mini-metrics">
        <article><span>{loading ? '…' : students.length}</span><p>إجمالي الطلاب<small>مسجّلون في المنصة</small></p></article>
        <article><span>{loading ? '…' : active.length}</span><p>طلاب نشطون<small>{students.length ? Math.round((active.length / students.length) * 100) : 0}% من الإجمالي</small></p></article>
        <article><span>{loading ? '…' : `${avgScore}%`}</span><p>متوسط الدرجات<small>آخر اختبار لكل طالب</small></p></article>
        <article><span>{loading ? '…' : needsAttention.length}</span><p>بحاجة لمتابعة<small>درجات أقل من 65%</small></p></article>
      </div>

      {loading ? <Spinner /> : students.length === 0 ? (
        <EmptyState text="لا يوجد طلاب" />
      ) : (
        <article className="admin-card data-card" data-searchable>
          <header className="card-head">
            <div><h3>قائمة الطلاب</h3><p>{students.length} طالب مسجّل</p></div>
            <div className="segmented">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>الكل</button>
              <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>النشطون</button>
              <button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>بحاجة لمتابعة</button>
            </div>
          </header>
          <div className="table-wrap">
            <table>
              <thead><tr><th>الطالب</th><th>الكورسات</th><th>الدرجة الأخيرة</th><th>آخر نشاط</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
              <tbody>
                {visible.map((s, i) => (
                  <tr key={s.id}>
                    <td>
                      <span className={`person-avatar ${avatarClass(i)}`}>{initials(s.full_name)}</span>
                      <div><b>{s.full_name}</b><small className="cell-sub">{s.email}</small></div>
                    </td>
                    <td>{s.courses}</td>
                    <td>{s.lastScore !== null ? <strong className={`score ${s.lastScore >= 85 ? 'high' : s.lastScore >= 65 ? '' : 'low'}`}>{s.lastScore}%</strong> : '—'}</td>
                    <td>{timeAgo(s.lastActivity)}</td>
                    <td><StatusBadge variant={s.is_active ? 'success' : 'danger'}>{s.is_active ? 'نشط' : 'محظور'}</StatusBadge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="row-action" onClick={() => openMessage(s)}><MessageSquare size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />رسالة</button>
                        <button className="row-action" onClick={() => openEnrollments(s)}><BookOpen size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />الاشتراكات</button>
                        <button className="row-action" onClick={() => toggleBan(s)} style={s.is_active ? { color: '#d33b55' } : { color: '#26a879' }}>
                          {s.is_active ? <><Ban size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />حظر</> : <><UserCheck size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />تفعيل</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {messageTarget && (
        <Modal title={`إرسال رسالة إلى ${messageTarget.full_name}`} onClose={() => setMessageTarget(null)}>
          <form onSubmit={sendMessage} className="admin-form">
            <label>العنوان<input value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} placeholder="مثال: تذكير بمتابعة الدروس" /></label>
            <label>نص الرسالة<textarea rows={5} value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="اكتب رسالتك هنا..." /></label>
            <div className="form-row" style={{ padding: '10px 12px', borderRadius: 12, background: '#f2fbf6', border: '1px solid #d9f1e7' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={msgSendEmail} onChange={(e) => setMsgSendEmail(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span>
                  <b style={{ display: 'block', fontSize: 12 }}>إرسال إيميل حقيقي كمان</b>
                  <small style={{ display: 'block', color: '#8a7d91', fontSize: 10 }}>يوصل لصندوق بريد الطالب مش داخل المنصة بس</small>
                </span>
              </label>
            </div>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={sendingMsg}>{sendingMsg ? 'جاري الإرسال...' : 'إرسال'}</button>
              <button type="button" className="ghost-button" onClick={() => setMessageTarget(null)}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {enrollTarget && (
        <Modal title={`اشتراكات ${enrollTarget.full_name}`} onClose={() => setEnrollTarget(null)}>
          {enrollLoading ? <Spinner /> : enrollList.length === 0 ? (
            <EmptyState text="لا يوجد اشتراكات لهذا الطالب" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enrollList.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', border: '1px solid var(--adm-line)', borderRadius: 12 }}>
                  <div>
                    <b style={{ display: 'block', fontSize: 14 }}>{e.course_title}</b>
                    <small className="cell-sub">
                      {e.payment_status === 'paid' ? 'مدفوع' : e.payment_status === 'pending' ? 'قيد الانتظار' : e.payment_status === 'refunded' ? 'مسترجَع' : 'فشل الدفع'}
                      {' · '}منذ {timeAgo(e.enrolled_at)}
                    </small>
                  </div>
                  <button type="button" className="row-action" onClick={() => cancelEnrollment(e.id)} style={{ color: '#d33b55' }}><X size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />إلغاء</button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
