import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit, ArrowRight, Video, Eye, EyeOff, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import {
  glassCard, TopSheen, primaryBtnStyle, outlineBtnStyle, inputStyle, labelStyle,
  iconBtnStyle, GlassBadge, GlassSpinner, GlassEmptyState, GlassModal,
} from '../../components/admin/glassKit'

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
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button onClick={() => navigate('/admin/courses')} className="qm-icon-btn" style={iconBtnStyle()}>
          <ArrowRight size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>الكورسات ← </p>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: '#fff', margin: '2px 0 0', textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>{course?.title || 'دروس الكورس'}</h1>
        </div>
        <button onClick={openAdd} style={primaryBtnStyle}>
          <Plus size={17} /> إضافة درس
        </button>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, margin: '0 0 26px 0', paddingRight: 46 }}>{lessons.length} درس</p>

      {loading ? (
        <GlassSpinner />
      ) : lessons.length === 0 ? (
        <GlassEmptyState
          icon={<Video size={40} />}
          text="لا توجد دروس بعد"
          action={<button onClick={openAdd} style={{ ...primaryBtnStyle, marginTop: 4 }}>أضف أول درس</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lessons.map((lesson, i) => (
            <div key={lesson.id} className="qm-glass" style={{ ...glassCard, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <TopSheen />
              <div style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}><GripVertical size={18} /></div>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#F97316,#EC4899 50%,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 13.5, margin: 0 }}>{lesson.title}</h3>
                  {lesson.is_free_preview && <GlassBadge variant="success">مجاني</GlassBadge>}
                  {lesson.video_id && <GlassBadge variant="accent"><Video size={10} style={{ display: 'inline', marginLeft: 4 }} />VdoCipher</GlassBadge>}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11.5, margin: '4px 0 0' }}>
                  {lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : 'مدة غير محددة'}
                  {lesson.video_id && <span style={{ marginRight: 8 }}>· ID: {lesson.video_id.substring(0, 12)}...</span>}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button onClick={() => toggleFreePreview(lesson)} className="qm-icon-btn" style={iconBtnStyle()} title={lesson.is_free_preview ? 'إلغاء المجاني' : 'جعله مجانيًا'}>
                  {lesson.is_free_preview ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => openEdit(lesson)} className="qm-icon-btn" style={iconBtnStyle()}><Edit size={15} /></button>
                <button onClick={() => deleteLesson(lesson.id)} className="qm-icon-btn" style={iconBtnStyle(true)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <GlassModal title={editing ? 'تعديل الدرس' : 'إضافة درس جديد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>عنوان الدرس *</label>
              <input className="qm-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                style={inputStyle} placeholder="مثال: مقدمة في النسب والتناسب" />
            </div>
            <div>
              <label style={labelStyle}>الباب</label>
              <input className="qm-input" value={form.chapter} onChange={e => setForm({ ...form, chapter: e.target.value })}
                style={inputStyle} placeholder="مثال: الباب الأول — النسب والتناسب" />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>الدروس اللي لها نفس اسم الباب تتجمع تحته تلقائيًا</p>
            </div>
            <div>
              <label style={labelStyle}>الوصف</label>
              <textarea className="qm-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="وصف مختصر للدرس..." />
            </div>
            <div>
              <label style={labelStyle}>رقم الفيديو (VdoCipher Video ID)</label>
              <input className="qm-input" value={form.video_id} onChange={e => setForm({ ...form, video_id: e.target.value })}
                style={inputStyle} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>من لوحة VdoCipher → Videos → نسخ الـ ID</p>
            </div>
            <div>
              <label style={labelStyle}>رابط صورة الغلاف (Thumbnail URL)</label>
              <input className="qm-input" value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })}
                style={inputStyle} placeholder="https://..." dir="ltr" />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>ارفع الصورة على Google Drive أو Imgur وضع الرابط هنا</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>المدة (دقيقة)</label>
                <input type="number" className="qm-input" value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                  style={inputStyle} placeholder="15" />
              </div>
              <div>
                <label style={labelStyle}>الترتيب</label>
                <input type="number" className="qm-input" value={form.order_index}
                  onChange={e => setForm({ ...form, order_index: Number(e.target.value) })}
                  style={inputStyle} min={1} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <div
                onClick={() => setForm({ ...form, is_free_preview: !form.is_free_preview })}
                className="qm-check"
                style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.is_free_preview ? '#4ADE80' : 'rgba(255,255,255,0.3)'}`, background: form.is_free_preview ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                {form.is_free_preview && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>درس مجاني (Preview)</p>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>يظهر للطلاب قبل الاشتراك كعينة مجانية</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>
                {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الدرس'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="qm-btn-outline" style={{ ...outlineBtnStyle, flex: 1 }}>إلغاء</button>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  )
}
