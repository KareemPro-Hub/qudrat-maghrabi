import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Courses from './pages/Courses'
import Dashboard from './pages/Dashboard'
import AdminLayout from './components/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminCourses from './pages/admin/AdminCourses'
import AdminStudents from './pages/admin/AdminStudents'
import AdminEnrollments from './pages/admin/AdminEnrollments'

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
            fontFamily: 'Cairo, sans-serif',
            fontWeight: '600',
            borderRadius: '12px',
            direction: 'rtl',
          },
          success: { iconTheme: { primary: '#E91E8C', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/courses" element={<Layout><Courses /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
        <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
        <Route path="/admin/courses" element={<AdminLayout><AdminCourses /></AdminLayout>} />
        <Route path="/admin/students" element={<AdminLayout><AdminStudents /></AdminLayout>} />
        <Route path="/admin/enrollments" element={<AdminLayout><AdminEnrollments /></AdminLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
