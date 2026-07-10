import { useEffect, useState } from 'react'
import { Users, BookOpen, CreditCard, TrendingUp, Eye, Plus, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

type RecentEnrollment = {
  id: string
  created_at: string
  student_name: string
  course_title: string
}

export default function AdminOverview() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ students: 0, courses: 0, enrollments: 0, revenue: 0 })
  const [recentEnrollments, setRecentEnrollments] = useState<RecentEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [chartTab, setChartTab] = useState<'students' | 'exams'>('students')

  useEffect(() => {
    async function fetchData() {
      const [studentsRes, coursesRes, enrollRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('courses').select('id', { count: 'exact' }).eq('is_published', true),
        supabase.from('enrollments').select('id, amount_paid', { count: 'exact' }).eq('payment_status', 'paid'),
      ])

      const revenue = enrollRes.data?.reduce((sum, e) => sum + (e.amount_paid || 0), 0) || 0

      setStats({
        students: studentsRes.count || 0,
        courses: coursesRes.count || 0,
        enrollments: enrollRes.count || 0,
        revenue,
      })

      const { data: recent } = await supabase
        .from('enrollments')
        .select('id, created_at, profiles(full_name), courses(title)')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5)

      const mapped: RecentEnrollment[] = (recent || []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        student_name: r.profiles?.full_name || 'طالب',
        course_title: r.courses?.title || '—',
      }))

      setRecentEnrollments(mapped)
      setLoading(false)
    }
    fetchData()
  }, [])

  const cards = [
    { icon: Users, label: 'إجمالي الطلاب', value: stats.students, gradient: 'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)', link: '/admin/students' },
    { icon: BookOpen, label: 'الكورسات المنشورة', value: stats.courses, gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', link: '/admin/courses' },
    { icon: CreditCard, label: 'الاشتراكات المدفوعة', value: stats.enrollments, gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', link: '/admin/enrollments' },
    { icon: TrendingUp, label: 'إجمالي الإيرادات (ر.س)', value: stats.revenue.toLocaleString('en'), gradient: 'linear-gradient(135deg, #211D45 0%, #4C1D95 100%)', link: '/admin/enrollments' },
  ]

  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#211D45]">
            مرحباً{firstName ? ` ${firstName}` : ''} 👋
          </h1>
          <p className="text-[#8A8699] mt-1 text-sm">هنا نظرة شاملة على أداء منصة قدرات المغربي اليوم</p>
        </div>
        <Link
          to="/admin/students"
          className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #F97316 0%, #EC4899 45%, #7C3AED 100%)' }}
        >
          <Plus size={16} /> طالب جديد
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {cards.map((card) => (
          <Link
            to={card.link}
            key={card.label}
            className="bg-white rounded-2xl p-5 border border-[#ECEBF5] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
              style={{ background: card.gradient }}
            >
              <card.icon size={22} className="text-white" />
            </div>
            <div className="text-3xl font-extrabold text-[#211D45] mb-1">{loading ? '...' : card.value}</div>
            <div className="text-sm font-semibold text-[#8A8699]">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Promo card */}
        <div
          className="lg:col-span-1 rounded-2xl p-6 text-white flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #F97316 0%, #EC4899 45%, #7C3AED 100%)' }}
        >
          <div>
            <h3 className="font-extrabold text-lg mb-2">طوّر منصتك</h3>
            <p className="text-white/80 text-sm leading-relaxed">أضف كورساً جديداً أو اختباراً تدريبياً لجذب مزيد من الطلاب</p>
          </div>
          <Link
            to="/admin/courses"
            className="mt-5 inline-flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors rounded-xl py-2.5 text-sm font-bold"
          >
            إضافة كورس جديد
          </Link>
        </div>

        {/* Recent students */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#ECEBF5] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#F3F2FA]">
            <h2 className="text-base font-extrabold text-[#211D45]">آخر الطلاب المسجلين</h2>
            <Link to="/admin/students" className="text-xs font-bold text-[#EC4899] hover:underline flex items-center gap-1">
              <Eye size={13} /> عرض الكل
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-4 border-[#EC4899] border-t-transparent animate-spin" />
            </div>
          ) : recentEnrollments.length === 0 ? (
            <div className="text-center py-10 text-[#8A8699] text-sm font-semibold">لا يوجد طلاب مسجلين بعد</div>
          ) : (
            <div className="divide-y divide-[#F3F2FA]">
              {recentEnrollments.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #F97066 0%, #EC4899 100%)' }}
                  >
                    {s.student_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#211D45] truncate">{s.student_name}</p>
                    <p className="text-xs text-[#8A8699] truncate">{s.course_title}</p>
                  </div>
                  <p className="text-xs text-[#B4B0C4] flex-shrink-0">{new Date(s.created_at).toLocaleDateString('ar-SA')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#ECEBF5] shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-extrabold text-[#211D45]">نمو المنصة</h2>
            <div className="flex bg-[#F3F2FA] rounded-lg p-1 text-xs font-bold">
              <button
                onClick={() => setChartTab('students')}
                className={`px-3 py-1.5 rounded-md transition-colors ${chartTab === 'students' ? 'bg-white text-[#211D45] shadow-sm' : 'text-[#8A8699]'}`}
              >
                الطلاب
              </button>
              <button
                onClick={() => setChartTab('exams')}
                className={`px-3 py-1.5 rounded-md transition-colors ${chartTab === 'exams' ? 'bg-white text-[#211D45] shadow-sm' : 'text-[#8A8699]'}`}
              >
                الاختبارات
              </button>
            </div>
          </div>
          <div className="h-48 flex flex-col items-center justify-center text-center">
            <TrendingUp size={28} className="text-[#D9D6E8] mb-2" />
            <p className="text-sm font-bold text-[#8A8699]">
              {chartTab === 'students' ? 'ستظهر بيانات النمو هنا عند تسجيل طلاب جدد' : 'ستظهر بيانات الاختبارات هنا عند بدء الطلاب في حلها'}
            </p>
          </div>
        </div>

        {/* Upcoming quizzes */}
        <div className="bg-white rounded-2xl border border-[#ECEBF5] shadow-sm p-5 flex flex-col">
          <h2 className="text-base font-extrabold text-[#211D45] mb-4">الاختبارات القادمة</h2>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <ClipboardList size={28} className="text-[#D9D6E8] mb-2" />
            <p className="text-sm font-bold text-[#8A8699] mb-4">لا توجد اختبارات مجدولة حالياً</p>
            <Link
              to="/admin/quizzes"
              className="text-xs font-bold text-white px-4 py-2 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #F97316 0%, #EC4899 45%, #7C3AED 100%)' }}
            >
              + جدولة اختبار جديد
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
