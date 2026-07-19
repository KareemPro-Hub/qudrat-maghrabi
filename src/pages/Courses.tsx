import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, Users, Star, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Course } from '../types'
import CurrencySymbol from '../components/CurrencySymbol'

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [childCountByParent, setChildCountByParent] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('order_index', { ascending: true }),
      supabase.rpc('get_course_stats'),
    ]).then(([coursesRes, statsRes]) => {
      const statsByCourse: Record<string, { lessons_count: number; enrolled_count: number }> = {}
      ;(statsRes.data || []).forEach((s: any) => {
        statsByCourse[s.course_id] = { lessons_count: s.lessons_count, enrolled_count: s.enrolled_count }
      })
      const merged = (coursesRes.data || []).map((c: any) => ({
        ...c,
        lessons_count: statsByCourse[c.id]?.lessons_count ?? 0,
        enrolled_count: statsByCourse[c.id]?.enrolled_count ?? 0,
      }))
      const childCounts: Record<string, number> = {}
      merged.forEach((c: any) => { if (c.parent_course_id) childCounts[c.parent_course_id] = (childCounts[c.parent_course_id] || 0) + 1 })
      setChildCountByParent(childCounts)
      // الكورسات الفرعية بتظهر جوه صفحة الكورس الأب بتاعها، مش كبلاطة مستقلة هنا
      setCourses(merged.filter((c: any) => !c.parent_course_id))
      setLoading(false)
    })
  }, [])


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
        ) : courses.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="font-bold text-lg">لا توجد كورسات منشورة حاليًا</p>
            <p className="text-sm mt-2">تابعنا قريبًا لإطلاق الكورسات</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {courses.map((course) => (
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
                    <span className="flex items-center gap-1"><Star size={14} fill="#D946C6" color="#D946C6" /> ٤.٩</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  {course.price > 0 ? (
                    <>
                      <div className="text-2xl font-black gradient-text">{course.price} <CurrencySymbol currency={course.currency} /></div>
                      <span className="btn-primary py-2 px-6 text-sm">
                        اشترك الآن
                      </span>
                    </>
                  ) : !childCountByParent[course.id] ? (
                    <>
                      <div className="text-sm font-black text-green-600 bg-green-50 px-4 py-1.5 rounded-full">مجاني</div>
                      <span className="btn-primary py-2 px-6 text-sm">
                        ابدأ الآن
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-black text-brand-purple bg-purple-50 px-3 py-1.5 rounded-full">باقة · {childCountByParent[course.id]} كورس</div>
                      <span className="btn-primary py-2 px-6 text-sm">
                        استعرض الباقة
                      </span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
