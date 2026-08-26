import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Lock, BookOpen, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function LearnChapters() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const [course, setCourse] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [lessonsByChapter, setLessonsByChapter] = useState<Record<string, any[]>>({})
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user && courseId) fetchData()
  }, [user, authLoading, courseId])

  async function fetchData() {
    const [{ data: c }, { data: ch }, { data: l }, { data: e }, { data: p }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('chapters').select('*').eq('course_id', courseId).order('order_index'),
      supabase.from('lessons').select('id, chapter_id').eq('course_id', courseId),
      supabase.rpc('has_active_course_access', { p_student_id: user!.id, p_course_id: courseId! }),
      supabase.from('lesson_progress').select('lesson_id, completed').eq('student_id', user!.id),
    ])
    setCourse(c)
    setChapters(ch || [])
    setEnrolled(e === true)

    const byChapter: Record<string, any[]> = {}
    ;(l || []).forEach((lesson: any) => {
      const key = lesson.chapter_id || ''
      if (!byChapter[key]) byChapter[key] = []
      byChapter[key].push(lesson)
    })
    setLessonsByChapter(byChapter)

    const progressMap: Record<string, boolean> = {}
    p?.forEach((item: any) => { progressMap[item.lesson_id] = item.completed })
    setProgress(progressMap)

    setLoading(false)
  }

  const initial = (profile?.full_name || 'ط').charAt(0)

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
        <Link to={`/courses/${courseId}`} className="btn-primary inline-block py-3 px-8">
          اشترك الآن ←
        </Link>
      </div>
    </div>
  )
  if (chapters.length === 0) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <BookOpen size={64} className="mx-auto text-gray-200 mb-4" />
        <p className="text-gray-400 font-bold">لا توجد أبواب في هذا الكورس بعد</p>
      </div>
    </div>
  )

  return (
    <div className="lesson-hub-page" dir="rtl">
      <header className="hub-header">
        <Link className="hub-logo" to="/" aria-label="قدرات المغربي">
          <img src="/admin/logo.png" alt="قدرات المغربي" />
        </Link>
        <nav className="hub-breadcrumb" aria-label="مسار الكورس">
          <span>{course?.title}</span><i>/</i><strong>اختر بابك</strong>
        </nav>
        <div className="hub-user-actions">
          <div className="hub-profile"><span>{initial}</span><p><b>{profile?.full_name}</b><small>طالب</small></p></div>
          <Link className="back-dashboard" to="/dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="m14 7-5 5 5 5"></path></svg>العودة للوحة</Link>
        </div>
      </header>

      <main className="chapters-gallery-main">
        <div className="chapters-gallery-head">
          <h1>{course?.title}</h1>
          <p>اختر الباب اللي عايز تبدأ منه، وكل باب فيه دروسه الخاصة.</p>
        </div>
        <div className="chapters-gallery">
          {chapters.map((ch) => {
            const chapterLessons = lessonsByChapter[ch.id] || []
            const total = chapterLessons.length
            const completed = chapterLessons.filter((l) => progress[l.id]).length
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0
            return (
              <Link key={ch.id} to={`/learn/${courseId}/${ch.id}`} className="chapter-gallery-card">
                <span className="chapter-gallery-cover">
                  {ch.cover_url ? <img src={ch.cover_url} alt="" /> : <BookOpen size={32} />}
                </span>
                <div>
                  <h3>{ch.title}</h3>
                  <p>{total > 0 ? `${completed} من ${total} ${total === 1 ? 'درس' : 'دروس'} مكتملة` : 'لا توجد دروس بعد'}</p>
                  {total > 0 && <i><u style={{ width: `${pct}%` }} /></i>}
                  <em>ادخل الباب <ArrowLeft size={15} /></em>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
