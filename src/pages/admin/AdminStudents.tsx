import { useEffect, useState } from 'react'
import { Search, Users, Mail, Phone, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })
      .then(({ data }) => { setStudents(data || []); setFiltered(data || []); setLoading(false) })
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(students.filter(s => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)))
  }, [search, students])

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-brand-navy">الطلاب</h1>
        <p className="text-gray-500 mt-1">إجمالي {students.length} طالب مسجل</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pr-10" placeholder="ابحث باسم الطالب أو الإيميل..." />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Users size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-bold">لا يوجد طلاب</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الطالب</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الإيميل</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الجوال</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">تاريخ التسجيل</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-t border-gray-50 hover:bg-gray-50/50 transition-colors`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {s.full_name?.charAt(0) || '؟'}
                      </div>
                      <span className="font-bold text-brand-navy">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500" dir="ltr">{s.email}</td>
                  <td className="px-5 py-4 text-gray-500" dir="ltr">{s.phone || '—'}</td>
                  <td className="px-5 py-4 text-gray-400">{new Date(s.created_at).toLocaleDateString('ar-SA')}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.is_active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {s.is_active !== false ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
