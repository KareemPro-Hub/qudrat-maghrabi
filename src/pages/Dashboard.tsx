import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { BookOpen, Trophy, Clock, TrendingUp, Play, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { user, profile, loading } = useAuth()
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [quizResults, setQuizResults] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  async function fetchData() {
    const [{ data: enr }, { data: quiz }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user!.id)
        .eq('payment_status', 'paid')
        .order('enrolled_at', { ascending: false }),
      supabase
        .from('quiz_results')
        .select('*, quizzes(title, total_marks)')
        .eq('student_id', user!.id)
        .order('taken_at', { ascending: false })
        .limit(5)
    ])
    setEnrollments(enr || [])
    setQuizResults(quiz || [])
    setFetching(false)
  }

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" />
  if (profile?.role === 'parent') return <Navigate to="/parent" />
  if (profile && ['admin', 'teacher', 'content_manager', 'student_manager'].includes(profile.role)) {
    return <Navigate to="/admin" />
  }

  const avgScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((s, r) => s + (r.score / (r.quizzes?.total_marks || 1) * 100), 0) / quizResults.length)
    : null

  const stats = [
    { icon: BookOpen, label: 'كورساتي', value: enrollments.length, color: 'text-brand-pink', bg: 'bg-pink-50' },
    { icon: Trophy, label: 'اختباراتي', value: quizResults.length, color: 'text-brand-orange', bg: 'bg-orange-50' },
    { icon: TrendingUp, label: 'متوسط درجاتي', value: avgScore !== null ? `${avgScore}%` : '—', color: 'text-brand-purple', bg: 'bg-purple-50' },
    { icon: Clock, label: 'ساعات الدراسة', value: '—', color: 'text-brand-navy', bg: 'bg-blue-50' },
  ]

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-brand-navy">
            أهلاً، <span className="gradient-text">{profile?.full_name || 'طالب'}</span> 👋
          </h1>
          <p className="text-gray-500 mt-1">تابع تقدمك ودراستك من هنا</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="card text-center">
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-3`}>
                <s.icon size={24} className={s.color} />
              </div>
              <div className="text-2xl font-black text-brand-navy">{s.value}</div>
              <div className="text-sm text-gray-500 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* My Courses — 2/3 width */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-5">
              <Link to="/courses" className="text-brand-pink text-sm font-bold hover:underline flex items-center gap-1">
                استعرض الكل <ArrowLeft size={14} />
              </Link>
              <h2 className="text-xl font-black text-brand-navy">كورساتي</h2>
            </div>

            {enrollments.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 font-semibold mb-4">لم تشترك في أي كورس بعد</p>
                <Link to="/courses" className="btn-primary inline-block">استعرض الكورسات ←</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {enrollments.map((e) => (
                  <div key={e.id} className="border-2 border-gray-100 rounded-2xl p-4 hover:border-brand-pink/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 gradient-bg rounded-xl flex items-center justify-center text-white flex-shrink-0">
                        <Play size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-brand-navy truncate">{e.courses?.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="gradient-bg h-2 rounded-full" style={{ width: '0%' }} />
                          </div>
                          <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">٠٪ مكتمل</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          اشتركت في {new Date(e.enrolled_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <Link to={`/learn/${e.course_id}`} className="btn-primary py-2 px-4 text-sm flex-shrink-0">
                        متابعة ←
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Quiz Results */}
            <div className="card">
              <h2 className="text-lg font-black text-brand-navy mb-4 text-right">آخر الاختبارات</h2>
              {quizResults.length === 0 ? (
                <div className="text-center py-6">
                  <Trophy size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm font-semibold">لا توجد اختبارات بعد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quizResults.map(r => (
                    <div key={r.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                        {r.passed
                          ? <CheckCircle size={16} className="text-green-500" />
                          : <AlertCircle size={16} className="text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-brand-navy truncate">{r.quizzes?.title}</p>
                        <p className="text-xs text-gray-400">{new Date(r.taken_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <span className={`text-sm font-black ${r.passed ? 'text-green-600' : 'text-red-500'}`}>
                        {r.score}/{r.quizzes?.total_marks}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-lg font-black text-brand-navy mb-4 text-right">روابط سريعة</h2>
              <div className="space-y-2">
                <Link to="/courses" className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-pink-50 transition-colors group">
                  <ArrowLeft size={16} className="text-gray-300 group-hover:text-brand-pink" />
                  <span className="font-bold text-gray-600 text-sm group-hover:text-brand-pink">استعرض الكورسات</span>
                </Link>
                <Link to="/quizzes" className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors group">
                  <ArrowLeft size={16} className="text-gray-300 group-hover:text-brand-purple" />
                  <span className="font-bold text-gray-600 text-sm group-hover:text-brand-purple">اختباراتي</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
