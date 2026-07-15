import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SectionToolbar, StatusBadge, Spinner, EmptyState, avatarClass, initials } from '../../components/admin/lightKit'

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

  useEffect(() => {
    async function load() {
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
    load()
  }, [])

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
              <thead><tr><th>الطالب</th><th>الكورسات</th><th>الدرجة الأخيرة</th><th>آخر نشاط</th><th>الحالة</th></tr></thead>
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
                    <td><StatusBadge variant={s.is_active ? 'success' : 'danger'}>{s.is_active ? 'نشط' : 'موقوف'}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </>
  )
}
