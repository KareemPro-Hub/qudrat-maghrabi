import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit, ArrowRight, Video, Eye, EyeOff, FileText, Upload, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { SectionToolbar, TagBadge, Spinner, EmptyState, Modal } from '../../components/admin/lightKit'

const CLOUDINARY_CLOUD = 'dzgfvs0gi'
const CLOUDINARY_PRESET = 'qudrat_thumbnails'
const coverClass = ['c1', 'c2', 'c3', 'c4']

const emptyChapterForm = { title: '', cover_url: '', order_index: 0 }
const emptyForm = {
  title: '', description: '', video_id: '', thumbnail_url: '', duration_minutes: '', order_index: 0, is_free_preview: false
}
const emptyFileForm = { title: '', file_url: '', size_label: '', file_type: 'pdf', order_index: 0 }

const UNASSIGNED = { id: null as string | null, title: 'دروس بدون باب' }

export default function AdminLessons() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [allLessons, setAllLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // إدارة الأبواب
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [editingChapter, setEditingChapter] = useState<any>(null)
  const [chapterForm, setChapterForm] = useState(emptyChapterForm)
  const [savingChapter, setSavingChapter] = useState(false)
  const [uploadingChapterCover, setUploadingChapterCover] = useState(false)

  // الباب المفتوح حاليًا لإدارة دروسه (null = شاشة الأبواب)
  const [activeChapter, setActiveChapter] = useState<{ id: string | null; title: string } | null>(null)

  // إدارة الدروس داخل الباب
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [fetchingBunny, setFetchingBunny] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => { if (courseId) fetchData() }, [courseId])

  async function fetchData() {
    setLoading(true)
    const [{ data: c }, { data: ch }, { data: l }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('chapters').select('*').eq('course_id', courseId).order('order_index'),
      supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index'),
    ])
    setCourse(c)
    setChapters(ch || [])
    setAllLessons(l || [])
    setLoading(false)
  }

  const lessonsOf = (chapterId: string | null) => allLessons.filter((l) => (l.chapter_id || null) === chapterId)
  const unassignedCount = lessonsOf(null).length
  const currentLessons = activeChapter ? lessonsOf(activeChapter.id) : []

  function fmtCount(n: number) { return `${n} ${n === 1 ? 'درس' : 'دروس'}` }

  // ===== الأبواب: CRUD =====
  function openAddChapter() {
    setEditingChapter(null)
    setChapterForm({ ...emptyChapterForm, order_index: chapters.length + 1 })
    setShowChapterModal(true)
  }

  function openEditChapter(ch: any) {
    setEditingChapter(ch)
    setChapterForm({ title: ch.title, cover_url: ch.cover_url || '', order_index: ch.order_index || 0 })
    setShowChapterModal(true)
  }

  async function handleChapterCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingChapterCover(true)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: data })
    const json = await res.json()
    if (json.secure_url) { setChapterForm((f) => ({ ...f, cover_url: json.secure_url })); toast.success('تم رفع الصورة ✅') }
    else toast.error('فشل رفع الصورة')
    setUploadingChapterCover(false)
  }

  async function handleLessonThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingThumbnail(true)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: data })
    const json = await res.json()
    if (json.secure_url) { setForm((f) => ({ ...f, thumbnail_url: json.secure_url })); toast.success('تم رفع الصورة ✅') }
    else toast.error('فشل رفع الصورة')
    setUploadingThumbnail(false)
  }

  async function handleLessonFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, { method: 'POST', body: data })
    const json = await res.json()
    if (json.secure_url) {
      const sizeLabel = json.bytes ? `${(json.bytes / (1024 * 1024)).toFixed(1)} MB` : ''
      setFileForm((f) => ({ ...f, file_url: json.secure_url, size_label: f.size_label || sizeLabel }))
      toast.success('تم رفع الملف ✅')
    } else {
      toast.error(json.error?.message || 'فشل رفع الملف')
    }
    setUploadingFile(false)
  }

  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault()
    if (!chapterForm.title) return toast.error('عنوان الباب مطلوب')
    setSavingChapter(true)
    const payload = { title: chapterForm.title, cover_url: chapterForm.cover_url || null, order_index: Number(chapterForm.order_index), course_id: courseId }
    if (editingChapter) {
      const { error } = await supabase.from('chapters').update(payload).eq('id', editingChapter.id)
      if (error) toast.error('حدث خطأ')
      else { toast.success('تم التعديل ✅'); fetchData(); setShowChapterModal(false) }
    } else {
      const { error } = await supabase.from('chapters').insert(payload)
      if (error) toast.error('حدث خطأ')
      else { toast.success('تمت الإضافة ✅'); fetchData(); setShowChapterModal(false) }
    }
    setSavingChapter(false)
  }

  async function deleteChapter(id: string) {
    if (!confirm('حذف الباب ؟ الدروس اللي جواه هتفضل موجودة وتترحل لـ"دروس بدون باب".')) return
    await supabase.from('chapters').delete().eq('id', id)
    toast.success('تم الحذف')
    fetchData()
  }

  // ===== الدروس: CRUD =====
  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, order_index: currentLessons.length + 1 })
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
      chapter_id: activeChapter ? activeChapter.id : null,
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

  async function fetchFromBunny() {
    if (!form.video_id) return toast.error('اكتب رقم الفيديو (Bunny Video ID) الأول')
    setFetchingBunny(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/bunny-video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ videoId: form.video_id }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'فشل جلب بيانات الفيديو'); return }
      setForm((f) => ({
        ...f,
        duration_minutes: json.duration_minutes != null ? String(json.duration_minutes) : f.duration_minutes,
      }))
      toast.success('تم جلب المدة من Bunny ✅')
    } catch {
      toast.error('فشل الاتصال بـ Bunny')
    } finally {
      setFetchingBunny(false)
    }
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

  // ===== ملفات الدرس =====
  const [filesLesson, setFilesLesson] = useState<any>(null)
  const [lessonFiles, setLessonFiles] = useState<any[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [editingFile, setEditingFile] = useState<any>(null)
  const [fileForm, setFileForm] = useState(emptyFileForm)
  const [savingFile, setSavingFile] = useState(false)

  // إعادة تحميل قائمة الملفات فقط (بعد حفظ أو حذف) — من غير ما يفتح أي نافذة
  async function refreshFiles(lesson: any) {
    const { data } = await supabase.from('lesson_files').select('*').eq('lesson_id', lesson.id).order('order_index')
    setLessonFiles(data || [])
    return data || []
  }

  async function openFiles(lesson: any) {
    setFilesLesson(lesson)
    setFilesLoading(true)
    const data = await refreshFiles(lesson)
    setFilesLoading(false)
    // مفيش ملفات لسه؟ يدخل على شاشة رفع الملف على طول من غير ما يعدي على شاشة فاضية
    if (data.length === 0) {
      setEditingFile(null)
      setFileForm({ ...emptyFileForm, order_index: 1 })
      setShowFileModal(true)
    }
  }

  // قفل نافذة رفع/تعديل الملف: لو مفيش ملفات خالص يخرج من شاشة الملفات كلها
  // بدل ما يرجّع المستخدم لنافذة فاضية مكتوب فيها "لا توجد ملفات لهذا الدرس بعد"
  function closeFileModal() {
    setShowFileModal(false)
    if (lessonFiles.length === 0) setFilesLesson(null)
  }

  function openAddFile() {
    setEditingFile(null)
    setFileForm({ ...emptyFileForm, order_index: lessonFiles.length + 1 })
    setShowFileModal(true)
  }

  function openEditFile(file: any) {
    setEditingFile(file)
    setFileForm({
      title: file.title,
      file_url: file.file_url,
      size_label: file.size_label || '',
      file_type: file.file_type || 'pdf',
      order_index: file.order_index || 0,
    })
    setShowFileModal(true)
  }

  async function handleSaveFile(e: React.FormEvent) {
    e.preventDefault()
    if (!fileForm.title || !fileForm.file_url) return toast.error('العنوان والملف مطلوبان')
    setSavingFile(true)
    const payload = {
      title: fileForm.title,
      file_url: fileForm.file_url,
      size_label: fileForm.size_label || null,
      file_type: fileForm.file_type,
      order_index: Number(fileForm.order_index),
      lesson_id: filesLesson.id,
    }
    if (editingFile) {
      const { error } = await supabase.from('lesson_files').update(payload).eq('id', editingFile.id)
      if (error) toast.error('حدث خطأ')
      // ننتظر تحديث القائمة قبل قفل النافذة، وإلا تظهر شاشة "لا توجد ملفات" للحظة بالبيانات القديمة
      else { await refreshFiles(filesLesson); toast.success('تم التعديل ✅'); setShowFileModal(false) }
    } else {
      const { error } = await supabase.from('lesson_files').insert(payload)
      if (error) toast.error('حدث خطأ')
      else { await refreshFiles(filesLesson); toast.success('تمت الإضافة ✅'); setShowFileModal(false) }
    }
    setSavingFile(false)
  }

  async function deleteFile(id: string) {
    if (!confirm('حذف الملف ؟')) return
    await supabase.from('lesson_files').delete().eq('id', id)
    toast.success('تم الحذف')
    // حذفنا آخر ملف؟ نقفل شاشة الملفات بدل ما نسيب نافذة فاضية مفتوحة
    const remaining = await refreshFiles(filesLesson)
    if (remaining.length === 0) setFilesLesson(null)
  }

  const showingChapters = !activeChapter

  return (
    <>
      <SectionToolbar
        title={showingChapters ? (course?.title || 'دروس الكورس') : `${course?.title || ''} — ${activeChapter!.title}`}
        subtitle={showingChapters
          ? `${chapters.length} ${chapters.length === 1 ? 'باب' : 'أبواب'} · ${allLessons.length} ${allLessons.length === 1 ? 'درس' : 'دروس'} إجمالي`
          : `${fmtCount(currentLessons.length)} · إدارة دروس الباب`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ghost-button" onClick={() => (showingChapters ? navigate('/admin/courses') : setActiveChapter(null))}>
              <ArrowRight size={14} /> {showingChapters ? 'رجوع للكورسات' : 'رجوع للأبواب'}
            </button>
            {showingChapters ? (
              <button className="primary-admin" onClick={openAddChapter}><Plus size={16} /> إضافة باب</button>
            ) : (
              <button className="primary-admin" onClick={openAdd}><Plus size={16} /> إضافة درس</button>
            )}
          </div>
        }
      />

      {loading ? (
        <Spinner />
      ) : showingChapters ? (
        chapters.length === 0 && unassignedCount === 0 ? (
          <EmptyState text="لا توجد أبواب أو دروس بعد" action={<button className="primary-admin" onClick={openAddChapter}>أضف أول باب</button>} />
        ) : (
          <div className="course-card-grid">
            {chapters.map((ch, i) => (
              <article className="course-manage-card" key={ch.id} onClick={() => setActiveChapter(ch)}>
                <span className={`course-cover ${coverClass[i % coverClass.length]}`}>
                  {ch.cover_url ? <img src={ch.cover_url} alt="" /> : ch.title.charAt(0)}
                </span>
                <div>
                  <h3>{ch.title}</h3>
                  <p>{fmtCount(lessonsOf(ch.id).length)}</p>
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="row-action" onClick={() => openEditChapter(ch)}><Edit size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />تعديل</button>
                    <button className="row-action" onClick={() => deleteChapter(ch.id)} style={{ color: '#d33b55' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              </article>
            ))}
            {unassignedCount > 0 && (
              <article className="course-manage-card" onClick={() => setActiveChapter(UNASSIGNED)}>
                <span className="course-cover c3"><Layers size={29} /></span>
                <div>
                  <h3>دروس بدون باب</h3>
                  <p>{fmtCount(unassignedCount)}</p>
                </div>
              </article>
            )}
          </div>
        )
      ) : currentLessons.length === 0 ? (
        <EmptyState text="لا توجد دروس في هذا الباب بعد" action={<button className="primary-admin" onClick={openAdd}>أضف أول درس</button>} />
      ) : (
        <div className="lesson-manage-grid">
          {currentLessons.map((lesson, i) => (
            <article className="lesson-manage-card" key={lesson.id}>
              <div className="lm-cover">
                {lesson.thumbnail_url
                  ? <img src={lesson.thumbnail_url} alt="" />
                  : <span className="lm-cover-empty"><Video size={26} /></span>}
                <b className="lm-num">{i + 1}</b>
                {lesson.is_free_preview && <b className="lm-free">مجاني</b>}
                <div className="lm-overlay">
                  <span className={`lm-pill${lesson.video_id ? ' ok' : ' warn'}`}>
                    <Video size={11} />{lesson.video_id ? 'فيديو مرفوع' : 'لا يوجد فيديو'}
                  </span>
                  {lesson.duration_minutes ? <span className="lm-pill">{lesson.duration_minutes} دقيقة</span> : null}
                </div>
              </div>

              <div className="lm-body">
                <h3>{lesson.title}</h3>
                <div className="lm-actions">
                  <button className="lm-action" onClick={() => openEdit(lesson)}><Edit size={13} />تعديل</button>
                  <button className="lm-action" onClick={() => openFiles(lesson)}><FileText size={13} />الملفات</button>
                  <button
                    className={`lm-action${lesson.is_free_preview ? ' is-on' : ''}`}
                    onClick={() => toggleFreePreview(lesson)}
                    title={lesson.is_free_preview ? 'إلغاء الإتاحة المجانية' : 'إتاحته مجانًا للزوار'}
                  >
                    {lesson.is_free_preview ? <Eye size={13} /> : <EyeOff size={13} />}
                    {lesson.is_free_preview ? 'مجاني' : 'مغلق'}
                  </button>
                  <button className="lm-action danger" onClick={() => deleteLesson(lesson.id)} title="حذف الدرس"><Trash2 size={13} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showChapterModal && (
        <Modal title={editingChapter ? 'تعديل الباب' : 'إضافة باب جديد'} onClose={() => setShowChapterModal(false)}>
          <form onSubmit={handleSaveChapter} className="admin-form">
            <label>
              غلاف الباب
              {chapterForm.cover_url ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', width: '100%', aspectRatio: '16 / 9', background: '#000' }}>
                  <img src={chapterForm.cover_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                  <button type="button" onClick={() => setChapterForm((f) => ({ ...f, cover_url: '' }))} style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(211,59,85,.9)', color: '#fff', fontSize: 10, padding: '4px 10px', borderRadius: 8, border: 'none' }}>حذف</button>
                </div>
              ) : (
                <label className="adm-thumb-drop">
                  {uploadingChapterCover ? <div className="adm-loading"><i /></div> : (<><Upload size={20} /><span>اضغط لرفع غلاف الباب</span></>)}
                  <input type="file" accept="image/*" className="hidden" onChange={handleChapterCoverUpload} disabled={uploadingChapterCover} />
                </label>
              )}
            </label>
            <label>عنوان الباب *<input value={chapterForm.title} onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })} placeholder="مثال: الباب الأول — النسب والتناسب" /></label>
            <label>الترتيب<input type="number" value={chapterForm.order_index} onChange={(e) => setChapterForm({ ...chapterForm, order_index: Number(e.target.value) })} min={1} /></label>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={savingChapter || uploadingChapterCover}>{savingChapter ? 'جاري الحفظ...' : editingChapter ? 'حفظ التعديلات' : 'إضافة الباب'}</button>
              <button type="button" className="ghost-button" onClick={() => setShowChapterModal(false)}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {showModal && (
        <Modal title={editing ? 'تعديل الدرس' : 'إضافة درس جديد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="admin-form">
            <label>عنوان الدرس *<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثال: مقدمة في النسب والتناسب" /></label>
            <label>الوصف<textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر للدرس..." /></label>
            <label>
              رقم الفيديو (Bunny Video ID)
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={form.video_id} onChange={e => setForm({ ...form, video_id: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" style={{ flex: 1 }} />
                <button type="button" className="ghost-button" onClick={fetchFromBunny} disabled={fetchingBunny} style={{ whiteSpace: 'nowrap' }}>
                  {fetchingBunny ? 'جاري الجلب...' : 'جلب المدة من Bunny'}
                </button>
              </div>
            </label>
            <label>
              غلاف الدرس
              {form.thumbnail_url ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', width: '100%', aspectRatio: '16 / 9', background: '#000' }}>
                  <img src={form.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, thumbnail_url: '' }))} style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(211,59,85,.9)', color: '#fff', fontSize: 10, padding: '4px 10px', borderRadius: 8, border: 'none' }}>حذف</button>
                </div>
              ) : (
                <label className="adm-thumb-drop">
                  {uploadingThumbnail ? <div className="adm-loading"><i /></div> : (<><Upload size={20} /><span>اضغط لرفع غلاف الدرس</span></>)}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLessonThumbnailUpload} disabled={uploadingThumbnail} />
                </label>
              )}
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

      {filesLesson && !showFileModal && (filesLoading || lessonFiles.length > 0) && (
        <Modal title={`ملفات درس: ${filesLesson.title}`} onClose={() => setFilesLesson(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="primary-admin" onClick={openAddFile}><Plus size={16} /> إضافة ملف</button>
            </div>
            {filesLoading ? (
              <Spinner />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الملف</th>
                      <th>النوع</th>
                      <th>الحجم</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonFiles.map((file, i) => (
                      <tr key={file.id}>
                        <td><span className="table-course c3" style={{ fontSize: 11 }}>{i + 1}</span></td>
                        <td><b>{file.title}</b></td>
                        <td><TagBadge variant="purple">{file.file_type === 'sheet' ? 'ورقة عمل' : 'PDF'}</TagBadge></td>
                        <td>{file.size_label || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="row-action" onClick={() => openEditFile(file)}><Edit size={12} /></button>
                            <button className="row-action" onClick={() => deleteFile(file.id)} style={{ color: '#d33b55' }}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showFileModal && (
        <Modal title={editingFile ? 'تعديل الملف' : 'إضافة ملف جديد'} onClose={closeFileModal}>
          <form onSubmit={handleSaveFile} className="admin-form">
            <label>عنوان الملف *<input value={fileForm.title} onChange={e => setFileForm({ ...fileForm, title: e.target.value })} placeholder="مثال: ورقة تدريبات الباب الأول" /></label>
            <label>
              الملف *
              {fileForm.file_url ? (
                <div className="adm-file-picked">
                  <span className="adm-file-icon"><FileText size={18} /></span>
                  <span className="adm-file-name" dir="ltr">{fileForm.file_url.split('/').pop()}</span>
                  <button type="button" onClick={() => setFileForm(f => ({ ...f, file_url: '' }))}>حذف</button>
                </div>
              ) : (
                <label className="adm-thumb-drop" style={{ height: 90 }}>
                  {uploadingFile ? <div className="adm-loading"><i /></div> : (<><Upload size={20} /><span>اضغط لرفع الملف من جهازك</span></>)}
                  <input type="file" className="hidden" onChange={handleLessonFileUpload} disabled={uploadingFile} />
                </label>
              )}
            </label>
            <div className="form-grid">
              <label>
                نوع الملف
                <select value={fileForm.file_type} onChange={e => setFileForm({ ...fileForm, file_type: e.target.value })}>
                  <option value="pdf">PDF</option>
                  <option value="sheet">ورقة عمل</option>
                </select>
              </label>
              <label>الحجم (اختياري)<input value={fileForm.size_label} onChange={e => setFileForm({ ...fileForm, size_label: e.target.value })} placeholder="مثال: 2.4 MB" dir="ltr" /></label>
            </div>
            <label>الترتيب<input type="number" value={fileForm.order_index} onChange={e => setFileForm({ ...fileForm, order_index: Number(e.target.value) })} min={1} /></label>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={savingFile || uploadingFile}>{savingFile ? 'جاري الحفظ...' : editingFile ? 'حفظ التعديلات' : 'إضافة الملف'}</button>
              <button type="button" className="ghost-button" onClick={closeFileModal}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
