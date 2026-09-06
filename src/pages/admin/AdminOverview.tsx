import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Users, BookOpen, PlayCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { avatarClass, initials } from '../../components/admin/lightKit'
import CurrencySymbol from '../../components/CurrencySymbol'
import { formatMoney } from '../../utils/formatMoney'

type MonthPoint = { label: string; short: string; value: number }
type CourseProgressRow = { title: string; students: number; pct: number; colorClass: string }
type RecentStudent = { id: string; name: string; course: string; score?: number }
type RecentQuiz = { id: string; title: string; course: string; created_at: string; attempts: number }
type SliceDatum = { label: string; count: number; color: string }

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const PROGRESS_COLORS = ['purple', 'pink', 'orange', 'green']
const SLICE_COLORS = ['#7d37df', '#e83f91', '#f0a72a', '#31b979', '#3ea0e8']

function fmtMoney(n: number) {
  return formatMoney(n)
}

// "نايس" أرقام لمحور Y بدل تقريب عشوائي يطلع قيم مكررة
function niceNumber(range: number, round: boolean) {
  const exponent = Math.floor(Math.log10(range || 1))
  const fraction = range / Math.pow(10, exponent)
  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }
  return niceFraction * Math.pow(10, exponent)
}

function niceMaxAndStep(max: number, ticks = 4) {
  const safeMax = Math.max(max, 1)
  const range = niceNumber(safeMax, false)
  const step = niceNumber(range / ticks, true)
  const niceMax = Math.ceil(safeMax / step) * step
  return { niceMax, step }
}

