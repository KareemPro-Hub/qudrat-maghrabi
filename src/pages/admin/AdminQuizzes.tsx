import { useEffect, useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import {
  glassCard, TopSheen, primaryBtnStyle, outlineBtnStyle, inputStyle, labelStyle,
  iconBtnStyle, GlassBadge, GlassPageHeader, GlassSpinner, GlassEmptyState, GlassModal,
} from '../../components/admin/glassKit'

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [showQModal, setShowQModal] = useState<string | null>(null) // quiz id
  const [expanded, setExpanded] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Record<string, any[]>>({})

  const emptyQuiz = { title: '', course_id: '', lesson_id: '', description: '', total_marks: 10, pass_marks: 6, time_limit_minutes: '' }
  const emptyQ = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', marks: 1, explanation: '', explanation_video_id: '', question_image_url: '', question_link_url: '', question_link_text: '' }
  const [lessons, setLessons] = useState<any[]>([])
  const [quizForm, setQuizForm] = useState(emptyQuiz)
  const [qForm, setQForm] = useState(emptyQ)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: q }] = await Promise.all([
      supabase.from('quizzes').select('*, courses(title)').order('created_at', { ascending: false }),
    ])
    setQuizzes(q || [])
    const { data: allCourses } = await supabase.from('courses').select('id, title').order('title')
    setCourses(allCourses || [])
    setLoading(false)
  }

  async function fetchQuestions(quizId: string) {
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index')
    setQuestions(prev => ({ ...prev, [quizId]: data || [] }))
  }

  async function fetchLessons(courseId: string) {
    const { data } = await supabase.from('lessons').select('id, title').eq('course_id', courseId).order('order_index')
    setLessons(data || [])
  }

  async function handleSaveQuiz(e: React.FormEvent) {
    e.preventDefault()
    if (!quizForm.title || !quizForm.course_id) return toast.error('عنوان الاختبار والكورس مطلوبان')
    setSaving(true)
    const { error } = await supabase.from('quizzes').insert({
      ...quizForm,
      lesson_id: quizForm.lesson_id || null,
      time_limit_minutes: quizForm.time_limit_minutes ? Number(quizForm.time_limit_minutes) : null
    })
    if (error) toast.error('حدث خطأ')
    else { toast.success('تم إضافة الاختبار ✅'); setShowQuizModal(false); setQuizForm(emptyQuiz); fetchAll() }
    setSaving(false)
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!qForm.question_text || !qForm.option_a || !qForm.option_b || !qForm.option_c || !qForm.option_d) return toast.error('يرجى تعبئة جميع الحقول')
    setSaving(true)
    const questionsCount = questions[showQModal!]?.length || 0
    const { error } = await supabase.from('quiz_questions').insert({ ...qForm, quiz_id: showQModal, order_index: questionsCount })
    if (error) toast.error('حدث خطأ')
    else { toast.success('تمت إضافة السؤال ✅'); setQForm(emptyQ); fetchQuestions(showQModal!) }
    setSaving(false)
  }

  async function deleteQuestion(id: string, quizId: string) {
    if (!confirm('حذف السؤال؟')) return
    await supabase.from('quiz_questions').delete().eq('id', id)
    fetchQuestions(quizId)
  }

  async function togglePublish(quiz: any) {
    await supabase.from('quizzes').update({ is_published: !quiz.is_published }).eq('id', quiz.id)
    toast.success(quiz.is_published ? 'تم إخفاء الاختبار' : 'تم نشر الاختبار ✅')
    fetchAll()
  }

  async function deleteQuiz(id: string) {
    if (!confirm('حذف الاختبار وجميع أسئلته؟')) return
    await supabase.from('quizzes').delete().eq('id', id)
    toast.success('تم الحذف')
    fetchAll()
  }

  const optionLabels: Record<string, string> = { a: 'أ', b: 'ب', c: 'ج', d: 'د' }

  return (
    <div>
      <GlassPageHeader
        title="الاختبارات"
        subtitle="إدارة اختبارات المنصة"
        action={
          <button onClick={() => setShowQuizModal(true)} style={primaryBtnStyle}>
            <Plus size={17} /> إضافة اختبار
          </button>
        }
      />

      {loading ? (
        <GlassSpinner />
      ) : quizzes.length === 0 ? (
        <GlassEmptyState
          icon={<BookOpen size={40} />}
          text="لا توجد اختبارات بعد"
          action={<button onClick={() => setShowQuizModal(true)} style={{ ...primaryBtnStyle, marginTop: 4 }}>أضف أول اختبار</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {quizzes.map(quiz => (
            <div key={quiz.id} className="qm-glass" style={glassCard}>
              <TopSheen />
              {/* Quiz Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 800, color: '#fff', fontSize: 14, margin: 0 }}>{quiz.title}</h3>
                    <GlassBadge variant="accent">{quiz.courses?.title}</GlassBadge>
                    <GlassBadge variant={quiz.is_published ? 'success' : 'neutral'}>{quiz.is_published ? '✅ منشور' : '⏸ مخفي'}</GlassBadge>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '6px 0 0' }}>
                    {quiz.total_marks} درجة | نجاح: {quiz.pass_marks} | {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} دقيقة` : 'بدون وقت'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setShowQModal(quiz.id); if (!questions[quiz.id]) fetchQuestions(quiz.id) }} className="qm-btn-outline" style={{ ...outlineBtnStyle, padding: '7px 14px', fontSize: 11.5 }}>+ سؤال</button>
                  <button onClick={() => togglePublish(quiz)} className="qm-icon-btn" style={iconBtnStyle()}>
                    {quiz.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button onClick={() => deleteQuiz(quiz.id)} className="qm-icon-btn" style={iconBtnStyle(true)}><Trash2 size={15} /></button>
                  <button
                    onClick={() => { setExpanded(expanded === quiz.id ? null : quiz.id); if (!questions[quiz.id]) fetchQuestions(quiz.id) }}
                    className="qm-icon-btn" style={iconBtnStyle()}
                  >
                    {expanded === quiz.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {expanded === quiz.id && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', padding: 20 }}>
                  <h4 style={{ fontWeight: 700, color: '#fff', marginBottom: 12, fontSize: 12.5 }}>الأسئلة ({questions[quiz.id]?.length || 0})</h4>
                  {!questions[quiz.id] || questions[quiz.id].length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, textAlign: 'center', padding: '16px 0' }}>لا توجد أسئلة بعد — اضغط "+ سؤال" لإضافة أسئلة</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {questions[quiz.id].map((q, i) => (
                        <div key={q.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <p style={{ fontWeight: 700, color: '#fff', fontSize: 12.5, flex: 1, margin: 0 }}>
                              <span style={{ color: '#F9A8D4', marginLeft: 4 }}>{i + 1}.</span> {q.question_text}
                            </p>
                            <button onClick={() => deleteQuestion(q.id, quiz.id)} style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', flexShrink: 0, display: 'flex' }}><Trash2 size={13} /></button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                            {(['a', 'b', 'c', 'd'] as const).map(opt => (
                              <div key={opt} style={{
                                fontSize: 11.5, padding: '7px 12px', borderRadius: 9, fontWeight: 600,
                                background: q.correct_answer === opt ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)',
                                color: q.correct_answer === opt ? '#86EFAC' : 'rgba(255,255,255,0.55)',
                                border: `1px solid ${q.correct_answer === opt ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                              }}>
                                {optionLabels[opt]}) {q[`option_${opt}`]}
                              </div>
                            ))}
                          </div>
                          {q.explanation && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>💡 {q.explanation}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quiz Modal */}
      {showQuizModal && (
        <GlassModal title="إضافة اختبار جديد" onClose={() => setShowQuizModal(false)}>
          <form onSubmit={handleSaveQuiz} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>عنوان الاختبار *</label>
              <input className="qm-input" value={quizForm.title} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })} style={inputStyle} placeholder="مثال: اختبار الوحدة الأولى" />
            </div>
            <div>
              <label style={labelStyle}>الكورس *</label>
              <select className="qm-select" value={quizForm.course_id} onChange={e => { setQuizForm({ ...quizForm, course_id: e.target.value, lesson_id: '' }); fetchLessons(e.target.value) }} style={inputStyle}>
                <option value="">اختر الكورس</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>الدرس المرتبط بالاختبار</label>
              <select className="qm-select" value={quizForm.lesson_id} onChange={e => setQuizForm({ ...quizForm, lesson_id: e.target.value })} style={inputStyle} disabled={!quizForm.course_id}>
                <option value="">بدون درس (اختبار عام للكورس)</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>لو اخترت درس، الطالب لازم يجتاز الاختبار عشان يكمل للدرس اللي بعده</p>
            </div>
            <div>
              <label style={labelStyle}>الوصف</label>
              <textarea className="qm-input" value={quizForm.description} onChange={e => setQuizForm({ ...quizForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="وصف مختصر..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>الدرجة الكاملة</label>
                <input type="number" className="qm-input" value={quizForm.total_marks} onChange={e => setQuizForm({ ...quizForm, total_marks: Number(e.target.value) })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>درجة النجاح</label>
                <input type="number" className="qm-input" value={quizForm.pass_marks} onChange={e => setQuizForm({ ...quizForm, pass_marks: Number(e.target.value) })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>الوقت (دقيقة)</label>
                <input type="number" className="qm-input" value={quizForm.time_limit_minutes} onChange={e => setQuizForm({ ...quizForm, time_limit_minutes: e.target.value })} style={inputStyle} placeholder="اختياري" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>{saving ? 'جاري الحفظ...' : 'إضافة الاختبار'}</button>
              <button type="button" onClick={() => setShowQuizModal(false)} className="qm-btn-outline" style={{ ...outlineBtnStyle, flex: 1 }}>إلغاء</button>
            </div>
          </form>
        </GlassModal>
      )}

      {/* Question Modal */}
      {showQModal && (
        <GlassModal title="إضافة سؤال" onClose={() => setShowQModal(null)} wide>
          <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>نص السؤال *</label>
              <textarea className="qm-input" value={qForm.question_text} onChange={e => setQForm({ ...qForm, question_text: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="اكتب السؤال هنا..." />
            </div>
            <div>
              <label style={labelStyle}>صورة السؤال (رابط URL)</label>
              <input className="qm-input" value={qForm.question_image_url} onChange={e => setQForm({ ...qForm, question_image_url: e.target.value })} style={inputStyle} placeholder="https://..." dir="ltr" />
              {qForm.question_image_url && (
                <img src={qForm.question_image_url} alt="preview" style={{ marginTop: 8, borderRadius: 12, maxHeight: 150, objectFit: 'contain', border: '1px solid rgba(255,255,255,0.15)' }} />
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>رابط إضافي (URL)</label>
                <input className="qm-input" value={qForm.question_link_url} onChange={e => setQForm({ ...qForm, question_link_url: e.target.value })} style={inputStyle} placeholder="https://..." dir="ltr" />
              </div>
              <div>
                <label style={labelStyle}>نص الرابط</label>
                <input className="qm-input" value={qForm.question_link_text} onChange={e => setQForm({ ...qForm, question_link_text: e.target.value })} style={inputStyle} placeholder="مثال: اقرأ النص" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {(['a', 'b', 'c', 'd'] as const).map(opt => (
                <div key={opt}>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>الخيار {optionLabels[opt]} *</label>
                  <input className="qm-input" value={(qForm as any)[`option_${opt}`]} onChange={e => setQForm({ ...qForm, [`option_${opt}`]: e.target.value })} style={inputStyle} placeholder={`الخيار ${optionLabels[opt]}`} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>الإجابة الصحيحة *</label>
                <select className="qm-select" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} style={inputStyle}>
                  <option value="a">الخيار أ</option>
                  <option value="b">الخيار ب</option>
                  <option value="c">الخيار ج</option>
                  <option value="d">الخيار د</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>الدرجة</label>
                <input type="number" className="qm-input" value={qForm.marks} onChange={e => setQForm({ ...qForm, marks: Number(e.target.value) })} style={inputStyle} min={1} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>شرح الإجابة — نص (اختياري)</label>
              <input className="qm-input" value={qForm.explanation} onChange={e => setQForm({ ...qForm, explanation: e.target.value })} style={inputStyle} placeholder="سيظهر للطالب بعد الاختبار" />
            </div>
            <div>
              <label style={labelStyle}>شرح الإجابة — فيديو VdoCipher ID (اختياري)</label>
              <input className="qm-input" value={qForm.explanation_video_id} onChange={e => setQForm({ ...qForm, explanation_video_id: e.target.value })} style={inputStyle} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" dir="ltr" />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>الطالب يضغط "شرح الإجابة" بعد الاختبار فيشوف الفيديو</p>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center' }}>{saving ? 'جاري الحفظ...' : 'إضافة السؤال ✅'}</button>
              <button type="button" onClick={() => setShowQModal(null)} className="qm-btn-outline" style={{ ...outlineBtnStyle, flex: 1 }}>إغلاق</button>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  )
}
