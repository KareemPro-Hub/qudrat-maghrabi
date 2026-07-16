import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Clock, ChevronRight, ChevronLeft, CheckCircle, Send, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Quiz() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    if (!authLoading && user) fetchQuiz()
  }, [user, authLoading])

  useEffect(() => {
    if (quiz?.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60)
    }
  }, [quiz])

  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { handleSubmit(); return }
    timerRef.current = setTimeout(() => setTimeLeft(t => (t ?? 1) - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft])

  async function fetchQuiz() {
    const [{ data: q }, { data: qs }] = await Promise.all([
      supabase.from('quizzes').select('*, courses(title)').eq('id', quizId).single(),
      supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index')
    ])
    if (!q || !q.is_published) { navigate('/dashboard'); return }
    setQuiz(q)
    setQuestions(qs || [])
    setLoading(false)
  }

  async function handleSubmit() {
    clearTimeout(timerRef.current)
    if (Object.keys(answers).length < questions.length) {
      const unanswered = questions.length - Object.keys(answers).length
      if (!confirm(`لم تجب على ${unanswered} سؤال. هل تريد الإرسال ؟`)) return
    }
    setSubmitting(true)

    // Calculate score
    let score = 0
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) score += q.marks
    })
    const passed = score >= quiz.pass_marks

    const { data: result, error } = await supabase.from('quiz_results').insert({
      student_id: user!.id,
      quiz_id: quizId,
      score,
      total_marks: quiz.total_marks,
      passed,
      answers
    }).select('id').single()

    if (error) {
      toast.error('حدث خطأ في حفظ النتيجة')
      setSubmitting(false)
      return
    }

    navigate(`/quiz/${quizId}/result/${result.id}`)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" />
  if (!quiz || questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 font-bold">الاختبار غير متاح</p>
    </div>
  )

  const q = questions[current]
  const progress = ((current + 1) / questions.length) * 100
  const answered = Object.keys(answers).length
  const optionLabels: Record<string, string> = { a: 'أ', b: 'ب', c: 'ج', d: 'د' }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-brand-navy font-black">
              {timeLeft !== null && (
                <span className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  <Clock size={14} /> {formatTime(timeLeft)}
                </span>
              )}
            </div>
            <h1 className="text-lg font-black text-brand-navy">{quiz.title}</h1>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>{answered}/{questions.length} أُجيب عليها</span>
            <span>السؤال {current + 1} من {questions.length}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="gradient-bg h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <p className="text-lg font-black text-brand-navy mb-4 leading-relaxed text-right">
            <span className="text-brand-pink ml-2">{current + 1}.</span>
            {q.question_text}
          </p>

          {/* صورة السؤال */}
          {q.question_image_url && (
            <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img src={q.question_image_url} alt="صورة السؤال" className="w-full max-h-64 object-contain" />
            </div>
          )}

          {/* رابط إضافي */}
          {q.question_link_url && (
            <a href={q.question_link_url} target="_blank" rel="noopener noreferrer"
              className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-purple bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition-colors w-fit">
              <ExternalLink size={14} />
              {q.question_link_text || q.question_link_url}
            </a>
          )}

          <div className="space-y-3">
            {(['a', 'b', 'c', 'd'] as const).map(opt => {
              const selected = answers[q.id] === opt
              return (
                <button
                  key={opt}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-right transition-all duration-200 ${
                    selected
                      ? 'border-brand-pink bg-pink-50'
                      : 'border-gray-200 hover:border-brand-purple/40 hover:bg-purple-50/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    selected ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {optionLabels[opt]}
                  </div>
                  <span className={`flex-1 font-semibold ${selected ? 'text-brand-navy' : 'text-gray-600'}`}>
                    {q[`option_${opt}`]}
                  </span>
                  {selected && <CheckCircle size={18} className="text-brand-pink flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrent(c => c - 1)}
            disabled={current === 0}
            className="btn-outline flex items-center gap-2 py-3 px-5 disabled:opacity-40"
          >
            <ChevronRight size={18} /> السابق
          </button>

          <div className="flex-1 flex flex-wrap gap-2 justify-center">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                  i === current ? 'gradient-bg text-white' :
                  answers[questions[i].id] ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent(c => c + 1)} className="btn-primary flex items-center gap-2 py-3 px-5">
              التالي <ChevronLeft size={18} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 py-3 px-5">
              {submitting ? 'جاري الإرسال...' : <><Send size={16} /> إنهاء</>}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
