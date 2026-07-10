import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, EyeOff, BookOpen, Video, Upload, GripVertical } from 'lucide-react'
import SarSymbol from '../../components/SarSymbol'
import { supabase } from '../../lib/supabase'
import { Course } from '../../types'
import toast from 'react-hot-toast'
import {
  glassCard, TopSheen, primaryBtnStyle, outlineBtnStyle, inputStyle, labelStyle,
  iconBtnStyle, GlassBadge, GlassPageHeader, GlassSpinner, GlassEmptyState, GlassModal,
  tableWrapStyle, thStyle, tdStyle, trStyle,
} from '../../components/admin/glassKit'

const CLOUDINARY_CLOUD = 'dzgfvs0gi'
const CLOUDINARY_PRESET = 'qudrat_thumbnails'

const emptyForm = { title: '', description: '', price: '', level: 'beginner', duration_hours: '', thumbnail_url: '' }
const levelLabels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' }

export default function AdminCourses() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dragIndex = useRef<number | null>(null)

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('*').order('order_index', { ascending: true })
    setCourses(data || [])
    setLoading(false)
  }

  function handleDragStart(i: number) { dragIndex.current = i }

  async function handleDrop(dropIndex: number) {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return
    const reordered = [...courses]
    const [moved] = reordered.splice(dragIndex.current, 1)
    reordered.splice(dropIndex, 0, moved)
    setCourses(reordered)
    dragIndex.current = null
    await Promise.all(reordered.map((c, i) =>
      supabase.from('courses').update({ order_index: i }).eq('id', c.id)
    ))
    toast.success('تم حفظ الترتيب ✅')
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
      thumbnail_url: (c as any).thumbnail_url || ''
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
    if (json.secure_url) {
      setForm(f => ({ ...f, thumbnail_url: json.secure_url }))
      toast.success('تم رفع الصورة ✅')
    } else {
      toast.error('فشل رفع الصورة')
    }
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.price) return toast.error('يرجى تعبئة العنوان والسعر')
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      level: form.level,
      duration_hours: Number(form.duration_hours) || null,
      thumbnail_url: form.thumbnail_url || null
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
    await supabase.from('courses').update({ is_published: !c.is_published }).eq('id', c.id)
    toast.success(c.is_published ? 'تم إخفاء الكورس' : 'تم نشر الكورس ✅')
    fetchCourses()
  }

  async function deleteCourse(id: string) {
    if (!confirm('هل أنت متأكد من حذف الكورس؟')) return
    await supabase.from('courses').delete().eq('id', id)
    toast.success('تم الحذف')
    fetchCourses()
  }

  return (
    <div>
      <GlassPageHeader
        title="الكورسات"
        subtitle="إدارة كورسات المنصة"
        action={
          <button onClick={openAdd} style={primaryBtnStyle}>
            <Plus size={17} /> إضافة كورس
          </button>
        }
      />

      {loading ? (
        <GlassSpinner />
      ) : courses.length === 0 ? (
        <GlassEmptyState
          icon={<BookOpen size={40} />}
          text="لا يوجد كورسات بعد"
          action={<button onClick={openAdd} style={{ ...primaryBtnStyle, marginTop: 4 }}>أضف أول كورس</button>}
        />
      ) : (
        <div className="qm-glass" style={tableWrapStyle}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>الكورس</th>
                <th style={thStyle}>السعر</th>
                <th style={thStyle}>المستوى</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr
                  key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className="qm-row"
                  style={trStyle}
                >
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <GripVertical size={16} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'grab', flexShrink: 0 }} />
                      {(c as any).thumbnail_url ? (
                        <img src={(c as any).thumbnail_url} style={{ width: 48, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 48, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#F97316,#EC4899 50%,#7C3AED)', flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{c.title}</div>
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11.5, marginTop: 2, maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.description}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#F9A8D4' }}>{c.price} <SarSymbol /></td>
                  <td style={tdStyle}>
                    <GlassBadge variant="accent">{levelLabels[(c as any).level] || 'مبتدئ'}</GlassBadge>
                  </td>
                  <td style={tdStyle}>
                    <GlassBadge variant={c.is_published ? 'success' : 'neutral'}>{c.is_published ? '✅ منشور' : '⏸ مخفي'}</GlassBadge>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => navigate(`/admin/lessons/${c.id}`)} className="qm-btn-outline" style={{ ...outlineBtnStyle, padding: '7px 12px', fontSize: 11.5 }}>
                        <Video size={13} /> الدروس
                      </button>
                      <button onClick={() => openEdit(c)} className="qm-icon-btn" style={iconBtnStyle()}><Edit size={15} /></button>
                      <button onClick={() => togglePublish(c)} className="qm-icon-btn" style={iconBtnStyle()}>{c.is_published ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                      <button onClick={() => deleteCourse(c.id)} className="qm-icon-btn" style={iconBtnStyle(true)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <GlassModal title={editing ? 'تعديل الكورس' : 'إضافة كورس جديد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Thumbnail Upload */}
            <div>
              <label style={labelStyle}>صورة الغلاف</label>
              {form.thumbnail_url ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 140, marginBottom: 8 }}>
                  <img src={form.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, thumbnail_url: '' }))}
                    style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(239,68,68,0.85)', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>حذف</button>
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, border: '1.5px dashed rgba(255,255,255,0.25)', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }}>
                  {uploading ? (
                    <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.7)' }} />
                  ) : (
                    <>
                      <Upload size={22} style={{ color: 'rgba(255,255,255,0.35)', marginBottom: 8 }} />
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>اضغط لرفع صورة الغلاف</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>PNG, JPG — حتى 5MB</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>

            <div>
              <label style={labelStyle}>عنوان الكورس *</label>
              <input className="qm-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="مثال: القدرات الكمي — المستوى الأساسي" />
            </div>
            <div>
              <label style={labelStyle}>الوصف</label>
              <textarea className="qm-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="وصف مختصر للكورس..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>السعر *</label>
                <input type="number" className="qm-input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={inputStyle} placeholder="199" />
              </div>
              <div>
                <label style={labelStyle}>المستوى</label>
                <select className="qm-select" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} style={inputStyle}>
                  <option value="beginner">مبتدئ</option>
                  <option value="intermediate">متوسط</option>
                  <option value="advanced">متقدم</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="submit" disabled={saving || uploading} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>
                {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الكورس'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="qm-btn-outline" style={{ ...outlineBtnStyle, flex: 1 }}>إلغاء</button>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  )
}
