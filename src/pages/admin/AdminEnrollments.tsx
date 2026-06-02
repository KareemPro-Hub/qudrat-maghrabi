import { useEffect, useState } from 'react'
import { CreditCard, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import SarSymbol from '../../components/SarSymbol'

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('enrollments')
      .select('*, profiles(full_name, email), courses(title, price)')
      .order('enrolled_at', { ascending: false })
      .then(({ data }) => { setEnrollments(data || []); setFiltered(data || []); setLoading(false) })
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(enrollments.filter(e =>
      e.profiles?.full_name?.toLowerCase().includes(q) ||
      e.courses?.title?.toLowerCase().includes(q)
    ))
  }, [search, enrollments])

  const statusColors: Record<string, string> = {
    paid: 'bg-green-50 text-green-600',
    pending: 'bg-yellow-50 text-yellow-600',
    failed: 'bg-red-50 text-red-500',
    refunded: 'bg-gray-100 text-gray-500',
  }
  const statusLabels: Record<string, string> = {
    paid: '✅ مدفوع', pending: '⏳ معلق', failed: '❌ فشل', refunded: '↩️ مسترجع'
  }

  const totalRevenue = enrollments.filter(e => e.payment_status === 'paid').reduce((s, e) => s + (e.amount_paid || e.courses?.price || 0), 0)

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-brand-navy">الاشتراكات</h1>
        <p className="text-gray-500 mt-1">إجمالي الإيرادات: <span className="gradient-text font-extrabold">{totalRevenue.toLocaleString('en')} <SarSymbol /></span></p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pr-10" placeholder="ابحث باسم الطالب أو الكورس..." />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <CreditCard size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-bold">لا يوجد اشتراكات بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الطالب</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الكورس</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">المبلغ</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">الحالة</th>
                <th className="text-right px-5 py-4 font-bold text-gray-500">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-brand-navy">{e.profiles?.full_name || '—'}</td>
                  <td className="px-5 py-4 text-gray-600">{e.courses?.title || '—'}</td>
                  <td className="px-5 py-4 font-bold text-brand-pink">{(e.amount_paid || e.courses?.price || 0).toLocaleString('en')} <SarSymbol /></td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[e.payment_status] || 'bg-gray-100 text-gray-500'}`}>
                      {statusLabels[e.payment_status] || e.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-400">{new Date(e.enrolled_at).toLocaleDateString('ar-SA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
