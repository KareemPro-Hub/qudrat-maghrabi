import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Lock, BookOpen, ArrowLeft, Play, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function LearnChapterLessons() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const [course, setCourse] = useState<any>(null)
  const [chapter, setChapter] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [quizByLesson, setQuizByLesson] = useState<Record<string, any>>({})
  const [passedQuizIds, setPassedQuizIds] = useState<Set<string>>(new Set())
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user && courseId && chapterId) fetchData()
  }, [user, authLoading, courseId, chapterId])

  async function fetchData() {
    const [{ data: c }, { data: ch }, { data: l }, { data: e }, { data: p }, { data: q }, { data: qr }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('chapters').select('*').eq('id', chapterId).single(),
      supabase.from('lessons').select('*').eq('course_id', courseId).eq('chapter_id', chapterId).order('order_index'),
      supabase.from('enrollments').select('id').eq('student_id', user!.id).eq('course_id', courseId!).eq('payment_status', 'paid').single(),
      supabase.from('lesson_progress').select('lesson_id, completed').eq('student_id', user!.id),
      supabase.from('quizzes').select('*').eq('course_id', courseId!).not('lesson_id', 'is', null),
      supabase.from('quiz_results').select('quiz_id').eq('student_id', user!.id).eq('passed', true),
    ])
    setCourse(c)
    setChapter(ch)
    setLessons(l || [])
    setEnrolled(!!e || Number(c?.price) === 0)

    const progressMap: Record<string, boolean> = {}
    p?.forEach((item: any) => { progressMap[item.lesson_id] = item.completed })
    setProgress(progressMap)

    const quizMap: Record<string, any> = {}
    q?.forEach((quiz: any) => { if (quiz.lesson_id) quizMap[quiz.lesson_id] = quiz })
    setQuizByLesson(quizMap)

    setPassedQuizIds(new Set<string>(qr?.map((r: any) => r.quiz_id) || []))
    setLoading(false)
  }

  // نفس منطق القفل الموجود في صفحة الدرس: الدرس مقفول لو اختبار الدرس اللي قبله لسه ما اتجازش
  function isBlockedByQuiz(index: number): boolean {
    if (index === 0) return false
    const prevQuiz = quizByLesson[lessons[index - 1]?.id]
    if (!prevQuiz) return false
    return !passedQuizIds.has(prevQuiz.id)
  }

  const initial = (profile?.full_name || 'ط').charAt(0)
  const completedCount = lessons.filter((l) => progress[l.id]).length

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
        <p className="text-gray-500 mb-6">اشترك الآن للوصول لجميع الأبواب والدروس</p>
        <Link to={`/courses/${courseId}`} className="btn-primary inline-block py-3 px-8">اشترك الآن ←</Link>
      </div>
    </div>
  )
  if (lessons.length === 0) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <BookOpen size={64} className="mx-auto text-gray-200 mb-4" />
        <p className="text-gray-400 font-bold mb-4">لا توجد دروس في هذا الباب بعد</p>
        <Link to={`/learn/${courseId}/chapters`} className="btn-primary inline-block py-3 px-8">رجوع للأبواب</Link>
      </div>
    </div>
  )

  return (
    <div className="lesson-hub-page" dir="rtl">
      <header className="hub-header">
        <Link className="hub-logo" to="/" aria-label="قدرات المغربي">
          <img src="/admin/logo.png" alt="قدرات المغربي" />
        </Link>
        <nav className="hub-breadcrumb" aria-label="مسار الباب">
          <span>{course?.title}</span><i>/</i><strong>{chapter?.title}</strong>
        </nav>
        <div className="hub-user-actions">
          <div className="hub-profile"><span>{initial}</span><p><b>{profile?.full_name}</b><small>طالب</small></p></div>
          <Link className="back-dashboard" to={`/learn/${courseId}/chapters`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="m14 7-5 5 5 5"></path></svg>رجوع للأبواب
          </Link>
        </div>
      </header>

      <main className="chapters-gallery-main">
        <div className="chapters-gallery-head">
          <h1>{chapter?.title}</h1>
          <p>{completedCount} من {lessons.length} {lessons.length === 1 ? 'درس' : 'دروس'} مكتملة — اختر الدرس اللي عايز تبدأ بيه.</p>
        </div>
        <div className="chapters-gallery">
          {lessons.map((lesson, i) => {
            const isCompleted = !!progress[lesson.id]
            const isLocked = isBlockedByQuiz(i)
            const meta = isLocked
              ? 'اجتز اختبار الدرس السابق الأول'
              : lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : 'مدة غير محددة'

            const inner = (
              <>
                <span className="chapter-gallery-cover">
                  {lesson.thumbnail_url ? <img src={lesson.thumbnail_url} alt="" /> : <Play size={30} />}
                  <b className="lesson-card-index">{i + 1}</b>
                  {isCompleted && <b className="lesson-card-done"><Check size={13} /> مكتمل</b>}
                </span>
                <div>
                  <h3>{lesson.title}</h3>
                  <p>{meta}</p>
                  <em>
                    {isLocked
                      ? <><Lock size={14} /> مقفول</>
                      : <>{isCompleted ? 'أعد المشاهدة' : 'ابدأ الدرس'} <ArrowLeft size={15} /></>}
                  </em>
                </div>
              </>
            )

            return isLocked ? (
              <div key={lesson.id} className="chapter-gallery-card is-locked" aria-disabled="true">{inner}</div>
            ) : (
              <Link key={lesson.id} to={`/learn/${courseId}/${chapterId}/${lesson.id}`} className="chapter-gallery-card">{inner}</Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
