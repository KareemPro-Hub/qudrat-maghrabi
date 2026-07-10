import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

type RecentEnrollment = {
  id: string
  created_at: string
  student_name: string
  course_title: string
}

// --- glass card style helpers (exact tokens from the Glass Pro design handoff) ---
const glassCard: React.CSSProperties = {
  borderRadius: 20,
  background: 'linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1.5px solid rgba(255,255,255,0.32)',
  borderBottomColor: 'rgba(255,255,255,0.10)',
  borderLeftColor: 'rgba(255,255,255,0.10)',
  boxShadow: '0 16px 40px rgba(10,5,40,0.35), inset 0 1px 1px rgba(255,255,255,0.4)',
  padding: '20px 22px',
  position: 'relative',
  overflow: 'hidden',
}

function TopSheen() {
  return <span style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }} />
}

const statDefs = [
  { key: 'students', label: 'إجمالي الطلاب', tag: 'الكل', suffix: '', iconBg: 'linear-gradient(135deg,#22D3EE,#0EA5E9)', glow: '0 8px 22px rgba(14,165,233,0.5)', iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
  { key: 'courses', label: 'الكورسات المنشورة', tag: 'نشط', suffix: '', iconBg: 'linear-gradient(135deg,#A855F7,#7C3AED)', glow: '0 8px 22px rgba(124,58,237,0.55)', iconPath: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3ZM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3Z' },
  { key: 'enrollments', label: 'الاشتراكات المدفوعة', tag: 'هذا الشهر', suffix: '', iconBg: 'linear-gradient(135deg,#EC4899,#DB2777)', glow: '0 8px 22px rgba(236,72,153,0.55)', iconPath: 'M2 10h20M6 15h2M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' },
  { key: 'revenue', label: 'إجمالي الإيرادات', tag: 'الكل', suffix: 'ر.س', iconBg: 'linear-gradient(135deg,#FB923C,#F97316)', glow: '0 8px 22px rgba(249,115,22,0.5)', iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
] as const

function periodLabel() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 60)
  const fmt = (d: Date) => d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export default function AdminOverview() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ students: 0, courses: 0, enrollments: 0, revenue: 0 })
  const [recentEnrollments, setRecentEnrollments] = useState<RecentEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [chartTab, setChartTab] = useState<'students' | 'exams'>('students')

  useEffect(() => {
    async function fetchData() {
      const [studentsRes, coursesRes, enrollRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('courses').select('id', { count: 'exact' }).eq('is_published', true),
        supabase.from('enrollments').select('id, amount_paid', { count: 'exact' }).eq('payment_status', 'paid'),
      ])

      const revenue = enrollRes.data?.reduce((sum, e) => sum + (e.amount_paid || 0), 0) || 0

      setStats({
        students: studentsRes.count || 0,
        courses: coursesRes.count || 0,
        enrollments: enrollRes.count || 0,
        revenue,
      })

      const { data: recent } = await supabase
        .from('enrollments')
        .select('id, created_at, profiles(full_name), courses(title)')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5)

      const mapped: RecentEnrollment[] = (recent || []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        student_name: r.profiles?.full_name || 'طالب',
        course_title: r.courses?.title || '—',
      }))

      setRecentEnrollments(mapped)
      setLoading(false)
    }
    fetchData()
  }, [])

  const values: Record<string, string> = {
    students: String(stats.students),
    courses: String(stats.courses),
    enrollments: String(stats.enrollments),
    revenue: stats.revenue.toLocaleString('en'),
  }

  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>لوحة التحكم</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {firstName ? `مرحباً ${firstName}، ` : 'مرحباً، '}هذه نظرة شاملة على أداء المنصة
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 12, padding: '10px 15px', fontSize: 12.5, color: 'rgba(255,255,255,0.85)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <span>{periodLabel()}</span>
          </div>
          <Link
            to="/admin/students"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#F97316,#EC4899 50%,#7C3AED)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '11px 20px', fontSize: 13, fontWeight: 700, boxShadow: '0 10px 30px rgba(236,72,153,0.5), inset 0 1px 2px rgba(255,255,255,0.5)' }}
          >
            + طالب جديد
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 18 }}>
        {statDefs.map((s) => (
          <div key={s.key} className="qm-glass" style={glassCard}>
            <TopSheen />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: s.iconBg, boxShadow: `${s.glow}, inset 0 1.5px 3px rgba(255,255,255,0.5)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.iconPath} /></svg>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{s.tag}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              {loading ? '…' : values[s.key]} <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>{s.suffix}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Middle row: performance chart + recent students */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 16, marginBottom: 18 }}>
        <div className="qm-glass" style={glassCard}>
          <TopSheen />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>أداء المنصة</div>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.15)' }}>
              {(['students', 'exams'] as const).map((key) => {
                const active = chartTab === key
                return (
                  <div
                    key={key}
                    onClick={() => setChartTab(key)}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: active ? 'rgba(255,255,255,0.22)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.5)', boxShadow: active ? 'inset 0 1px 1px rgba(255,255,255,0.4)' : 'none' }}
                  >
                    {key === 'students' ? 'الطلاب' : 'الاختبارات'}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 0', gap: 10 }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>لا توجد بيانات كافية لعرض الرسم البياني حتى الآن</div>
          </div>
        </div>

        <div className="qm-glass" style={glassCard}>
          <TopSheen />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>آخر الطلاب المسجلين</div>
            <Link to="/admin/students" style={{ fontSize: 11.5, fontWeight: 600 }}>عرض الكل</Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '38px 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>...</div>
          ) : recentEnrollments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '38px 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>لا يوجد طلاب بعد</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentEnrollments.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#F97066,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {s.student_name.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.student_name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.course_title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: promo + upcoming exams */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 16 }}>
        <div
          className="qm-glass"
          style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(249,115,22,0.30), rgba(236,72,153,0.30) 50%, rgba(124,58,237,0.35))',
            backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1.5px solid rgba(255,255,255,0.40)', borderBottomColor: 'rgba(255,255,255,0.12)', borderLeftColor: 'rgba(255,255,255,0.12)',
            boxShadow: '0 16px 44px rgba(124,58,237,0.35), inset 0 1px 1px rgba(255,255,255,0.5)',
            padding: '24px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, position: 'relative', overflow: 'hidden',
          }}
        >
          <span style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)' }} />
          <div style={{ maxWidth: 360 }}>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 7 }}>طوّر منصتك بإضافة كورس جديد</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.7, marginBottom: 15 }}>شارك خبرتك مع طلابك عبر إنشاء كورسات واختبارات جديدة تصل لهم مباشرة.</div>
            <Link
              to="/admin/courses"
              style={{ display: 'inline-block', background: 'rgba(255,255,255,0.95)', color: '#5B21B6', border: 'none', borderRadius: 11, padding: '10px 22px', fontSize: 13, fontWeight: 700, boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}
            >
              إنشاء كورس
            </Link>
          </div>
          <div style={{ width: 78, height: 78, borderRadius: 22, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.45)', backdropFilter: 'blur(10px)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
          </div>
        </div>

        <div className="qm-glass" style={glassCard}>
          <TopSheen />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 12 }}>الاختبارات القادمة</div>
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>لا توجد اختبارات مجدولة بعد</div>
          <Link
            to="/admin/quizzes"
            style={{ display: 'block', textAlign: 'center', width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.30)', color: '#fff', borderRadius: 12, padding: 11, fontSize: 12.5, fontWeight: 700, backdropFilter: 'blur(10px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)' }}
          >
            + جدولة اختبار جديد
          </Link>
        </div>
      </div>
    </div>
  )
}
