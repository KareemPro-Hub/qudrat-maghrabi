import { useEffect, useState } from 'react'
import { Plus, Copy, Trash2, Eye, EyeOff, Ticket } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { SectionToolbar, StatusBadge, Spinner, EmptyState, Modal } from '../../components/admin/lightKit'

type Coupon = {
  id: string
  code: string
  note: string | null
  is_active: boolean
  max_uses: number | null
  used_count: number
  expires_at: string | null
  created_at: string
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `QM-${s}`
}

const emptyForm = { code: generateCode(), note: '', max_uses: '', expires_at: '' }

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false })
    setCoupons(data || [])
    setLoading(false)
  }

  function openCreate() {
    setForm({ ...emptyForm, code: generateCode() })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) return toast.error('كود الخصم مطلوب')
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('discount_codes').insert({
      code: form.code.trim().toUpperCase(),
      note: form.note || null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      created_by: userData.user?.id || null,
    })
    if (error) {
      toast.error(error.code === '23505' ? 'هذا الكود مستخدم بالفعل، جرّب كود آخر' : 'حدث خطأ أثناء إنشاء الكود')
    } else {
      toast.success('تم إنشاء كود الخصم ✅ — التسجيل به مجاني بالكامل')
      setShowModal(false)
      fetchAll()
    }
    setSaving(false)
  }

  async function toggleActive(c: Coupon) {
    await supabase.from('discount_codes').update({ is_active: !c.is_active }).eq('id', c.id)
    toast.success(c.is_active ? 'تم إيقاف الكود' : 'تم تفعيل الكود ✅')
    fetchAll()
  }

  async function deleteCoupon(id: string) {
    if (!confirm('حذف كود الخصم نهائيًا ؟')) return
    await supabase.from('discount_codes').delete().eq('id', id)
    toast.success('تم الحذف')
    fetchAll()
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success('تم نسخ الكود 📋')
  }

  const activeCount = coupons.filter((c) => c.is_active).length
  const totalUses = coupons.reduce((s, c) => s + c.used_count, 0)

  return (
    <>
      <SectionToolbar
        title="أكواد الخصم"
        subtitle="ولّد أكواد اشتراك مجانية بالكامل لأي مناسبة — الطالب اللي يستخدمها ما يدفعش أي مبلغ."
        action={<button className="primary-admin" onClick={openCreate}><Plus size={16} /> توليد كود جديد</button>}
      />

      <div className="mini-metrics">
        <article><span>{loading ? '…' : coupons.length}</span><p>إجمالي الأكواد<small>منذ إنشاء المنصة</small></p></article>
        <article><span>{loading ? '…' : activeCount}</span><p>أكواد مفعّلة<small>متاحة للاستخدام الآن</small></p></article>
        <article><span>{loading ? '…' : totalUses}</span><p>مرات الاستخدام<small>عبر كل الأكواد</small></p></article>
      </div>

      {loading ? <Spinner /> : coupons.length === 0 ? (
        <EmptyState text="لا توجد أكواد خصم بعد" action={<button className="primary-admin" onClick={openCreate}>ولّد أول كود</button>} />
      ) : (
        <article className="admin-card data-card" data-searchable>
          <header className="card-head"><div><h3>قائمة الأكواد</h3><p>كل الأكواد تمنح اشتراكًا مجانيًا 100% عند الاستخدام</p></div></header>
          <div className="table-wrap">
            <table>
              <thead><tr><th>الكود</th><th>ملاحظة</th><th>الاستخدام</th><th>تاريخ الانتهاء</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false
                  const maxedOut = c.max_uses != null && c.used_count >= c.max_uses
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Ticket size={14} style={{ color: '#a53ee0', flexShrink: 0 }} />
                          <b style={{ fontFamily: 'monospace', letterSpacing: '.5px' }}>{c.code}</b>
                          <button className="row-action" onClick={() => copyCode(c.code)} title="نسخ الكود"><Copy size={12} /></button>
                        </div>
                      </td>
                      <td>{c.note || '—'}</td>
                      <td>{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ' (غير محدود)'}</td>
                      <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-SA') : 'بدون انتهاء'}</td>
                      <td>
                        {!c.is_active ? <StatusBadge variant="neutral">موقوف</StatusBadge>
                          : expired ? <StatusBadge variant="danger">منتهي</StatusBadge>
                          : maxedOut ? <StatusBadge variant="warning">مستنفد</StatusBadge>
                          : <StatusBadge variant="success">فعّال</StatusBadge>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="row-action" onClick={() => toggleActive(c)} title={c.is_active ? 'إيقاف' : 'تفعيل'}>
                            {c.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button className="row-action" onClick={() => deleteCoupon(c.id)} style={{ color: '#d33b55' }} title="حذف"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {showModal && (
        <Modal title="توليد كود خصم جديد" onClose={() => setShowModal(false)}>
          <form className="admin-form" onSubmit={handleSave}>
            <label>الكود
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} dir="ltr" style={{ fontFamily: 'monospace' }} />
                <button type="button" className="ghost-button" onClick={() => setForm({ ...form, code: generateCode() })}>توليد آخر</button>
              </div>
            </label>
            <label>ملاحظة (اختياري)<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="مثال: عرض بداية الفصل الدراسي" /></label>
            <div className="form-grid">
              <label>حد الاستخدام (اختياري)<input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="بدون حد = غير محدود" /></label>
              <label>تاريخ الانتهاء (اختياري)<input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></label>
            </div>
            <p className="adm-hint">أي طالب يستخدم هذا الكود عند الدفع هيحصل على الكورس مجانًا بالكامل — بدون أي رسوم.</p>
            <div className="form-row">
              <button type="submit" className="primary-admin" disabled={saving}>{saving ? 'جاري الحفظ...' : 'إنشاء الكود'}</button>
              <button type="button" className="ghost-button" onClick={() => setShowModal(false)}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
