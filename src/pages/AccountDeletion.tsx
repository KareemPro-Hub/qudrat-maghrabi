export default function AccountDeletion() {
  const subject = encodeURIComponent('طلب حذف حساب قدرات المغربي')
  const body = encodeURIComponent(
    'مرحبًا، أطلب حذف حسابي وجميع البيانات المرتبطة به من تطبيق ومنصة قدرات المغربي.\n\nالبريد المسجل في الحساب: ',
  )

  return (
    <div className="qm-home qm-info">
      <section className="qm-info-hero">
        <div className="qm-info-orb qm-info-orb-one" />
        <div className="qm-info-orb qm-info-orb-two" />
        <span className="qm-info-kicker">بياناتك تحت سيطرتك</span>
        <h1>حذف حساب قدرات المغربي</h1>
        <p className="qm-info-updated">طلب واضح وآمن لحذف الحساب والبيانات</p>
      </section>

      <div className="qm-info-body">
        <div className="qm-info-card">
          <h2><span className="qm-info-num">١</span>الحذف من داخل التطبيق</h2>
          <p>
            افتح تطبيق قدرات المغربي، ثم انتقل إلى «حسابي» ← «حذف الحساب نهائيًا».
            بعد إعادة التحقق من كلمة المرور يمكنك تأكيد حذف الحساب مباشرة.
          </p>
        </div>

        <div className="qm-info-card">
          <h2><span className="qm-info-num">٢</span>طلب الحذف عبر الويب</h2>
          <p>
            إذا تعذّر عليك الدخول إلى التطبيق، أرسل الطلب من البريد المسجل في الحساب
            إلى فريق الدعم، واكتب البريد المستخدم في حساب قدرات المغربي.
          </p>
          <p style={{ marginTop: '18px' }}>
            <a
              className="btn-primary"
              href={`mailto:Qudrat.Maghrabi.Pro@gmail.com?subject=${subject}&body=${body}`}
            >
              إرسال طلب حذف الحساب
            </a>
          </p>
        </div>

        <div className="qm-info-card">
          <h2><span className="qm-info-num">٣</span>ما الذي يتم حذفه؟</h2>
          <p>
            يُحذف حساب تسجيل الدخول والملف الشخصي والاشتراكات وتقدم الدروس ونتائج
            الاختبارات والإشعارات وروابط ولي الأمر المرتبطة بالحساب. قد نحتفظ فقط
            بالسجلات التي يلزم الاحتفاظ بها نظاميًا لأغراض مالية أو أمنية مشروعة،
            وفق سياسة الخصوصية.
          </p>
        </div>

        <div className="qm-info-card">
          <h2><span className="qm-info-num">٤</span>مدة معالجة طلب الويب</h2>
          <p>
            نراجع الطلب ونتحقق من ملكية الحساب، ثم نكمل الحذف خلال مدة لا تتجاوز
            7 أيام عمل. الحذف المباشر من داخل التطبيق يتم فور نجاح التحقق.
          </p>
        </div>
      </div>
    </div>
  )
}
