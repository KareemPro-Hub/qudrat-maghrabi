import { useEffect, useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { avatarClass } from './admin/lightKit'

const navDefs = [
  { to: '/admin', exact: true, label: 'نظرة عامة', icon: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></> },
  { to: '/admin/courses', label: 'الكورسات', icon: <path d="M4 5.5c3.1-.8 5.8-.1 8 1.7v12c-2.2-1.8-4.9-2.5-8-1.7v-12Zm16 0c-3.1-.8-5.8-.1-8 1.7v12c2.2-1.8 4.9-2.5 8-1.7v-12Z" /> },
  { to: '/admin/quizzes', label: 'الاختبارات', icon: <><path d="M8 4h8M9 3v3h6V3M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" /><path d="m8 12 2 2 5-5M8 17h7" /></> },
  { to: '/admin/students', label: 'الطلاب', icon: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M15 14c3.4-.4 5.5 1.4 6 5" /></> },
  { to: '/admin/enrollments', label: 'الاشتراكات', icon: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></> },
  { to: '/admin/coupons', label: 'أكواد الخصم', adminOnly: true, icon: <><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M9 6v12" strokeDasharray="2 2" /></> },
  { to: '/admin/notifications', label: 'الإشعارات', icon: <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8ZM10 21h4" />, badgeKey: 'notifications' as const },
  { to: '/admin/team', label: 'فريق العمل', icon: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><path d="M2 20c.4-4 2.4-6 6-6s5.6 2 6 6M12 20c.5-3.7 2.2-5.5 5-5.5s4.5 1.8 5 5.5" /></> },
  { to: '/admin/settings', label: 'الإعدادات', icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></> },
]

const PANEL_META: Record<string, { title: string; subtitle: string; action?: { label: string; to: string } }> = {
  '/admin': { title: 'نظرة عامة', subtitle: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', action: { label: '+ طالب جديد', to: '/admin/students' } },
  '/admin/courses': { title: 'الكورسات', subtitle: 'إدارة المحتوى التعليمي ومتابعة أداء الكورسات' },
  '/admin/quizzes': { title: 'الاختبارات', subtitle: 'إنشاء الاختبارات وتحليل نتائج الطلاب' },
  '/admin/students': { title: 'الطلاب', subtitle: 'متابعة الطلاب ودرجاتهم وتقدمهم الدراسي' },
  '/admin/enrollments': { title: 'الاشتراكات والإيرادات', subtitle: 'إدارة الباقات والمدفوعات وتجديدات الطلاب' },
  '/admin/notifications': { title: 'الإشعارات', subtitle: 'إرسال التنبيهات ومراجعة سجل التواصل' },
  '/admin/team': { title: 'فريق العمل', subtitle: 'إدارة أعضاء الفريق والأدوار والصلاحيات' },
  '/admin/coupons': { title: 'أكواد الخصم', subtitle: 'ولّد أكواد اشتراك مجانية بالكامل لأي مناسبة' },
  '/admin/settings': { title: 'الإعدادات', subtitle: 'تخصيص المنصة وإعدادات الحساب والأمان' },
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'مدير المنصة',
  teacher: 'معلم',
  content_manager: 'مشرف محتوى',
  student_manager: 'مسؤول الطلاب',
  quiz_manager: 'مشرف الاختبارات',
}

// مشرف الاختبارات: صلاحية واحدة فقط، رفع/إدارة أسئلة الاختبارات — ممنوع من أي قسم آخر
const QUIZ_MANAGER_ALLOWED_PATH = '/admin/quizzes'

function isNavActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to
  return pathname === to || pathname.startsWith(to + '/')
}

function metaFor(pathname: string) {
  if (PANEL_META[pathname]) return PANEL_META[pathname]
  if (pathname.startsWith('/admin/lessons')) return { title: 'الدروس', subtitle: 'إدارة دروس الكورس ومحتواه' }
  return PANEL_META['/admin']
}

function initialsOf(name?: string) {
  return name?.split(' ').slice(0, 2).map((w) => w.charAt(0)).join('') || 'A'
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setUnread(count || 0))
  }, [user, location.pathname])

  // Simple client-side search: hides non-matching rows/cards under [data-searchable] scopes on the page
  useEffect(() => {
    const term = search.trim().toLowerCase()
    const rows = document.querySelectorAll<HTMLElement>('[data-searchable] tbody tr, [data-searchable] .member-card')
    rows.forEach((row) => {
      row.classList.toggle('is-hidden', Boolean(term) && !row.textContent?.toLowerCase().includes(term))
    })
  }, [search, location.pathname])

  useEffect(() => setSearch(''), [location.pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user || !profile) return <Navigate to="/login" />
  if (!['admin', 'teacher', 'content_manager', 'student_manager', 'quiz_manager'].includes(profile.role)) {
    return <Navigate to="/dashboard" />
  }
  const isQuizManager = profile.role === 'quiz_manager'
  if (isQuizManager && !location.pathname.startsWith(QUIZ_MANAGER_ALLOWED_PATH)) {
    return <Navigate to={QUIZ_MANAGER_ALLOWED_PATH} replace />
  }
  // أكواد الخصم: مدير المنصة فقط
  if (location.pathname.startsWith('/admin/coupons') && profile.role !== 'admin') {
    return <Navigate to="/admin" replace />
  }

  const meta = metaFor(location.pathname)
  const visibleNavDefs = isQuizManager
    ? navDefs.filter((item) => item.to === QUIZ_MANAGER_ALLOWED_PATH)
    : navDefs.filter((item) => !item.adminOnly || profile.role === 'admin')

  return (
    <div className="admin-app" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/" aria-label="العودة إلى منصة قدرات المغربي">
          <img src="/admin/logo.png" alt="قدرات المغربي" />
        </Link>

        <nav className="admin-nav" aria-label="التنقل داخل لوحة الإدارة">
          {visibleNavDefs.map((item) => {
            const active = isNavActive(location.pathname, item.to, item.exact)
            return (
              <Link key={item.to} to={item.to} className={`admin-nav-item${active ? ' active' : ''}`}>
                <span className="nav-glyph"><svg viewBox="0 0 24 24">{item.icon}</svg></span>
                <span>{item.label}</span>
                {item.badgeKey === 'notifications' && unread > 0 && <b className="nav-badge">{unread}</b>}
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-profile">
          <div className="avatar">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name || ''} />
              : <span className={`avatar-fallback ${avatarClass(profile.full_name?.length || 0)}`}>{initialsOf(profile.full_name)}</span>}
          </div>
          <div>
            <strong>{profile.full_name}</strong>
            <span>{ROLE_LABEL[profile.role] || profile.role}</span>
          </div>
          <button className="signout-icon" onClick={signOut} aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-copy"><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>
          <div className="topbar-actions">
            <label className="admin-search">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input type="search" placeholder="ابحث في القسم الحالي..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            {!isQuizManager && (
              <Link className="icon-button" to="/admin/notifications" aria-label="الإشعارات">
                <svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8ZM10 21h4" /></svg>
                {unread > 0 && <b>{unread}</b>}
              </Link>
            )}
            {!isQuizManager && meta.action && (
              <Link className="quick-button" to={meta.action.to}>
                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                {meta.action.label}
              </Link>
            )}
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-panel" key={location.pathname}>{children}</div>
        </div>
      </main>
    </div>
  )
}
