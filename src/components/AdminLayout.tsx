import { useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Users, CreditCard,
  Bell, Settings, LogOut, Menu, X, ChevronLeft, GraduationCap
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'نظرة عامة', exact: true },
  { to: '/admin/courses', icon: BookOpen, label: 'الكورسات' },
  { to: '/admin/quizzes', icon: GraduationCap, label: 'الاختبارات' },
  { to: '/admin/students', icon: Users, label: 'الطلاب' },
  { to: '/admin/enrollments', icon: CreditCard, label: 'الاشتراكات' },
  { to: '/admin/notifications', icon: Bell, label: 'الإشعارات' },
  { to: '/admin/settings', icon: Settings, label: 'الإعدادات' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )

  if (!user || !profile) return <Navigate to="/login" />
  if (!['admin', 'teacher', 'content_manager', 'student_manager'].includes(profile.role)) {
    return <Navigate to="/dashboard" />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-navy min-h-screen flex flex-col transition-all duration-300 fixed right-0 top-0 bottom-0 z-40`}>

        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="قدرات المغربي" className="h-9 w-auto object-contain" />
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to) && item.to !== '/admin'
                ? true
                : location.pathname === item.to

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${active
                    ? 'gradient-bg text-white shadow-brand'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
              >
                <item.icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Profile */}
        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center gap-3 px-3 py-2 ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {profile.full_name?.charAt(0) || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{profile.full_name}</p>
                <p className="text-white/40 text-xs">مدير المنصة</p>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className={`mt-2 flex items-center gap-2 text-white/50 hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-white/10 w-full ${sidebarOpen ? '' : 'justify-center'}`}
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="text-sm font-semibold">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`flex-1 ${sidebarOpen ? 'mr-64' : 'mr-20'} transition-all duration-300 min-h-screen`}>
        {children}
      </main>
    </div>
  )
}
