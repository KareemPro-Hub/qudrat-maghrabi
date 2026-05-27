import { useEffect, useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [showQModal, setShowQModal] = useState<string | null>(null) // quiz id
  const [expanded, setExpanded] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Record<string, any[]>>({})

  const emptyQuiz = { title: '', course_id: '', description: '', total_marks: 10, pass_marks: 6, time_limit_minutes: '' }
  const emptyQ = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', marks: 1, explanation: '' }
  const [quizForm, setQuizForm] = useState(emptyQuiz)
  const [qForm, setQForm] = useState(emptyQ)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: q }, { data: c }] = await Promise.all([
      supabase.from('quizzes').select('*, courses(title)').order('created_at', { ascending: false }),
      supabase.from('courses').select('id, title').eq('is_published', false).order('title')
        .then(r => r.data ? r : supabase.from('courses').select('id, title').order('title'))
    ])
    setQuizzes(q || [])
    // Get all courses
    const { data: allCourses } = await supabase.from('courses').select('id, title').order('title')
    setCourses(allCourses || [])
    setLoading(false)
  }

  async function fetchQuestions(quizId: string) {
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index')
    setQuestions(prev => ({ ...prev, [quizId]: data || [] }))
  }

  async function handleSaveQuiz(e: React.FormEvent) {
    e.preventDefault()
    if (!quizForm.title || !quizForm.course_id) return toast.error('عنوان الاختبار والكورس مطلوبان')
    setSaving(true)
    const { error } = await supabase.from('quizzes').insert({
      ...quizForm,
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
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-navy">الاختبارات</h1>
          <p className="text-gray-500 mt-1">إدارة اختبارات المنصة</p>
        </div>
        <button onClick={() => setShowQuizModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> إضافة اختبار
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" /></div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-bold mb-4">لا توجد اختبارات بعد</p>
          <button onClick={() => setShowQuizModal(true)} className="btn-primary">أضف أول اختبار</button>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Quiz Header */}
              <div className="flex items-center gap-4 p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-extrabold text-brand-navy">{quiz.title}</h3>
                    <span className="text-xs bg-purple-50 text-brand-purple font-bold px-2 py-1 rounded-lg">{quiz.courses?.title}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${quiz.is_published ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {quiz.is_published ? '✅ منشور' : '⏸ مخفي'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    {quiz.total_marks} درجة | نجاح: {quiz.pass_marks} | {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} دقيقة` : 'بدون وقت'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowQModal(quiz.id); if (!questions[quiz.id]) fetchQuestions(quiz.id) }} className="btn-outline py-2 px-3 text-sm">+ سؤال</button>
                  <button onClick={() => togglePublish(quiz)} className="p-2 text-gray-400 hover:text-brand-pink hover:bg-pink-50 rounded-lg transition-colors">
                    {quiz.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={() => deleteQuiz(quiz.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  <button
                    onClick={() => { setExpanded(expanded === quiz.id ? null : quiz.id); if (!questions[quiz.id]) fetchQuestions(quiz.id) }}
                    className="p-2 text-gray-400 hover:text-brand-navy rounded-lg"
                  >
                    {expanded === quiz.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {expanded === quiz.id && (
                <div className="border-t border-gray-100 p-5">
                  <h4 className="font-bold text-brand-navy mb-3 text-sm">الأسئلة ({questions[quiz.id]?.length || 0})</h4>
                  {!questions[quiz.id] || questions[quiz.id].length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">لا توجد أسئلة بعد — اضغط "+ سؤال" لإضافة أسئلة</p>
                  ) : (
                    <div className="space-y-3">
                      {questions[quiz.id].map((q, i) => (
                        <div key={q.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold text-brand-navy text-sm flex-1">
                              <span className="text-brand-pink ml-1">{i + 1}.</span> {q.question_text}
                            </p>
                            <button onClick={() => deleteQuestion(q.id, quiz.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={14} /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {(['a','b','c','d'] as const).map(opt => (
                              <div key={opt} className={`text-xs px-3 py-2 rounded-lg font-semibold ${q.correct_answer === opt ? 'bg-green-100 text-green-700' : 'bg-white text-gray-500 border border-gray-200'}`}>
                                {optionLabels[opt]}) {q[`option_${opt}`]}
                              </div>
                            ))}
                          </div>
                          {q.explanation && <p className="text-xs text-gray-400 mt-2 border-t border-gray-200 pt-2">💡 {q.explanation}</p>}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-brand-lg">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-brand-navy">إضافة اختبار جديد</h2>
              <button onClick={() => setShowQuizModal(false)} className="text-gray-400 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveQuiz} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">عنوان الاختبار *</label>
                <input value={quizForm.title} onChange={e => setQuizForm({...quizForm, title: e.target.value})} className="input-field" placeholder="مثال: اختبار الوحدة الأولى" />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">الكورس *</label>
                <select value={quizForm.course_id} onChange={e => setQuizForm({...quizForm, course_id: e.target.value})} className="input-field">
                  <option value="">اختر الكورس</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">الوصف</label>
                <textarea value={quizForm.description} onChange={e => setQuizForm({...quizForm, description: e.target.value})} className="input-field" rows={2} placeholder="وصف مختصر..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">الدرجة الكاملة</label>
                  <input type="number" value={quizForm.total_marks} onChange={e => setQuizForm({...quizForm, total_marks: Number(e.target.value)})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">درجة النجاح</label>
                  <input type="number" value={quizForm.pass_marks} onChange={e => setQuizForm({...quizForm, pass_marks: Number(e.target.value)})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">الوقت (دقيقة)</label>
                  <input type="number" value={quizForm.time_limit_minutes} onChange={e => setQuizForm({...quizForm, time_limit_minutes: e.target.value})} className="input-field" placeholder="اختياري" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 text-center">{saving ? 'جاري الحفظ...' : 'إضافة الاختبار'}</button>
                <button type="button" onClick={() => setShowQuizModal(false)} className="btn-outline flex-1 py-3">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-brand-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-extrabold text-brand-navy">إضافة سؤال</h2>
              <button onClick={() => setShowQModal(null)} className="text-gray-400 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveQuestion} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">نص السؤال *</label>
                <textarea value={qForm.question_text} onChange={e => setQForm({...qForm, question_text: e.target.value})} className="input-field" rows={3} placeholder="اكتب السؤال هنا..." />
              </div>
              <div className="grid grid-cols-1 gap-3">
                {(['a','b','c','d'] as const).map(opt => (
                  <div key={opt}>
                    <label className="block text-sm font-bold text-brand-navy mb-1">الخيار {optionLabels[opt]} *</label>
                    <input value={qForm[`option_${opt}`]} onChange={e => setQForm({...qForm, [`option_${opt}`]: e.target.value})} className="input-field" placeholder={`الخيار ${optionLabels[opt]}`} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">الإجابة الصحيحة *</label>
                  <select value={qForm.correct_answer} onChange={e => setQForm({...qForm, correct_answer: e.target.value})} className="input-field">
                    <option value="a">الخيار أ</option>
                    <option value="b">الخيار ب</option>
                    <option value="c">الخيار ج</option>
                    <option value="d">الخيار د</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-2">الدرجة</label>
                  <input type="number" value={qForm.marks} onChange={e => setQForm({...qForm, marks: Number(e.target.value)})} className="input-field" min={1} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2">شرح الإجابة (اختياري)</label>
                <input value={qForm.explanation} onChange={e => setQForm({...qForm, explanation: e.target.value})} className="input-field" placeholder="سيظهر للطالب بعد الاختبار" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 text-center">{saving ? 'جاري الحفظ...' : 'إضافة السؤال ✅'}</button>
                <button type="button" onClick={() => setShowQModal(null)} className="btn-outline flex-1 py-3">إغلاق</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
