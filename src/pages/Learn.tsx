import { useEffect, useState, useRef } from 'react'
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom'
import { CheckCircle, Circle, Lock, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

declare global {
  interface Window { VdoPlayer: any }
}

function VdoCipherPlayer({ videoId, courseId, sessionToken }: { videoId: string, courseId: string, sessionToken: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let destroyed = false

    async function init() {
      setLoading(true)
      setError('')

      try {
        // طلب OTP من الـ API
        const res = await fetch('/api/vdocipher-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ videoId, courseId }),
        })
        const { otp, playbackInfo, error: apiError } = await res.json()
        if (apiError || !otp) throw new Error(apiError || 'Failed to load video')
        if (destroyed) return

        // تحميل VdoCipher SDK
        if (!window.VdoPlayer) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://player.vdocipher.com/v2/api.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load VdoCipher SDK'))
            document.head.appendChild(script)
          })
        }
        if (destroyed) return

        // تهيئة المشغّل
        playerRef.current = new window.VdoPlayer({
          otp,
          playbackInfo,
          theme: '9ae8bbe8dd964ddc9bdb932cca1cb59a',
          container: containerRef.current,
        })
        setLoading(false)
      } catch (e: any) {
        if (!destroyed) { setError(e.message); setLoading(false) }
      }
    }

    init()
    return () => { destroyed = true; playerRef.current?.destroy?.() }
  }, [videoId])

  return (
    <div className="w-full h-full bg-black relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
          <p className="text-red-400 font-bold">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}

