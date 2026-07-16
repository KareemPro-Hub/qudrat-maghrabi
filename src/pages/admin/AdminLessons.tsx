import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit, ArrowRight, Video, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { SectionToolbar, StatusBadge, TagBadge, Spinner, EmptyState, Modal } from '../../components/admin/lightKit'

const emptyForm = {
  title: '', chapter: '', description: '', video_id: '', thumbnail_url: '', duration_minutes: '', order_index: 0, is_free_preview: false
}

export default function AdminLessons() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (courseId) fetchData() }, [courseId])

  async function fetchData() {
    const [{ data: c }, { data: l }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index')
    ])
    setCourse(c)
    setLessons(l || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, order_index: lessons.length + 1 })
    setShowModal(true)
  }

  function openEdit(lesson: any) {
    setEditing(lesson)
    setForm({
      title: lesson.title,
      chapter: lesson.chapter || '',
      description: lesson.description || '',
      video_id: lesson.video_id || '',
      thumbnail_url: lesson.thumbnail_url || '',
      duration_minutes: String(lesson.duration_minutes || ''),
      order_index: lesson.order_index,
      is_free_preview: lesson.is_free_preview || false,
    })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return toast.error('عنوان الدرس مطلوب')
    setSaving(true)
    const payload = {
      title: form.title,
      chapter: form.chapter || null,
      description: form.description,
      video_id: form.video_id,
      thumbnail_url: form.thumbnail_url || null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      order_index: Number(form.order_index),
      is_free_preview: form.is_free_preview,
      course_id: courseId,
    }
    if (editing) {
      const { error } = await supabase.from('lessons').update(payload).eq('id', editing.id)
      if (error) toast.error('حدث خطأ')
      else { toast.success('تم التعديل ✅'); fetchData(); setShowModal(false) }
    } else {
      const { error } = await supabase.from('lessons').insert(payload)
      if (error) toast.error('حدث خطأ')
      else { toast.success('تمت الإضافة ✅'); fetchData(); setShowModal(false) }
    }
    setSaving(false)
  }

  async function deleteLesson(id: string) {
    if (!confirm('حذف الدرس ؟')) return
    await supabase.from('lessons').delete().eq('id', id)
    toast.success('تم الحذف')
    fetchData()
  }

  async function toggleFreePreview(lesson: any) {
    await supabase.from('lessons').update({ is_free_preview: !lesson.is_free_preview }).eq('id', lesson.id)
    fetchData()
  }

  return (
    <>
      <SectionToolbar
        title={course?.title || 'دروس الكورس'}
        subtitle={`${lessons.length} ${lessons.length === 1 ? 'درس' : 'دروس'} · إدارة دروس الكورس ومحتواه`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ghost-button" onClick={() => navigate('/admin/courses')}>
              <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> رجوع للكورسات
            </button>
            <button className="primary-admin" onClick={openAdd}><Plus size={16} /> إضافة درس</button>
          </div>
        }
      />

      {loading ? (
        <Spinner />
      ) : lessons.length === 0 ? (
        <EmptyState text="لا توجد دروس بعد" action={<button className="primary-admin" onClick={openAdd}>أضف أول درس</button>} />
      ) : (
        <article className="admin-card data-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الدرس</th>
                  <th>المدة</th>
                  <th>الفيديو</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson, i) => (
                  <tr key={lesson.id}>
                    <td>
                      <span className="table-course c3" style={{ fontSize: 11 }}>{i + 1}</span>
                    </td>
                    <td>
                      <b>{lesson.title}</b>
                      {lesson.chapter && <span className="cell-sub">{lesson.chapter}</span>}
                    </td>
                    <td>{lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : '—'}</td>
                    <td>
                      {lesson.video_id ? (
                        <TagBadge variant="purple"><Video size={10} style={{ verticalAlign: 'middle', marginLeft: 4 }} />مرفوع</TagBadge>
                      ) : (
                        <span className="cell-sub">لم يُرفع بعد</span>
                      )}
                    </td>
                    <td><StatusBadge variant={lesson.is_free_preview ? 'success' : 'neutral'}>{lesson.is_free_preview ? 'مجاني' : 'عادي'}</StatusBadge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="row-action" onClick={() => toggleFreePreview(lesson)} title={lesson.is_free_preview ? 'إلغاء المجاني' : 'جعله مجانيًا'}>
                          {lesson.is_free_preview ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button className="row-action" onClick={() => openEdit(lesson)}><Edit size={12} /></button>
                        <button className="row-action" onClick={() => deleteLesson(lesson.id)} style={{ color: '#d33b55' }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {showModal && (
        <Modal title={editing ? 'تعديل الدرس' : 'إضافة درس جديد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="admin-form">
            <label>عنوان الدرس *<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثال: مقدمة في النسب والتناسب" /></label>
            <label>
              الباب
              <input value={form.chapter} onChange={e => setForm({ ...form, chapter: e.target.value })} placeholder="مثال: الباب الأول — النسب والتناسب" />
            </label>
            <label>الوصف<textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر للدرس..." /></label>
            <label>
              رقم الفيديو (Bunny Video ID)
              <input value={form.video_id} onChange={e => setForm({ ...form, video_id: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" />
            </label>
            <label>
              رابط صورة الغلاف (Thumbnail URL)
              <input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." dir="ltr" />
            </label>
            <div className="form-grid">
              <label>المدة (دقيقة)<input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} placeholder="15" /></label>
              <label>الترتيب<input type="number" value={form.order_index} onChange={e => setForm({ ...form, order_index: Number(e.target.value) })} min={1} /></label>
            </div>
            <div className="form-row" style={{ padding: '10px 12px', borderRadius: 12, background: '#f2fbf6', border: '1px solid #d9f1e7' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.is_free_preview} onChange={e => setForm({ ...form, is_free_preview: e.target.checked })} style={{ width: 16, height: 16 }} />
                <span>
                  <b style={{ display: 'block', fontSize: 12 }}>درس مجاني (Preview)</b>
                  <small style={{ display: 'block', color: '#8a7d91', fontSize: 10 }}>يظهر للطلاب قبل الاشتراك كعينة مجانية</small>
                </span>
              </label>
            </div>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={saving}>{saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الدرس'}</button>
              <button type="button" className="ghost-button" onClick={() => setShowModal(false)}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
