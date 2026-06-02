import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, Users, Star, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Course } from '../types'
import SarSymbol from '../components/SarSymbol'

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCourses(data || [])
        setLoading(false)
      })
  }, [])

  // Placeholder courses for demo
  const demoCourses = [
    { id: '1', title: 'القدرات الكمي — المستوى الأساسي', description: 'أساسيات الرياضيات والأنماط الرقمية وأساليب الحل السريع للمبتدئين', price: 199, lessons_count: 40, enrolled_count: 1200 },
    { id: '2', title: 'القدرات الكمي — المستوى المتوسط', description: 'تعمق في مسائل الجبر والهندسة والاحتمالات مع أسلوب اختصار الوقت', price: 249, lessons_count: 55, enrolled_count: 980 },
    { id: '3', title: 'القدرات الكمي — المستوى المتقدم', description: 'كل الأبواب بمستوى متقدم مع اختبارات على نمط الاختبار الحقيقي', price: 299, lessons_count: 70, enrolled_count: 750 },
    { id: '4', title: 'باقة القدرات الكاملة', description: 'الكورسات الثلاثة مجتمعة بسعر مخفض — من الصفر حتى التفوق', price: 599, lessons_count: 165, enrolled_count: 2300 },
  ]

  const displayCourses = courses.length > 0 ? courses : demoCourses

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">الكورسات المتاحة</h1>
          <p className="section-subtitle">اختر الكورس المناسب لمستواك وابدأ رحلتك</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {displayCourses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`} className="card hover:shadow-brand-lg transition-all duration-300 flex flex-col cursor-pointer">
                {/* Thumbnail */}
                <div className="rounded-xl mb-5 relative overflow-hidden" style={{aspectRatio: '16/9'}}>
                  {(course as any).thumbnail_url ? (
                    <img src={(course as any).thumbnail_url} alt={course.title} className="w-full h-full object-contain bg-black" />
                  ) : (
                    <div className="gradient-bg w-full h-full flex items-center justify-center">
                      <span className="text-white font-black text-lg text-center px-4">{course.title}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-black text-brand-navy mb-2">{course.title}</h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">{course.description}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-5">
                    <span className="flex items-center gap-1"><BookOpen size={14} /> {course.lessons_count} درس</span>
                    <span className="flex items-center gap-1"><Users size={14} /> {course.enrolled_count?.toLocaleString('ar')} طالب</span>
                    <span className="flex items-center gap-1"><Star size={14} fill="#E91E8C" color="#E91E8C" /> ٤.٩</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-2xl font-black gradient-text">{course.price} <SarSymbol /></div>
                  <span className="btn-primary py-2 px-6 text-sm">
                    اشترك الآن
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
