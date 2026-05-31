import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit, ArrowRight, Video, Eye, EyeOff, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const emptyForm = {
  title: '', description: '', video_id: '', thumbnail_url: '', duration_minutes: '', order_index: 0, is_free_preview: false
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
    if (!confirm('حذف الدرس؟')) return
    await supabase.from('lessons').delete().eq('id', id)
    toast.success('تم الحذف')
    fetchData()
  }

  async function toggleFreePreview(lesson: any) {
    await supabase.from('lessons').update({ is_free_preview: !lesson.is_free_preview }).eq('id', lesson.id)
    fetchData()
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/admin/courses')} className="text-gray-400 hover:text-brand-navy transition-colors">
          <ArrowRight size={20} />
        </button>
        <div className="flex-1">
          <p className="text-gray-400 text-sm">الكورسات ← </p>
          <h1 className="text-2xl font-extrabold text-brand-navy">{course?.title || 'دروس الكورس'}</h1>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> إضافة درس
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-8 mr-8">{lessons.length} درس</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Video size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-bold mb-4">لا توجد دروس بعد</p>
          <button onClick={openAdd} className="btn-primary">أضف أول درس</button>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, i) => (
            <div key={lesson.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-brand-pink/30 transition-colors">
              <div className="text-gray-300 flex-shrink-0"><GripVertical size={20} /></div>
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-brand-navy">{lesson.title}</h3>
                  {lesson.is_free_preview && (
                    <span className="text-xs bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full">مجاني</span>
                  )}
                  {lesson.video_id && (
                    <span className="text-xs bg-purple-100 text-brand-purple font-bold px-2 py-0.5 rounded-full">
                      <Video size={10} className="inline ml-1" />VdoCipher
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mt-0.5">
                  {lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : 'مدة غير محددة'}
                  {lesson.video_id && <span className="mr-2">· ID: {lesson.video_id.substring(0, 12)}...</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleFreePreview(lesson)}
                  className={`p-2 rounded-lg transition-colors text-sm font-bold ${lesson.is_free_preview ? 'text-green-500 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                  title={lesson.is_free_preview ? 'إلغاء المجاني' : 'جعله مجانياً'}>
                  {lesson.is_free_preview ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => openEdit(lesson)}
                  className="p-2 text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-lg transition-colors">
                  <Edit size={16} />
                </button>
                <button onClick={() => deleteLesson(lesson.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-brand-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-extrabold text-brand-navy">{editing ? 'تعديل الدرس' : 'إضافة درس جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">عنوان الدرس *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="input-field" placeholder="مثال: مقدمة في النسب والتناسب" />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">الوصف</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input-field" rows={2} placeholder="وصف مختصر للدرس..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">
                  رقم الفيديو (VdoCipher Video ID)
                </label>
                <input value={form.video_id} onChange={e => setForm({ ...form, video_id: e.target.value })}
                  className="input-field" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" />
                <p className="text-xs text-gray-400 mt-1">من لوحة VdoCipher → Videos → نسخ الـ ID</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">رابط صورة الغلاف (Thumbnail URL)</label>
                <input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })}
                  className="input-field" placeholder="https://..." dir="ltr" />
                <p className="text-xs text-gray-400 mt-1">ارفع الصورة على Google Drive أو Imgur وضع الرابط هنا</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">المدة (دقيقة)</label>
                  <input type="number" value={form.duration_minutes}
                    onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                    className="input-field" placeholder="15" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">الترتيب</label>
                  <input type="number" value={form.order_index}
                    onChange={e => setForm({ ...form, order_index: Number(e.target.value) })}
                    className="input-field" min={1} />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div
                  onClick={() => setForm({ ...form, is_free_preview: !form.is_free_preview })}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${form.is_free_preview ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                  {form.is_free_preview && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-navy">درس مجاني (Preview)</p>
                  <p className="text-xs text-gray-500">يظهر للطلاب قبل الاشتراك كعينة مجانية</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 text-center">
                  {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الدرس'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1 py-3">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
