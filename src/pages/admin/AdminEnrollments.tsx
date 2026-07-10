import { useEffect, useState } from 'react'
import { CreditCard, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import SarSymbol from '../../components/SarSymbol'
import {
  GlassPageHeader, GlassSpinner, GlassEmptyState, GlassSearchInput, GlassBadge,
  tableWrapStyle, thStyle, tdStyle, trStyle,
} from '../../components/admin/glassKit'

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

  const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    paid: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral',
  }
  const statusLabels: Record<string, string> = {
    paid: '✅ مدفوع', pending: '⏳ معلق', failed: '❌ فشل', refunded: '↩️ مسترجع'
  }

  const totalRevenue = enrollments.filter(e => e.payment_status === 'paid').reduce((s, e) => s + (e.amount_paid || e.courses?.price || 0), 0)

  return (
    <div>
      <GlassPageHeader
        title="الاشتراكات"
        subtitle={<>إجمالي الإيرادات: <span style={{ color: '#F9A8D4', fontWeight: 800 }}>{totalRevenue.toLocaleString('en')} <SarSymbol /></span></>}
      />

      <GlassSearchInput value={search} onChange={setSearch} placeholder="ابحث باسم الطالب أو الكورس..." icon={<Search size={16} />} />

      {loading ? (
        <GlassSpinner />
      ) : filtered.length === 0 ? (
        <GlassEmptyState icon={<CreditCard size={40} />} text="لا يوجد اشتراكات بعد" />
      ) : (
        <div className="qm-glass" style={tableWrapStyle}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>الطالب</th>
                <th style={thStyle}>الكورس</th>
                <th style={thStyle}>المبلغ</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="qm-row" style={trStyle}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>{e.profiles?.full_name || '—'}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.65)' }}>{e.courses?.title || '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#F9A8D4' }}>{(e.amount_paid || e.courses?.price || 0).toLocaleString('en')} <SarSymbol /></td>
                  <td style={tdStyle}>
                    <GlassBadge variant={statusVariant[e.payment_status] || 'neutral'}>{statusLabels[e.payment_status] || e.payment_status}</GlassBadge>
                  </td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.45)' }}>{new Date(e.enrolled_at).toLocaleDateString('ar-SA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
