import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SectionToolbar, StatusBadge, Spinner, EmptyState, avatarClass, initials } from '../../components/admin/lightKit'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = { paid: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral' }
const statusLabels: Record<string, string> = { paid: 'مدفوع', pending: 'بانتظار الدفع', failed: 'فشل', refunded: 'مسترجع' }
const packageClass = ['', 'featured', 'pro']

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('enrollments').select('*, profiles(full_name, email), courses(title, price)').order('enrolled_at', { ascending: false })
      .then(({ data }) => { setEnrollments(data || []); setLoading(false) })
  }, [])

  const q = search.toLowerCase()
  const filtered = enrollments.filter((e) => e.profiles?.full_name?.toLowerCase().includes(q) || e.courses?.title?.toLowerCase().includes(q))

  const paid = enrollments.filter((e) => e.payment_status === 'paid')
  const totalRevenue = paid.reduce((s, e) => s + (e.amount_paid || e.courses?.price || 0), 0)

  const now = new Date()
  const thisMonth = paid.filter((e) => new Date(e.enrolled_at).getMonth() === now.getMonth() && new Date(e.enrolled_at).getFullYear() === now.getFullYear())
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = paid.filter((e) => { const d = new Date(e.enrolled_at); return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear() })
  const thisMonthRevenue = thisMonth.reduce((s, e) => s + (e.amount_paid || e.courses?.price || 0), 0)
  const lastMonthRevenue = lastMonth.reduce((s, e) => s + (e.amount_paid || e.courses?.price || 0), 0)
  const growth = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : (thisMonthRevenue > 0 ? 100 : 0)

  // Per-course package breakdown (top 3 by paid enrollment count)
  const byCourse: Record<string, { title: string; price: number; count: number }> = {}
  paid.forEach((e) => {
    const cid = e.course_id
    if (!cid) return
    if (!byCourse[cid]) byCourse[cid] = { title: e.courses?.title || 'كورس', price: e.courses?.price || 0, count: 0 }
    byCourse[cid].count++
  })
  const packages = Object.values(byCourse).sort((a, b) => b.count - a.count).slice(0, 3)
  const totalPaidCount = paid.length || 1

  // Simple 7-bar sparkline from last 7 enrollment-days revenue
  const sparkDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i))
    const dayRevenue = paid.filter((e) => { const ed = new Date(e.enrolled_at); return ed.toDateString() === d.toDateString() }).reduce((s, e) => s + (e.amount_paid || e.courses?.price || 0), 0)
    return dayRevenue
  })
  const maxSpark = Math.max(...sparkDays, 1)

  return (
    <>
      <SectionToolbar title="الاشتراكات والإيرادات" subtitle="راقب نمو الاشتراكات وحركة المدفوعات والباقات." />

      <div className="revenue-hero">
        <div>
          <small>إجمالي الإيرادات (كل الوقت)</small>
          <strong>{Math.round(totalRevenue).toLocaleString('en')} <b>ج.م</b></strong>
          <p><span>{growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%</span> مقارنة بالشهر الماضي</p>
        </div>
        <div className="revenue-spark">
          {sparkDays.map((v, i) => <i key={i} style={{ height: `${Math.max(8, (v / maxSpark) * 100)}%` }} />)}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="package-grid">
          {packages.length === 0 ? <EmptyState text="لا توجد اشتراكات مدفوعة بعد" /> : packages.map((p, i) => (
            <article className={`package-card ${packageClass[i]}`} key={p.title}>
              <header><span>{p.title}</span><b>{p.price} ج.م</b></header>
              <strong>{p.count}</strong>
              <p>اشتراك مدفوع</p>
              <i><u style={{ width: `${Math.round((p.count / totalPaidCount) * 100)}%` }} /></i>
              <footer><span>{Math.round((p.count / totalPaidCount) * 100)}% من الاشتراكات</span></footer>
            </article>
          ))}
        </div>
      )}

      {loading ? null : (
        <article className="admin-card data-card" data-searchable>
          <header className="card-head"><div><h3>أحدث الاشتراكات</h3><p>حركة الاشتراكات والمدفوعات الأخيرة</p></div></header>
          <div className="filter-bar" style={{ marginBottom: 14 }}>
            <label><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الطالب أو الكورس..." /></label>
          </div>
          {filtered.length === 0 ? <EmptyState text="لا يوجد اشتراكات بعد" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>الطالب</th><th>الكورس</th><th>تاريخ الاشتراك</th><th>القيمة</th><th>طريقة الدفع</th><th>الحالة</th></tr></thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr key={e.id}>
                      <td><span className={`person-avatar ${avatarClass(i)}`}>{initials(e.profiles?.full_name)}</span><b>{e.profiles?.full_name || '—'}</b></td>
                      <td>{e.courses?.title || '—'}</td>
                      <td>{new Date(e.enrolled_at).toLocaleDateString('ar-SA')}</td>
                      <td><strong>{(e.amount_paid || e.courses?.price || 0).toLocaleString('en')} ج.م</strong></td>
                      <td>{e.payment_method || '—'}</td>
                      <td><StatusBadge variant={statusVariant[e.payment_status] || 'neutral'}>{statusLabels[e.payment_status] || e.payment_status}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}
    </>
  )
}
