import { useEffect, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  GlassPageHeader, GlassSpinner, GlassEmptyState, GlassSearchInput, GlassBadge,
  tableWrapStyle, thStyle, tdStyle, trStyle,
} from '../../components/admin/glassKit'

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
    <div>
      <GlassPageHeader title="الطلاب" subtitle={`إجمالي ${students.length} طالب مسجل`} />

      <GlassSearchInput value={search} onChange={setSearch} placeholder="ابحث باسم الطالب أو الإيميل..." icon={<Search size={16} />} />

      {loading ? (
        <GlassSpinner />
      ) : filtered.length === 0 ? (
        <GlassEmptyState icon={<Users size={40} />} text="لا يوجد طلاب" />
      ) : (
        <div className="qm-glass" style={tableWrapStyle}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>الطالب</th>
                <th style={thStyle}>الإيميل</th>
                <th style={thStyle}>الجوال</th>
                <th style={thStyle}>تاريخ التسجيل</th>
                <th style={thStyle}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="qm-row" style={trStyle}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#F97066,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>
                        {s.full_name?.charAt(0) || '؟'}
                      </div>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{s.full_name}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.6)' }} dir="ltr">{s.email}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.6)' }} dir="ltr">{s.phone || '—'}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.45)' }}>{new Date(s.created_at).toLocaleDateString('ar-SA')}</td>
                  <td style={tdStyle}>
                    <GlassBadge variant={s.is_active !== false ? 'success' : 'danger'}>{s.is_active !== false ? 'نشط' : 'موقوف'}</GlassBadge>
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
