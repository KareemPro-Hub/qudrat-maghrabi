import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Users, BookOpen, Trophy, TrendingUp, Clock, UserPlus, Play, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface StudentData {
  id: string
  full_name: string
  email: string
  enrollments: any[]
  quizResults: any[]
}

export default function ParentDashboard() {
  const { user, profile, loading } = useAuth()
  const [students, setStudents] = useState<StudentData[]>([])
  const [fetching, setFetching] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('')

  useEffect(() => {
    if (user) fetchStudents()
  }, [user])

  async function fetchStudents() {
    // Get linked students
    const { data: links } = await supabase
      .from('parent_student')
      .select('student_id, profiles(id, full_name, email)')
      .eq('parent_id', user!.id)

    if (!links || links.length === 0) { setFetching(false); return }

    const studentIds = links.map((l: any) => l.student_id)

    // Get enrollments for all students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(title, price)')
      .in('student_id', studentIds)
      .eq('payment_status', 'paid')

    // Get quiz results
    const { data: quizResults } = await supabase
      .from('quiz_results')
      .select('*, quizzes(title, total_marks)')
      .in('student_id', studentIds)
      .order('taken_at', { ascending: false })

    const studentsData: StudentData[] = links.map((l: any) => ({
      id: l.profiles.id,
      full_name: l.profiles.full_name,
      email: l.profiles.email,
      enrollments: enrollments?.filter(e => e.student_id === l.profiles.id) || [],
      quizResults: quizResults?.filter(q => q.student_id === l.profiles.id) || [],
    }))

    setStudents(studentsData)
    if (studentsData.length > 0) setActiveTab(studentsData[0].id)
    setFetching(false)
  }

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-purple border-t-transparent animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" />
  if (profile && profile.role !== 'parent') return <Navigate to="/dashboard" />

  const activeStudent = students.find(s => s.id === activeTab)

  // No students linked yet
  if (students.length === 0) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
          <Users size={36} className="text-brand-purple" />
        </div>
        <h2 className="text-2xl font-black text-brand-navy mb-2">لم تربط أي طالب بعد</h2>
        <p className="text-gray-500 mb-6">ربّط حساب ابنك/ابنتك لمتابعة تقدمه الدراسي</p>
        <Link to="/parent/link" className="btn-primary inline-block py-3 px-8">
          ربط حساب طالب
        </Link>
      </div>
    </div>
  )

  const avgScore = activeStudent && activeStudent.quizResults.length > 0
    ? Math.round(activeStudent.quizResults.reduce((s, r) => s + (r.score / r.quizzes?.total_marks * 100), 0) / activeStudent.quizResults.length)
    : null

  const passRate = activeStudent && activeStudent.quizResults.length > 0
    ? Math.round(activeStudent.quizResults.filter(r => r.passed).length / activeStudent.quizResults.length * 100)
    : null

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-brand-navy">
              أهلاً، <span className="gradient-text">{profile?.full_name}</span> 👋
            </h1>
            <p className="text-gray-500 mt-1">متابعة أداء أبنائك الدراسي</p>
          </div>
          <Link to="/parent/link" className="btn-primary flex items-center gap-2 py-2 px-5 text-sm">
            <UserPlus size={16} /> ربط طالب جديد
          </Link>
        </div>

        {/* Student Tabs */}
        {students.length > 1 && (
          <div className="flex gap-3 mb-6 flex-wrap">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  activeTab === s.id
                    ? 'gradient-bg text-white shadow-brand'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-purple'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                  {s.full_name?.charAt(0)}
                </div>
                {s.full_name}
              </button>
            ))}
          </div>
        )}

        {activeStudent && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card text-center">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-2">
                  <BookOpen size={20} className="text-white" />
                </div>
                <div className="text-2xl font-black text-brand-navy">{activeStudent.enrollments.length}</div>
                <div className="text-xs text-gray-500 font-semibold">الكورسات المشترك فيها</div>
              </div>

              <div className="card text-center">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-2">
                  <Trophy size={20} className="text-brand-orange" />
                </div>
                <div className="text-2xl font-black text-brand-navy">{activeStudent.quizResults.length}</div>
                <div className="text-xs text-gray-500 font-semibold">الاختبارات المُنجزة</div>
              </div>

              <div className="card text-center">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp size={20} className="text-brand-purple" />
                </div>
                <div className="text-2xl font-black text-brand-navy">
                  {avgScore !== null ? `${avgScore}%` : '—'}
                </div>
                <div className="text-xs text-gray-500 font-semibold">متوسط الدرجات</div>
              </div>

              <div className="card text-center">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
                <div className="text-2xl font-black text-brand-navy">
                  {passRate !== null ? `${passRate}%` : '—'}
                </div>
                <div className="text-xs text-gray-500 font-semibold">نسبة النجاح</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Courses */}
              <div className="card">
                <h2 className="text-lg font-black text-brand-navy mb-4">الكورسات المشترك فيها</h2>
                {activeStudent.enrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen size={36} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm font-semibold">لم يشترك في أي كورس بعد</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeStudent.enrollments.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
                          <Play size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-brand-navy text-sm truncate">{e.courses?.title}</p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="gradient-bg h-1.5 rounded-full" style={{ width: '0%' }} />
                          </div>
                          <span className="text-xs text-gray-400">٠٪ مكتمل</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quiz Results */}
              <div className="card">
                <h2 className="text-lg font-black text-brand-navy mb-4">آخر نتائج الاختبارات</h2>
                {activeStudent.quizResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy size={36} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm font-semibold">لم يُجرِ أي اختبار بعد</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeStudent.quizResults.slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                          {r.passed
                            ? <CheckCircle size={18} className="text-green-500" />
                            : <AlertCircle size={18} className="text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-brand-navy text-sm truncate">{r.quizzes?.title}</p>
                          <p className="text-xs text-gray-400">{new Date(r.taken_at).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="text-right">
                          <span className={`font-black text-sm ${r.passed ? 'text-green-600' : 'text-red-500'}`}>
                            {r.score}/{r.quizzes?.total_marks}
                          </span>
                          <p className="text-xs text-gray-400">
                            {Math.round(r.score / r.quizzes?.total_marks * 100)}٪
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Report */}
              <div className="card lg:col-span-2">
                <h2 className="text-lg font-black text-brand-navy mb-4">تقرير الالتزام والتقدم</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div className="bg-blue-50 rounded-2xl p-4 text-center">
                    <Clock size={24} className="mx-auto text-blue-500 mb-2" />
                    <div className="font-black text-2xl text-brand-navy">—</div>
                    <div className="text-sm text-gray-500 font-semibold">ساعات الدراسة</div>
                    <div className="text-xs text-gray-400 mt-1">ستُفعَّل مع الفيديوهات</div>
                  </div>

                  <div className="bg-purple-50 rounded-2xl p-4 text-center">
                    <TrendingUp size={24} className="mx-auto text-brand-purple mb-2" />
                    <div className="font-black text-2xl text-brand-navy">
                      {avgScore !== null ? `${avgScore}%` : '—'}
                    </div>
                    <div className="text-sm text-gray-500 font-semibold">متوسط الأداء العام</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {avgScore !== null
                        ? avgScore >= 80 ? 'ممتاز 🌟' : avgScore >= 60 ? 'جيد 👍' : 'يحتاج متابعة ⚠️'
                        : 'لا توجد بيانات بعد'
                      }
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-2xl p-4 text-center">
                    <CheckCircle size={24} className="mx-auto text-green-500 mb-2" />
                    <div className="font-black text-2xl text-brand-navy">{activeStudent.enrollments.length}</div>
                    <div className="text-sm text-gray-500 font-semibold">كورسات نشطة</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {activeStudent.enrollments.length > 0 ? 'الطالب منتظم ✅' : 'لم يشترك بعد'}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