export default function AdminOverview() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ students: 0, courses: 0, lessons: 0, quizzes: 0, revenueMonth: 0, revenueMonthGrowth: 0 })
  const [months, setMonths] = useState<MonthPoint[]>([])
  const [activeMonth, setActiveMonth] = useState(5)
  const [courseProgress, setCourseProgress] = useState<CourseProgressRow[]>([])
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([])
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([])
  const [slices, setSlices] = useState<SliceDatum[]>([])
  const [performanceScore, setPerformanceScore] = useState(0)
  const [chartStyle, setChartStyle] = useState<'bars' | 'area'>('bars')
  const [subscribers, setSubscribers] = useState({ total: 0, web: 0, apple: 0, google: 0 })

  useEffect(() => {
    async function load() {
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      const [studentsRes, coursesRes, lessonsRes, quizzesRes, paidRes, progressRes, recentRes, quizzesRecentRes, resultsRes, activeRes, storeRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('courses').select('id, parent_course_id').eq('is_published', true),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }),
        supabase.from('enrollments').select('amount_paid, enrolled_at, course_id, courses(title)').eq('payment_status', 'paid').gte('enrolled_at', sixMonthsAgo.toISOString()),
        supabase.from('lesson_progress').select('watch_percentage, lessons(course_id, courses(title))'),
        supabase.from('enrollments').select('id, enrolled_at, profiles(full_name), courses(title)').eq('payment_status', 'paid').order('enrolled_at', { ascending: false }).limit(5),
        supabase.from('quizzes').select('id, title, created_at, courses(title)').order('created_at', { ascending: false }).limit(3),
        supabase.from('quiz_results').select('quiz_id, passed'),
        supabase.from('enrollments').select('student_id, expires_at').eq('payment_status', 'paid'),
        supabase.from('store_subscriptions').select('student_id, platform, status, current_period_end'),
      ])

      // --- monthly revenue buckets (last 6 months) ---
      const buckets: Record<string, number> = {}
      const courseCounts: Record<string, { title: string; count: number }> = {}
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        buckets[`${d.getFullYear()}-${d.getMonth()}`] = 0
      }
      ;(paidRes.data || []).forEach((e: any) => {
        const d = new Date(e.enrolled_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (key in buckets) buckets[key] += e.amount_paid || 0
        const cid = e.course_id
        if (cid) {
          if (!courseCounts[cid]) courseCounts[cid] = { title: e.courses?.title || 'كورس', count: 0 }
          courseCounts[cid].count++
        }
      })
      const monthPoints: MonthPoint[] = Object.keys(buckets).map((key) => {
        const [, m] = key.split('-').map(Number)
        return { label: MONTH_NAMES[m], short: MONTH_NAMES[m], value: buckets[key] }
      })

      const thisMonthKey = `${monthStart.getFullYear()}-${monthStart.getMonth()}`
      const prevMonthKey = `${prevMonthStart.getFullYear()}-${prevMonthStart.getMonth()}`
      const revenueMonth = buckets[thisMonthKey] || 0
      const revenuePrev = buckets[prevMonthKey] || 0
      const revenueMonthGrowth = revenuePrev > 0 ? Math.round(((revenueMonth - revenuePrev) / revenuePrev) * 100) : (revenueMonth > 0 ? 100 : 0)

      // --- course progress (avg watch % per course) ---
      const progressAgg: Record<string, { title: string; total: number; count: number }> = {}
      ;(progressRes.data || []).forEach((r: any) => {
        const cid = r.lessons?.course_id
        if (!cid) return
        if (!progressAgg[cid]) progressAgg[cid] = { title: r.lessons?.courses?.title || 'كورس', total: 0, count: 0 }
        progressAgg[cid].total += r.watch_percentage || 0
        progressAgg[cid].count++
      })
      const progressRows: CourseProgressRow[] = Object.entries(progressAgg)
        .map(([cid, v], i) => ({
          title: v.title,
          students: courseCounts[cid]?.count || 0,
          pct: v.count ? Math.round(v.total / v.count) : 0,
          colorClass: PROGRESS_COLORS[i % PROGRESS_COLORS.length],
        }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 4)

      // --- subscription distribution (top courses by paid enrollment) ---
      const sortedCourses = Object.values(courseCounts).sort((a, b) => b.count - a.count)
      const total = sortedCourses.reduce((s, c) => s + c.count, 0) || 1
      const top = sortedCourses.slice(0, 3)
      const restCount = sortedCourses.slice(3).reduce((s, c) => s + c.count, 0)
      const sliceData: SliceDatum[] = top.map((c, i) => ({ label: c.title, count: c.count, color: SLICE_COLORS[i] }))
      if (restCount > 0) sliceData.push({ label: 'أخرى', count: restCount, color: SLICE_COLORS[3] })

      // الكورس الأب (زي «دورة القدرات») مجرد حاوية للكورسات المتفرّعة منه،
      // فبنعدّ الكورسات المتفرّعة والمستقلة بس من غيره.
      const publishedCourses = (coursesRes.data || []) as { id: string, parent_course_id: string | null }[]
      const parentCourseIds = new Set(
        publishedCourses.map((c) => c.parent_course_id).filter(Boolean) as string[],
      )
      const coursesCount = publishedCourses.filter((c) => !parentCourseIds.has(c.id)).length

      // --- performance score from quiz pass rate ---
      const results = resultsRes.data || []
      const passRate = results.length ? Math.round((results.filter((r: any) => r.passed).length / results.length) * 100) : 0

      // --- المشتركون الحاليون: اشتراك مدفوع سارٍ، موزّعون حسب مصدر الشراء ---
      const nowMs = now.getTime()
      const activeStudents = new Set<string>()
      ;(activeRes.data || []).forEach((e: any) => {
        if (!e.student_id) return
        if (e.expires_at && new Date(e.expires_at).getTime() <= nowMs) return
        activeStudents.add(e.student_id)
      })
      const appleStudents = new Set<string>()
      const googleStudents = new Set<string>()
      ;(storeRes.data || []).forEach((sub: any) => {
        if (!sub.student_id || sub.status !== 'active') return
        if (sub.current_period_end && new Date(sub.current_period_end).getTime() <= nowMs) return
        if (!activeStudents.has(sub.student_id)) return
        if (sub.platform === 'apple') appleStudents.add(sub.student_id)
        else if (sub.platform === 'google') googleStudents.add(sub.student_id)
      })
      const storeStudents = new Set<string>([...appleStudents, ...googleStudents])
      setSubscribers({
        total: activeStudents.size,
        web: [...activeStudents].filter((id) => !storeStudents.has(id)).length,
        apple: appleStudents.size,
        google: googleStudents.size,
      })

      setStats({
        students: studentsRes.count || 0,
        courses: coursesCount,
        lessons: lessonsRes.count || 0,
        quizzes: quizzesRes.count || 0,
        revenueMonth,
        revenueMonthGrowth,
      })
      setMonths(monthPoints)
      setActiveMonth(monthPoints.length - 1)
      setCourseProgress(progressRows)
      setSlices(sliceData)
      setPerformanceScore(passRate)
      setRecentStudents((recentRes.data || []).map((r: any) => ({ id: r.id, name: r.profiles?.full_name || 'طالب', course: r.courses?.title || '—' })))

      const quizIds = (quizzesRecentRes.data || []).map((q: any) => q.id)
      const attemptsByQuiz: Record<string, number> = {}
      ;(quizIds.length ? await supabase.from('quiz_results').select('quiz_id').in('quiz_id', quizIds) : { data: [] as any[] }).data?.forEach((r: any) => {
        attemptsByQuiz[r.quiz_id] = (attemptsByQuiz[r.quiz_id] || 0) + 1
      })
      setRecentQuizzes((quizzesRecentRes.data || []).map((q: any) => ({
        id: q.id, title: q.title, course: q.courses?.title || '—', created_at: q.created_at, attempts: attemptsByQuiz[q.id] || 0,
      })))

      setLoading(false)
    }
    load()
  }, [])

  const { niceMax, step } = niceMaxAndStep(Math.max(...months.map((m) => m.value), 0), 4)
  const gridTicks = [0, 1, 2, 3, 4].map((i) => step * i).filter((v) => v <= niceMax)
  const totalRevenue6mo = months.reduce((s, m) => s + m.value, 0)
  const hasRevenue = totalRevenue6mo > 0
  const chartMax = niceMax
  const yAxisTicks = [...gridTicks].reverse()
  const areaMonths = months.map((m, i) => {
    const x = months.length > 1 ? 600 - (i / (months.length - 1)) * 600 : 300
    const y = chartMax > 0 ? 240 - (m.value / chartMax) * 240 : 240
    return { x, y }
  })
  const linePath = areaMonths.length
    ? areaMonths.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : ''
  const areaPath = areaMonths.length
    ? `${linePath} L${areaMonths[areaMonths.length - 1].x.toFixed(1)} 240 L${areaMonths[0].x.toFixed(1)} 240 Z`
    : ''
  const donutGradient = (() => {
    const total = slices.reduce((s, sl) => s + sl.count, 0) || 1
    let acc = 0
    const stops = slices.map((sl) => {
      const from = (acc / total) * 100
      acc += sl.count
      const to = (acc / total) * 100
      return `${sl.color} ${from.toFixed(1)}% ${to.toFixed(1)}%`
    })
    return `conic-gradient(${stops.join(',')})`
  })()

  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <>
      <div className="stats-header">
        <div>
          <div className="stats-kicker"><i /><span>قدرات المغربي · لوحة التحكم</span></div>
          <h1>الإحصائيات</h1>
          <p className="stats-header-sub">نظرة شاملة على أداء المنصة خلال آخر 6 أشهر</p>
        </div>
        <div className="stats-header-actions">
          <span className="stats-update-pill">آخر تحديث: اليوم</span>
          <button className="stats-export-btn" onClick={() => window.print()}><i />تصدير التقرير</button>
        </div>
      </div>

      <div className="kpi-grid">
        <article className="kpi-card purple">
          <span className="kpi-blob" />
          <div className="kpi-card-row">
            <div>
              <div className="kpi-label">إجمالي الطلاب</div>
              <div className="kpi-value">{loading ? '…' : stats.students.toLocaleString('en')}</div>
              <div className="kpi-sub" style={{ color: '#8b7fa3' }}>مسجّلون في المنصة</div>
            </div>
            <span className="kpi-icon"><Users size={20} /></span>
          </div>
        </article>
        <article className="kpi-card pink">
          <span className="kpi-blob" />
          <div className="kpi-card-row">
            <div>
              <div className="kpi-label">إجمالي الكورسات</div>
              <div className="kpi-value">{loading ? '…' : stats.courses.toLocaleString('en')}</div>
              <div className="kpi-sub" style={{ color: '#8b7fa3' }}>منشورة على المنصة</div>
            </div>
            <span className="kpi-icon"><BookOpen size={20} /></span>
          </div>
        </article>
        <article className="kpi-card green">
          <span className="kpi-blob" />
          <div className="kpi-card-row">
            <div>
              <div className="kpi-label">إجمالي الدروس</div>
              <div className="kpi-value">{loading ? '…' : stats.lessons.toLocaleString('en')}</div>
              <div className="kpi-sub" style={{ color: '#8b7fa3' }}>في كل الكورسات</div>
            </div>
            <span className="kpi-icon"><PlayCircle size={20} /></span>
          </div>
        </article>
        <article className="kpi-card gold">
          <span className="kpi-blob" />
          <div className="kpi-card-row">
            <div>
              <div className="kpi-label">إيرادات هذا الشهر</div>
              <div className="kpi-value">{loading ? '…' : <>{fmtMoney(stats.revenueMonth)} <CurrencySymbol /></>}</div>
              <div className="kpi-sub" style={{ color: stats.revenueMonthGrowth >= 0 ? '#149a5b' : '#c17a12' }}>
                {stats.revenueMonthGrowth >= 0 ? '+' : ''}{stats.revenueMonthGrowth}% عن الشهر الماضي
              </div>
            </div>
            <span className="kpi-icon"><Wallet size={20} /></span>
          </div>
        </article>
      </div>

      <div className="overview-grid">
        <article className="admin-card chart-card revenue-card">
          <div className="revenue-head-row">
            <div>
              <h3>أداء الإيرادات</h3>
              <p>تطوّر الإيرادات خلال آخر 6 أشهر</p>
            </div>
            <div className="revenue-head-meta">
              <span className={`revenue-status-pill${stats.revenueMonthGrowth < 0 ? ' negative' : ''}`}>
                <i />
                {stats.revenueMonthGrowth >= 0 ? 'أداء يتجاوز الشهر السابق' : 'أداء أقل من الشهر السابق'}
              </span>
              <div className="revenue-total-mini">
                <span>إجمالي الإيرادات</span>
                <strong>{fmtMoney(totalRevenue6mo)} <CurrencySymbol /></strong>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="adm-loading"><i /></div>
          ) : hasRevenue ? (
            <>
              <div className="revenue-toolbar">
                <span className="revenue-growth-pill">
                  {stats.revenueMonthGrowth >= 0 ? '↗' : '↘'} نمو {Math.abs(stats.revenueMonthGrowth)}% عن الفترة السابقة
                </span>
                <div className="chart-toggle">
                  <button type="button" className={chartStyle === 'bars' ? 'active' : ''} onClick={() => setChartStyle('bars')}>أعمدة</button>
                  <button type="button" className={chartStyle === 'area' ? 'active' : ''} onClick={() => setChartStyle('area')}>مساحي</button>
                </div>
              </div>

              <div className="revenue-plot">
                <div className="revenue-plot-grid">
                  {yAxisTicks.map((v, i) => (
                    <div key={i}><span>{fmtMoney(v)}</span><i /></div>
                  ))}
                </div>

                {chartStyle === 'bars' ? (
                  <div className="revenue-bars">
                    {months.map((m, i) => {
                      const active = i === activeMonth
                      const heightPct = chartMax > 0 ? Math.max((m.value / chartMax) * 100, m.value > 0 ? 3 : 1.5) : 1.5
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`bar-col${active ? ' active' : ''}`}
                          onClick={() => setActiveMonth(i)}
                        >
                          {active && <span className="bar-col-value">{fmtMoney(m.value)}</span>}
                          <span className="bar-col-fill" style={{ height: `${heightPct}%` }} />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <svg className="revenue-area" viewBox="0 0 600 240" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7736e7" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#7736e7" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#revenueAreaFill)" />
                    <path d={linePath} fill="none" stroke="#7736e7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {areaMonths.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill="#fff"
                        stroke="#7736e7"
                        strokeWidth="2.5"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setActiveMonth(i)}
                      />
                    ))}
                  </svg>
                )}
              </div>

              <div className="revenue-month-strip">
                {months.map((m, i) => (
                  <button key={i} type="button" className={i === activeMonth ? 'active' : ''} onClick={() => setActiveMonth(i)}>
                    <b>{m.short}</b>
                    <small>{fmtMoney(m.value)}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="revenue-empty">
              <span className="revenue-empty-icon">
                <svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l3-3 3 2 4-5" /><circle cx="18" cy="9" r="2.2" /></svg>
              </span>
              <h4>لسه معندكش إيرادات مسجّلة</h4>
              <p>هيظهر هنا رسم بياني بنمو الإيرادات تلقائيًا بمجرد إتمام أول عملية اشتراك مدفوعة</p>
            </div>
          )}
        </article>

        <div className="stats-side-col">
          <article className="admin-card completion-card">
            <h3>إكمال الكورسات</h3>
            <p>متوسط تقدم الطلاب</p>
            {loading ? <Spinner /> : courseProgress.length === 0 ? (
              <div className="empty-state">لا توجد بيانات تقدّم كافية بعد</div>
            ) : (
              courseProgress.map((c) => (
                <div className="completion-row" key={c.title}>
                  <div className="completion-row-top">
                    <div className="completion-row-info">
                      <span className="completion-avatar">{c.title.charAt(0)}</span>
                      <div>
                        <b>{c.title}</b>
                        <small>{c.students} طالب</small>
                      </div>
                    </div>
                    <span className="completion-pct">{c.pct}%</span>
                  </div>
                  <div className="completion-track"><i style={{ width: `${c.pct}%` }} /></div>
                </div>
              ))
            )}
          </article>

          <article className="admin-card completion-card">
            <h3>الطلاب المشتركون</h3>
            <p>اشتراك سارٍ الآن، حسب مصدر الشراء</p>
            {loading ? <Spinner /> : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '10px 0 14px' }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: '#221a33', lineHeight: 1 }}>{subscribers.total.toLocaleString('en')}</span>
                  <span style={{ fontSize: 14, color: '#93889b', fontWeight: 700 }}>من {stats.students.toLocaleString('en')} طالب مسجّل</span>
                </div>
                {subscribers.total === 0 ? (
                  <div className="empty-state">لا يوجد اشتراك سارٍ حاليًا</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {([
                      { label: 'من الموقع', value: subscribers.web, color: '#8739db' },
                      { label: 'App Store', value: subscribers.apple, color: '#249a6a' },
                      { label: 'Google Play', value: subscribers.google, color: '#c17a12' },
                    ]).map((row) => (
                      <div key={row.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#221a33', marginBottom: 5 }}>
                          <span>{row.value.toLocaleString('en')}</span>
                          <span style={{ color: '#6f6378' }}>{row.label}</span>
                        </div>
                        <div className="completion-track"><i style={{ width: `${Math.round((row.value / subscribers.total) * 100)}%`, background: row.color }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </article>
        </div>
      </div>

      <div className="lower-grid">
        <article className="admin-card recent-card" data-searchable>
          <header className="card-head"><div><h3>أحدث الطلاب</h3><p>آخر المسجلين في المنصة</p></div><Link to="/admin/students">جميع الطلاب</Link></header>
          <div className="table-wrap">
            <table>
              <thead><tr><th>الطالب</th><th>الكورس</th></tr></thead>
              <tbody>
                {loading ? null : recentStudents.length === 0 ? (
                  <tr><td colSpan={2}><div className="empty-state">لا يوجد طلاب بعد</div></td></tr>
                ) : recentStudents.map((s, i) => (
                  <tr key={s.id}>
                    <td><span className={`person-avatar ${avatarClass(i)}`}>{initials(s.name)}</span><b>{s.name}</b></td>
                    <td>{s.course}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="side-stack">
          <article className="admin-card exams-card">
            <header className="card-head"><div><h3>أحدث الاختبارات</h3><p>آخر ما تمت إضافته</p></div><Link to="/admin/quizzes">عرض الكل</Link></header>
            <div className="exam-list">
              {loading ? null : recentQuizzes.length === 0 ? (
                <div className="empty-state">لا توجد اختبارات بعد</div>
              ) : recentQuizzes.map((q, i) => {
                const d = new Date(q.created_at)
                return (
                  <div key={q.id}>
                    <time><b>{d.getDate()}</b><span>{MONTH_NAMES[d.getMonth()]}</span></time>
                    <p><strong>{q.title}</strong><small>{q.course} · {q.attempts} محاولة</small></p>
                    <i className={`exam-dot ${['pink', 'orange', 'purple'][i % 3]}`} />
                  </div>
                )
              })}
            </div>
          </article>
          <article className="admin-card subscription-mini">
            <div className="donut" style={{ ['--adm-donut-bg' as any]: donutGradient }}>
              <span><strong>{stats.students.toLocaleString('en')}</strong><small>طالب</small></span>
            </div>
            <div>
              <h3>توزيع الاشتراكات</h3>
              <ul>
                {slices.length === 0 ? <li>لا توجد بيانات بعد</li> : slices.map((sl) => {
                  const total = slices.reduce((s, x) => s + x.count, 0) || 1
                  return (
                    <li key={sl.label}><i style={{ background: sl.color }} />{sl.label} <b>{Math.round((sl.count / total) * 100)}%</b></li>
                  )
                })}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </>
  )
}

function Spinner() {
  return <div className="adm-loading"><i /></div>
}