export default function Learn() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, loading: authLoading } = useAuth()
  const [sessionToken, setSessionToken] = useState<string>('')
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quizByLesson, setQuizByLesson] = useState<Record<string, any>>({}) // lesson_id → quiz
  const [passedQuizIds, setPassedQuizIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && user && courseId) {
      fetchData()
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSessionToken(session?.access_token || '')
      })
    }
  }, [user, authLoading, courseId])

  async function fetchData() {
    const [{ data: c }, { data: l }, { data: e }, { data: p }, { data: q }, { data: qr }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index'),
      supabase.from('enrollments').select('id').eq('student_id', user!.id).eq('course_id', courseId!).eq('payment_status', 'paid').single(),
      supabase.from('lesson_progress').select('lesson_id, completed').eq('student_id', user!.id),
      supabase.from('quizzes').select('*').eq('course_id', courseId!).not('lesson_id', 'is', null),
      supabase.from('quiz_results').select('quiz_id').eq('student_id', user!.id).eq('passed', true),
    ])
    setCourse(c)
    setLessons(l || [])
    setEnrolled(!!e)

    const progressMap: Record<string, boolean> = {}
    p?.forEach((item: any) => { progressMap[item.lesson_id] = item.completed })
    setProgress(progressMap)

    // ربط الاختبارات بالدروس
    const quizMap: Record<string, any> = {}
    q?.forEach((quiz: any) => { if (quiz.lesson_id) quizMap[quiz.lesson_id] = quiz })
    setQuizByLesson(quizMap)

    // الاختبارات التي اجتازها الطالب
    const passed = new Set<string>(qr?.map((r: any) => r.quiz_id) || [])
    setPassedQuizIds(passed)

    if (l && l.length > 0) {
      const firstIncomplete = l.find((lesson: any) => !progressMap[lesson.id]) || l[0]
      setCurrentLesson(firstIncomplete)
    }
    setLoading(false)
  }

  // هل الدرس محجوب بسبب اختبار الدرس السابق؟
  function isBlockedByQuiz(index: number): boolean {
    if (index === 0) return false
    const prevLesson = lessons[index - 1]
    const prevQuiz = quizByLesson[prevLesson?.id]
    if (!prevQuiz) return false
    return !passedQuizIds.has(prevQuiz.id)
  }

  async function markComplete(lessonId: string) {
    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('student_id', user!.id)
      .eq('lesson_id', lessonId)
      .single()

    if (existing) {
      await supabase.from('lesson_progress')
        .update({ completed: true, last_watched_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('lesson_progress')
        .insert({ student_id: user!.id, lesson_id: lessonId, completed: true, watch_percentage: 100 })
    }
    setProgress(prev => ({ ...prev, [lessonId]: true }))
  }

  const completedCount = Object.values(progress).filter(Boolean).length
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0
  const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id)

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" />
  if (!enrolled && course) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <Lock size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-black text-brand-navy mb-2">غير مشترك في هذا الكورس</h2>
        <p className="text-gray-500 mb-6">اشترك الآن للوصول لجميع الدروس والاختبارات</p>
        <Link to={`/courses/${courseId}`} className="btn-primary inline-block py-3 px-8">
          اشترك الآن ←
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 70px)' }}>

        {/* Sidebar — قائمة الدروس */}
        <aside className="lg:w-80 bg-white border-l border-gray-200 flex flex-col">

          {/* Course Header */}
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-black text-brand-navy text-sm leading-tight mb-3">{course?.title}</h2>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>{completedCount}/{lessons.length} درس مكتمل</span>
              <span className="font-bold text-brand-pink">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="gradient-bg h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Lessons List grouped by chapter */}
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const chapters: { name: string; lessons: any[] }[] = []
              lessons.forEach(lesson => {
                const ch = lesson.chapter || ''
                const existing = chapters.find(c => c.name === ch)
                if (existing) existing.lessons.push(lesson)
                else chapters.push({ name: ch, lessons: [lesson] })
              })
              let globalIndex = 0
              return chapters.map(chapter => (
                <div key={chapter.name}>
                  {chapter.name && (
                    <div className="px-4 py-2 bg-gradient-to-l from-purple-50 to-pink-50 border-b border-purple-100 sticky top-0 z-10">
                      <p className="text-xs font-black text-brand-navy">{chapter.name}</p>
                    </div>
                  )}
                  {chapter.lessons.map(lesson => {
                    const i = globalIndex++
                    const isCompleted = progress[lesson.id]
                    const isCurrent = currentLesson?.id === lesson.id
                    const isNotEnrolled = !enrolled && !lesson.is_free_preview
                    const isQuizBlocked = isBlockedByQuiz(lessons.findIndex(l => l.id === lesson.id))
                    const isLocked = isNotEnrolled || isQuizBlocked
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => !isLocked && setCurrentLesson(lesson)}
                        disabled={isLocked}
                        className={`w-full flex items-start gap-3 p-4 text-right border-b border-gray-50 transition-all duration-200
                          ${isCurrent ? 'bg-pink-50 border-r-4 border-r-brand-pink' : 'hover:bg-gray-50'}
                          ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isLocked ? (
                            <Lock size={18} className={isQuizBlocked ? 'text-orange-300' : 'text-gray-300'} />
                          ) : isCompleted ? (
                            <CheckCircle size={18} className="text-green-500" />
                          ) : (
                            <Circle size={18} className={isCurrent ? 'text-brand-pink' : 'text-gray-300'} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isCurrent ? 'text-brand-pink' : isCompleted ? 'text-green-600' : 'text-brand-navy'}`}>
                            {i + 1}. {lesson.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock size={10} />
                            {lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : 'مدة غير محددة'}
                            {lesson.is_free_preview && <span className="text-green-500 font-bold mr-1">مجاني</span>}
                            {isQuizBlocked && <span className="text-orange-400 font-bold mr-1">اجتز الاختبار أولاً</span>}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            })()}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {currentLesson ? (
            <>
              {/* Video Area */}
              <div className="bg-black flex-shrink-0" style={{ aspectRatio: '16/9', maxHeight: '60vh' }}>
                {currentLesson.video_id ? (
                  <VdoCipherPlayer
                    key={currentLesson.id}
                    videoId={currentLesson.video_id}
                    courseId={courseId!}
                    sessionToken={sessionToken}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white">
                    <BookOpen size={48} className="text-white/30 mb-4" />
                    <p className="text-white/60 font-bold">لم يُرفع فيديو لهذا الدرس بعد</p>
                  </div>
                )}
              </div>

              {/* Lesson Info */}
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">الدرس {currentIndex + 1} من {lessons.length}</p>
                    <h1 className="text-2xl font-black text-brand-navy">{currentLesson.title}</h1>
                    {currentLesson.description && (
                      <p className="text-gray-500 mt-2 leading-relaxed">{currentLesson.description}</p>
                    )}
                  </div>
                  {!progress[currentLesson.id] ? (
                    <button
                      onClick={() => markComplete(currentLesson.id)}
                      className="btn-primary flex items-center gap-2 py-2 px-5 text-sm flex-shrink-0">
                      <CheckCircle size={16} /> تم مشاهدة الدرس
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl flex-shrink-0">
                      <CheckCircle size={16} /> مكتمل ✅
                    </div>
                  )}
                </div>

                {/* Navigation */}
                {(() => {
                  const currentQuiz = quizByLesson[currentLesson.id]
                  const quizPassed = currentQuiz ? passedQuizIds.has(currentQuiz.id) : true
                  const isLastLesson = currentIndex === lessons.length - 1
                  return (
                    <div className="mt-6 border-t border-gray-100 pt-6 space-y-3">
                      {/* زر الاختبار — يظهر لو في اختبار للدرس الحالي */}
                      {currentQuiz && (
                        <div className={`rounded-xl p-4 flex items-center justify-between gap-4 ${quizPassed ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                          <div>
                            <p className={`font-black text-sm ${quizPassed ? 'text-green-700' : 'text-orange-700'}`}>
                              {quizPassed ? '✅ اجتزت اختبار هذا الدرس' : '📝 يجب اجتياز الاختبار للمتابعة'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{currentQuiz.title}</p>
                          </div>
                          {!quizPassed && (
                            <Link
                              to={`/quiz/${currentQuiz.id}`}
                              className="btn-primary text-sm py-2 px-4 flex-shrink-0 flex items-center gap-1">
                              ابدأ الاختبار <ChevronLeft size={14} />
                            </Link>
                          )}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => currentIndex > 0 && setCurrentLesson(lessons[currentIndex - 1])}
                          disabled={currentIndex === 0}
                          className="btn-outline flex items-center gap-2 py-2 px-4 text-sm disabled:opacity-40">
                          <ChevronRight size={16} /> الدرس السابق
                        </button>
                        <button
                          onClick={() => {
                            markComplete(currentLesson.id)
                            if (!isLastLesson) setCurrentLesson(lessons[currentIndex + 1])
                          }}
                          disabled={isLastLesson || !quizPassed}
                          title={!quizPassed ? 'اجتز اختبار هذا الدرس أولاً' : ''}
                          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm disabled:opacity-40">
                          الدرس التالي <ChevronLeft size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen size={64} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold">اختر درساً من القائمة</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
