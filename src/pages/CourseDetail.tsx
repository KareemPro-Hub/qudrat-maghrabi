import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { BookOpen, Clock, Users, Star, CheckCircle, Lock, Play, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import SarSymbol from '../components/SarSymbol'
import { Course } from '../types'
import toast from 'react-hot-toast'

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lessons, setLessons] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    fetchCourse()
  }, [id, user])

  async function fetchCourse() {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()
    setCourse(data)

    if (data) {
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, chapter, duration_minutes, is_free_preview, order_index, video_id, thumbnail_url')
        .eq('course_id', id)
        .order('order_index')
      setLessons(lessonsData || [])
    }

    if (user && data) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', data.id)
        .eq('payment_status', 'paid')
        .single()
      setEnrolled(!!enrollment)
    }
    setLoading(false)
  }

  const handleBuy = () => {
    if (!user) {
      toast.error('سجّل دخولك أولاً')
      navigate('/login')
      return
    }
    navigate(`/checkout/${id}`)
  }

  const levelMap: Record<string, string> = {
    beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم'
  }

  const features = [
    'شرح مبسّط لجميع أبواب القدرات الكمي',
    'أسلوب الحل السريع والاختصارات الذكية',
    'اختبارات على نمط الاختبار الحقيقي',
    'متابعة فردية وتتبع تقدمك',
    'وصول مدى الحياة للمحتوى',
    'شهادة إتمام معتمدة',
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 font-bold mb-4">الكورس غير موجود</p>
        <Link to="/courses" className="btn-primary">العودة للكورسات</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <div className="py-16" style={{ background: 'linear-gradient(135deg, #1B1B5E 0%, #3D1070 100%)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

            <div className="text-right">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {levelMap[(course as any).level] || 'مبتدئ'}
                </span>
                <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <Star size={14} fill="currentColor" /> ٤.٩
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">{course.title}</h1>
              <p className="text-white/70 text-lg mb-6 leading-relaxed">{course.description}</p>
              <div className="flex items-center gap-5 text-white/60 text-sm mb-8">
                <span className="flex items-center gap-1"><Users size={16} /> +١٢٠٠ طالب</span>
                <span className="flex items-center gap-1"><Clock size={16} /> {(course as any).duration_hours || '٢٠'}+ ساعة</span>
                <span className="flex items-center gap-1"><BookOpen size={16} /> ٤٠+ درس</span>
              </div>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-brand-lg p-8">
              <div className="rounded-2xl overflow-hidden mb-6 relative" style={{aspectRatio: '16/9'}}>
                {(course as any).thumbnail_url ? (
                  <img src={(course as any).thumbnail_url} alt={course.title} className="w-full h-full object-contain bg-black" />
                ) : (
                  <div className="gradient-bg w-full h-full flex items-center justify-center">
                    <Play size={40} className="text-white" />
                  </div>
                )}
              </div>
              <div className="text-3xl font-black gradient-text mb-2">{course.price} <SarSymbol /></div>
              <p className="text-gray-400 text-sm mb-6">وصول مدى الحياة</p>

              {enrolled ? (
                <Link to={`/learn/${course.id}`} className="btn-primary w-full text-center py-4 text-lg block">
                  ادرس الآن ←
                </Link>
              ) : (
                <button onClick={handleBuy} className="btn-primary w-full py-4 text-lg">
                  اشترك الآن
                </button>
              )}

              <p className="text-center text-gray-400 text-xs mt-3">ضمان استرداد خلال ٧ أيام</p>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      {lessons.length > 0 && (
        <div className="py-14 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-black text-brand-navy mb-8 text-right">محتوى الكورس</h2>
            <div className="space-y-4">
              {(() => {
                // Group lessons by chapter
                const chapters: { name: string; lessons: any[] }[] = []
                lessons.forEach(lesson => {
                  const chapterName = lesson.chapter || ''
                  const existing = chapters.find(c => c.name === chapterName)
                  if (existing) existing.lessons.push(lesson)
                  else chapters.push({ name: chapterName, lessons: [lesson] })
                })
                let globalIndex = 0
                return chapters.map(chapter => (
                  <div key={chapter.name} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {chapter.name && (
                      <div className="px-5 py-3 bg-gradient-to-l from-purple-50 to-pink-50 border-b border-purple-100">
                        <h3 className="font-black text-brand-navy text-sm">{chapter.name}</h3>
                      </div>
                    )}
                    {chapter.lessons.map(lesson => {
                      const i = globalIndex++
                      const canWatch = enrolled || lesson.is_free_preview
                      const thumbnail = lesson.thumbnail_url || null
                      return (
                        <div key={lesson.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0">
                          <div className="relative flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden bg-gray-100">
                            {thumbnail ? (
                              <img src={thumbnail} alt={lesson.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full gradient-bg" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              {canWatch ? <Play size={16} className="text-white" fill="white" /> : <Lock size={14} className="text-white" />}
                            </div>
                          </div>
                          <div className="flex-1 text-right">
                            <p className={`font-bold text-sm ${canWatch ? 'text-brand-navy' : 'text-gray-500'}`}>{lesson.title}</p>
                            <div className="flex items-center justify-end gap-2 mt-1">
                              {lesson.is_free_preview && <span className="text-xs bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full">مجاني</span>}
                              {lesson.duration_minutes && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} /> {lesson.duration_minutes} د</span>}
                              <span className="text-xs text-gray-300">{i + 1}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              })()}
            </div>
            {!enrolled && (
              <div className="text-center mt-4">
                <button onClick={handleBuy} className="btn-primary py-3 px-10 text-sm">
                  🔓 اشترك لتفتح جميع الدروس
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* What you'll learn */}
      <div className="py-14">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-black text-brand-navy mb-8 text-right">ماذا ستتعلم؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 text-right">
                <div className="flex-1">
                  <p className="text-gray-700 font-semibold">{f}</p>
                </div>
                <CheckCircle size={20} className="text-brand-pink flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Bottom */}
      {!enrolled && (
        <div className="py-10 bg-gray-50">
          <div className="max-w-xl mx-auto px-4 text-center">
            <h3 className="text-2xl font-black text-brand-navy mb-2">جاهز تبدأ؟</h3>
            <p className="text-gray-500 mb-6">انضم لآلاف الطلاب الذين حققوا نتائج مميزة</p>
            <button onClick={handleBuy} className="btn-primary py-4 px-12 text-lg">
              اشترك الآن بـ {course.price} <SarSymbol />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
