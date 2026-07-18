import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Spinner, EmptyState, initials } from '../../components/admin/lightKit'

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

type Member = { id: string; full_name: string; email: string; role: string; avatar_url?: string; courses: number; students: number; questions: number }

export default function AdminTeam() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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
    load()
  }, [])

  return (
    <>
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
    </>
  )
}
