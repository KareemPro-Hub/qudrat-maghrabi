import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { BookOpen, Trophy, Clock, TrendingUp, Play } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { user, profile, loading } = useAuth()
  const [enrollments, setEnrollments] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .eq('payment_status', 'paid')
        .then(({ data }) => setEnrollments(data || []))
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />
  if (profile && ['admin', 'teacher', 'content_manager', 'student_manager'].includes(profile.role)) {
    return <Navigate to="/admin" />
  }

  const stats = [
    { icon: BookOpen, label: 'كورساتي', value: enrollments.length, color: 'text-brand-pink' },
    { icon: Trophy, label: 'اختباراتي', value: '٠', color: 'text-brand-orange' },
    { icon: TrendingUp, label: 'متوسط درجاتي', value: '—', color: 'text-brand-purple' },
    { icon: Clock, label: 'ساعات الدراسة', value: '٠', color: 'text-brand-navy' },
  ]

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-brand-navy">
            أهلاً، <span className="gradient-text">{profile?.full_name || 'طالب'}</span> 👋
          </h1>
          <p className="text-gray-500 mt-1">متابعة تقدمك ودراستك</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="card text-center">
              <s.icon size={28} className={`mx-auto mb-2 ${s.color}`} />
              <div className="text-2xl font-black text-brand-navy">{s.value}</div>
              <div className="text-sm text-gray-500 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* My Courses */}
        <div className="card">
          <h2 className="text-xl font-black text-brand-navy mb-5">كورساتي</h2>
          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 font-semibold mb-4">لم تشترك في أي كورس بعد</p>
              <Link to="/courses" className="btn-primary inline-block">
                استعرض الكورسات ←
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrollments.map((e) => (
                <div key={e.id} className="border-2 border-purple-100 rounded-xl p-4 flex items-center gap-4 hover:border-brand-pink transition-colors">
                  <div className="w-14 h-14 gradient-bg rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    <Play size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-brand-navy truncate">{e.courses?.title}</h3>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                      <div className="gradient-bg h-2 rounded-full" style={{ width: '0%' }} />
                    </div>
                    <span className="text-xs text-gray-400 mt-1 block">٠٪ مكتمل</span>
                  </div>
                  <Link to={`/learn/${e.course_id}`} className="btn-primary py-2 px-4 text-sm flex-shrink-0">
                    ادرس
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
