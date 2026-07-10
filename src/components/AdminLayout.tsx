import { useEffect } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// Exact icon paths + routes from the "Glass Pro" design handoff
const glassNavDefs = [
  { to: '/admin', label: 'نظرة عامة', path: 'M3 13h8V3H3v10Zm10 8h8v-8h-8v8ZM3 21h8v-6H3v6ZM13 3v6h8V3h-8Z', exact: true },
  { to: '/admin/courses', label: 'الكورسات', path: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3ZM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3Z' },
  { to: '/admin/quizzes', label: 'الاختبارات', path: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { to: '/admin/students', label: 'الطلاب', path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { to: '/admin/enrollments', label: 'الاشتراكات', path: 'M2 10h20M6 15h2M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' },
  { to: '/admin/notifications', label: 'الإشعارات', path: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0', dot: true },
  { to: '/admin/settings', label: 'الإعدادات', path: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z' },
]

function isNavActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to
  return pathname === to || pathname.startsWith(to)
}

// Injects the IBM Plex Sans Arabic font + glass keyframes, scoped only to this screen
function useGlassStyles() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap'
    link.id = 'qm-glass-font'
    if (!document.getElementById('qm-glass-font')) document.head.appendChild(link)

    const style = document.createElement('style')
    style.id = 'qm-glass-style'
    style.textContent = `
      @keyframes qmBlob1 { 0%,100%{ transform:translate(0,0) scale(1); } 50%{ transform:translate(40px,30px) scale(1.15); } }
      @keyframes qmBlob2 { 0%,100%{ transform:translate(0,0) scale(1); } 50%{ transform:translate(-50px,20px) scale(1.1); } }
      @keyframes qmBlob3 { 0%,100%{ transform:translate(0,0) scale(1); } 50%{ transform:translate(30px,-40px) scale(1.2); } }
      .qm-glass-dash, .qm-glass-dash * { font-family:'IBM Plex Sans Arabic', sans-serif; }
      .qm-glass-dash ::-webkit-scrollbar { width:6px; height:6px; }
      .qm-glass-dash ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:4px; }
      .qm-glass-dash a { color:#F9A8D4; text-decoration:none; }
      .qm-glass-dash a:hover { color:#FDE1F0; }
      @media (prefers-reduced-motion: reduce) {
        .qm-blob { animation:none !important; }
      }
      @supports not (backdrop-filter: blur(1px)) {
        .qm-glass { background:rgba(30,20,70,0.9) !important; }
      }
      .qm-nav-item:hover:not(.qm-nav-active) { background:rgba(255,255,255,0.14) !important; }
      .qm-row:hover { background:rgba(255,255,255,0.06); }
      .qm-icon-btn:hover { background:rgba(255,255,255,0.20) !important; color:#fff !important; }
      .qm-btn-outline:hover { background:rgba(255,255,255,0.20) !important; }
      .qm-btn-primary:hover { filter:brightness(1.06); }
      .qm-input:focus, .qm-select:focus { outline:none; border-color:rgba(249,168,212,0.55) !important; background:rgba(255,255,255,0.12) !important; }
      .qm-input::placeholder { color:rgba(255,255,255,0.35); }
      .qm-select option { background:#2A1650; color:#fff; }
      .qm-check:hover { border-color:rgba(255,255,255,0.5) !important; }
    `
    if (!document.getElementById('qm-glass-style')) document.head.appendChild(style)

    return () => {
      document.getElementById('qm-glass-font')?.remove()
      document.getElementById('qm-glass-style')?.remove()
    }
  }, [])
}

function GlassAdminShell({ children }: { children: React.ReactNode }) {
  useGlassStyles()
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const initials = profile?.full_name?.split(' ').slice(0, 2).map(w => w.charAt(0)).join('') || 'A'

  return (
    <div
      dir="rtl"
      className="qm-glass-dash"
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(160deg,#241A5E 0%,#3B1D6E 40%,#4A1D63 70%,#2A1650 100%)',
        color: '#fff',
      }}
    >
      {/* Vivid light blobs behind the glass */}
      <div className="qm-blob" style={{ position: 'absolute', top: -140, right: '8%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, #A855F7 0%, rgba(168,85,247,0) 65%)', filter: 'blur(30px)', animation: 'qmBlob1 14s ease-in-out infinite', pointerEvents: 'none' }} />
      <div className="qm-blob" style={{ position: 'absolute', top: '30%', left: -120, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, #EC4899 0%, rgba(236,72,153,0) 65%)', filter: 'blur(30px)', animation: 'qmBlob2 17s ease-in-out infinite', pointerEvents: 'none' }} />
      <div className="qm-blob" style={{ position: 'absolute', bottom: -160, right: '34%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, #F97316 0%, rgba(249,115,22,0) 68%)', filter: 'blur(36px)', opacity: 0.8, animation: 'qmBlob3 19s ease-in-out infinite', pointerEvents: 'none' }} />
      <div className="qm-blob" style={{ position: 'absolute', top: '12%', left: '32%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, #22D3EE 0%, rgba(34,211,238,0) 65%)', filter: 'blur(34px)', opacity: 0.7, animation: 'qmBlob1 22s ease-in-out infinite 2s', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', position: 'relative', minHeight: '100vh' }}>
        {/* Sidebar: glass slab */}
        <aside
          className="qm-glass"
          style={{
            width: 250, flexShrink: 0, margin: '22px 22px 22px 0', borderRadius: 24,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            border: '1.5px solid rgba(255,255,255,0.35)', borderBottomColor: 'rgba(255,255,255,0.12)', borderLeftColor: 'rgba(255,255,255,0.12)',
            boxShadow: '0 20px 60px rgba(10,5,40,0.45), inset 0 1px 1px rgba(255,255,255,0.4)',
            display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'relative', overflow: 'hidden',
          }}
        >
          <span style={{ position: 'absolute', top: '-40%', right: '-60%', width: '130%', height: '120%', background: 'linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.14) 48%, rgba(255,255,255,0.02) 56%, transparent 60%)', transform: 'rotate(6deg)', pointerEvents: 'none' }} />

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '2px 6px 22px', position: 'relative' }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#F97316,#EC4899 50%,#7C3AED)', boxShadow: '0 8px 22px rgba(236,72,153,0.5), inset 0 2px 4px rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 15 }}>QM</div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>قدرات المغربي</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>لوحة تحكم المنصة</div>
            </div>
          </Link>

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, padding: '6px 10px 8px', letterSpacing: 0.3, position: 'relative' }}>القائمة الرئيسية</div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative' }}>
            {glassNavDefs.map((item) => {
              const active = isNavActive(location.pathname, item.to, item.exact)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`qm-nav-item${active ? ' qm-nav-active' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 13, cursor: 'pointer',
                    background: active ? 'rgba(255,255,255,0.18)' : undefined,
                    border: `1px solid ${active ? 'rgba(255,255,255,0.40)' : 'transparent'}`,
                    boxShadow: active ? 'inset 0 1px 1px rgba(255,255,255,0.45), 0 6px 20px rgba(10,5,40,0.3)' : 'none',
                    color: active ? '#fff' : 'rgba(255,255,255,0.62)',
                    fontSize: 13.5, fontWeight: active ? 700 : 500, transition: 'all .16s',
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? '#F9A8D4' : 'rgba(255,255,255,0.55)'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d={item.path} />
                  </svg>
                  <span>{item.label}</span>
                  {item.dot && <span style={{ marginRight: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#F9A8D4', boxShadow: '0 0 8px rgba(249,168,212,0.9)' }} />}
                </Link>
              )
            })}
          </nav>

          <div style={{ flex: 1 }} />

          <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)', padding: 12, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#F97066,#EC4899)', boxShadow: '0 4px 14px rgba(249,112,102,0.45), inset 0 1px 3px rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>
              {initials}
            </div>
            <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>مدير المنصة</div>
            </div>
            <button onClick={signOut} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }} aria-label="تسجيل الخروج">
              <LogOut size={16} color="rgba(255,255,255,0.65)" />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: '30px 34px', minWidth: 0, position: 'relative' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )

  if (!user || !profile) return <Navigate to="/login" />
  if (!['admin', 'teacher', 'content_manager', 'student_manager'].includes(profile.role)) {
    return <Navigate to="/dashboard" />
  }

  // Glass Pro design applies across the whole admin section
  return <GlassAdminShell>{children}</GlassAdminShell>
}
