import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

type PanelKey = 'home' | 'learning' | 'tests' | 'account'

const WEEK_LABELS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'] // Sat -> Fri

function startOfWeekSaturday(d: Date) {
  const day = d.getDay() // 0=Sun..6=Sat
  const diff = (day + 1) % 7 // days since Saturday
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - diff)
  return s
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const NAV_ITEMS: { key: PanelKey; label: string; icon: JSX.Element }[] = [
  {
    key: 'home', label: 'الرئيسية',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 10.4 12 3.8l8.2 6.6v8.4a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8z" /><path d="M9 20.5v-6h6v6" /></svg>
  },
  {
    key: 'learning', label: 'تعلّمي',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.2c3.2-.8 5.8-.2 8 1.6v12c-2.2-1.8-4.8-2.4-8-1.6z" /><path d="M20 5.2c-3.2-.8-5.8-.2-8 1.6v12c2.2-1.8 4.8-2.4 8-1.6z" /></svg>
  },
  {
    key: 'tests', label: 'الاختبارات',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4.2V3h6v1.2M8.7 9h6.6M8.7 13h4.8M8.7 17h6.6" /></svg>
  },
  {
    key: 'account', label: 'حسابي',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.7-4.2 3.2-6.3 7.5-6.3s6.8 2.1 7.5 6.3" /></svg>
  },
]

