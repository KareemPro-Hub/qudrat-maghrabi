import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SectionToolbar, StatusBadge, Spinner, EmptyState, avatarClass, initials } from '../../components/admin/lightKit'
import CurrencySymbol from '../../components/CurrencySymbol'
import { formatMoney } from '../../utils/formatMoney'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = { paid: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral' }
const statusLabels: Record<string, string> = { paid: 'مدفوع', pending: 'بانتظار الدفع', failed: 'فشل', refunded: 'مسترجع' }
const packageClass = ['', 'featured', 'pro']

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showIncomplete, setShowIncomplete] = useState(false)
  const [loading, setLoading] = useState(true)

  const [storePrices, setStorePrices] = useState<Record<string, number>>({})

  useEffect(() => {
    void (async () => {
      const [{ data: rows }, { data: subs }, { data: plans }] = await Promise.all([
        supabase.from('enrollments').select('*, profiles(full_name, email), courses(title, price)').order('enrolled_at', { ascending: false }),
        supabase.from('store_subscriptions').select('latest_transaction_id, original_transaction_id, product_id'),
        supabase.from('store_subscription_plans').select('product_id, web_price_minor'),
      ])
      const planPrice: Record<string, number> = {}
      for (const plan of plans || []) planPrice[plan.product_id] = (plan.web_price_minor || 0) / 100
      const byTransaction: Record<string, number> = {}
      for (const sub of subs || []) {
        const price = planPrice[sub.product_id]
        if (price === undefined) continue
        if (sub.latest_transaction_id) byTransaction[sub.latest_transaction_id] = price
        if (sub.original_transaction_id) byTransaction[sub.original_transaction_id] = price
      }
      setStorePrices(byTransaction)
      setEnrollments(rows || [])
      setLoading(false)
    })()
  }, [])

  // شراء المتجر لا يرسل المبلغ في الإيصال، فنعرض سعر الباقة بدل صفر.
  const amountOf = (e: any) => e.amount_paid ?? storePrices[e.payment_reference] ?? e.courses?.price ?? 0

  // محاولات الدفع غير المكتملة تُخفى افتراضيًا ولا تُحذف: الـwebhook يحتاج صفها
  // لو أكمل الطالب الدفع لاحقًا، وهي كذلك قائمة عملاء محتملين.
  const incompleteCount = enrollments.filter((e) => e.payment_status === 'pending').length

  const q = search.toLowerCase()
  const filtered = enrollments
    .filter((e) => (showIncomplete ? e.payment_status === 'pending' : e.payment_status !== 'pending'))
    .filter((e) => e.profiles?.full_name?.toLowerCase().includes(q) || e.courses?.title?.toLowerCase().includes(q))

  const paid = enrollments.filter((e) => e.payment_status === 'paid')
  const totalRevenue = paid.reduce((s, e) => s + amountOf(e), 0)

  const now = new Date()
  const thisMonth = paid.filter((e) => new Date(e.enrolled_at).getMonth() === now.getMonth() && new Date(e.enrolled_at).getFullYear() === now.getFullYear())
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = paid.filter((e) => { const d = new Date(e.enrolled_at); return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear() })
  const thisMonthRevenue = thisMonth.reduce((s, e) => s + amountOf(e), 0)
  const lastMonthRevenue = lastMonth.reduce((s, e) => s + amountOf(e), 0)
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
    const dayRevenue = paid.filter((e) => { const ed = new Date(e.enrolled_at); return ed.toDateString() === d.toDateString() }).reduce((s, e) => s + amountOf(e), 0)
    return dayRevenue
  })
  const maxSpark = Math.max(...sparkDays, 1)

  return (
    <>
      <SectionToolbar title="الاشتراكات والإيرادات" subtitle="راقب نمو الاشتراكات وحركة المدفوعات والباقات." />

      <div className="revenue-hero">
        <div>
          <small>إجمالي الإيرادات (كل الوقت)</small>
          <strong>{formatMoney(totalRevenue)} <b><CurrencySymbol /></b></strong>
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
              <header><span>{p.title}</span><b>{p.price} <CurrencySymbol /></b></header>
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
          <header className="card-head">
            <div>
              <h3>{showIncomplete ? 'محاولات لم تكتمل' : 'أحدث الاشتراكات'}</h3>
              <p>{showIncomplete ? 'طلاب فتحوا صفحة الدفع ولم يكملوها — عملاء محتملون' : 'حركة الاشتراكات والمدفوعات الأخيرة'}</p>
            </div>
            {(incompleteCount > 0 || showIncomplete) && (
              <button type="button" onClick={() => setShowIncomplete((v) => !v)} className="ghost-button">
                {showIncomplete ? 'رجوع للاشتراكات' : `محاولات لم تكتمل (${incompleteCount})`}
              </button>
            )}
          </header>
          <div className="filter-bar" style={{ marginBottom: 14 }}>
            <label><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الطالب أو الكورس..." /></label>
          </div>
          {filtered.length === 0 ? <EmptyState text={showIncomplete ? 'لا توجد محاولات غير مكتملة' : 'لا يوجد اشتراكات بعد'} /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>الطالب</th><th>الكورس</th><th>تاريخ الاشتراك</th><th>القيمة</th><th>طريقة الدفع</th><th>الحالة</th></tr></thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr key={e.id}>
                      <td><span className={`person-avatar ${avatarClass(i)}`}>{initials(e.profiles?.full_name)}</span><b>{e.profiles?.full_name || '—'}</b></td>
                      <td>{e.courses?.title || '—'}</td>
                      <td>{new Date(e.enrolled_at).toLocaleDateString('ar-SA')}</td>
                      <td><strong>{formatMoney(amountOf(e))} <CurrencySymbol /></strong></td>
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
