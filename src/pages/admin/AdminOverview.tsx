import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

// مستطيل بحواف علوية دائرية فقط (شكل عمود بار شارت احترافي)
function roundedTopRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, Math.max(h, 0))
  if (h <= 0) return `M${x} ${y} H${x + w} V${y} H${x}Z`
  return `M${x} ${y + h} V${y + rr} Q${x} ${y} ${x + rr} ${y} H${x + w - rr} Q${x + w} ${y} ${x + w} ${y + rr} V${y + h} Z`
}

export default function AdminOverview() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ students: 0, courses: 0, quizzes: 0, revenueMonth: 0, revenueMonthGrowth: 0 })
  const [months, setMonths] = useState<MonthPoint[]>([])
  const [activeMonth, setActiveMonth] = useState(5)
  const [courseProgress, setCourseProgress] = useState<CourseProgressRow[]>([])
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([])
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([])
  const [slices, setSlices] = useState<SliceDatum[]>([])
  const [performanceScore, setPerformanceScore] = useState(0)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      const [studentsRes, coursesRes, quizzesRes, paidRes, progressRes, recentRes, quizzesRecentRes, resultsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }),
        supabase.from('enrollments').select('amount_paid, enrolled_at, course_id, courses(title)').eq('payment_status', 'paid').gte('enrolled_at', sixMonthsAgo.toISOString()),
        supabase.from('lesson_progress').select('watch_percentage, lessons(course_id, courses(title))'),
        supabase.from('enrollments').select('id, enrolled_at, profiles(full_name), courses(title)').eq('payment_status', 'paid').order('enrolled_at', { ascending: false }).limit(5),
        supabase.from('quizzes').select('id, title, created_at, courses(title)').order('created_at', { ascending: false }).limit(3),
        supabase.from('quiz_results').select('quiz_id, passed'),
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

      // --- performance score from quiz pass rate ---
      const results = resultsRes.data || []
      const passRate = results.length ? Math.round((results.filter((r: any) => r.passed).length / results.length) * 100) : 0

      setStats({
        students: studentsRes.count || 0,
        courses: coursesRes.count || 0,
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

  const topY = 26, bottomY = 210
  const plotLeft = 58, plotRight = 726
  const { niceMax, step } = niceMaxAndStep(Math.max(...months.map((m) => m.value), 0), 4)
  const gridTicks = [0, 1, 2, 3, 4].map((i) => step * i).filter((v) => v <= niceMax)
  const barSlot = (plotRight - plotLeft) / Math.max(months.length, 1)
  const barWidth = Math.min(46, barSlot * 0.44)
  const bars = months.map((m, i) => {
    const cx = plotLeft + barSlot * i + barSlot / 2
    const h = niceMax > 0 ? (m.value / niceMax) * (bottomY - topY) : 0
    return { x: cx - barWidth / 2, y: bottomY - h, h, cx }
  })
  const totalRevenue6mo = months.reduce((s, m) => s + m.value, 0)
  const hasRevenue = totalRevenue6mo > 0
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
      <div className="welcome-strip">
        <div>
          <h2>مرحبًا {firstName ? `أ. ${firstName}` : ''} 👋</h2>
          <p>أداء المنصة يسير بشكل {performanceScore >= 60 ? 'جيد' : 'يحتاج متابعة'}، لديك <strong>{recentQuizzes.length} اختبارات</strong> مضافة مؤخرًا لمراجعتها.</p>
        </div>
        <div className="welcome-score"><span>معدل نجاح الطلاب</span><strong>{loading ? '…' : `${performanceScore}%`}</strong><i /></div>
      </div>

      <div className="metric-grid">
        <article className="metric-card purple">
          <span className="metric-icon"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M15 14c3.4-.4 5.5 1.4 6 5" /></svg></span>
          <div><small>إجمالي الطلاب</small><strong>{loading ? '…' : stats.students.toLocaleString('en')}</strong><em>مسجّلون في المنصة</em></div>
        </article>
        <article className="metric-card pink">
          <span className="metric-icon"><svg viewBox="0 0 24 24"><path d="M4 5.5c3.1-.8 5.8-.1 8 1.7v12c-2.2-1.8-4.9-2.5-8-1.7v-12Zm16 0c-3.1-.8-5.8-.1-8 1.7v12c2.2-1.8 4.9-2.5 8-1.7v-12Z" /></svg></span>
          <div><small>الكورسات النشطة</small><strong>{loading ? '…' : stats.courses}</strong><em>منشورة للطلاب</em></div>
        </article>
        <article className="metric-card orange">
          <span className="metric-icon"><svg viewBox="0 0 24 24"><path d="M8 4h8M9 3v3h6V3M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" /><path d="m8 12 2 2 5-5" /></svg></span>
          <div><small>إجمالي الاختبارات</small><strong>{loading ? '…' : stats.quizzes}</strong><em>في كل الكورسات</em></div>
        </article>
        <article className="metric-card gold">
          <span className="metric-icon"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-7" /><path d="M16 6h3v3" /></svg></span>
          <div><small>إيرادات هذا الشهر</small><strong>{loading ? '…' : fmtMoney(stats.revenueMonth)} <b><CurrencySymbol /></b></strong><em>{stats.revenueMonthGrowth >= 0 ? '+' : ''}{stats.revenueMonthGrowth}% عن الشهر الماضي</em></div>
        </article>
      </div>

      <div className="overview-grid">
        <article className="admin-card chart-card revenue-card">
          <header className="card-head revenue-head">
            <div><h3>أداء الإيرادات</h3><p>تطوّر الإيرادات خلال آخر 6 أشهر</p></div>
          </header>
          <div className="revenue-overview">
            <div className="revenue-total"><span>إجمالي الإيرادات (6 أشهر)</span><strong>{fmtMoney(totalRevenue6mo)} <small><CurrencySymbol /></small></strong></div>
            <div className="revenue-growth"><b>{stats.revenueMonthGrowth >= 0 ? '↗' : '↘'} {Math.abs(stats.revenueMonthGrowth)}%</b><span>نمو عن الفترة السابقة</span></div>
            <div className="revenue-status"><i />{stats.revenueMonthGrowth >= 0 ? <span>أداء يتجاوز الشهر السابق</span> : <span>أداء أقل من الشهر السابق</span>}</div>
          </div>
          {loading ? (
            <div className="adm-loading"><i /></div>
          ) : hasRevenue ? (
            <div className="revenue-chart-shell">
              <svg className="bar-chart" viewBox="0 0 760 232" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="barActive" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#8738e7" />
                    <stop offset=".55" stopColor="#dd429a" />
                    <stop offset="1" stopColor="#f6b42e" />
                  </linearGradient>
                  <linearGradient id="barMuted" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#c8b3ec" />
                    <stop offset="1" stopColor="#ecd3e6" />
                  </linearGradient>
                </defs>
                <g className="chart-grid">
                  {gridTicks.map((v, i) => {
                    const y = bottomY - (v / niceMax) * (bottomY - topY)
                    return <path key={i} className={v === 0 ? 'chart-baseline' : ''} d={`M${plotLeft} ${y}H${plotRight}`} />
                  })}
                </g>
                <g className="chart-y-labels">
                  {gridTicks.map((v, i) => (
                    <text key={i} x={plotLeft - 12} y={bottomY - (v / niceMax) * (bottomY - topY) + 4}>{fmtMoney(v)}</text>
                  ))}
                </g>
                <g className="chart-bars">
                  {bars.map((b, i) => {
                    const active = i === activeMonth
                    return (
                      <g key={i} className={`chart-bar${active ? ' active' : ''}`} onMouseEnter={() => setActiveMonth(i)}>
                        <path className="bar-track" d={roundedTopRect(b.x, topY, barWidth, bottomY - topY, barWidth / 2)} />
                        <path
                          className="bar-fill"
                          style={{ animationDelay: `${i * 70}ms` }}
                          d={roundedTopRect(b.x, b.y, barWidth, Math.max(b.h, 3), barWidth / 2)}
                          fill={active ? 'url(#barActive)' : 'url(#barMuted)'}
                        />
                        {active && (
                          <g className="bar-tooltip" transform={`translate(${b.cx} ${b.y - 16})`}>
                            <rect x="-40" y="-28" width="80" height="26" rx="8" />
                            <text y="-9">{fmtMoney(months[i].value)} ر.س</text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>
              <div className="chart-months">
                {months.map((m, i) => (
                  <span key={i} className={i === activeMonth ? 'active' : ''} onMouseEnter={() => setActiveMonth(i)}>
                    <b>{m.short}</b><small>{fmtMoney(m.value)}</small>
                  </span>
                ))}
              </div>
            </div>
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

        <article className="admin-card progress-card">
          <header className="card-head"><div><h3>إكمال الكورسات</h3><p>متوسط تقدم الطلاب</p></div><Link to="/admin/courses">عرض الكل</Link></header>
          {loading ? <Spinner /> : courseProgress.length === 0 ? (
            <div className="empty-state">لا توجد بيانات تقدّم كافية بعد</div>
          ) : (
            <div className="course-progress-list">
              {courseProgress.map((c) => (
                <div key={c.title}>
                  <span className={`course-mini ${c.colorClass}`}>{c.title.charAt(0)}</span>
                  <p><b>{c.title}</b><small>{c.students} طالب</small></p>
                  <strong>{c.pct}%</strong>
                  <i><u style={{ width: `${c.pct}%` }} /></i>
                </div>
              ))}
            </div>
          )}
        </article>
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
