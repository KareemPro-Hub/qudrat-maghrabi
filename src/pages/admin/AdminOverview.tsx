import { useEffect, useState } from 'react'
import { Users, BookOpen, CreditCard, TrendingUp, Bell, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

export default function AdminOverview() {
  const [stats, setStats] = useState({ students: 0, courses: 0, enrollments: 0, revenue: 0 })
  const [recentStudents, setRecentStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentStudents(recent || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const cards = [
    { icon: Users, label: 'إجمالي الطلاب', value: stats.students, color: 'from-brand-orange to-brand-pink', link: '/admin/students' },
    { icon: BookOpen, label: 'الكورسات المنشورة', value: stats.courses, color: 'from-brand-pink to-brand-purple', link: '/admin/courses' },
    { icon: CreditCard, label: 'الاشتراكات المدفوعة', value: stats.enrollments, color: 'from-brand-purple to-brand-navy', link: '/admin/enrollments' },
    { icon: TrendingUp, label: 'إجمالي الإيرادات (ر.س)', value: stats.revenue.toLocaleString('en'), color: 'from-brand-navy to-brand-purple', link: '/admin/enrollments' },
  ]

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-brand-navy">لوحة التحكم 👋</h1>
        <p className="text-gray-500 mt-1">مرحباً! هنا نظرة شاملة على أداء المنصة</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map((card) => (
          <Link to={card.link} key={card.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-brand transition-all duration-300 hover:-translate-y-1 group">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <card.icon size={22} className="text-white" />
            </div>
            <div className="text-3xl font-extrabold text-brand-navy mb-1">{loading ? '...' : card.value}</div>
            <div className="text-sm font-semibold text-gray-400">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Students */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <h2 className="text-lg font-extrabold text-brand-navy">آخر الطلاب المسجلين</h2>
          <Link to="/admin/students" className="text-sm font-bold text-brand-pink hover:underline flex items-center gap-1">
            <Eye size={14} /> عرض الكل
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
          </div>
        ) : recentStudents.length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-semibold">لا يوجد طلاب بعد</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-5 py-3 font-bold text-gray-500">الاسم</th>
                <th className="text-right px-5 py-3 font-bold text-gray-500">الإيميل</th>
                <th className="text-right px-5 py-3 font-bold text-gray-500">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {recentStudents.map((s, i) => (
                <tr key={s.id} className={`border-t border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-5 py-3 font-bold text-brand-navy">{s.full_name}</td>
                  <td className="px-5 py-3 text-gray-500" dir="ltr">{s.email}</td>
                  <td className="px-5 py-3 text-gray-400">{new Date(s.created_at).toLocaleDateString('ar-SA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
