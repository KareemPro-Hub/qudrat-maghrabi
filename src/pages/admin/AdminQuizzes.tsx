import { Fragment, useEffect, useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { SectionToolbar, StatusBadge, TagBadge, Spinner, EmptyState, Modal } from '../../components/admin/lightKit'

const CLOUDINARY_CLOUD = 'dzgfvs0gi'
const CLOUDINARY_PRESET = 'qudrat_thumbnails'

const optionLabels: Record<string, string> = { a: 'أ', b: 'ب', c: 'ج', d: 'د' }
const emptyQuiz = { title: '', course_id: '', lesson_id: '', description: '', total_marks: 10, pass_marks: 6, time_limit_minutes: '' }
const emptyQ = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', marks: 1, explanation: '', explanation_video_id: '', question_image_url: '', question_link_url: '', question_link_text: '' }

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, { count: number; avg: number }>>({})
  const [loading, setLoading] = useState(true)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [showQModal, setShowQModal] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Record<string, any[]>>({})
  const [quizForm, setQuizForm] = useState(emptyQuiz)
  const [qForm, setQForm] = useState(emptyQ)
  const [saving, setSaving] = useState(false)
  const [uploadingQImage, setUploadingQImage] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: q }, { data: allCourses }] = await Promise.all([
      supabase.from('quizzes').select('*, courses(title)').order('created_at', { ascending: false }),
      supabase.from('courses').select('id, title').order('title'),
    ])
    setQuizzes(q || [])
    setCourses(allCourses || [])

    if (q && q.length) {
      const { data: results } = await supabase.from('quiz_results').select('quiz_id, score, total_marks').in('quiz_id', q.map((x: any) => x.id))
      const agg: Record<string, { count: number; sum: number }> = {}
      ;(results || []).forEach((r: any) => {
        if (!agg[r.quiz_id]) agg[r.quiz_id] = { count: 0, sum: 0 }
        agg[r.quiz_id].count++
        agg[r.quiz_id].sum += r.total_marks ? (r.score / r.total_marks) * 100 : 0
      })
      const attemptsMap: Record<string, { count: number; avg: number }> = {}
      Object.keys(agg).forEach((qid) => { attemptsMap[qid] = { count: agg[qid].count, avg: Math.round(agg[qid].sum / agg[qid].count) } })
      setAttempts(attemptsMap)
    }
    setLoading(false)
  }

  async function fetchQuestions(quizId: string) {
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index')
    setQuestions((prev) => ({ ...prev, [quizId]: data || [] }))
  }

  async function fetchLessons(courseId: string) {
    const { data } = await supabase.from('lessons').select('id, title').eq('course_id', courseId).order('order_index')
    setLessons(data || [])
  }

  async function handleSaveQuiz(e: React.FormEvent) {
    e.preventDefault()
    if (!quizForm.title || !quizForm.course_id) return toast.error('عنوان الاختبار والكورس مطلوبان')
    if (!qForm.question_text) return toast.error('يرجى تعبئة نص السؤال الأول')
    setSaving(true)
    const { data: newQuiz, error } = await supabase
      .from('quizzes')
      .insert({ ...quizForm, lesson_id: quizForm.lesson_id || null, time_limit_minutes: quizForm.time_limit_minutes ? Number(quizForm.time_limit_minutes) : null })
      .select('id')
      .single()
    if (error || !newQuiz) { toast.error('حدث خطأ أثناء إنشاء الاختبار'); setSaving(false); return }
    const { error: qError } = await supabase.from('quiz_questions').insert({ ...qForm, quiz_id: newQuiz.id, order_index: 0 })
    if (qError) toast.error('تم إنشاء الاختبار، لكن حدث خطأ أثناء حفظ السؤال — أضفه يدويًا من زر "+ سؤال"')
    else toast.success('تم إضافة الاختبار والسؤال الأول ✅')
    setShowQuizModal(false)
    setQuizForm(emptyQuiz)
    setQForm(emptyQ)
    fetchAll()
    setSaving(false)
  }

  async function handleQuestionImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingQImage(true)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: data })
    const json = await res.json()
    if (json.secure_url) { setQForm((f) => ({ ...f, question_image_url: json.secure_url })); toast.success('تم رفع الصورة ✅') }
    else toast.error('فشل رفع الصورة')
    setUploadingQImage(false)
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!qForm.question_text) return toast.error('يرجى تعبئة نص السؤال')
    setSaving(true)
    const questionsCount = questions[showQModal!]?.length || 0
    const { error } = await supabase.from('quiz_questions').insert({ ...qForm, quiz_id: showQModal, order_index: questionsCount })
    if (error) toast.error('حدث خطأ')
    else { toast.success('تمت إضافة السؤال ✅'); setQForm(emptyQ); fetchQuestions(showQModal!) }
    setSaving(false)
  }

  async function deleteQuestion(id: string, quizId: string) {
    if (!confirm('حذف السؤال ؟')) return
    await supabase.from('quiz_questions').delete().eq('id', id)
    fetchQuestions(quizId)
  }

  async function togglePublish(quiz: any) {
    await supabase.from('quizzes').update({ is_published: !quiz.is_published }).eq('id', quiz.id)
    toast.success(quiz.is_published ? 'تم إخفاء الاختبار' : 'تم نشر الاختبار ✅')
    fetchAll()
  }

  async function deleteQuiz(id: string) {
    if (!confirm('حذف الاختبار وجميع أسئلته ؟')) return
    await supabase.from('quizzes').delete().eq('id', id)
    toast.success('تم الحذف')
    fetchAll()
  }

  const totalAttempts = Object.values(attempts).reduce((s, a) => s + a.count, 0)
  const avgScoreAll = Object.values(attempts).length ? Math.round(Object.values(attempts).reduce((s, a) => s + a.avg, 0) / Object.values(attempts).length) : 0
  const publishedCount = quizzes.filter((q) => q.is_published).length

  return (
    <>
      <SectionToolbar
        title="الاختبارات والمحاكاة"
        subtitle="اختبارات ذكية تقيس المستوى وتحاكي تجربة يوم الاختبار."
        action={<button className="primary-admin" onClick={() => setShowQuizModal(true)}><Plus size={16} /> إنشاء اختبار</button>}
      />

      {!loading && quizzes.length > 0 && (
        <div className="insight-banner tests-banner">
          <div>
            <span className="banner-icon"><svg viewBox="0 0 24 24"><path d="M8 4h8M9 3v3h6V3M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" /><path d="m8 12 2 2 5-5" /></svg></span>
            <div><h3>متوسط نتائج جميع الاختبارات</h3><p>{totalAttempts} محاولة عبر {quizzes.length} اختبار.</p></div>
          </div>
          <strong>{avgScoreAll}%</strong>
        </div>
      )}

      <div className="mini-metrics">
        <article><span>{loading ? '…' : quizzes.length}</span><p>إجمالي الاختبارات<small>{publishedCount} منشور</small></p></article>
        <article><span>{loading ? '…' : quizzes.filter((q) => q.lesson_id).length}</span><p>اختبارات دروس<small>مرتبطة بدرس محدد</small></p></article>
        <article><span>{loading ? '…' : totalAttempts}</span><p>محاولة مكتملة<small>عبر كل الاختبارات</small></p></article>
        <article><span>{loading ? '…' : `${avgScoreAll}%`}</span><p>متوسط الدرجات<small>لكل المحاولات</small></p></article>
      </div>

      {loading ? <Spinner /> : quizzes.length === 0 ? (
        <EmptyState text="لا توجد اختبارات بعد" action={<button className="primary-admin" onClick={() => setShowQuizModal(true)}>أضف أول اختبار</button>} />
      ) : (
        <article className="admin-card data-card" data-searchable>
          <header className="card-head"><div><h3>قائمة الاختبارات</h3><p>الاختبارات المنشورة والمسودات</p></div></header>
          <div className="table-wrap">
            <table>
              <thead><tr><th>الاختبار</th><th>الكورس</th><th>الدرجة الكاملة</th><th>المدة</th><th>المحاولات</th><th>متوسط الدرجة</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
              <tbody>
                {quizzes.map((quiz) => (
                  <Fragment key={quiz.id}>
                    <tr>
                      <td><b>{quiz.title}</b></td>
                      <td><TagBadge variant="purple">{quiz.courses?.title}</TagBadge></td>
                      <td>{quiz.total_marks} (نجاح {quiz.pass_marks})</td>
                      <td>{quiz.time_limit_minutes ? `${quiz.time_limit_minutes} دقيقة` : 'بدون وقت'}</td>
                      <td>{attempts[quiz.id]?.count || 0}</td>
                      <td>{attempts[quiz.id] ? <strong className={`score ${attempts[quiz.id].avg >= 85 ? 'high' : attempts[quiz.id].avg >= 65 ? '' : 'low'}`}>{attempts[quiz.id].avg}%</strong> : '—'}</td>
                      <td><StatusBadge variant={quiz.is_published ? 'success' : 'neutral'}>{quiz.is_published ? 'منشور' : 'مسودة'}</StatusBadge></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="row-action" onClick={() => { setShowQModal(quiz.id); if (!questions[quiz.id]) fetchQuestions(quiz.id) }}>+ سؤال</button>
                          <button className="row-action" onClick={() => togglePublish(quiz)}>{quiz.is_published ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                          <button className="row-action" onClick={() => deleteQuiz(quiz.id)} style={{ color: '#d33b55' }}><Trash2 size={12} /></button>
                          <button className="row-action" onClick={() => { setExpanded(expanded === quiz.id ? null : quiz.id); if (!questions[quiz.id]) fetchQuestions(quiz.id) }}>
                            {expanded === quiz.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === quiz.id && (
                      <tr>
                        <td colSpan={8} style={{ background: '#fbf9fd' }}>
                          <div style={{ padding: '10px 4px', display: 'grid', gap: 10 }}>
                            {!questions[quiz.id] || questions[quiz.id].length === 0 ? (
                              <div className="empty-state">لا توجد أسئلة بعد — اضغط "+ سؤال" لإضافة أسئلة</div>
                            ) : questions[quiz.id].map((q, i) => (
                              <div key={q.id} className="adm-question-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: 11.5 }}><span style={{ color: '#7736e7' }}>{i + 1}.</span> {q.question_text}</p>
                                  <button onClick={() => deleteQuestion(q.id, quiz.id)} style={{ background: 'none', border: 0, color: '#d33b55' }}><Trash2 size={13} /></button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                                  {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                                    <div key={opt} className={`adm-option${q.correct_answer === opt ? ' correct' : ''}`}>{optionLabels[opt]}) {q[`option_${opt}`]}</div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {showQuizModal && (
        <Modal title="إضافة اختبار جديد" onClose={() => { setShowQuizModal(false); setQForm(emptyQ) }} wide>
          <form onSubmit={handleSaveQuiz} className="admin-form">
            <label>عنوان الاختبار *<input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="مثال: اختبار الوحدة الأولى" /></label>
            <label>الكورس *
              <select value={quizForm.course_id} onChange={(e) => { setQuizForm({ ...quizForm, course_id: e.target.value, lesson_id: '' }); fetchLessons(e.target.value) }}>
                <option value="">اختر الكورس</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <label>الدرس المرتبط (اختياري)
              <select value={quizForm.lesson_id} onChange={(e) => setQuizForm({ ...quizForm, lesson_id: e.target.value })} disabled={!quizForm.course_id}>
                <option value="">بدون درس (اختبار عام للكورس)</option>
                {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </label>
            <label>الوصف<textarea rows={2} value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} placeholder="وصف مختصر..." /></label>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <label>الدرجة الكاملة<input type="number" value={quizForm.total_marks} onChange={(e) => setQuizForm({ ...quizForm, total_marks: Number(e.target.value) })} /></label>
              <label>درجة النجاح<input type="number" value={quizForm.pass_marks} onChange={(e) => setQuizForm({ ...quizForm, pass_marks: Number(e.target.value) })} /></label>
              <label>الوقت (دقيقة)<input type="number" value={quizForm.time_limit_minutes} onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: e.target.value })} placeholder="اختياري" /></label>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--adm-line)', margin: '6px 0 10px' }} />
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 15 }}>السؤال الأول</p>
            <small className="cell-sub" style={{ marginTop: -10, marginBottom: 4 }}>هتقدر تضيف أسئلة إضافية بعد إنشاء الاختبار من زر "+ سؤال"</small>

            <label>نص السؤال *<textarea rows={3} value={qForm.question_text} onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })} placeholder="اكتب السؤال هنا..." /></label>
            <label>
              صورة السؤال (اختياري)
              {qForm.question_image_url ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', width: '100%', maxHeight: 180, background: '#000' }}>
                  <img src={qForm.question_image_url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'contain' }} />
                  <button type="button" onClick={() => setQForm((f) => ({ ...f, question_image_url: '' }))} style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(211,59,85,.9)', color: '#fff', fontSize: 10, padding: '4px 10px', borderRadius: 8, border: 'none' }}>حذف</button>
                </div>
              ) : (
                <label className="adm-thumb-drop">
                  {uploadingQImage ? <div className="adm-loading"><i /></div> : (<><Upload size={20} /><span>اضغط لرفع صورة السؤال</span></>)}
                  <input type="file" accept="image/*" className="hidden" onChange={handleQuestionImageUpload} disabled={uploadingQImage} />
                </label>
              )}
            </label>
            {(['a', 'b', 'c', 'd'] as const).map((opt) => (
              <label key={opt}>الخيار {optionLabels[opt]}<input value={(qForm as any)[`option_${opt}`]} onChange={(e) => setQForm({ ...qForm, [`option_${opt}`]: e.target.value })} placeholder={`الخيار ${optionLabels[opt]} (اختياري)`} /></label>
            ))}
            <div className="form-grid">
              <label>الإجابة الصحيحة *
                <select value={qForm.correct_answer} onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })}>
                  <option value="a">الخيار أ</option><option value="b">الخيار ب</option><option value="c">الخيار ج</option><option value="d">الخيار د</option>
                </select>
              </label>
              <label>درجة السؤال<input type="number" min={1} value={qForm.marks} onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) })} /></label>
            </div>
            <label>شرح الإجابة — نص (اختياري)<input value={qForm.explanation} onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })} placeholder="سيظهر للطالب بعد الاختبار" /></label>
            <label>شرح الإجابة — رقم فيديو Bunny (اختياري)<input value={qForm.explanation_video_id} onChange={(e) => setQForm({ ...qForm, explanation_video_id: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" /></label>
            <p className="adm-hint">هيظهر للطالب زر "عرفني الإجابة الصحيحة" بعد تسليم الاختبار، سواء جاوب صح أو غلط.</p>

            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={saving || uploadingQImage}>{saving ? 'جاري الحفظ...' : 'إضافة الاختبار'}</button>
              <button type="button" className="ghost-button" onClick={() => { setShowQuizModal(false); setQForm(emptyQ) }}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {showQModal && (
        <Modal title="إضافة سؤال" onClose={() => setShowQModal(null)} wide>
          <form onSubmit={handleSaveQuestion} className="admin-form">
            <label>نص السؤال *<textarea rows={3} value={qForm.question_text} onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })} placeholder="اكتب السؤال هنا..." /></label>
            <label>
              صورة السؤال (اختياري)
              {qForm.question_image_url ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', width: '100%', maxHeight: 180, background: '#000' }}>
                  <img src={qForm.question_image_url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'contain' }} />
                  <button type="button" onClick={() => setQForm((f) => ({ ...f, question_image_url: '' }))} style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(211,59,85,.9)', color: '#fff', fontSize: 10, padding: '4px 10px', borderRadius: 8, border: 'none' }}>حذف</button>
                </div>
              ) : (
                <label className="adm-thumb-drop">
                  {uploadingQImage ? <div className="adm-loading"><i /></div> : (<><Upload size={20} /><span>اضغط لرفع صورة السؤال</span></>)}
                  <input type="file" accept="image/*" className="hidden" onChange={handleQuestionImageUpload} disabled={uploadingQImage} />
                </label>
              )}
            </label>
            <div className="form-grid">
              <label>رابط إضافي (URL)<input value={qForm.question_link_url} onChange={(e) => setQForm({ ...qForm, question_link_url: e.target.value })} placeholder="https://..." dir="ltr" /></label>
              <label>نص الرابط<input value={qForm.question_link_text} onChange={(e) => setQForm({ ...qForm, question_link_text: e.target.value })} placeholder="مثال: اقرأ النص" /></label>
            </div>
            {(['a', 'b', 'c', 'd'] as const).map((opt) => (
              <label key={opt}>الخيار {optionLabels[opt]}<input value={(qForm as any)[`option_${opt}`]} onChange={(e) => setQForm({ ...qForm, [`option_${opt}`]: e.target.value })} placeholder={`الخيار ${optionLabels[opt]} (اختياري)`} /></label>
            ))}
            <div className="form-grid">
              <label>الإجابة الصحيحة *
                <select value={qForm.correct_answer} onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })}>
                  <option value="a">الخيار أ</option><option value="b">الخيار ب</option><option value="c">الخيار ج</option><option value="d">الخيار د</option>
                </select>
              </label>
              <label>الدرجة<input type="number" min={1} value={qForm.marks} onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) })} /></label>
            </div>
            <label>شرح الإجابة — نص (اختياري)<input value={qForm.explanation} onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })} placeholder="سيظهر للطالب بعد الاختبار" /></label>
            <label>شرح الإجابة — رقم فيديو Bunny (اختياري)<input value={qForm.explanation_video_id} onChange={(e) => setQForm({ ...qForm, explanation_video_id: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" /></label>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={saving || uploadingQImage}>{saving ? 'جاري الحفظ...' : 'إضافة السؤال ✅'}</button>
              <button type="button" className="ghost-button" onClick={() => setShowQModal(null)}>إغلاق</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
