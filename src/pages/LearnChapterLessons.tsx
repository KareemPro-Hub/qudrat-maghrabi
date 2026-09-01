import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Lock, BookOpen, ArrowLeft, Play, Check, ClipboardList } from 'lucide-react'
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
      // مخطط الدروس العام: كل دروس الباب بتظهر للطالب مشترك أو لأ،
      // والدرس غير المجاني بيتقفل لغير المشترك بدل ما يختفي.
      supabase.from('lesson_public_outline').select('*').eq('course_id', courseId).eq('chapter_id', chapterId).order('order_index'),
      supabase.rpc('has_active_course_access', { p_student_id: user!.id, p_course_id: courseId! }),
      supabase.from('lesson_progress').select('lesson_id, completed').eq('student_id', user!.id),
      supabase.from('quizzes').select('*').eq('course_id', courseId!).not('lesson_id', 'is', null),
      supabase.from('quiz_results').select('quiz_id').eq('student_id', user!.id).eq('passed', true),
    ])
    setCourse(c)
    setChapter(ch)
    setLessons(l || [])
    setEnrolled(e === true)

    const progressMap: Record<string, boolean> = {}
    p?.forEach((item: any) => { progressMap[item.lesson_id] = item.completed })
    setProgress(progressMap)

    const quizMap: Record<string, any> = {}
    q?.forEach((quiz: any) => { if (quiz.lesson_id) quizMap[quiz.lesson_id] = quiz })
    setQuizByLesson(quizMap)

    setPassedQuizIds(new Set<string>(qr?.map((r: any) => r.quiz_id) || []))
    setLoading(false)
  }

  const initial = (profile?.full_name || 'ط').charAt(0)
  const completedCount = lessons.filter((l) => progress[l.id]).length

  // لازم يتحقق من تسجيل الدخول قبل شاشة التحميل: الزائر غير المسجّل مكانش بيوصل
  // للسطر ده أصلاً فكان بيفضل على شاشة تحميل بلا نهاية بدل ما يتحوّل لصفحة الدخول.
  if (!authLoading && !user) return <Navigate to="/login" />
  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
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
          {lessons.length > 0 && (
            <div className="lesson-tiles-progress">
              <i style={{ width: `${Math.round((completedCount / lessons.length) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="lesson-tiles">
          {lessons.map((lesson, i) => {
            const isCompleted = !!progress[lesson.id]
            // الدرس غير المجاني بيظهر لغير المشترك عادي بس بقفل ودعوة للاشتراك
            const isLocked = !enrolled && !lesson.is_free_preview
            const lessonTo = isLocked
              ? `/courses/${courseId}`
              : `/learn/${courseId}/${chapterId}/${lesson.id}`
            const quiz = quizByLesson[lesson.id]
            const quizPassed = quiz ? passedQuizIds.has(quiz.id) : false

            return (
              <article className={`lesson-tile${isLocked ? ' is-locked' : ''}`} key={lesson.id}>
                <Link to={lessonTo} className="lesson-tile-cover" aria-label={lesson.title}>
                  {lesson.thumbnail_url ? <img src={lesson.thumbnail_url} alt="" loading="lazy" /> : <Play size={30} />}
                  <b className="lesson-tile-num">{i + 1}</b>
                  {isCompleted
                    ? <b className="lesson-tile-flag is-done"><Check size={12} /> مكتمل</b>
                    : (!isLocked && lesson.is_free_preview) ? <b className="lesson-tile-flag is-free">مجاني</b> : null}
                  {isLocked && <span className="lesson-tile-lock"><Lock size={18} /></span>}
                </Link>
                <div className="lesson-tile-body">
                  <h3>{lesson.title}</h3>
                  <small>
                    {isLocked
                      ? 'متاح للمشتركين في الباقة'
                      : lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : 'مدة غير محددة'}
                  </small>
                </div>
                <Link to={lessonTo} className="lesson-tile-cta">
                  <span>{isLocked ? 'اشترك لفتح الدرس' : isCompleted ? 'أعد المشاهدة' : 'ابدأ الدرس'}</span>
                  <ArrowLeft size={15} />
                </Link>
                {quiz && (
                  isLocked ? (
                    <div className="lesson-tile-hw is-off" aria-disabled="true">
                      <i><ClipboardList size={14} /></i>
                      <span><b>الواجب</b> · يفتح مع الدرس</span>
                      <em>مقفول</em>
                    </div>
                  ) : (
                    <Link to={`/quiz/${quiz.id}`} className={`lesson-tile-hw${quizPassed ? ' is-done' : ''}`}>
                      <i>{quizPassed ? <Check size={14} /> : <ClipboardList size={14} />}</i>
                      <span><b>الواجب</b> · {quizPassed ? 'تم الحل' : 'اختبر نفسك'}</span>
                      <em>{quizPassed ? 'مراجعة ←' : 'ابدأ ←'}</em>
                    </Link>
                  )
                )}
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
