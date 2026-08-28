import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { SectionToolbar } from '../../components/admin/lightKit'
import { fetchMaintenanceMode, setMaintenanceMode } from '../../lib/platformSettings'

const TABS = ['الملف العام', 'الهوية البصرية', 'الإشعارات', 'الأمان والدخول', 'الدفع والفواتير']

export default function AdminSettings() {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState({
    name: 'قدرات المغربي',
    email: 'hello@qudratmaghrabi.sa',
    phone: '+966 50 000 0000',
    description: 'منصة تعليمية متخصصة في إعداد طلاب الثانوية لاختبار القدرات الكمي بأسلوب بسيط وفعّال.',
  })
  const [switches, setSwitches] = useState({ registration: true, emailAlerts: true, maintenance: false })
  const [savingMaintenance, setSavingMaintenance] = useState(false)

  // وضع الصيانة هو المفتاح الوحيد المربوط فعليًا بقاعدة البيانات دلوقتي،
  // فبنقرأ حالته الحقيقية عند فتح الصفحة وبنحفظ أي تغيير فيه على طول.
  useEffect(() => {
    let alive = true
    fetchMaintenanceMode().then((value) => {
      if (alive) setSwitches((prev) => ({ ...prev, maintenance: value }))
    })
    return () => { alive = false }
  }, [])

  async function toggleMaintenance(enabled: boolean) {
    if (savingMaintenance) return
    setSavingMaintenance(true)
    const previous = switches.maintenance
    setSwitches((prev) => ({ ...prev, maintenance: enabled }))
    const { error } = await setMaintenanceMode(enabled)
    setSavingMaintenance(false)
    if (error) {
      setSwitches((prev) => ({ ...prev, maintenance: previous }))
      toast.error('تعذّر تغيير وضع الصيانة. حاول مرة أخرى')
      return
    }
    toast.success(enabled ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة')
  }

  function save() {
    toast.success('تم حفظ إعدادات المنصة بنجاح')
  }

  return (
    <>
      <SectionToolbar
        title="إعدادات المنصة"
        subtitle="خصص الهوية والحساب والأمان والإشعارات."
        action={<button className="primary-admin" onClick={save}>حفظ التغييرات</button>}
      />

      <div className="settings-grid">
        <article className="admin-card settings-nav">
          {TABS.map((t, i) => (
            <button key={t} className={i === tab ? 'active' : ''} onClick={() => setTab(i)}>{t}</button>
          ))}
        </article>

        <article className="admin-card settings-form">
          <header className="card-head"><div><h3>بيانات المنصة</h3><p>المعلومات الأساسية التي تظهر للطلاب</p></div></header>
          <form className="admin-form" onSubmit={(e) => e.preventDefault()}>
            <div className="logo-upload">
              <img src="/admin/logo.png" alt="شعار قدرات المغربي" />
              <button type="button" onClick={() => toast('رفع الشعار سيتم ربطه لاحقًا', { icon: '📁' })}>تغيير الشعار</button>
            </div>
            <div className="form-grid">
              <label>اسم المنصة<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>البريد الإلكتروني<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></label>
              <label>رقم التواصل<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></label>
              <label>المنطقة الزمنية
                <select defaultValue="riyadh"><option value="riyadh">الرياض (GMT+3)</option></select>
              </label>
            </div>
            <label>وصف مختصر<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="setting-switches">
              <div>
                <span><b>إتاحة التسجيل الجديد</b><small>السماح للطلاب بإنشاء حسابات جديدة</small></span>
                <label className="switch"><input type="checkbox" checked={switches.registration} onChange={(e) => setSwitches({ ...switches, registration: e.target.checked })} /><i /></label>
              </div>
              <div>
                <span><b>التنبيهات البريدية</b><small>إرسال التقارير الأسبوعية إلى بريد الإدارة</small></span>
                <label className="switch"><input type="checkbox" checked={switches.emailAlerts} onChange={(e) => setSwitches({ ...switches, emailAlerts: e.target.checked })} /><i /></label>
              </div>
              <div>
                <span><b>وضع الصيانة</b><small>إيقاف المنصة مؤقتًا أمام الطلاب — لوحة الإدارة تفضل شغالة</small></span>
                <label className="switch"><input type="checkbox" checked={switches.maintenance} disabled={savingMaintenance} onChange={(e) => toggleMaintenance(e.target.checked)} /><i /></label>
              </div>
            </div>
          </form>
        </article>
      </div>
    </>
  )
}
