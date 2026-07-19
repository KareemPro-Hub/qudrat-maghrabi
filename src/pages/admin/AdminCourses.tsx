import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, EyeOff, Video, Upload, ArrowRight, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Course } from '../../types'
import toast from 'react-hot-toast'
import { SectionToolbar, Spinner, EmptyState, Modal } from '../../components/admin/lightKit'

const CLOUDINARY_CLOUD = 'dzgfvs0gi'
const CLOUDINARY_PRESET = 'qudrat_thumbnails'

const emptyForm = { title: '', description: '', price: '', level: 'beginner', duration_hours: '', thumbnail_url: '', parent_course_id: '' }
const levelLabels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' }
const levelClass: Record<string, string> = { beginner: '', intermediate: 'orange', advanced: 'purple' }
const coverClass = ['c1', 'c2', 'c3', 'c4']

type CourseStats = { lessons: number; students: number; completion: number }

export default function AdminCourses() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [statsByCourse, setStatsByCourse] = useState<Record<string, CourseStats>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [viewParentId, setViewParentId] = useState<string | null>(null)

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    setLoading(true)
    const { data } = await supabase.from('courses').select('*').order('order_index', { ascending: true })
    const list = data || []
    setCourses(list)

    if (list.length) {
      const ids = list.map((c) => c.id)
      const [lessonsRes, enrollRes, progressRes] = await Promise.all([
        supabase.from('lessons').select('id, course_id').in('course_id', ids),
        supabase.from('enrollments').select('course_id').eq('payment_status', 'paid').in('course_id', ids),
        supabase.from('lesson_progress').select('watch_percentage, lessons!inner(course_id)').in('lessons.course_id', ids),
      ])
      const stats: Record<string, CourseStats> = {}
      ids.forEach((id) => { stats[id] = { lessons: 0, students: 0, completion: 0 } })
      ;(lessonsRes.data || []).forEach((l: any) => { if (stats[l.course_id]) stats[l.course_id].lessons++ })
      ;(enrollRes.data || []).forEach((e: any) => { if (stats[e.course_id]) stats[e.course_id].students++ })
      const progAgg: Record<string, { total: number; count: number }> = {}
      ;(progressRes.data || []).forEach((p: any) => {
        const cid = p.lessons?.course_id
        if (!cid) return
        if (!progAgg[cid]) progAgg[cid] = { total: 0, count: 0 }
        progAgg[cid].total += p.watch_percentage || 0
        progAgg[cid].count++
      })
      Object.keys(progAgg).forEach((cid) => {
        if (stats[cid]) stats[cid].completion = Math.round(progAgg[cid].total / progAgg[cid].count)
      })
      setStatsByCourse(stats)
    } else {
      setStatsByCourse({})
    }
    setLoading(false)
  }

  function openAdd() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(c: Course) {
    setEditing(c)
    setForm({
      title: c.title,
      description: c.description || '',
      price: String(c.price),
      level: (c as any).level || 'beginner',
      duration_hours: String((c as any).duration_hours || ''),
      thumbnail_url: (c as any).thumbnail_url || '',
      parent_course_id: c.parent_course_id || '',
    })
    setShowModal(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: data })
    const json = await res.json()
    if (json.secure_url) { setForm((f) => ({ ...f, thumbnail_url: json.secure_url })); toast.success('تم رفع الصورة ✅') }
    else toast.error('فشل رفع الصورة')
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return toast.error('يرجى تعبئة عنوان الكورس')
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description,
      price: form.price ? Number(form.price) : 0,
      currency: 'EGP',
      level: form.level,
      duration_hours: Number(form.duration_hours) || null,
      thumbnail_url: form.thumbnail_url || null,
      parent_course_id: form.parent_course_id || null,
    }
    if (editing) {
      const { error } = await supabase.from('courses').update(payload).eq('id', editing.id)
      if (error) toast.error('حدث خطأ'); else { toast.success('تم التحديث ✅'); fetchCourses(); setShowModal(false) }
    } else {
      const { error } = await supabase.from('courses').insert({ ...payload, is_published: false })
      if (error) toast.error('حدث خطأ'); else { toast.success('تم إضافة الكورس ✅'); fetchCourses(); setShowModal(false) }
    }
    setSaving(false)
  }

  async function togglePublish(c: Course) {
    const { error } = await supabase.from('courses').update({ is_published: !c.is_published }).eq('id', c.id)
    if (error) { toast.error('حدث خطأ أثناء تغيير حالة النشر'); return }
    toast.success(c.is_published ? 'تم إخفاء الكورس' : 'تم نشر الكورس ✅')
    fetchCourses()
  }

  async function deleteCourse(id: string) {
    if (!confirm('هل أنت متأكد من حذف الكورس ؟')) return
    await supabase.from('courses').delete().eq('id', id)
    toast.success('تم الحذف')
    fetchCourses()
  }

  const totalLessons = Object.values(statsByCourse).reduce((s, c) => s + c.lessons, 0)
  const totalStudents = Object.values(statsByCourse).reduce((s, c) => s + c.students, 0)
  const avgCompletion = courses.length ? Math.round(Object.values(statsByCourse).reduce((s, c) => s + c.completion, 0) / courses.length) : 0

  // الكورسات المؤهلة تبقى "أب" — أي كورس مستقل (مش هو نفسه فرعي) وغير الكورس اللي بيتعدّل حاليًا
  const parentOptions = courses.filter((c) => !c.parent_course_id && c.id !== editing?.id)
  const childrenCountByParent: Record<string, number> = {}
  courses.forEach((c) => { if (c.parent_course_id) childrenCountByParent[c.parent_course_id] = (childrenCountByParent[c.parent_course_id] || 0) + 1 })
  const titleById: Record<string, string> = {}
  courses.forEach((c) => { titleById[c.id] = c.title })

  // الكروت بتعرض الكورسات الرئيسية بس (اللي مالهاش أب) — الضغط على كورس أب (باقة) يفتح الفرعيين اللي جواه
  const viewParent = viewParentId ? courses.find((c) => c.id === viewParentId) || null : null
  const gridCourses = (viewParentId
    ? courses.filter((c) => c.parent_course_id === viewParentId)
    : courses.filter((c) => !c.parent_course_id)
  ).sort((a, b) => (statsByCourse[b.id]?.students || 0) - (statsByCourse[a.id]?.students || 0))

  function handleCardClick(c: Course) {
    if (!viewParentId && childrenCountByParent[c.id] > 0) setViewParentId(c.id)
    else navigate(`/admin/lessons/${c.id}`)
  }

  return (
    <>
      <SectionToolbar
        title="إدارة الكورسات"
        subtitle="نظّم المحتوى وتابع أداء كل مسار تعليمي."
        action={<button className="primary-admin" onClick={openAdd}><Plus size={16} /> إضافة كورس جديد</button>}
      />

      <div className="mini-metrics">
        <article><span>{loading ? '…' : courses.length}</span><p>إجمالي الكورسات<small>{courses.filter((c) => c.is_published).length} منشورة · {courses.filter((c) => !c.is_published).length} مسودة</small></p></article>
        <article><span>{loading ? '…' : totalLessons}</span><p>إجمالي الدروس<small>عبر جميع الكورسات</small></p></article>
        <article><span>{loading ? '…' : totalStudents}</span><p>الطلاب المسجلون<small>اشتراكات مدفوعة</small></p></article>
        <article><span>{loading ? '…' : `${avgCompletion}%`}</span><p>متوسط الإكمال<small>عبر كل الكورسات</small></p></article>
      </div>

      {loading ? <Spinner /> : courses.length === 0 ? (
        <EmptyState text="لا يوجد كورسات بعد" action={<button className="primary-admin" onClick={openAdd}>أضف أول كورس</button>} />
      ) : (
        <>
          {gridCourses.length > 0 && (
            <>
              {viewParent && (
                <div className="course-grid-head">
                  <button type="button" className="course-grid-back" onClick={() => setViewParentId(null)}>
                    <ArrowRight size={14} /> كل الكورسات
                  </button>
                  <h4>الكورسات الفرعية داخل: {viewParent.title}</h4>
                </div>
              )}
              <div className="course-card-grid">
                {gridCourses.map((c, i) => {
                  const s = statsByCourse[c.id] || { lessons: 0, students: 0, completion: 0 }
                  const childCount = childrenCountByParent[c.id] || 0
                  const isBundle = !viewParentId && childCount > 0
                  return (
                    <article className="course-manage-card" key={c.id} onClick={() => handleCardClick(c)}>
                      <span className={`course-cover ${coverClass[i % coverClass.length]}`}>
                        {(c as any).thumbnail_url ? <img src={(c as any).thumbnail_url} alt="" /> : c.title.charAt(0)}
                      </span>
                      <div>
                        {isBundle ? (
                          <span className="course-bundle-badge"><Layers size={12} /> باقة · {childCount} كورس فرعي</span>
                        ) : (
                          <small className={`course-label ${levelClass[(c as any).level] || ''}`}>{levelLabels[(c as any).level] || 'مبتدئ'}</small>
                        )}
                        <h3>{c.title}</h3>
                        {c.parent_course_id && titleById[c.parent_course_id] && (
                          <small className="cell-sub">فرعي ضمن: {titleById[c.parent_course_id]}</small>
                        )}
                        <p>{isBundle ? 'اضغط لعرض الكورسات الفرعية' : `${s.lessons} درسًا · ${s.students} طالب`}</p>
                        {!isBundle && <i><u style={{ width: `${s.completion}%` }} /></i>}
                        <footer>
                          <span>{isBundle ? '' : c.price > 0 ? `${c.price} ج.م` : 'مجاني'}</span>
                          <b className={`status ${c.is_published ? 'success' : 'neutral'}`}>{c.is_published ? 'منشور' : 'مسودة'}</b>
                        </footer>
                        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                          {!isBundle && (
                            <button className="row-action" onClick={() => navigate(`/admin/lessons/${c.id}`)}><Video size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />الدروس</button>
                          )}
                          <button className="row-action" onClick={() => openEdit(c)}><Edit size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />تعديل</button>
                          <button className="row-action" onClick={() => togglePublish(c)}>{c.is_published ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                          <button className="row-action" onClick={() => deleteCourse(c.id)} style={{ color: '#d33b55' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}

          {gridCourses.length === 0 && (
            <EmptyState text={viewParent ? 'مفيش كورسات فرعية جوه الكورس ده لسة' : 'لا يوجد كورسات رئيسية بعد'} action={<button className="primary-admin" onClick={openAdd}>أضف كورس</button>} />
          )}
        </>
      )}

      {showModal && (
        <Modal title={editing ? 'تعديل الكورس' : 'إضافة كورس جديد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="admin-form">
            <label>
              صورة الغلاف
              {form.thumbnail_url ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', width: '100%', aspectRatio: '16 / 9', background: '#000' }}>
                  <img src={form.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, thumbnail_url: '' }))} style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(211,59,85,.9)', color: '#fff', fontSize: 10, padding: '4px 10px', borderRadius: 8, border: 'none' }}>حذف</button>
                </div>
              ) : (
                <label className="adm-thumb-drop">
                  {uploading ? <div className="adm-loading"><i /></div> : (<><Upload size={20} /><span>اضغط لرفع صورة الغلاف</span></>)}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </label>
            <label>عنوان الكورس *<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: القدرات الكمي" /></label>
            <label>الوصف<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر للكورس..." /></label>
            <div className="form-grid">
              <label>السعر بالجنيه المصري (اختياري)<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="اتركه فاضي لو الكورس أب/باقة بدون سعر مباشر" /></label>
              <label>المستوى
                <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  <option value="beginner">مبتدئ</option>
                  <option value="intermediate">متوسط</option>
                  <option value="advanced">متقدم</option>
                </select>
              </label>
            </div>
            <label>
              الكورس الأب (اختياري)
              <select value={form.parent_course_id} onChange={(e) => setForm({ ...form, parent_course_id: e.target.value })}>
                <option value="">— كورس مستقل —</option>
                {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            {form.parent_course_id === '' && !editing?.parent_course_id && (
              <small className="cell-sub" style={{ marginTop: -12 }}>لو الكورس ده باقة هتحط جواها كورسات فرعية بعدين، سيبه بدون سعر وبدون كورس أب — وبعدين اربط كل كورس فرعي بيه من هنا.</small>
            )}
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={saving || uploading}>{saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الكورس'}</button>
              <button type="button" className="ghost-button" onClick={() => setShowModal(false)}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
