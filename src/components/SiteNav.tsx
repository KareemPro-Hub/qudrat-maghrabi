import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

function dashboardPath(role?: string) {
  if (role === 'parent') return '/parent'
  if (role && ['admin', 'teacher', 'content_manager', 'student_manager'].includes(role)) return '/admin'
  return '/dashboard'
}

const links = [
  { to: '/', label: 'الرئيسية', icon: '/home/nav-icons/home.png' },
  { to: '/courses', label: 'الكورسات', icon: '/home/nav-icons/online-course.png' },
  { to: '/#qm-prices', label: 'الأسعار', icon: '/home/nav-icons/tags.png' },
  { to: '/#qm-reviews', label: 'آراء الطلاب', icon: '/home/nav-icons/thumbs-up-trust-v2.png' },
  { to: '/contact', label: 'تواصل معنا', icon: '/home/nav-icons/headset.png' },
]

export default function SiteNav() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // الصفحة الرئيسية عندها شريطها الخاص المدمج داخل قسم الهيرو
  if (location.pathname === '/') return null

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="qm-topbar">
      <nav className="qm-nav qm-wrap">
        <Link className="qm-brand qm-brand-full" to="/">
          <img src="/home/brand/logo.png" alt="قدرات المغربي" />
        </Link>

        <div className="qm-nav-links">
          {links.map((l) => (
            <Link key={l.label} to={l.to}>
              <span className="qm-nav-icon" aria-hidden="true"><img src={l.icon} alt="" /></span>{l.label}
            </Link>
          ))}
        </div>

        <div className="qm-topbar-actions">
          {user ? (
            <>
              <Link className="qm-topbar-icon-btn" to={dashboardPath(profile?.role)} aria-label="لوحة التحكم" title={profile?.full_name || 'لوحة التحكم'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </Link>
              <button className="qm-topbar-icon-btn" onClick={handleSignOut} aria-label="تسجيل الخروج" title="تسجيل الخروج">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="qm-nav-cta" to="/login">ابدأ الآن</Link>
          )}
          <button className="qm-topbar-toggle qm-topbar-icon-btn" type="button" onClick={() => setOpen((o) => !o)} aria-label="القائمة" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="qm-topbar-mobile open qm-wrap">
          {links.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          {user ? (
            <>
              <Link to={dashboardPath(profile?.role)} onClick={() => setOpen(false)}>لوحة التحكم</Link>
              <button type="button" onClick={handleSignOut}>تسجيل الخروج</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>تسجيل الدخول</Link>
              <Link to="/login" onClick={() => setOpen(false)}>ابدأ الآن</Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
