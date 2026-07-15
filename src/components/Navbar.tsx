import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, LogOut, User, BookOpen, LayoutDashboard, Info, Phone } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const navLinks = [
  { to: '/courses', label: 'الكورسات', icon: BookOpen },
  { to: '/about', label: 'من نحن', icon: Info },
  { to: '/contact', label: 'تواصل معنا', icon: Phone },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path

  // The homepage hero has its own embedded nav bar matching the new design
  if (location.pathname === '/') return null

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="قدرات المغربي" className="h-12 w-auto object-contain" />
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { to: '/courses', label: 'الكورسات' },
              ...(user ? [{ to: '/dashboard', label: 'لوحة التحكم' }] : []),
              { to: '/about', label: 'من نحن' },
              { to: '/contact', label: 'تواصل معنا' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 group
                  ${isActive(link.to)
                    ? 'text-brand-pink bg-pink-50'
                    : 'text-gray-600 hover:text-brand-pink hover:bg-pink-50/50'
                  }`}
              >
                {link.label}
                <span className={`absolute bottom-0 right-1/2 translate-x-1/2 h-0.5 rounded-full transition-all duration-300
                  ${isActive(link.to) ? 'w-1/2 gradient-bg' : 'w-0 group-hover:w-1/2 gradient-bg'}`}
                />
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:text-brand-pink transition-colors px-3 py-1.5 rounded-xl hover:bg-pink-50">
                  <User size={16} />
                  {profile?.full_name || user.email}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors text-sm font-semibold px-3 py-1.5 rounded-xl hover:bg-red-50"
                >
                  <LogOut size={16} />
                  خروج
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-outline text-sm py-2 px-5">
                  تسجيل الدخول
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-5">
                  ابدأ الآن
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors" onClick={() => setOpen(!open)}>
            {open ? <X size={24} className="text-brand-navy" /> : <Menu size={24} className="text-brand-navy" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-purple-50 px-4 py-4 space-y-1">
          {navLinks.map(link => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200
                  ${isActive(link.to) ? 'text-brand-pink bg-pink-50' : 'text-gray-700 hover:text-brand-pink hover:bg-pink-50/50'}`}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            )
          })}
          {user && (
            <Link to="/dashboard" onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200
                ${isActive('/dashboard') ? 'text-brand-pink bg-pink-50' : 'text-gray-700 hover:text-brand-pink hover:bg-pink-50/50'}`}>
              <LayoutDashboard size={18} /> لوحة التحكم
            </Link>
          )}
          {user && (
            <Link to="/profile" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-700 hover:text-brand-pink hover:bg-pink-50/50 transition-all duration-200">
              <User size={18} /> الملف الشخصي
            </Link>
          )}
          <div className="pt-2 border-t border-gray-100 mt-2">
            {user ? (
              <button onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-all duration-200">
                <LogOut size={18} /> تسجيل الخروج
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" className="btn-outline text-center" onClick={() => setOpen(false)}>تسجيل الدخول</Link>
                <Link to="/register" className="btn-primary text-center" onClick={() => setOpen(false)}>ابدأ الآن</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
