import { useEffect, useState } from 'react'
import { Mail, Pencil, Plus, Trash2 } from 'lucide-react'
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
]
const MANAGEABLE_ROLES = ADDABLE_ROLES

type Member = { id: string; full_name: string; email: string; role: string; avatar_url?: string; courses: number; students: number; questions: number }
type InviteResult = { success?: boolean; existing?: boolean; invite_link?: string | null }
type ManageResult = { success?: boolean }
type EmailResult = { success?: boolean; error?: string; code?: string }
type InviteAttempt = { success: boolean; memberReady: boolean; existing?: boolean; message?: string }

async function functionErrorMessage(error: unknown, fallback: string) {
  try {
    const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } })?.context?.json?.()
    return body?.error || fallback
  } catch {
    return fallback
  }
}

async function createAndSendInvitation(
  member: Pick<Member, 'full_name' | 'email' | 'role'>,
  accessToken: string,
): Promise<InviteAttempt> {
  const { data: result, error } = await supabase.functions.invoke<InviteResult>('invite-team-member', {
    body: {
      email: member.email.trim(),
      full_name: member.full_name.trim(),
      role: member.role,
    },
  })

  if (error) {
    return {
      success: false,
      memberReady: false,
      message: await functionErrorMessage(error, 'حدث خطأ أثناء تجهيز دعوة العضو'),
    }
  }

  const link = result?.invite_link?.trim()
  if (!result?.success || !link) {
    return {
      success: false,
      memberReady: true,
      message: 'تم تجهيز حساب العضو لكن تعذّر إنشاء رابط الدعوة. حاول إعادة الإرسال.',
    }
  }

  const emailResponse = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: member.email.trim().toLowerCase(),
      type: 'team_invite',
      data: {
        memberName: member.full_name.trim(),
        inviteLink: link,
        roleLabel: ROLE_LABEL[member.role] || member.role,
      },
    }),
  })
  const emailResult = await emailResponse.json().catch(() => null) as EmailResult | null

  if (!emailResponse.ok) {
    return {
      success: false,
      memberReady: true,
      existing: result.existing,
      message: emailResult?.error || 'تم إنشاء العضو، لكن تعذّر إرسال الإيميل. يمكنك إعادة إرسال الدعوة من بطاقته.',
    }
  }

  return { success: true, memberReady: true, existing: result.existing }
}

