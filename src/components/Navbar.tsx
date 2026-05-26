import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, User, BookOpen, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="قدرات المغربي" className="h-12 w-auto object-contain" />
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/courses" className="text-gray-600 hover:text-brand-pink font-semibold transition-colors">
              الكورسات
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-brand-pink font-semibold transition-colors">
              عن المنصة
            </Link>
            {user && (
              <Link to="/dashboard" className="text-gray-600 hover:text-brand-pink font-semibold transition-colors">
                لوحة التحكم
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-brand-navy">
                  {profile?.full_name || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors text-sm font-semibold"
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
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X size={24} className="text-brand-navy" /> : <Menu size={24} className="text-brand-navy" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-purple-50 px-4 py-4 space-y-3">
          <Link to="/courses" className="block font-semibold text-gray-700 py-2" onClick={() => setOpen(false)}>
            <BookOpen size={16} className="inline ml-2" /> الكورسات
          </Link>
          {user && (
            <Link to="/dashboard" className="block font-semibold text-gray-700 py-2" onClick={() => setOpen(false)}>
              <LayoutDashboard size={16} className="inline ml-2" /> لوحة التحكم
            </Link>
          )}
          {user ? (
            <button onClick={handleSignOut} className="block w-full text-right font-semibold text-red-500 py-2">
              <LogOut size={16} className="inline ml-2" /> تسجيل الخروج
            </button>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" className="btn-outline text-center" onClick={() => setOpen(false)}>تسجيل الدخول</Link>
              <Link to="/register" className="btn-primary text-center" onClick={() => setOpen(false)}>ابدأ الآن</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
