import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Checkout from './pages/Checkout'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailed from './pages/PaymentFailed'
import Dashboard from './pages/Dashboard'
import ParentDashboard from './pages/ParentDashboard'
import ParentLink from './pages/ParentLink'
import AdminLayout from './components/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminCourses from './pages/admin/AdminCourses'
import AdminStudents from './pages/admin/AdminStudents'
import AdminEnrollments from './pages/admin/AdminEnrollments'
import AdminQuizzes from './pages/admin/AdminQuizzes'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminTeam from './pages/admin/AdminTeam'
import AdminSettings from './pages/admin/AdminSettings'
import Quiz from './pages/Quiz'
import QuizResult from './pages/QuizResult'
import Learn from './pages/Learn'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminLessons from './pages/admin/AdminLessons'
import About from './pages/About'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Refund from './pages/Refund'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Almarai, sans-serif',
            fontWeight: '600',
            borderRadius: '12px',
            direction: 'rtl',
          },
          success: { iconTheme: { primary: '#E91E8C', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/courses" element={<Layout><Courses /></Layout>} />
        <Route path="/courses/:id" element={<Layout><CourseDetail /></Layout>} />

        {/* Auth */}
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
        <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />

        {/* Student */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/learn/:courseId" element={<Layout><Learn /></Layout>} />
        <Route path="/checkout/:courseId" element={<AuthLayout><Checkout /></AuthLayout>} />
        <Route path="/payment/success" element={<AuthLayout><PaymentSuccess /></AuthLayout>} />
        <Route path="/payment/failed" element={<AuthLayout><PaymentFailed /></AuthLayout>} />

        {/* Parent */}
        <Route path="/parent" element={<Layout><ParentDashboard /></Layout>} />
        <Route path="/parent/link" element={<AuthLayout><ParentLink /></AuthLayout>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
        <Route path="/admin/courses" element={<AdminLayout><AdminCourses /></AdminLayout>} />
        <Route path="/admin/lessons/:courseId" element={<AdminLayout><AdminLessons /></AdminLayout>} />
        <Route path="/admin/students" element={<AdminLayout><AdminStudents /></AdminLayout>} />
        <Route path="/admin/enrollments" element={<AdminLayout><AdminEnrollments /></AdminLayout>} />
        <Route path="/admin/quizzes" element={<AdminLayout><AdminQuizzes /></AdminLayout>} />
        <Route path="/admin/notifications" element={<AdminLayout><AdminNotifications /></AdminLayout>} />
        <Route path="/admin/team" element={<AdminLayout><AdminTeam /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
        <Route path="/quiz/:quizId" element={<Layout><Quiz /></Layout>} />
        <Route path="/quiz/:quizId/result/:resultId" element={<Layout><QuizResult /></Layout>} />
        <Route path="/about" element={<Layout><About /></Layout>} />
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/refund" element={<Layout><Refund /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