const ROLE_LABEL: Record<string, string> = {
  student: 'طالب', parent: 'ولي أمر', teacher: 'مدرس',
  admin: 'مدير المنصة', content_manager: 'مسؤول محتوى', student_manager: 'مسؤول طلاب',
}

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<PanelKey>('home')
  const [fetching, setFetching] = useState(true)
  const [toastMsg, setToastMsg] = useState<{ title: string; body: string } | null>(null)

  const [courses, setCourses] = useState<any[]>([]) // per-enrollment { enrollment, course, lessons, progressMap, completedCount, pct, currentLesson }
  const [quizResults, setQuizResults] = useState<any[]>([])
  const [upcomingQuiz, setUpcomingQuiz] = useState<any>(null)
  const [learningDays, setLearningDays] = useState(0)
  const [weekActivity, setWeekActivity] = useState<boolean[]>(new Array(7).fill(false))
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestNotification, setLatestNotification] = useState<any>(null)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  async function fetchData() {
    setFetching(true)
    const [{ data: enr }, { data: qr }, { data: notifs }] = await Promise.all([
      supabase.from('enrollments').select('*, courses(*)').eq('student_id', user!.id).eq('payment_status', 'paid').order('enrolled_at', { ascending: false }),
      supabase.from('quiz_results').select('*, quizzes(title, total_marks, pass_marks)').eq('student_id', user!.id).order('taken_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
    ])

    const enrollments = enr || []
    const results = qr || []
    setQuizResults(results)

    const unread = (notifs || []).filter((n: any) => !n.is_read)
    setUnreadCount(unread.length)
    setLatestNotification((notifs || [])[0] || null)

    const courseIds = enrollments.map((e: any) => e.course_id)

    // بعض الاشتراكات تكون على "باقة" (كورس أب) والدروس الفعلية منشورة تحت
    // الكورسات الفرعية المرتبطة بها (parent_course_id)، فلازم نجيب أبناء كل
    // كورس مشترك فيه الطالب عشان نعرف منين نجيب الدروس والاختبارات فعليًا.
    const { data: childCourses } = courseIds.length
      ? await supabase.from('courses').select('id, title, parent_course_id').in('parent_course_id', courseIds)
      : { data: [] as any[] }

    const childrenByParent: Record<string, any[]> = {}
    ;(childCourses || []).forEach((c: any) => {
      if (!childrenByParent[c.parent_course_id]) childrenByParent[c.parent_course_id] = []
      childrenByParent[c.parent_course_id].push(c)
    })

    const contentCourseIdsByEnrollment: Record<string, string[]> = {}
    enrollments.forEach((e: any) => {
      const children = childrenByParent[e.course_id]
      contentCourseIdsByEnrollment[e.course_id] = children && children.length > 0
        ? children.map((c: any) => c.id)
        : [e.course_id]
    })
    const contentCourseIds = Array.from(new Set(Object.values(contentCourseIdsByEnrollment).flat()))

    const [{ data: allLessons }, { data: allProgress }, { data: allQuizzes }] = await Promise.all([
      contentCourseIds.length ? supabase.from('lessons').select('*').in('course_id', contentCourseIds).order('order_index') : Promise.resolve({ data: [] as any[] }),
      supabase.from('lesson_progress').select('*').eq('student_id', user!.id),
      contentCourseIds.length ? supabase.from('quizzes').select('*').in('course_id', contentCourseIds).eq('is_published', true) : Promise.resolve({ data: [] as any[] }),
    ])

    const progressByLesson: Record<string, any> = {}
    ;(allProgress || []).forEach((p: any) => { progressByLesson[p.lesson_id] = p })

    const courseRows = enrollments.map((e: any) => {
      const contentIds = contentCourseIdsByEnrollment[e.course_id] || [e.course_id]
      const lessons = (allLessons || []).filter((l: any) => contentIds.includes(l.course_id))
      const completedIds = new Set(lessons.filter((l: any) => progressByLesson[l.id]?.completed).map((l: any) => l.id))
      const completedCount = completedIds.size
      const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0
      const currentLesson = lessons.find((l: any) => !completedIds.has(l.id)) || lessons[0] || null
      // most recent activity timestamp for this course (used to pick "continue" course)
      const lastActivity = lessons.reduce((max: number, l: any) => {
        const t = progressByLesson[l.id]?.last_watched_at ? new Date(progressByLesson[l.id].last_watched_at).getTime() : 0
        return t > max ? t : max
      }, 0)
      return { enrollment: e, course: e.courses, lessons, completedIds, completedCount, pct, currentLesson, lastActivity, contentCourseId: contentIds[0] }
    })
    courseRows.sort((a: any, b: any) => b.lastActivity - a.lastActivity)
    setCourses(courseRows)

    // upcoming (unpassed) quiz across enrolled courses
    const passedQuizIds = new Set(results.filter((r: any) => r.passed).map((r: any) => r.quiz_id))
    const courseTitleById: Record<string, string> = {}
    enrollments.forEach((e: any) => { courseTitleById[e.course_id] = e.courses?.title })
    ;(childCourses || []).forEach((c: any) => { courseTitleById[c.id] = c.title })
    const nextQuiz = (allQuizzes || []).find((q: any) => !passedQuizIds.has(q.id))
    setUpcomingQuiz(nextQuiz ? { ...nextQuiz, courseTitle: courseTitleById[nextQuiz.course_id] } : null)

    // learning days (distinct calendar days with any watched lesson)
    const activityDates = new Set<string>()
    ;(allProgress || []).forEach((p: any) => {
      if (p.last_watched_at) activityDates.add(new Date(p.last_watched_at).toDateString())
    })
    results.forEach((r: any) => { if (r.taken_at) activityDates.add(new Date(r.taken_at).toDateString()) })
    setLearningDays(activityDates.size)

    // this week's streak (Sat -> Fri)
    const weekStart = startOfWeekSaturday(new Date())
    const week = new Array(7).fill(false)
    activityDates.forEach((ds) => {
      const d = new Date(ds)
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart)
        day.setDate(day.getDate() + i)
        if (sameDay(d, day)) week[i] = true
      }
    })
    setWeekActivity(week)

    setFetching(false)
    void flushPendingCompletionEmails()
  }

  // لو أنهى الطالب كورسًا من التطبيق، يبقى إيميل الإتمام معلّقًا؛ هنا نرسله عند أول دخول للمنصة.
  // كل شيء محسوم في السيرفر: لا يُرسل إلا لإتمام مسجّل، ومرة واحدة فقط.
  async function flushPendingCompletionEmails() {
    try {
      const { data: pending } = await supabase
        .from('course_completions')
        .select('course_id')
        .eq('student_id', user!.id)
        .is('emails_sent_at', null)

      if (!pending?.length) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      for (const row of pending) {
        await fetch('/api/notify-course-completion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ courseId: row.course_id }),
        })
      }
    } catch {
      // لا يؤثر على لوحة الطالب إطلاقًا
    }
  }

  async function dismissNotifications() {
    if (unreadCount === 0) {
      toast('لا توجد إشعارات جديدة', { icon: '🔔' })
      return
    }
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false)
    toast.success(latestNotification ? latestNotification.title : 'تم تحديث الإشعارات')
    setUnreadCount(0)
  }

  function showToast(title: string, body: string) {
    setToastMsg({ title, body })
    setTimeout(() => setToastMsg(null), 2600)
  }

  const avgScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((s, r) => s + (r.score / (r.quizzes?.total_marks || 1) * 100), 0) / quizResults.length)
    : null

  const overallPct = courses.length > 0 ? Math.round(courses.reduce((s, c) => s + c.pct, 0) / courses.length) : 0
  const primary = courses[0] || null
  const lastResult = quizResults[0] || null
  const lastResultPct = lastResult ? Math.round((lastResult.score / (lastResult.quizzes?.total_marks || 1)) * 100) : null

  const nearestExpiry = useMemo(() => {
    const dates = courses.map((c) => c.enrollment.expires_at).filter(Boolean).map((d: string) => new Date(d))
    if (!dates.length) return null
    return new Date(Math.max(...dates.map((d) => d.getTime())))
  }, [courses])

  // نفس السبب: من غير الفحص ده الزائر غير المسجّل كان بيعلق على شاشة تحميل دائمة.
  if (!loading && !user) return <Navigate to="/login" />
  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" />
  if (profile?.role === 'parent') return <Navigate to="/login" />
  if (profile && ['admin', 'teacher', 'content_manager', 'student_manager'].includes(profile.role)) {
    return <Navigate to="/admin" />
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'طالب'
  const initial = profile?.full_name?.charAt(0) || 'ط'

  async function handleContinue() {
    if (!primary) return
    showToast(`رائع يا ${firstName}!`, 'خطوة جديدة تقترب بها من هدفك.')
    const cur = primary.currentLesson
    const targetCourseId = cur?.course_id || primary.contentCourseId || primary.course.id
    const target = cur?.chapter_id
      ? `/learn/${cur.course_id}/${cur.chapter_id}/${cur.id}`
      : `/learn/${targetCourseId}`
    setTimeout(() => navigate(target), 550)
  }

  return (
    <div className="student-shell">
      <aside className="student-sidebar" aria-label="التنقل الرئيسي">
        <Link className="student-brand" to="/" aria-label="العودة إلى الصفحة الرئيسية" title="العودة إلى الصفحة الرئيسية">
          <img src="/admin/logo.png" alt="قدرات المغربي" />
          <span className="student-brand-home">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 10.4 12 3.8l8.2 6.6v8.4a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8z" /><path d="M9 20.5v-6h6v6" /></svg>
            العودة للصفحة الرئيسية
          </span>
        </Link>

        <nav className="student-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`student-nav-item${panel === item.key ? ' active' : ''}`}
              type="button"
              onClick={() => setPanel(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 4h8v4.5a4 4 0 0 1-8 0z" />
              <path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13v4M8.5 20h7M10 17h4" />
            </svg>
          </span>
          <p>كل يوم خطوة،<br /><strong>وهدفك أقرب.</strong></p>
        </div>
      </aside>

      <main className="student-main">
        <header className="student-topbar">
          <div className="student-heading">
            <h1>أهلًا {firstName} <span aria-hidden="true">👋</span></h1>
            <p>رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي</p>
          </div>
          <div className="topbar-actions">
            <button className="notification-button" type="button" aria-label="الإشعارات" onClick={dismissNotifications}>
              <svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9z" /><path d="M10 21h4" /></svg>
              {unreadCount > 0 && <i />}
            </button>
            <button
              className="student-mini-profile"
              type="button"
              onClick={() => setPanel('account')}
              style={{ border: 0 }}
            >
              <span>{initial}</span>
              <div><b>{profile?.full_name || 'طالب'}</b><small>{ROLE_LABEL[profile?.role || 'student']}</small></div>
            </button>
          </div>
        </header>

        {/* ===== الرئيسية ===== */}
        <section className={`student-panel${panel === 'home' ? ' active' : ''}`} data-panel="home">
          {primary ? (
            <>
              <article className="continue-card">
                <div className="continue-copy">
                  <span className="continue-label"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><path d="m10 8 5 4-5 4z" /></svg> واصل من حيث توقفت</span>
                  <h2>{primary.course?.title}</h2>
                  <p>الدرس الحالي</p>
                  <h3>{primary.currentLesson?.title || 'ستبدأ قريبًا'}</h3>
                  <button className="primary-study-button" type="button" onClick={handleContinue} disabled={!primary.currentLesson}>
                    <span>أكمل الدرس</span>
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m10 8 5 4-5 4z" /></svg>
                  </button>
                </div>
                <div className="course-progress" role="img" aria-label={`تقدمك في الفصل ${primary.pct} بالمئة`}>
                  <div className="progress-ring" style={{ background: `conic-gradient(#fff 0 ${primary.pct}%, rgba(255,255,255,.2) ${primary.pct}% 100%)` }}>
                    <strong>{primary.pct}<small>%</small></strong>
                    <span>تقدمك في الفصل</span>
                  </div>
                </div>
              </article>

              <section className="student-stats" aria-label="ملخص التقدم">
                <div><span className="stat-icon orange"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 4V2M20 12h2" /></svg></span><p><strong>{overallPct}%</strong><small>الإنجاز</small></p></div>
                <i />
                <div><span className="stat-icon purple"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-7" /></svg></span><p><strong>{avgScore !== null ? `${avgScore}%` : '—'}</strong><small>متوسط الاختبارات</small></p></div>
                <i />
                <div><span className="stat-icon violet"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg></span><p><strong>{learningDays}</strong><small>أيام التعلّم</small></p></div>
              </section>

              <div className="student-lower-grid">
                <section className="today-plan">
                  <header className="section-head">
                    <div><span className="section-icon"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg></span><h2>خطوتك التالية</h2></div>
                    <small><b>{primary.completedCount}</b> من {primary.lessons.length} مكتملة</small>
                  </header>
                  <div className="plan-list">
                    {primary.lessons.length === 0 ? (
                      <p style={{ color: '#9a8fa0', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>لا توجد دروس منشورة بعد في هذا الكورس</p>
                    ) : (() => {
                      // القائمة كانت بتبدأ من الدرس الحالي بالظبط، فأي درس مكتمل كان
                      // بيختفي خالص من الداشبورد والطالب يفتكر إنه اتحذف. بنرجع خطوة
                      // واحدة لورا عشان يفضل شايف آخر درس خلّصه جنب درسه الحالي.
                      const currentIdx = primary.lessons.findIndex((l: any) => l.id === primary.currentLesson?.id)
                      const startIdx = Math.max(0, (currentIdx < 0 ? 0 : currentIdx) - 1)
                      return primary.lessons.slice(startIdx, startIdx + 3)
                    })().map((lesson: any) => {
                      const done = primary.completedIds.has(lesson.id)
                      const isCurrent = primary.currentLesson?.id === lesson.id
                      return (
                        <Link
                          key={lesson.id}
                          className={`plan-item${done ? ' done' : ''}${isCurrent && !done ? ' current' : ''}`}
                          to={lesson.chapter_id
                            ? `/learn/${lesson.course_id}/${lesson.chapter_id}/${lesson.id}`
                            : `/learn/${lesson.course_id || primary.contentCourseId || primary.course.id}`}
                        >
                          <span className="plan-state">{done && <svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7" /></svg>}</span>
                          <span className="plan-copy"><b>{lesson.title}</b><small>{lesson.chapter || primary.course?.title}</small></span>
                          <span className="plan-time">{lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : ''}</span>
                        </Link>
                      )
                    })}
                  </div>
                </section>

                <div className="student-side-stack">
                  <section className="next-test">
                    <div className="next-test-title"><span><svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4V3h6v1M9 10h6M9 14h4" /></svg></span><small>الاختبار القادم</small></div>
                    {upcomingQuiz ? (
                      <>
                        <h2>{upcomingQuiz.title}</h2>
                        <p><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg> {upcomingQuiz.time_limit_minutes ? `${upcomingQuiz.time_limit_minutes} دقيقة` : upcomingQuiz.courseTitle}</p>
                        <button type="button" onClick={() => setPanel('tests')} className="text-button">عرض التفاصيل <svg viewBox="0 0 24 24"><path d="m14 7-5 5 5 5" /></svg></button>
                      </>
                    ) : (
                      <>
                        <h2>لا يوجد اختبار حاليًا</h2>
                        <p>أنجزت كل اختبارات كورساتك 🎉</p>
                      </>
                    )}
                  </section>
                  <section className="weekly-streak">
                    <div><b>استمرارية هذا الأسبوع</b><small>{weekActivity.filter(Boolean).length} من 7 أيام</small></div>
                    <div className="streak-days" aria-label="أيام التعلّم هذا الأسبوع">
                      {WEEK_LABELS.map((l, i) => <span key={i} className={weekActivity[i] ? 'checked' : ''}>{l}</span>)}
                    </div>
                  </section>
                </div>
              </div>
            </>
          ) : (
            <EmptyPanel text="لم تشترك في أي كورس بعد" cta={{ label: 'استعرض الكورسات', to: '/courses' }} />
          )}
        </section>

        {/* ===== تعلّمي ===== */}
        <section className={`student-panel simple-view${panel === 'learning' ? ' active' : ''}`} data-panel="learning">
          <div className="simple-view-head"><div><h2>تعلّمي</h2><p>مسارك واضح؛ درس واحد في كل مرة.</p></div><span className="simple-view-icon"><svg viewBox="0 0 24 24"><path d="M4 5.2c3.2-.8 5.8-.2 8 1.6v12c-2.2-1.8-4.8-2.4-8-1.6z" /><path d="M20 5.2c-3.2-.8-5.8-.2-8 1.6v12c2.2-1.8 4.8-2.4 8-1.6z" /></svg></span></div>
          {courses.length === 0 ? (
            <EmptyPanel text="لم تشترك في أي كورس بعد" cta={{ label: 'استعرض الكورسات', to: '/courses' }} />
          ) : (
            <div className="single-course-stack">
              {courses.map((c) => (
                <article className="single-course" key={c.enrollment.id}>
                  <div className="single-course-progress" style={{ background: `conic-gradient(#7c35df 0 ${c.pct}%, #ece5f1 ${c.pct}%)` }}>
                    <strong>{c.pct}%</strong><span>منجز</span>
                  </div>
                  <div>
                    <small>مسارك الحالي</small>
                    <h3>{c.course?.title}</h3>
                    <p>{c.completedCount} من {c.lessons.length} درسًا مكتملًا</p>
                    <Link to={c.currentLesson?.chapter_id
                      ? `/learn/${c.currentLesson.course_id}/${c.currentLesson.chapter_id}/${c.currentLesson.id}`
                      : `/learn/${c.currentLesson?.course_id || c.contentCourseId || c.course.id}`} className="primary-study-button compact">متابعة التعلّم</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ===== الاختبارات ===== */}
        <section className={`student-panel simple-view${panel === 'tests' ? ' active' : ''}`} data-panel="tests">
          <div className="simple-view-head"><div><h2>الاختبارات</h2><p>اختبارك القادم ونتيجتك الأخيرة، بدون تشتيت.</p></div><span className="simple-view-icon"><svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4V3h6v1M9 10h6M9 14h4" /></svg></span></div>
          <div className="test-focus-row">
            <article>
              <small>القادم</small>
              {upcomingQuiz ? (
                <>
                  <h3>{upcomingQuiz.title}</h3>
                  <p>{upcomingQuiz.courseTitle}{upcomingQuiz.time_limit_minutes ? ` · ${upcomingQuiz.time_limit_minutes} دقيقة` : ''}</p>
                  <Link to={`/quiz/${upcomingQuiz.id}`} className="primary-study-button compact">الاستعداد للاختبار</Link>
                </>
              ) : (
                <>
                  <h3>لا يوجد اختبار قادم</h3>
                  <p>أنجزت جميع الاختبارات المتاحة حاليًا 🎉</p>
                </>
              )}
            </article>
            <article className="last-result">
              <small>آخر نتيجة</small>
              {lastResult ? (
                <>
                  <strong>{lastResultPct}%</strong>
                  <p>{lastResult.passed ? 'أداء ممتاز، استمر.' : 'حاول مجددًا، أنت أقرب من قبل.'}</p>
                </>
              ) : (
                <>
                  <strong>—</strong>
                  <p>لا توجد نتائج اختبارات بعد.</p>
                </>
              )}
            </article>
          </div>
        </section>

        {/* ===== حسابي ===== */}
        <section className={`student-panel simple-view${panel === 'account' ? ' active' : ''}`} data-panel="account">
          <div className="simple-view-head"><div><h2>حسابي</h2><p>بياناتك الأساسية في مكان واحد.</p></div><span className="simple-view-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.7-4.2 3.2-6.3 7.5-6.3s6.8 2.1 7.5 6.3" /></svg></span></div>
          <article className="account-card">
            <span className="account-avatar">{initial}</span>
            <div>
              <h3>{profile?.full_name}</h3>
              <p>{ROLE_LABEL[profile?.role || 'student']} {courses.length > 0 ? `· مشترك في ${courses.length} ${courses.length === 1 ? 'كورس' : 'كورسات'}` : ''}</p>
              <small>{nearestExpiry ? `اشتراكك فعّال حتى ${nearestExpiry.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}` : profile?.email}</small>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="secondary-button" onClick={() => navigate('/profile')}>تعديل البيانات</button>
              <button type="button" className="secondary-button" onClick={async () => { await signOut(); navigate('/') }}>تسجيل الخروج</button>
            </div>
          </article>
        </section>
      </main>

      <div className={`student-toast${toastMsg ? ' show' : ''}`} role="status" aria-live="polite">
        <span>✓</span>
        {toastMsg && <p><b>{toastMsg.title}</b><small>{toastMsg.body}</small></p>}
      </div>
    </div>
  )
}

function EmptyPanel({ text, cta }: { text: string; cta?: { label: string; to: string } }) {
  return (
    <div className="empty-panel">
      <svg viewBox="0 0 24 24"><path d="M4 5.2c3.2-.8 5.8-.2 8 1.6v12c-2.2-1.8-4.8-2.4-8-1.6z" /><path d="M20 5.2c-3.2-.8-5.8-.2-8 1.6v12c2.2-1.8 4.8-2.4 8-1.6z" /></svg>
      <p>{text}</p>
      {cta && <Link to={cta.to} className="primary-study-button primary-study-button--alternate compact" style={{ background: 'linear-gradient(135deg,#7935EB,#D946C6)', color: '#fff' }}>{cta.label}</Link>}
    </div>
  )
}
