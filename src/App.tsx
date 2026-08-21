import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import SiteNav from './components/SiteNav'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
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
import About from './pages/About'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import AccountDeletion from './pages/AccountDeletion'
import Refund from './pages/Refund'
import NotFound from './pages/NotFound'

// لوحة الإدارة محمّلة كسوليًا (lazy) — مش محتاجها إلا الأدمن فقط، بتقلل حجم الباندل الأساسي
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'))
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'))
const AdminEnrollments = lazy(() => import('./pages/admin/AdminEnrollments'))
const AdminQuizzes = lazy(() => import('./pages/admin/AdminQuizzes'))
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'))
const AdminTeam = lazy(() => import('./pages/admin/AdminTeam'))
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminLessons = lazy(() => import('./pages/admin/AdminLessons'))

function AdminFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )
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
      <Routes>
        {/* Public */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/courses" element={<Layout><Courses /></Layout>} />
        <Route path="/courses/:id" element={<Layout><CourseDetail /></Layout>} />

        {/* Auth */}
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
        <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />

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
    </BrowserRouter>
  )
}
