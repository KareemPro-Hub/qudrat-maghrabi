import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, EyeOff, BookOpen, Video } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Course } from '../../types'
import toast from 'react-hot-toast'

const emptyForm = { title: '', description: '', price: '', level: 'beginner', duration_hours: '' }

export default function AdminCourses() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  function openAdd() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(c: Course) {
    setEditing(c)
    setForm({ title: c.title, description: c.description || '', price: String(c.price), level: (c as any).level || 'beginner', duration_hours: String((c as any).duration_hours || '') })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.price) return toast.error('يرجى تعبئة العنوان والسعر')
    setSaving(true)
    const payload = { title: form.title, description: form.description, price: Number(form.price), level: form.level, duration_hours: Number(form.duration_hours) || null }

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
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-navy">الكورسات</h1>
          <p className="text-gray-500 mt-1">إدارة كورسات المنصة</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> إضافة كورس
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" /></div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-bold mb-4">لا يوجد كورسات بعد</p>
          <button onClick={openAdd} className="btn-primary">أضف أول كورس</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الكورس</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">السعر</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">المستوى</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الحالة</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-brand-navy">{c.title}</div>
                    <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{c.description}</div>
                  </td>
                  <td className="px-5 py-4 font-bold text-brand-pink">{c.price} ر.س</td>
                  <td className="px-5 py-4">
                    <span className="bg-purple-50 text-brand-purple text-xs font-bold px-2 py-1 rounded-lg">
                      {({'beginner': 'مبتدئ', 'intermediate': 'متوسط', 'advanced': 'متقدم'} as Record<string,string>)[(c as any).level] || 'مبتدئ'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.is_published ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {c.is_published ? '✅ منشور' : '⏸ مخفي'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/admin/lessons/${c.id}`)} className="flex items-center gap-1 px-3 py-2 text-brand-purple bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-xs font-bold"><Video size={14} /> الدروس</button>
                      <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-lg transition-colors"><Edit size={16} /></button>
                      <button onClick={() => togglePublish(c)} className="p-2 text-gray-400 hover:text-brand-pink hover:bg-pink-50 rounded-lg transition-colors">{c.is_published ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      <button onClick={() => deleteCourse(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-brand-lg">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-brand-navy">{editing ? 'تعديل الكورس' : 'إضافة كورس جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">عنوان الكورس *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" placeholder="مثال: القدرات الكمي — المستوى الأساسي" />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">الوصف</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows={3} placeholder="وصف مختصر للكورس..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">السعر (ر.س) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="input-field" placeholder="199" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">المستوى</label>
                  <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="input-field">
                    <option value="beginner">مبتدئ</option>
                    <option value="intermediate">متوسط</option>
                    <option value="advanced">متقدم</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-center py-3">
                  {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الكورس'}
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
