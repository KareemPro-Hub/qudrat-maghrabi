import { useEffect, useState } from 'react'
import { Plus, Copy, Trash2, Eye, EyeOff, Ticket, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { SectionToolbar, StatusBadge, Spinner, EmptyState, Modal } from '../../components/admin/lightKit'

type Coupon = {
  id: string
  code: string
  allowed_email: string | null
  note: string | null
  is_active: boolean
  max_uses: number | null
  used_count: number
  expires_at: string | null
  created_at: string
}

const emptyForm = { code: '', allowed_email: '', note: '', max_uses: '', expires_at: '' }

function todayDateInputValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function expiryAtEndOfDay(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString()
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data, error } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false })
    if (error) toast.error('تعذر تحميل أكواد الخصم، حاول مرة أخرى')
    setCoupons(data || [])
    setLoading(false)
  }

  function openCreate() {
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const normalizedCode = form.code.trim().toUpperCase()
    if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]{2,31}$/u.test(normalizedCode)) {
      return toast.error('اكتب اسم كود من 3 إلى 32 حرفًا عربيًا أو إنجليزيًا أو رقمًا')
    }
    const allowedEmail = form.allowed_email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allowedEmail)) {
      return toast.error('اكتب البريد الإلكتروني الصحيح للطالب المسموح له باستخدام الكود')
    }

    const maxUses = form.max_uses ? Number(form.max_uses) : null
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      return toast.error('حد الاستخدام يجب أن يكون رقمًا صحيحًا أكبر من صفر')
    }

    if (form.expires_at && form.expires_at < todayDateInputValue()) {
      return toast.error('تاريخ الانتهاء لا يمكن أن يكون في الماضي')
    }

    setSaving(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        toast.error('انتهت جلسة الدخول، سجّل الدخول مرة أخرى')
        return
      }

      const { error } = await supabase.from('discount_codes').insert({
        code: normalizedCode,
        allowed_email: allowedEmail,
        note: form.note.trim() || null,
        max_uses: maxUses,
        expires_at: form.expires_at ? expiryAtEndOfDay(form.expires_at) : null,
        created_by: userData.user.id,
      })
      if (error) {
        toast.error(error.code === '23505' ? 'هذا الكود مستخدم بالفعل، جرّب كودًا آخر' : 'تعذر إنشاء الكود، حاول مرة أخرى')
      } else {
        toast.success('تم إنشاء كود الخصم وأصبح جاهزًا للاستخدام')
        setShowModal(false)
        await fetchAll()
      }
    } catch {
      toast.error('تعذر الاتصال بالخادم، حاول مرة أخرى')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Coupon) {
    const { error } = await supabase.from('discount_codes').update({ is_active: !c.is_active }).eq('id', c.id)
    if (error) return toast.error('تعذر تحديث حالة الكود')
    toast.success(c.is_active ? 'تم إيقاف الكود' : 'تم تفعيل الكود ✅')
    await fetchAll()
  }

  async function deleteCoupon(id: string) {
    if (!confirm('هل تريد حذف كود الخصم نهائيًا؟')) return
    const { error } = await supabase.from('discount_codes').delete().eq('id', id)
    if (error) return toast.error('تعذر حذف الكود')
    toast.success('تم الحذف')
    await fetchAll()
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('تم نسخ الكود')
    } catch {
      toast.error('تعذر نسخ الكود')
    }
  }

  const activeCount = coupons.filter((c) => c.is_active).length
  const totalUses = coupons.reduce((s, c) => s + c.used_count, 0)

  return (
    <>
      <SectionToolbar
        title="أكواد الخصم"
        subtitle="أنشئ أكوادًا تمنح الطلاب اشتراكًا مجانيًا بالكامل لمناسباتك المختلفة."
        action={<button className="primary-admin" onClick={openCreate}><Plus size={16} /> إنشاء كود جديد</button>}
      />

      <div className="mini-metrics">
        <article><span>{loading ? '…' : coupons.length}</span><p>إجمالي الأكواد<small>منذ إنشاء المنصة</small></p></article>
        <article><span>{loading ? '…' : activeCount}</span><p>أكواد مفعّلة<small>متاحة للاستخدام الآن</small></p></article>
        <article><span>{loading ? '…' : totalUses}</span><p>مرات الاستخدام<small>عبر كل الأكواد</small></p></article>
      </div>

      {loading ? <Spinner /> : coupons.length === 0 ? (
        <EmptyState text="لا توجد أكواد خصم بعد" action={<button className="primary-admin" onClick={openCreate}>إنشاء أول كود</button>} />
      ) : (
        <article className="admin-card data-card" data-searchable>
          <header className="card-head"><div><h3>قائمة الأكواد</h3><p>كل الأكواد تمنح اشتراكًا مجانيًا 100% عند الاستخدام</p></div></header>
          <div className="table-wrap">
            <table>
              <thead><tr><th>الكود</th><th>البريد المسموح</th><th>ملاحظة</th><th>الاستخدام</th><th>تاريخ الانتهاء</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
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
                      <td dir="ltr" style={{ textAlign: 'right' }}>{c.allowed_email || 'غير مخصص'}</td>
                      <td>{c.note || '—'}</td>
                      <td>{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ' (غير محدود)'}</td>
                      <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-EG') : 'بدون انتهاء'}</td>
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
        <Modal title="إنشاء كود خصم" onClose={() => setShowModal(false)}>
          <form className="admin-form coupon-form" onSubmit={handleSave} noValidate>
            <label htmlFor="coupon-code"><span className="field-label">اسم كود الخصم المخصص</span>
              <div className="coupon-code-row">
                <input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => setForm({
                    ...form,
                    code: e.target.value
                      .toUpperCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^\p{L}\p{N}_-]/gu, ''),
                  })}
                  placeholder="مثال: هدية-حامد أو HAMED-GIFT"
                  dir="auto"
                  maxLength={32}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  required
                />
              </div>
              <small className="cell-sub">اكتب اسم الطالب أو المناسبة؛ لن يتم توليد أي كود تلقائيًا.</small>
            </label>
            <label htmlFor="coupon-email"><span className="field-label">البريد المسموح له باستخدام الكود</span>
              <input
                id="coupon-email"
                type="email"
                value={form.allowed_email}
                onChange={(e) => setForm({ ...form, allowed_email: e.target.value })}
                placeholder="student@example.com"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                maxLength={254}
                required
              />
              <small className="cell-sub">لن يعمل الكود إلا بعد تسجيل الدخول بحساب يحمل هذا البريد.</small>
            </label>
            <label htmlFor="coupon-note"><span className="field-label">ملاحظة <span className="optional-label">اختياري</span></span>
              <input
                id="coupon-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="مثال: عرض بداية الفصل الدراسي"
                maxLength={120}
              />
            </label>
            <div className="form-grid coupon-fields-grid">
              <label htmlFor="coupon-max-uses"><span className="field-label">حد الاستخدام <span className="optional-label">اختياري</span></span>
                <input
                  id="coupon-max-uses"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="غير محدود"
                />
              </label>
              <label htmlFor="coupon-expiry"><span className="field-label">تاريخ الانتهاء <span className="optional-label">اختياري</span></span>
                <div className="date-field-wrap">
                  <input
                    id="coupon-expiry"
                    type="date"
                    dir="ltr"
                    className={form.expires_at ? '' : 'is-empty'}
                    min={todayDateInputValue()}
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
                  {!form.expires_at && <span className="date-field-placeholder">يوم / شهر / سنة</span>}
                </div>
              </label>
            </div>
            <p className="coupon-benefit-note">
              <Info size={18} aria-hidden="true" />
              <span>يمنح هذا الكود اشتراكًا مجانيًا للحساب المرتبط بالبريد المحدد فقط.</span>
            </p>
            <div className="form-row coupon-form-actions">
              <button type="submit" className="primary-admin" disabled={saving}>{saving ? 'جاري الحفظ...' : 'إنشاء الكود'}</button>
              <button type="button" className="ghost-button coupon-cancel-button" onClick={() => setShowModal(false)} disabled={saving}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
