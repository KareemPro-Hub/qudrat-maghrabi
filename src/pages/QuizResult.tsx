import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Trophy, RotateCcw, Home, BookOpen, Play, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

function ExplanationVideo({ videoId, courseId, sessionToken, onClose }: { videoId: string, courseId: string, sessionToken: string, onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [src, setSrc] = useState('')

  useEffect(() => {
    // من غير الفحص ده كان الطلب بيتبعت بتوكن فاضي لو الجلسة لسه بتتحمّل،
    // فتظهر رسالة "تعذّر تحميل الفيديو" ومتتصلحش لوحدها بعد ما التوكن يجهز.
    if (!sessionToken) return
    let destroyed = false
    async function init() {
      try {
        const res = await fetch('/api/bunny-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ videoId, courseId }),
        })
        const { libraryId, token, expires, error: apiError } = await res.json()
        if (apiError || !token) throw new Error(apiError || 'تعذّر تحميل الفيديو')
        if (destroyed) return
        setSrc(`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`)
        setLoading(false)
      } catch (e: any) { if (!destroyed) { setError(e.message); setLoading(false) } }
    }
    init()
    return () => { destroyed = true }
  }, [videoId, sessionToken])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-black rounded-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-3 left-3 z-10 bg-white/20 hover:bg-white/40 rounded-full p-1.5 text-white transition-colors">
          <X size={18} />
        </button>
        {loading && <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" /></div>}
        {error && <div className="h-64 flex items-center justify-center text-red-400 font-bold">{error}</div>}
        {src && !error && (
          <div style={{ position: 'relative', aspectRatio: '16/9' }}>
            <iframe
              src={src}
              loading="lazy"
              style={{ border: 0, position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuizResult() {
  const { quizId, resultId } = useParams<{ quizId: string; resultId: string }>()
  const [result, setResult] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState('')
  const [explanationVideo, setExplanationVideo] = useState<{ videoId: string, courseId: string } | null>(null)
  const emailSent = useRef(false)

  useEffect(() => {
    fetchResult()
    supabase.auth.getSession().then(({ data: { session } }) => setSessionToken(session?.access_token || ''))
  }, [])

  async function fetchResult() {
    const [{ data: r }, { data: q }, { data: qs }] = await Promise.all([
      supabase.from('quiz_results').select('*').eq('id', resultId).single(),
      supabase.from('quizzes').select('*, courses(title, id)').eq('id', quizId).single(),
      supabase.rpc('get_quiz_review', { p_quiz_id: quizId, p_result_id: resultId })
    ])
    setResult(r)
    setQuiz(q)
    setQuestions(qs || [])
    setLoading(false)

    // إرسال إيميل عند النجاح (مرة واحدة فقط)
    if (r?.passed && !emailSent.current) {
      emailSent.current = true
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user!.id).single()
      const { data: sessionData } = await supabase.auth.getSession()
      fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          to: profile?.email || user?.email,
          type: 'quiz_passed',
          data: {
            studentName: profile?.full_name,
            quizTitle: q?.title,
            score: r.score,
            totalMarks: r.total_marks,
            courseId: q?.course_id,
          }
        })
      })
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )

  if (!result || !quiz) return null

  const pct = Math.round((result.score / result.total_marks) * 100)
  const optionLabels: Record<string, string> = { a: 'أ', b: 'ب', c: 'ج', d: 'د' }

  return (
    <>
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">

        {/* Result Card */}
        <div className={`rounded-3xl p-8 mb-6 text-center ${result.passed ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200' : 'bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-200'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.passed ? 'bg-green-500' : 'bg-red-500'}`}>
            {result.passed ? <Trophy size={36} className="text-white" /> : <XCircle size={36} className="text-white" />}
          </div>

          <h1 className="text-2xl font-black text-brand-navy mb-1">
            {result.passed ? 'أحسنت ! اجتزت الاختبار 🎉' : 'لم تجتز الاختبار هذه المرة'}
          </h1>
          <p className="text-gray-600 mb-6">{quiz.title}</p>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-black gradient-text">{result.score}</div>
              <div className="text-gray-500 text-sm">درجتك</div>
            </div>
            <div className="text-gray-300 text-3xl">/</div>
            <div className="text-center">
              <div className="text-4xl font-black text-gray-400">{result.total_marks}</div>
              <div className="text-gray-500 text-sm">الدرجة الكاملة</div>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-black ${pct >= 60 ? 'text-green-600' : 'text-red-500'}`}>{pct}%</div>
              <div className="text-gray-500 text-sm">النسبة</div>
            </div>
          </div>

          <div className="w-full bg-white/60 rounded-full h-3 mt-6">
            <div
              className={`h-3 rounded-full transition-all duration-1000 ${result.passed ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">درجة النجاح: {quiz.pass_marks}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <Link to="/dashboard" className="btn-outline py-3 px-4 flex items-center justify-center gap-2">
            <Home size={16} /> لوحتي
          </Link>
          {quiz?.course_id && (
            <Link to={`/learn/${quiz.course_id}`} className="btn-outline py-3 px-4 flex items-center justify-center gap-2 flex-1">
              <BookOpen size={16} /> العودة للكورس
            </Link>
          )}
          {!result.passed && (
            <Link to={`/quiz/${quizId}`} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
              <RotateCcw size={16} /> إعادة الاختبار
            </Link>
          )}
        </div>

        {/* Review Answers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-black text-brand-navy mb-5 text-right">مراجعة الإجابات</h2>
          <div className="space-y-5">
            {questions.map((q, i) => {
              const studentAnswer = result.answers?.[q.id]
              const isCorrect = studentAnswer === q.correct_answer
              return (
                <div key={q.id} className={`rounded-xl p-4 border-2 ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                  <div className="flex items-start gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                      {isCorrect ? <CheckCircle size={14} className="text-white" /> : <XCircle size={14} className="text-white" />}
                    </div>
                    <p className="font-bold text-brand-navy text-sm flex-1 text-right">
                      <span className="text-brand-pink ml-1">{i + 1}.</span> {q.question_text}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {(['a','b','c','d'] as const).map(opt => {
                      const isSelected = studentAnswer === opt
                      const isRight = q.correct_answer === opt
                      return (
                        <div key={opt} className={`text-xs px-3 py-2 rounded-lg font-semibold flex items-center gap-1 ${
                          isRight ? 'bg-green-100 text-green-700' :
                          isSelected && !isRight ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          <span>{optionLabels[opt]}{q[`option_${opt}`] && q[`option_${opt}`] !== optionLabels[opt] ? ')' : ''}</span>
                          {q[`option_${opt}`] && q[`option_${opt}`] !== optionLabels[opt] && <span className="flex-1">{q[`option_${opt}`]}</span>}
                          {isRight && <CheckCircle size={12} />}
                          {isSelected && !isRight && <XCircle size={12} />}
                        </div>
                      )
                    })}
                  </div>

                  {q.explanation && (
                    <p className="text-xs text-gray-500 bg-white/70 rounded-lg p-2 mt-2">
                      💡 <span className="font-semibold">الشرح:</span> {q.explanation}
                    </p>
                  )}
                  {q.explanation_video_id && (
                    <button
                      onClick={() => setExplanationVideo({ videoId: q.explanation_video_id, courseId: quiz.course_id })}
                      className="mt-2 flex items-center gap-2 text-xs font-bold text-brand-purple bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors w-full justify-center">
                      <Play size={13} /> عرفني الإجابة الصحيحة
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>

    {/* مشغّل فيديو الشرح */}
    {explanationVideo && (
      <ExplanationVideo
        videoId={explanationVideo.videoId}
        courseId={explanationVideo.courseId}
        sessionToken={sessionToken}
        onClose={() => setExplanationVideo(null)}
      />
    )}
    </>
  )
}
