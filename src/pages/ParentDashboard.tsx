import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

type PanelKey = 'home' | 'progress' | 'tests' | 'account'

const WEEK_LABELS = [
  { l: 'س', name: 'السبت' }, { l: 'ح', name: 'الأحد' }, { l: 'ن', name: 'الاثنين' },
  { l: 'ث', name: 'الثلاثاء' }, { l: 'ر', name: 'الأربعاء' }, { l: 'خ', name: 'الخميس' }, { l: 'ج', name: 'الجمعة' },
]

function startOfWeekSaturday(d: Date) {
  const day = d.getDay()
  const diff = (day + 1) % 7
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - diff)
  return s
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function daysInRange(dates: Set<string>, from: Date, to: Date) {
  let n = 0
  dates.forEach((ds) => { const d = new Date(ds); if (d >= from && d < to) n++ })
  return n
}

const NAV_ITEMS: { key: PanelKey; label: string; icon: JSX.Element }[] = [
  { key: 'home', label: 'الرئيسية', icon: <svg viewBox="0 0 24 24"><path d="M3.8 10.4 12 3.8l8.2 6.6v8.4a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8z" /><path d="M9 20.5v-6h6v6" /></svg> },
  { key: 'progress', label: 'التقدم', icon: <svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-7" /><path d="M16 6h3v3" /></svg> },
  { key: 'tests', label: 'الاختبارات', icon: <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4V3h6v1M9 10h6M9 14h4" /></svg> },
  { key: 'account', label: 'حسابي', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.7-4.2 3.2-6.3 7.5-6.3s6.8 2.1 7.5 6.3" /></svg> },
]

interface CourseRow {
  enrollment: any; course: any; lessons: any[]; completedIds: Set<string>
  completedCount: number; pct: number; currentLesson: any; lastActivity: number
}
interface StudentSummary {
  id: string; full_name: string; email: string
  courses: CourseRow[]; primary: CourseRow | null
  quizResults: any[]; avgScore: number | null
  lastResult: any | null; lastResultPct: number | null; prevResultPct: number | null
  upcomingQuiz: any | null
  weekActivity: boolean[]; commitmentDays: number
  weeklyGrowth: number | null
  estimatedMinutes: number
}

export default function ParentDashboard() {
  const { user, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<PanelKey>('home')
  const [fetching, setFetching] = useState(true)
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderSent, setReminderSent] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  async function fetchData() {
    setFetching(true)
    const { data: links } = await supabase
      .from('parent_student')
      .select('student_id, profiles(id, full_name, email)')
      .eq('parent_id', user!.id)

    if (!links || links.length === 0) { setStudents([]); setFetching(false); return }

    const studentIds = links.map((l: any) => l.student_id)

    const [{ data: enr }, { data: allProgress }, { data: allResults }] = await Promise.all([
      supabase.from('enrollments').select('*, courses(*)').in('student_id', studentIds).eq('payment_status', 'paid').order('enrolled_at', { ascending: false }),
      supabase.from('lesson_progress').select('*').in('student_id', studentIds),
      supabase.from('quiz_results').select('*, quizzes(title, total_marks, pass_marks)').in('student_id', studentIds).order('taken_at', { ascending: false }),
    ])

    const courseIds = Array.from(new Set((enr || []).map((e: any) => e.course_id)))
    const [{ data: allLessons }, { data: allQuizzes }] = await Promise.all([
      courseIds.length ? supabase.from('lessons').select('*').in('course_id', courseIds).order('order_index') : Promise.resolve({ data: [] as any[] }),
      courseIds.length ? supabase.from('quizzes').select('*').in('course_id', courseIds).eq('is_published', true) : Promise.resolve({ data: [] as any[] }),
    ])

    const summaries: StudentSummary[] = links.map((l: any) => {
      const sid = l.profiles.id
      const enrollments = (enr || []).filter((e: any) => e.student_id === sid)
      const progressRows = (allProgress || []).filter((p: any) => p.student_id === sid)
      const progressByLesson: Record<string, any> = {}
      progressRows.forEach((p: any) => { progressByLesson[p.lesson_id] = p })
      const results = (allResults || []).filter((r: any) => r.student_id === sid)

      const courses: CourseRow[] = enrollments.map((e: any) => {
        const lessons = (allLessons || []).filter((ls: any) => ls.course_id === e.course_id)
        const completedIds = new Set(lessons.filter((ls: any) => progressByLesson[ls.id]?.completed).map((ls: any) => ls.id))
        const completedCount = completedIds.size
        const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0
        const currentLesson = lessons.find((ls: any) => !completedIds.has(ls.id)) || lessons[0] || null
        const lastActivity = lessons.reduce((max: number, ls: any) => {
          const t = progressByLesson[ls.id]?.last_watched_at ? new Date(progressByLesson[ls.id].last_watched_at).getTime() : 0
          return t > max ? t : max
        }, 0)
        return { enrollment: e, course: e.courses, lessons, completedIds, completedCount, pct, currentLesson, lastActivity }
      })
      courses.sort((a, b) => b.lastActivity - a.lastActivity)
      const primary = courses[0] || null

      const avgScore = results.length > 0
        ? Math.round(results.reduce((s: number, r: any) => s + (r.score / (r.quizzes?.total_marks || 1) * 100), 0) / results.length)
        : null
      const lastResult = results[0] || null
      const lastResultPct = lastResult ? Math.round((lastResult.score / (lastResult.quizzes?.total_marks || 1)) * 100) : null
      const prevResult = results[1] || null
      const prevResultPct = prevResult ? Math.round((prevResult.score / (prevResult.quizzes?.total_marks || 1)) * 100) : null

      const passedQuizIds = new Set(results.filter((r: any) => r.passed).map((r: any) => r.quiz_id))
      const courseTitleById: Record<string, string> = {}
      enrollments.forEach((e: any) => { courseTitleById[e.course_id] = e.courses?.title })
      const studentCourseIds = new Set(enrollments.map((e: any) => e.course_id))
      const nextQuiz = (allQuizzes || []).find((q: any) => studentCourseIds.has(q.course_id) && !passedQuizIds.has(q.id))
      const upcomingQuiz = nextQuiz ? { ...nextQuiz, courseTitle: courseTitleById[nextQuiz.course_id] } : null

      const activityDates = new Set<string>()
      progressRows.forEach((p: any) => { if (p.last_watched_at) activityDates.add(new Date(p.last_watched_at).toDateString()) })
      results.forEach((r: any) => { if (r.taken_at) activityDates.add(new Date(r.taken_at).toDateString()) })

      const weekStart = startOfWeekSaturday(new Date())
      const weekActivity = new Array(7).fill(false)
      activityDates.forEach((ds) => {
        const d = new Date(ds)
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart); day.setDate(day.getDate() + i)
          if (sameDay(d, day)) weekActivity[i] = true
        }
      })
      const commitmentDays = weekActivity.filter(Boolean).length

      // weekly growth: avg quiz score this-week vs previous-week (needs both windows populated)
      const now = new Date()
      const thisWeekStart = startOfWeekSaturday(now)
      const prevWeekStart = new Date(thisWeekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7)
      const thisWeekResults = results.filter((r: any) => r.taken_at && new Date(r.taken_at) >= thisWeekStart)
      const prevWeekResults = results.filter((r: any) => r.taken_at && new Date(r.taken_at) >= prevWeekStart && new Date(r.taken_at) < thisWeekStart)
      let weeklyGrowth: number | null = null
      if (thisWeekResults.length > 0 && prevWeekResults.length > 0) {
        const avg = (arr: any[]) => arr.reduce((s, r) => s + (r.score / (r.quizzes?.total_marks || 1) * 100), 0) / arr.length
        weeklyGrowth = Math.round(avg(thisWeekResults) - avg(prevWeekResults))
      }

      // estimated study minutes from lesson durations x watch percentage
      const estimatedMinutes = Math.round(
        progressRows.reduce((sum: number, p: any) => {
          const lesson = (allLessons || []).find((ls: any) => ls.id === p.lesson_id)
          if (!lesson?.duration_minutes) return sum
          return sum + lesson.duration_minutes * ((p.watch_percentage || 0) / 100)
        }, 0)
      )

      return {
        id: sid, full_name: l.profiles.full_name, email: l.profiles.email,
        courses, primary, quizResults: results, avgScore,
        lastResult, lastResultPct, prevResultPct, upcomingQuiz,
        weekActivity, commitmentDays, weeklyGrowth, estimatedMinutes,
      }
    })

    setStudents(summaries)
    setActiveId((prev) => (summaries.find((s) => s.id === prev) ? prev : summaries[0]?.id || ''))
    setFetching(false)
  }

  function showToast(title: string, body: string) {
    setToastMsg({ title, body })
    setTimeout(() => setToastMsg(null), 2800)
  }

  const active = students.find((s) => s.id === activeId) || null

  async function sendReminder() {
    if (!active || sendingReminder) return
    setSendingReminder(true)
    const lessonTitle = active.primary?.currentLesson?.title
    const body = lessonTitle ? `أكمل درسك القادم: ${lessonTitle}` : 'أكمل خطتك الدراسية لهذا اليوم'
    const { error } = await supabase.from('notifications').insert({
      user_id: active.id,
      title: `تذكير من ${profile?.full_name || 'ولي الأمر'}`,
      body,
      type: 'info',
    })
    setSendingReminder(false)
    if (error) {
      toast.error('تعذّر إرسال التذكير، حاول مجددًا')
      return
    }
    setReminderSent(true)
    showToast('تم إرسال التذكير', `سيصل إلى ${active.full_name.split(' ')[0]} داخل حسابه.`)
  }

  async function viewWeeklyReport() {
    setPanel('progress')
    showToast(`تقرير ${active?.full_name.split(' ')[0] || ''} جاهز`, 'ملخص الأسبوع ظاهر أمامك الآن.')
  }

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-purple border-t-transparent animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" />
  if (profile && profile.role !== 'parent') return <Navigate to="/dashboard" />

  if (students.length === 0) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="text-brand-purple mx-auto"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M15 14c3.4-.4 5.5 1.4 6 5" /></svg>
        </div>
        <h2 className="text-2xl font-black text-brand-navy mb-2">لم تربط أي طالب بعد</h2>
        <p className="text-gray-500 mb-6">ربّط حساب ابنك/ابنتك لمتابعة تقدمه الدراسي</p>
        <Link to="/parent/link" className="btn-primary inline-block py-3 px-8">ربط حساب طالب</Link>
      </div>
    </div>
  )

  if (!active) return null

  const firstName = profile?.full_name?.split(' ')[0] || 'ولي الأمر'
  const childFirst = active.full_name.split(' ')[0]
  const parentInitial = profile?.full_name?.charAt(0) || 'و'
  const childInitial = active.full_name.charAt(0)

  const hours = Math.floor(active.estimatedMinutes / 60)
  const mins = active.estimatedMinutes % 60
  const studyTimeLabel = active.estimatedMinutes === 0 ? '—' : hours > 0 ? `${hours} ساعة و${mins} دقيقة` : `${mins} دقيقة`

  const hasAttention = !!active.primary && active.primary.pct < 100

  return (
    <div className="parent-shell">
      <aside className="parent-sidebar" aria-label="التنقل الرئيسي">
        <Link className="parent-brand" to="/" aria-label="قدرات المغربي">
          <img src="/admin/logo.png" alt="قدرات المغربي" />
        </Link>

        <nav className="parent-nav">
          {NAV_ITEMS.map((item) => (
            <button key={item.key} className={`parent-nav-item${panel === item.key ? ' active' : ''}`} type="button" onClick={() => setPanel(item.key)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span><svg viewBox="0 0 24 24"><path d="m12 3 1.4 5.4L19 10l-5.6 1.6L12 17l-1.4-5.4L5 10l5.6-1.6z" /></svg></span>
          <p>كل يوم خطوة،<br /><strong>وهدفه أقرب.</strong></p>
        </div>
      </aside>

      <main className="parent-main">
        <header className="parent-topbar">
          <div className="parent-heading">
            <h1>أهلًا {firstName} <span aria-hidden="true">👋</span></h1>
            <p>متابعة بسيطة وواضحة لأداء {childFirst}</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              className="child-card"
              aria-label="الطالب الذي تتابعه"
              type="button"
              style={{ border: students.length > 1 ? undefined : '1px solid #e6dced' }}
              onClick={() => students.length > 1 && setSwitcherOpen((v) => !v)}
            >
              <span><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" /></svg></span>
              <div><b>{active.full_name}</b><small>{students.length > 1 ? 'اضغط للتبديل' : 'الطالب'}</small></div>
              <i />
            </button>
            {switcherOpen && students.length > 1 && (
              <div className="child-switch">
                {students.map((s) => (
                  <button key={s.id} className={s.id === activeId ? 'active' : ''} onClick={() => { setActiveId(s.id); setSwitcherOpen(false); setReminderSent(false) }}>
                    <span>{s.full_name.charAt(0)}</span>{s.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ===== الرئيسية ===== */}
        <section className={`parent-panel${panel === 'home' ? ' active' : ''}`} data-panel="home">
          {active.primary ? (
            <>
              <article className="parent-focus-card">
                <div className="focus-copy">
                  <h2>{childFirst} {active.primary.pct >= 60 ? 'يتقدم بثبات' : 'بدأ رحلته'}</h2>
                  {active.weeklyGrowth !== null ? (
                    <div className={`weekly-growth${active.weeklyGrowth < 0 ? ' down' : ''}`}>
                      <span><svg viewBox="0 0 24 24"><path d="M4 16l5-5 4 3 7-8" /><path d="M16 6h4v4" /></svg></span>
                      <p><strong>{active.weeklyGrowth >= 0 ? '+' : ''}{active.weeklyGrowth}%</strong><small>عن الأسبوع الماضي</small></p>
                    </div>
                  ) : (
                    <div className="weekly-growth">
                      <span><svg viewBox="0 0 24 24"><path d="M4 16l5-5 4 3 7-8" /><path d="M16 6h4v4" /></svg></span>
                      <p><strong>—</strong><small>لا يوجد اختباران للمقارنة بعد</small></p>
                    </div>
                  )}
                  <div className="course-line">
                    <div><b>{active.primary.course?.title}</b><strong>{active.primary.pct}%</strong></div>
                    <i><u style={{ width: `${active.primary.pct}%` }} /></i>
                  </div>
                  <button className="primary-parent-button" type="button" onClick={viewWeeklyReport}>
                    <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 9h6M9 13h6M9 17h4" /></svg>
                    <span>عرض تقرير الأسبوع</span>
                  </button>
                </div>
                <div className="performance-score" role="img" aria-label={`الأداء العام ${active.avgScore ?? 0} بالمئة`}>
                  <div style={{ background: `conic-gradient(#fff 0 ${active.avgScore ?? 0}%, rgba(255,255,255,.2) ${active.avgScore ?? 0}%)` }}>
                    <strong>{active.avgScore ?? '—'}{active.avgScore !== null && <small>%</small>}</strong>
                    <span>الأداء العام</span>
                  </div>
                </div>
              </article>

              <section className="parent-stats" aria-label="ملخص أداء الطالب">
                <div><span className="stat-icon purple"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><p><strong>{studyTimeLabel}</strong><small>وقت التعلّم (تقديري)</small></p></div>
                <i />
                <div><span className="stat-icon violet"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg></span><p><strong>{active.commitmentDays} من 7</strong><small>أيام الالتزام</small></p></div>
                <i />
                <div><span className="stat-icon orange"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 4V2M20 12h2" /></svg></span><p><strong>{active.lastResultPct !== null ? `${active.lastResultPct}%` : '—'}</strong><small>آخر اختبار</small></p></div>
              </section>

              <div className="parent-lower-grid">
                <section className="week-card">
                  <header><div><span className="section-icon"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg></span><h2>هذا الأسبوع</h2></div><small>{active.commitmentDays} من 7 أيام</small></header>
                  <div className="week-days">
                    {WEEK_LABELS.map((w, i) => (
                      <div key={i}><span className={active.weekActivity[i] ? 'done' : ''}>{w.l}</span><small>{w.name}</small></div>
                    ))}
                  </div>
                  <div className={`commitment-note${active.commitmentDays < 4 ? ' low' : ''}`}>
                    <span>✓</span>
                    <p><b>{active.commitmentDays >= 5 ? 'التزام ممتاز' : active.commitmentDays >= 3 ? 'التزام جيد' : 'يحتاج مزيدًا من الانتظام'}</b><small>{active.commitmentDays >= 4 ? 'واصل على هذا التقدم الرائع' : 'شجّعه على الدخول يوميًا'}</small></p>
                  </div>
                </section>

                <section className="latest-test-card">
                  <span className="section-icon"><svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4V3h6v1M8.5 10h7M8.5 14h5" /></svg></span>
                  {active.lastResult ? (
                    <>
                      <small>آخر اختبار</small><h2>{active.lastResult.quizzes?.title}</h2><strong>{active.lastResultPct}%</strong>
                      <p>{active.prevResultPct !== null ? (active.lastResultPct! >= active.prevResultPct ? `تحسّن بمقدار ${active.lastResultPct! - active.prevResultPct}%` : `انخفاض بمقدار ${active.prevResultPct - active.lastResultPct!}%`) : 'أول نتيجة مسجّلة'}</p>
                      <button type="button" onClick={() => setPanel('tests')} className="text-button">عرض النتيجة <svg viewBox="0 0 24 24"><path d="m14 7-5 5 5 5" /></svg></button>
                    </>
                  ) : (
                    <>
                      <small>آخر اختبار</small><h2>لا توجد نتائج بعد</h2>
                      <p>سيظهر هنا أول اختبار يخوضه {childFirst}</p>
                    </>
                  )}
                </section>

                <section className={`attention-card${hasAttention ? '' : ' calm'}`}>
                  <span className="attention-icon"><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9z" /><path d="M10 21h4" /></svg></span>
                  {hasAttention ? (
                    <>
                      <h2>يحتاج انتباهك</h2>
                      <p>{active.primary?.currentLesson ? `تبقّى درس: ${active.primary.currentLesson.title}` : 'لم يكمل خطته الدراسية بعد'}</p>
                      <button className={`reminder-button${reminderSent ? ' sent' : ''}`} type="button" onClick={sendReminder} disabled={sendingReminder || reminderSent}>
                        {reminderSent ? (
                          <><svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7" /></svg><span>تم إرسال التذكير</span></>
                        ) : (
                          <><svg viewBox="0 0 24 24"><path d="m3 11 18-8-8 18-2-7z" /></svg><span>{sendingReminder ? 'جارٍ الإرسال...' : 'إرسال تذكير'}</span></>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <h2>لا شيء يستدعي القلق</h2>
                      <p>{childFirst} منجز في مساره الحالي 🎉</p>
                    </>
                  )}
                </section>
              </div>
            </>
          ) : (
            <EmptyPanel text={`لم يشترك ${childFirst} في أي كورس بعد`} />
          )}
        </section>

        {/* ===== التقدم ===== */}
        <section className={`parent-panel simple-view${panel === 'progress' ? ' active' : ''}`} data-panel="progress">
          <div className="simple-head"><div><h2>التقدم</h2><p>المهم فقط: أين وصل {childFirst}، وما الخطوة القادمة ؟</p></div><span className="simple-icon"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-7" /><path d="M16 6h3v3" /></svg></span></div>
          {active.primary ? (
            <article className="progress-focus">
              <div className="progress-number" style={{ background: `conic-gradient(#7c35df 0 ${active.primary.pct}%, #ece5f1 ${active.primary.pct}%)` }}>
                <strong>{active.primary.pct}%</strong><span>مكتمل</span>
              </div>
              <div className="progress-info">
                <small>المسار الحالي</small>
                <h3>{active.primary.course?.title}</h3>
                <p>أكمل {childFirst} {active.primary.completedCount} من {active.primary.lessons.length} درسًا</p>
                <div className="long-progress"><i style={{ width: `${active.primary.pct}%` }} /></div>
                <div className="next-step">
                  <span>الخطوة القادمة</span>
                  <b>{active.primary.currentLesson ? `إكمال درس ${active.primary.currentLesson.title}` : 'أكمل جميع الدروس 🎉'}</b>
                </div>
              </div>
            </article>
          ) : (
            <EmptyPanel text={`لم يشترك ${childFirst} في أي كورس بعد`} />
          )}
        </section>

        {/* ===== الاختبارات ===== */}
        <section className={`parent-panel simple-view${panel === 'tests' ? ' active' : ''}`} data-panel="tests">
          <div className="simple-head"><div><h2>الاختبارات</h2><p>آخر نتيجة والاختبار القادم، دون تقارير طويلة.</p></div><span className="simple-icon"><svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4V3h6v1M9 10h6M9 14h4" /></svg></span></div>
          <div className="tests-minimal">
            <article>
              <small>آخر نتيجة</small>
              {active.lastResult ? (
                <>
                  <strong>{active.lastResultPct}%</strong>
                  <h3>{active.lastResult.quizzes?.title}</h3>
                  <p>{active.prevResultPct !== null ? (active.lastResultPct! >= active.prevResultPct ? `تحسّن بمقدار ${active.lastResultPct! - active.prevResultPct}% عن الاختبار السابق` : `أقل بمقدار ${active.prevResultPct - active.lastResultPct!}% عن الاختبار السابق`) : 'أول اختبار مسجّل'}</p>
                </>
              ) : (
                <>
                  <strong>—</strong>
                  <h3>لا توجد نتائج بعد</h3>
                  <p>لم يخض {childFirst} أي اختبار حتى الآن</p>
                </>
              )}
            </article>
            <article>
              {active.upcomingQuiz ? (
                <>
                  <small>الاختبار القادم</small>
                  <h3>{active.upcomingQuiz.title}</h3>
                  <p>{active.upcomingQuiz.courseTitle}{active.upcomingQuiz.time_limit_minutes ? ` · ${active.upcomingQuiz.time_limit_minutes} دقيقة` : ''}</p>
                </>
              ) : (
                <>
                  <small>الاختبار القادم</small>
                  <h3>لا يوجد اختبار حاليًا</h3>
                  <p>{childFirst} أنجز كل الاختبارات المتاحة 🎉</p>
                </>
              )}
            </article>
          </div>
        </section>

        {/* ===== حسابي ===== */}
        <section className={`parent-panel simple-view${panel === 'account' ? ' active' : ''}`} data-panel="account">
          <div className="simple-head"><div><h2>حسابي</h2><p>بيانات ولي الأمر والطالب المرتبط بالحساب.</p></div><span className="simple-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.7-4.2 3.2-6.3 7.5-6.3s6.8 2.1 7.5 6.3" /></svg></span></div>
          <article className="parent-account-card">
            <span className="account-avatar">{parentInitial}</span>
            <div>
              <h3>{profile?.full_name}</h3>
              <p>ولي أمر {active.full_name}{students.length > 1 ? ` و${students.length - 1} ${students.length - 1 === 1 ? 'آخر' : 'آخرين'}` : ''}</p>
              <small>{profile?.email}</small>
              <div className="account-links">
                <Link to="/parent/link" className="secondary-parent-button">+ ربط طالب آخر</Link>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="secondary-parent-button" onClick={() => navigate('/profile')}>تعديل البيانات</button>
              <button type="button" className="secondary-parent-button" onClick={async () => { await signOut(); navigate('/') }}>تسجيل الخروج</button>
            </div>
          </article>
        </section>
      </main>

      <div className={`parent-toast${toastMsg ? ' show' : ''}`} role="status" aria-live="polite">
        <span>✓</span>
        {toastMsg && <p><b>{toastMsg.title}</b><small>{toastMsg.body}</small></p>}
      </div>
    </div>
  )
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="empty-panel">
      <svg viewBox="0 0 24 24"><path d="M4 5.2c3.2-.8 5.8-.2 8 1.6v12c-2.2-1.8-4.8-2.4-8-1.6z" /><path d="M20 5.2c-3.2-.8-5.8-.2-8 1.6v12c2.2-1.8 4.8-2.4 8-1.6z" /></svg>
      <p>{text}</p>
    </div>
  )
}