export default function AdminTeam() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'quiz_manager' })
  const [saving, setSaving] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [editRole, setEditRole] = useState('quiz_manager')
  const [managing, setManaging] = useState(false)
  const [invitingMemberId, setInvitingMemberId] = useState<string | null>(null)

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

  function closeAdd() {
    setShowAdd(false)
  }

  function openRoleEditor(member: Member) {
    setEditRole(member.role)
    setEditingMember(member)
  }

  async function updateMemberRole(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember) return
    setManaging(true)
    try {
      const { data: result, error } = await supabase.functions.invoke<ManageResult>('manage-team-member', {
        body: { action: 'update_role', member_id: editingMember.id, role: editRole },
      })
      if (error || !result?.success) {
        toast.error(await functionErrorMessage(error, 'تعذّر تحديث صلاحيات العضو'))
        return
      }
      setEditingMember(null)
      await load()
      toast.success('تم تحديث صلاحيات العضو ✅')
    } catch {
      toast.error('تعذر الاتصال بالسيرفر، حاول مرة أخرى')
    } finally {
      setManaging(false)
    }
  }

  async function deleteMember() {
    if (!deletingMember) return
    setManaging(true)
    try {
      const { data: result, error } = await supabase.functions.invoke<ManageResult>('manage-team-member', {
        body: { action: 'delete', member_id: deletingMember.id },
      })
      if (error || !result?.success) {
        toast.error(await functionErrorMessage(error, 'تعذّر حذف العضو'))
        return
      }
      setDeletingMember(null)
      await load()
      toast.success('تم حذف العضو وحساب تسجيل دخوله ✅')
    } catch {
      toast.error('تعذر الاتصال بالسيرفر، حاول مرة أخرى')
    } finally {
      setManaging(false)
    }
  }

  async function resendInvitation(member: Member) {
    setInvitingMemberId(member.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('انتهت الجلسة، سجّل الدخول من جديد')
        return
      }

      const attempt = await createAndSendInvitation(member, session.access_token)
      if (!attempt.success) {
        toast.error(attempt.message || 'تعذّر إرسال الدعوة')
        return
      }

      toast.success('تم إرسال دعوة جديدة إلى بريد العضو ✅')
    } catch {
      toast.error('تعذر الاتصال بالسيرفر، حاول مرة أخرى')
    } finally {
      setInvitingMemberId(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) return toast.error('يرجى تعبئة الاسم والبريد الإلكتروني')
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('انتهت الجلسة، سجّل الدخول من جديد')
        return
      }

      const attempt = await createAndSendInvitation({
        full_name: form.full_name,
        email: form.email,
        role: form.role,
      }, session.access_token)

      if (!attempt.success) {
        if (attempt.memberReady) {
          setShowAdd(false)
          await load()
        }
        toast.error(attempt.message || 'تعذّر إضافة العضو وإرسال الدعوة')
        return
      }

      toast.success(attempt.existing
        ? 'تم تحديث العضو وإرسال دعوة جديدة إلى بريده ✅'
        : 'تمت إضافة العضو وإرسال الدعوة إلى بريده ✅')
      setShowAdd(false)
      await load()
    } catch {
      toast.error('تعذر الاتصال بالسيرفر، حاول مرة أخرى')
    } finally {
      setSaving(false)
    }
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
            <article className={`member-card${m.role === 'admin' ? ' member-card-owner' : ''}`} key={m.id}>
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
              {isAdmin && m.role !== 'admin' && (
                <div className="member-actions">
                  <button
                    type="button"
                    className="member-action"
                    onClick={() => resendInvitation(m)}
                    disabled={invitingMemberId === m.id}
                    aria-label={`إعادة إرسال الدعوة إلى ${m.full_name}`}
                  >
                    <Mail size={15} /> {invitingMemberId === m.id ? 'جاري...' : 'الدعوة'}
                  </button>
                  <button
                    type="button"
                    className="member-action"
                    onClick={() => openRoleEditor(m)}
                    aria-label={`تعديل صلاحيات ${m.full_name}`}
                  >
                    <Pencil size={15} /> الصلاحيات
                  </button>
                  <button
                    type="button"
                    className="member-action danger"
                    onClick={() => setDeletingMember(m)}
                    aria-label={`حذف ${m.full_name}`}
                  >
                    <Trash2 size={15} /> حذف
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="إضافة عضو جديد لفريق العمل" onClose={() => { if (!saving) closeAdd() }}>
          <form className="admin-form" onSubmit={handleAdd}>
            <label>الاسم الكامل<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="مثال: أحمد محمد" /></label>
            <label>البريد الإلكتروني<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" dir="ltr" /></label>
            <label>الدور
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ADDABLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <p className="adm-hint">بمجرد الإضافة، هيتبعت للعضو إيميل تلقائي يعيّن منه كلمة المرور ويدخل المنصة بالدور المحدد.</p>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={saving}>{saving ? 'جاري الإضافة والإرسال...' : 'إضافة العضو وإرسال الدعوة'}</button>
              <button type="button" className="ghost-button" onClick={closeAdd} disabled={saving}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {editingMember && (
        <Modal title={`تعديل صلاحيات ${editingMember.full_name}`} onClose={() => { if (!managing) setEditingMember(null) }}>
          <form className="admin-form" onSubmit={updateMemberRole}>
            <p className="adm-hint" style={{ marginTop: 0 }}>
              اختر الدور المناسب. تتغير صفحات وأدوات العضو حسب الصلاحيات المرتبطة بهذا الدور.
            </p>
            <label>الدور والصلاحيات
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                {MANAGEABLE_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </label>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={managing}>
                {managing ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
              </button>
              <button type="button" className="ghost-button" onClick={() => setEditingMember(null)} disabled={managing}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {deletingMember && (
        <Modal title="تأكيد حذف العضو" onClose={() => { if (!managing) setDeletingMember(null) }}>
          <div className="admin-form">
            <p className="delete-member-warning">
              هل تريد حذف <strong>{deletingMember.full_name}</strong> نهائيًا؟ سيُحذف حساب تسجيل الدخول ويمكنك دعوته من جديد لاحقًا.
            </p>
            <div className="form-row">
              <button type="button" className="danger-admin" onClick={deleteMember} disabled={managing}>
                <Trash2 size={16} /> {managing ? 'جاري الحذف...' : 'حذف العضو'}
              </button>
              <button type="button" className="ghost-button" onClick={() => setDeletingMember(null)} disabled={managing}>إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
