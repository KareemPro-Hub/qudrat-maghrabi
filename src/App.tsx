import type { ComponentType } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import SiteNav from './components/SiteNav'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Courses from './pages/Courses'
import Checkout from './pages/Checkout'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailed from './pages/PaymentFailed'
import Dashboard from './pages/Dashboard'
import Quiz from './pages/Quiz'
import QuizResult from './pages/QuizResult'
import Learn from './pages/Learn'
import LearnChapters from './pages/LearnChapters'
import LearnChapterLessons from './pages/LearnChapterLessons'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import About from './pages/About'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import AccountDeletion from './pages/AccountDeletion'
import Refund from './pages/Refund'
import NotFound from './pages/NotFound'
import Maintenance from './pages/Maintenance'
import { useAuth } from './hooks/useAuth'
import { fetchMaintenanceMode } from './lib/platformSettings'

// بعد أي نشر جديد بتتغيّر أسماء ملفات الكود، فالصفحة اللي فاضلة مفتوحة من قبل النشر
// بتدوّر على ملف اتشال وبيطلع خطأ "Failed to fetch dynamically imported module".
// الحل: نعيد تحميل الصفحة مرة واحدة بس (بحارس في sessionStorage عشان ما ندخلش في حلقة).
const CHUNK_RELOAD_KEY = 'qm_chunk_reloaded'

function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory()
      try { sessionStorage.removeItem(CHUNK_RELOAD_KEY) } catch { /* sessionStorage غير متاح */ }
      return mod
    } catch (error) {
      let alreadyReloaded = false
      try { alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1' } catch { /* تجاهل */ }
      if (!alreadyReloaded) {
        try { sessionStorage.setItem(CHUNK_RELOAD_KEY, '1') } catch { /* تجاهل */ }
        window.location.reload()
        return new Promise<{ default: T }>(() => {})
      }
      throw error
    }
  })
}

// لوحة الإدارة محمّلة كسوليًا (lazy) — مش محتاجها إلا الأدمن فقط، بتقلل حجم الباندل الأساسي
const AdminLayout = lazyWithReload(() => import('./components/AdminLayout'))
const AdminOverview = lazyWithReload(() => import('./pages/admin/AdminOverview'))
const AdminCourses = lazyWithReload(() => import('./pages/admin/AdminCourses'))
const AdminStudents = lazyWithReload(() => import('./pages/admin/AdminStudents'))
const AdminEnrollments = lazyWithReload(() => import('./pages/admin/AdminEnrollments'))
const AdminQuizzes = lazyWithReload(() => import('./pages/admin/AdminQuizzes'))
const AdminNotifications = lazyWithReload(() => import('./pages/admin/AdminNotifications'))
const AdminTeam = lazyWithReload(() => import('./pages/admin/AdminTeam'))
const AdminCoupons = lazyWithReload(() => import('./pages/admin/AdminCoupons'))
const AdminSettings = lazyWithReload(() => import('./pages/admin/AdminSettings'))
const AdminLessons = lazyWithReload(() => import('./pages/admin/AdminLessons'))

function AdminFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )
}

// وضع الصيانة: لما يتفعّل، الموقع بيتقفل على **الجميع** — زوار وطلاب
// وأولياء أمور وحتى باقي فريق العمل — والأدمن وحده هو اللي بيكمّل عادي.
// بنسيب صفحة الدخول ولوحة الإدارة مفتوحتين عشان الأدمن يقدر يسجّل دخول
// ويقفل الوضع تاني (من غير كده مفيش طريقة يدخل بيها).
// ولو فشلت قراءة الحالة لأي سبب، الموقع بيشتغل عادي — عطل مؤقت في
// السيرفر ما ينفعش يقفل المنصة بالغلط.
function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const location = useLocation()
  const [maintenance, setMaintenance] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    fetchMaintenanceMode().then((value) => { if (alive) setMaintenance(value) })
    return () => { alive = false }
  }, [])

  if (maintenance !== true) return <>{children}</>

  const path = location.pathname
  if (path === '/login' || path === '/auth/callback' || path.startsWith('/admin')) {
    return <>{children}</>
  }

  // ننتظر معرفة الدور قبل ما نقفل، عشان ما نقفلش على الأدمن بالغلط
  if (loading) return <>{children}</>
  if (profile?.role === 'admin') return <>{children}</>

  return <Maintenance />
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Almarai, sans-serif',
            fontWeight: '600',
            borderRadius: '12px',
            direction: 'rtl',
          },
          success: { iconTheme: { primary: '#D946C6', secondary: '#fff' } },
        }}
      />
      <MaintenanceGate>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/courses" element={<Layout><Courses /></Layout>} />
        {/* صفحة تفاصيل الكورس اتشالت — أي رابط قديم بيروح لباقات الاشتراك مباشرة */}
        <Route path="/courses/:id" element={<Navigate to="/#qm-prices" replace />} />

        {/* Auth */}
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
        <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
        <Route path="/auth/callback" element={<AuthLayout><AuthCallback /></AuthLayout>} />

        {/* Student */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/learn/:courseId" element={<Learn />} />
        <Route path="/learn/:courseId/chapters" element={<LearnChapters />} />
        <Route path="/learn/:courseId/:chapterId" element={<LearnChapterLessons />} />
        <Route path="/learn/:courseId/:chapterId/:lessonId" element={<Learn />} />
        <Route path="/checkout" element={<AuthLayout><Checkout /></AuthLayout>} />
        <Route path="/checkout/:courseId" element={<AuthLayout><Checkout /></AuthLayout>} />
        <Route path="/payment/success" element={<AuthLayout><PaymentSuccess /></AuthLayout>} />
        <Route path="/payment/failed" element={<AuthLayout><PaymentFailed /></AuthLayout>} />

        {/* Admin (محمّلة كسوليًا) */}
        <Route path="/admin" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminOverview /></AdminLayout></Suspense>} />
        <Route path="/admin/courses" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminCourses /></AdminLayout></Suspense>} />
        <Route path="/admin/lessons/:courseId" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminLessons /></AdminLayout></Suspense>} />
        <Route path="/admin/students" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminStudents /></AdminLayout></Suspense>} />
        <Route path="/admin/enrollments" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminEnrollments /></AdminLayout></Suspense>} />
        <Route path="/admin/quizzes" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminQuizzes /></AdminLayout></Suspense>} />
        <Route path="/admin/notifications" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminNotifications /></AdminLayout></Suspense>} />
        <Route path="/admin/team" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminTeam /></AdminLayout></Suspense>} />
        <Route path="/admin/coupons" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminCoupons /></AdminLayout></Suspense>} />
        <Route path="/admin/settings" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminSettings /></AdminLayout></Suspense>} />
        <Route path="/quiz/:quizId" element={<Layout><Quiz /></Layout>} />
        <Route path="/quiz/:quizId/result/:resultId" element={<Layout><QuizResult /></Layout>} />
        <Route path="/about" element={<Layout><About /></Layout>} />
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/account-deletion" element={<Layout><AccountDeletion /></Layout>} />
        <Route path="/refund" element={<Layout><Refund /></Layout>} />

        {/* 404 */}
        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
      </MaintenanceGate>
    </BrowserRouter>
  )
}
