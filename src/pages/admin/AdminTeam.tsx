import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Spinner, EmptyState, initials, Modal } from '../../components/admin/lightKit'
import toast from 'react-hot-toast'

const ROLE_LABEL: Record<string, string> = {
  admin: 'مدير المنصة',
  teacher: 'معلم',
  content_manager: 'مشرف محتوى',
  student_manager: 'مسؤول الطلاب',
  quiz_manager: 'مشرف الاختبارات',
}
const ROLE_BADGE: Record<string, string> = { admin: 'owner', teacher: '', content_manager: 'design', student_manager: 'support', quiz_manager: 'support' }
const ROLE_ORDER: Record<string, number> = { admin: 0, teacher: 1, quiz_manager: 2, content_manager: 3, student_manager: 4 }
const coverClass = ['', 'c2', 'c3', 'c4']
const avatarClass = ['m1', 'm2', 'm3', 'm4']

const ADDABLE_ROLES: { value: string; label: string }[] = [
  { value: 'teacher', label: 'معلم' },
  { value: 'content_manager', label: 'مشرف محتوى' },
  { value: 'student_manager', label: 'مسؤول الطلاب' },
  { value: 'quiz_manager', label: 'مشرف الاختبارات' },
  { value: 'admin', label: 'مدير المنصة' },
]

type Member = { id: string; full_name: string; email: string; role: string; avatar_url?: string; courses: number; students: number; questions: number }

export default function AdminTeam() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'quiz_manager' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: profiles } = await supabase.from('profiles').select('*').in('role', ['admin', 'teacher', 'content_manager', 'student_manager', 'quiz_manager']).order('created_at')
    const list = profiles || []
    if (!list.length) { setMembers([]); setLoading(false); return }

    const ids = list.map((m: any) => m.id)
    const { data: courses } = await supabase.from('courses').select('id, created_by').in('created_by', ids)
    const courseCount: Record<string, number> = {}
    const courseIdsByOwner: Record<string, string[]> = {}
    ;(courses || []).forEach((c: any) => {
      courseCount[c.created_by] = (courseCount[c.created_by] || 0) + 1
      courseIdsByOwner[c.created_by] = [...(courseIdsByOwner[c.created_by] || []), c.id]
    })

    const allCourseIds = (courses || []).map((c: any) => c.id)
    const studentsByOwner: Record<string, number> = {}
    if (allCourseIds.length) {
      const { data: enrolls } = await supabase.from('enrollments').select('course_id').eq('payment_status', 'paid').in('course_id', allCourseIds)
      Object.entries(courseIdsByOwner).forEach(([owner, cids]) => {
        studentsByOwner[owner] = (enrolls || []).filter((e: any) => cids.includes(e.course_id)).length
      })
    }

    const { data: questionsData } = await supabase.from('quiz_questions').select('id, created_by').in('created_by', ids)
    const questionCount: Record<string, number> = {}
    ;(questionsData || []).forEach((q: any) => {
      if (!q.created_by) return
      questionCount[q.created_by] = (questionCount[q.created_by] || 0) + 1
    })

    const mapped = list.map((m: any) => ({
      id: m.id, full_name: m.full_name, email: m.email, role: m.role, avatar_url: m.avatar_url,
      courses: courseCount[m.id] || 0, students: studentsByOwner[m.id] || 0, questions: questionCount[m.id] || 0,
    }))
    mapped.sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))
    setMembers(mapped)
    setLoading(false)
  }

  function openAdd() {
    setForm({ full_name: '', email: '', role: 'quiz_manager' })
    setShowAdd(true)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) return toast.error('يرجى تعبئة الاسم والبريد الإلكتروني')
    setSaving(true)
    try {
      const { error } = await supabase.functions.invoke('invite-team-member', {
        body: { email: form.email.trim(), full_name: form.full_name.trim(), role: form.role },
      })
      if (error) {
        let msg = 'حدث خطأ أثناء الإضافة'
        try {
          const body = await (error as any).context?.json()
          if (body?.error) msg = body.error
        } catch { /* keep default */ }
        toast.error(msg)
      } else {
        toast.success('تم إرسال دعوة للعضو الجديد ✅ — هيستلم إيميل لتفعيل حسابه')
        setShowAdd(false)
        load()
      }
    } catch {
      toast.error('تعذر الاتصال بالسيرفر، حاول مرة أخرى')
    }
    setSaving(false)
  }

  return (
    <>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <button className="primary-admin" onClick={openAdd}><Plus size={16} /> إضافة عضو جديد</button>
        </div>
      )}

      {loading ? <Spinner /> : members.length === 0 ? (
        <EmptyState text="لا يوجد أعضاء فريق مسجّلون بعد" />
      ) : (
        <div className={`team-grid${members.length === 1 ? ' team-grid-single' : ''}`} data-searchable>
          {members.map((m, i) => (
            <article className="member-card" key={m.id}>
              <div className={`member-cover ${coverClass[i % coverClass.length]}`} />
              <span className={`member-avatar ${avatarClass[i % avatarClass.length]}`}>
                {m.avatar_url ? <img src={m.avatar_url} alt="" /> : initials(m.full_name)}
              </span>
              <h3>{m.full_name}</h3>
              <p>{m.email}</p>
              <span className={`role ${ROLE_BADGE[m.role] || ''}`}>{ROLE_LABEL[m.role] || m.role}</span>
              <div className="member-stats">
                {m.role === 'quiz_manager' ? (
                  <span><b>{m.questions}</b> سؤال</span>
                ) : (
                  <>
                    <span><b>{m.courses}</b> كورسات</span>
                    <span><b>{m.students}</b> طالب</span>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="إضافة عضو جديد لفريق العمل" onClose={() => setShowAdd(false)}>
          <form className="admin-form" onSubmit={handleAdd}>
            <label>الاسم الكامل<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="مثال: أحمد محمد" /></label>
            <label>البريد الإلكتروني<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" dir="ltr" /></label>
            <label>الدور
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ADDABLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <p className="adm-hint">هيتبعتله إيميل دعوة يقدر من خلاله يظبط كلمة المرور بنفسه ويدخل المنصة مباشرة بالدور المحدد.</p>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={saving}>{saving ? 'جاري الإرسال...' : 'إرسال الدعوة'}</button>
              <button type="button" className="ghost-button" onClick={() => setShowAdd(false)}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
