import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit, ArrowRight, Video, Eye, EyeOff, FileText, Upload, Layers, LayoutGrid, Rows3, Table2, ListVideo } from 'lucide-react'
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
const emptyPartForm = { title: '', video_id: '', duration_minutes: '', order_index: 0 }

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

  // طريقة عرض الدروس — تتحفظ في المتصفح عشان تفضل زي ما اختارها الأدمن
  type LessonView = 'grid' | 'rows' | 'table'
  const [lessonView, setLessonView] = useState<LessonView>(() => {
    const saved = localStorage.getItem('qm_admin_lesson_view')
    return saved === 'rows' || saved === 'table' ? saved : 'grid'
  })
  function changeLessonView(v: LessonView) {
    setLessonView(v)
    localStorage.setItem('qm_admin_lesson_view', v)
  }

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
    setDraftParts([])
    setShowModal(true)
  }

  async function openEdit(lesson: any) {
    setEditing(lesson)
    setDraftParts([])
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
    const { data } = await supabase.from('lesson_videos').select('*').eq('lesson_id', lesson.id).order('order_index')
    setDraftParts((data || []).map((p: any) => ({
      id: p.id,
      title: p.title || '',
      video_id: p.video_id,
      duration_minutes: p.duration_minutes ? String(p.duration_minutes) : '',
    })))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return toast.error('عنوان الدرس مطلوب')
    setSaving(true)
    const activeParts = draftParts.filter(p => (p.video_id || '').trim())
    const partsDuration = activeParts.reduce((sum, p) => sum + (Number(p.duration_minutes) || 0), 0)
    const payload = {
      title: form.title,
      description: form.description,
      // لما يكون فيه أجزاء، بنخلّي video_id = أول جزء عشان أي شاشة قديمة تفضل شغّالة.
      video_id: activeParts.length ? activeParts[0].video_id.trim() : form.video_id,
      thumbnail_url: form.thumbnail_url || null,
      duration_minutes: activeParts.length && partsDuration > 0
        ? partsDuration
        : (form.duration_minutes ? Number(form.duration_minutes) : null),
      order_index: Number(form.order_index),
      is_free_preview: form.is_free_preview,
      course_id: courseId,
      chapter_id: activeChapter ? activeChapter.id : null,
    }
    if (editing) {
      const { error } = await supabase.from('lessons').update(payload).eq('id', editing.id)
      if (error) toast.error('حدث خطأ')
      else {
        await syncDraftParts(editing.id)
        toast.success('تم التعديل ✅'); fetchData(); setShowModal(false)
      }
    } else {
      const { data: inserted, error } = await supabase.from('lessons').insert(payload).select('id').single()
      if (error) toast.error('حدث خطأ')
      else {
        if (inserted?.id) await syncDraftParts(inserted.id)
        toast.success('تمت الإضافة ✅'); fetchData(); setShowModal(false)
      }
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

  // ===== أجزاء الفيديو جوّه نافذة الدرس نفسها =====
  const [draftParts, setDraftParts] = useState<any[]>([])
  const [fetchingPart, setFetchingPart] = useState<number | null>(null)

  function addDraftPart() {
    setDraftParts(prev => [...prev, { title: '', video_id: '', duration_minutes: '' }])
  }

  function updateDraftPart(index: number, patch: any) {
    setDraftParts(prev => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  function removeDraftPart(index: number) {
    setDraftParts(prev => prev.filter((_, i) => i !== index))
  }

  async function fetchPartDuration(index: number) {
    const part = draftParts[index]
    if (!part?.video_id?.trim()) return toast.error('اكتب رقم فيديو Bunny الأول')
    setFetchingPart(index)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/bunny-video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ videoId: part.video_id.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'فشل جلب بيانات الفيديو'); return }
      if (json.duration_minutes != null) updateDraftPart(index, { duration_minutes: String(json.duration_minutes) })
      toast.success('تم جلب المدة ✅')
    } catch {
      toast.error('فشل الاتصال بـ Bunny')
    } finally {
      setFetchingPart(null)
    }
  }

  // بيزامن أجزاء الدرس مع اللي اتكتب في النافذة: يمسح المحذوف، يعدّل الموجود، ويضيف الجديد.
  async function syncDraftParts(lessonId: string) {
    const rows = draftParts.filter(p => (p.video_id || '').trim())
    const { data: existing } = await supabase.from('lesson_videos').select('id').eq('lesson_id', lessonId)
    const keep = new Set(rows.filter(r => r.id).map(r => r.id))
    const toDelete = (existing || []).filter(r => !keep.has(r.id)).map(r => r.id)
    if (toDelete.length) await supabase.from('lesson_videos').delete().in('id', toDelete)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const payload = {
        lesson_id: lessonId,
        title: (r.title || '').trim() || null,
        video_id: r.video_id.trim(),
        duration_minutes: r.duration_minutes ? Number(r.duration_minutes) : null,
        order_index: i + 1,
      }
      if (r.id) await supabase.from('lesson_videos').update(payload).eq('id', r.id)
      else await supabase.from('lesson_videos').insert(payload)
    }
    setPartCounts(prev => ({ ...prev, [lessonId]: rows.length }))
  }

  // ===== أجزاء فيديو الدرس =====
  // الدرس الطويل يتقسّم لأجزاء متتابعة بدل فيديو واحد. الدرس اللي مالوش
  // أجزاء بيفضل شغّال بـ lessons.video_id زي ما هو.
  const [partsLesson, setPartsLesson] = useState<any>(null)
  const [lessonParts, setLessonParts] = useState<any[]>([])
  const [partsLoading, setPartsLoading] = useState(false)
  const [showPartModal, setShowPartModal] = useState(false)
  const [editingPart, setEditingPart] = useState<any>(null)
  const [partForm, setPartForm] = useState(emptyPartForm)
  const [savingPart, setSavingPart] = useState(false)
  const [partCounts, setPartCounts] = useState<Record<string, number>>({})

  async function refreshParts(lesson: any) {
    const { data } = await supabase.from('lesson_videos').select('*').eq('lesson_id', lesson.id).order('order_index')
    setLessonParts(data || [])
    setPartCounts(prev => ({ ...prev, [lesson.id]: (data || []).length }))
    return data || []
  }

  async function openParts(lesson: any) {
    setPartsLesson(lesson)
    setPartsLoading(true)
    const data = await refreshParts(lesson)
    setPartsLoading(false)
    if (data.length === 0) {
      setEditingPart(null)
      setPartForm({ ...emptyPartForm, order_index: 1 })
      setShowPartModal(true)
    }
  }

  function closePartModal() {
    setShowPartModal(false)
    if (lessonParts.length === 0) setPartsLesson(null)
  }

  function openAddPart() {
    setEditingPart(null)
    setPartForm({ ...emptyPartForm, order_index: lessonParts.length + 1 })
    setShowPartModal(true)
  }

  function openEditPart(part: any) {
    setEditingPart(part)
    setPartForm({
      title: part.title || '',
      video_id: part.video_id,
      duration_minutes: part.duration_minutes ? String(part.duration_minutes) : '',
      order_index: part.order_index || 0,
    })
    setShowPartModal(true)
  }

  async function handleSavePart(e: React.FormEvent) {
    e.preventDefault()
    if (!partForm.video_id.trim()) return toast.error('رقم فيديو Bunny مطلوب')
    setSavingPart(true)
    const payload = {
      title: partForm.title.trim() || null,
      video_id: partForm.video_id.trim(),
      duration_minutes: partForm.duration_minutes ? Number(partForm.duration_minutes) : null,
      order_index: Number(partForm.order_index),
      lesson_id: partsLesson.id,
    }
    if (editingPart) {
      const { error } = await supabase.from('lesson_videos').update(payload).eq('id', editingPart.id)
      if (error) toast.error('حدث خطأ')
      else { await refreshParts(partsLesson); toast.success('تم التعديل ✅'); setShowPartModal(false) }
    } else {
      const { error } = await supabase.from('lesson_videos').insert(payload)
      if (error) toast.error('حدث خطأ')
      else { await refreshParts(partsLesson); toast.success('تمت الإضافة ✅'); setShowPartModal(false) }
    }
    setSavingPart(false)
  }

  async function deletePart(id: string) {
    if (!confirm('حذف هذا الجزء ؟')) return
    const { error } = await supabase.from('lesson_videos').delete().eq('id', id)
    if (error) return toast.error('حدث خطأ')
    const remaining = await refreshParts(partsLesson)
    toast.success('تم الحذف')
    if (remaining.length === 0) setPartsLesson(null)
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
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {!showingChapters && currentLessons.length > 0 && (
              <div className="segmented view-switch" role="group" aria-label="طريقة عرض الدروس">
                <button className={lessonView === 'grid' ? 'active' : ''} onClick={() => changeLessonView('grid')} title="كروت">
                  <LayoutGrid size={14} /> كروت
                </button>
                <button className={lessonView === 'rows' ? 'active' : ''} onClick={() => changeLessonView('rows')} title="قائمة">
                  <Rows3 size={14} /> قائمة
                </button>
                <button className={lessonView === 'table' ? 'active' : ''} onClick={() => changeLessonView('table')} title="جدول">
                  <Table2 size={14} /> جدول
                </button>
              </div>
            )}
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
        lessonView === 'rows' ? (
        <div className="lesson-row-list">
          {currentLessons.map((lesson, i) => (
            <article className="lesson-row" key={lesson.id}>
              <span className="lr-num">{i + 1}</span>
              <span className="lr-thumb">
                {lesson.thumbnail_url ? <img src={lesson.thumbnail_url} alt="" /> : <Video size={18} />}
              </span>
              <div className="lr-info">
                <b>{lesson.title}</b>
                <small>
                  <span className={lesson.video_id ? 'ok' : 'warn'}>{lesson.video_id ? 'فيديو مرفوع' : 'لا يوجد فيديو'}</span>
                  {lesson.duration_minutes ? <> · {lesson.duration_minutes} دقيقة</> : null}
                  {lesson.is_free_preview ? <> · <span className="ok">مجاني</span></> : null}
                </small>
              </div>
              <div className="lm-actions lr-actions">
                <button className="lm-action" onClick={() => openEdit(lesson)}><Edit size={13} />تعديل</button>
                <button className="lm-action" onClick={() => openParts(lesson)}><ListVideo size={13} />الأجزاء</button>
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
            </article>
          ))}
        </div>
        ) : lessonView === 'table' ? (
        <article className="admin-card data-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>الدرس</th><th>المدة</th><th>الفيديو</th><th>الحالة</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {currentLessons.map((lesson, i) => (
                  <tr key={lesson.id}>
                    <td><span className="table-course c3" style={{ fontSize: 11 }}>{i + 1}</span></td>
                    <td><b>{lesson.title}</b></td>
                    <td>{lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : '—'}</td>
                    <td>
                      {lesson.video_id
                        ? <TagBadge variant="purple"><Video size={10} style={{ verticalAlign: 'middle', marginLeft: 4 }} />مرفوع</TagBadge>
                        : <span className="cell-sub">لم يُرفع بعد</span>}
                    </td>
                    <td><TagBadge variant={lesson.is_free_preview ? 'purple' : 'orange'}>{lesson.is_free_preview ? 'مجاني' : 'عادي'}</TagBadge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="row-action" onClick={() => toggleFreePreview(lesson)} title={lesson.is_free_preview ? 'إلغاء المجاني' : 'جعله مجانيًا'}>
                          {lesson.is_free_preview ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button className="row-action" onClick={() => openEdit(lesson)} title="تعديل"><Edit size={12} /></button>
                        <button className="row-action" onClick={() => openParts(lesson)} title="أجزاء الفيديو"><ListVideo size={12} /></button>
                        <button className="row-action" onClick={() => openFiles(lesson)} title="ملفات الدرس"><FileText size={12} /></button>
                        <button className="row-action" onClick={() => deleteLesson(lesson.id)} title="حذف" style={{ color: '#d33b55' }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
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
                  <button className="lm-action" onClick={() => openParts(lesson)}><ListVideo size={13} />الأجزاء</button>
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
        )
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
            <label>ملخص الدرس<textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="اكتب نقاط الملخص، كل نقطة في سطر مستقل..." /></label>
            {draftParts.length === 0 && (
              <label>
                رقم الفيديو (Bunny Video ID)
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={form.video_id} onChange={e => setForm({ ...form, video_id: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" style={{ flex: 1 }} />
                  <button type="button" className="ghost-button" onClick={fetchFromBunny} disabled={fetchingBunny} style={{ whiteSpace: 'nowrap' }}>
                    {fetchingBunny ? 'جاري الجلب...' : 'جلب المدة من Bunny'}
                  </button>
                </div>
              </label>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, background: '#f8f6fb', border: '1px solid #ece6f3' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span>
                  <b style={{ display: 'block', fontSize: 12 }}>أجزاء الفيديو</b>
                  <small style={{ display: 'block', color: '#8a7d91', fontSize: 10 }}>
                    {draftParts.length === 0
                      ? 'الدرس الطويل تقدر تقسّمه لأجزاء متتابعة — الجزء اللي بعده بيبدأ تلقائيًا للطالب.'
                      : 'الأجزاء بتتشغّل بالترتيب ده، والمدة الكلية بتتحسب تلقائيًا.'}
                  </small>
                </span>
                <button type="button" className="ghost-button" onClick={addDraftPart} style={{ whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> إضافة جزء
                </button>
              </div>

              {draftParts.map((part, i) => (
                <div key={part.id || `new-${i}`} style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap', background: '#fff', padding: 8, borderRadius: 10, border: '1px solid #ece6f3' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#efe7f7', color: '#6b3fa0', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginBottom: 6 }}>{i + 1}</span>
                  <label style={{ flex: '1 1 130px', margin: 0, fontSize: 10 }}>
                    عنوان الجزء (اختياري)
                    <input value={part.title} onChange={e => updateDraftPart(i, { title: e.target.value })} placeholder="الجزء الأول" />
                  </label>
                  <label style={{ flex: '1 1 190px', margin: 0, fontSize: 10 }}>
                    رقم فيديو Bunny *
                    <input value={part.video_id} onChange={e => updateDraftPart(i, { video_id: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" />
                  </label>
                  <label style={{ flex: '0 0 74px', margin: 0, fontSize: 10 }}>
                    دقائق
                    <input type="number" min={1} value={part.duration_minutes} onChange={e => updateDraftPart(i, { duration_minutes: e.target.value })} />
                  </label>
                  <button type="button" className="ghost-button" onClick={() => fetchPartDuration(i)} disabled={fetchingPart === i} style={{ whiteSpace: 'nowrap', marginBottom: 2 }}>
                    {fetchingPart === i ? '...' : 'جلب المدة'}
                  </button>
                  <button type="button" className="row-action" onClick={() => removeDraftPart(i)} style={{ color: '#d33b55', marginBottom: 2 }} title="حذف الجزء">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
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
                  <b style={{ display: 'block', fontSize: 12 }}>إتاحة الدرس مجانًا</b>
                  <small style={{ display: 'block', color: '#8a7d91', fontSize: 10 }}>عند التفعيل، يمكن لأي طالب مشاهدة هذا الدرس دون اشتراك.</small>
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

      {partsLesson && !showPartModal && (partsLoading || lessonParts.length > 0) && (
        <Modal title={`أجزاء درس: ${partsLesson.title}`} onClose={() => setPartsLesson(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#8d8195' }}>
              الطالب يشوف الأجزاء بالترتيب، ولما يخلّص جزء يبدأ اللي بعده تلقائيًا.
              لو الدرس فيديو واحد، سيبه بدون أجزاء.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="primary-admin" onClick={openAddPart}><Plus size={16} /> إضافة جزء</button>
            </div>
            {partsLoading ? (
              <Spinner />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>الجزء</th><th>رقم الفيديو</th><th>المدة</th><th>الإجراءات</th></tr>
                  </thead>
                  <tbody>
                    {lessonParts.map((part, i) => (
                      <tr key={part.id}>
                        <td><span className="table-course c3" style={{ fontSize: 11 }}>{i + 1}</span></td>
                        <td><b>{part.title || `الجزء ${i + 1}`}</b></td>
                        <td><span className="cell-sub" dir="ltr">{part.video_id}</span></td>
                        <td>{part.duration_minutes ? `${part.duration_minutes} دقيقة` : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="row-action" onClick={() => openEditPart(part)}><Edit size={12} /></button>
                            <button className="row-action" onClick={() => deletePart(part.id)} style={{ color: '#d33b55' }}><Trash2 size={12} /></button>
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

      {showPartModal && (
        <Modal title={editingPart ? 'تعديل الجزء' : 'إضافة جزء جديد'} onClose={closePartModal}>
          <form onSubmit={handleSavePart} className="admin-form">
            <label>عنوان الجزء (اختياري)<input value={partForm.title} onChange={e => setPartForm({ ...partForm, title: e.target.value })} placeholder="مثال: الجزء الأول — التعريف" /></label>
            <label>رقم فيديو Bunny *<input value={partForm.video_id} onChange={e => setPartForm({ ...partForm, video_id: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" /></label>
            <div className="form-grid">
              <label>المدة بالدقائق (اختياري)<input type="number" value={partForm.duration_minutes} onChange={e => setPartForm({ ...partForm, duration_minutes: e.target.value })} min={1} /></label>
              <label>الترتيب<input type="number" value={partForm.order_index} onChange={e => setPartForm({ ...partForm, order_index: Number(e.target.value) })} min={1} /></label>
            </div>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={savingPart}>{savingPart ? 'جاري الحفظ...' : editingPart ? 'حفظ التعديلات' : 'إضافة الجزء'}</button>
              <button type="button" className="ghost-button" onClick={closePartModal}>إلغاء</button>
            </div>
          </form>
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
