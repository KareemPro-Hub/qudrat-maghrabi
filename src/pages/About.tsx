const stats = [
  { num: '+١٢٠٠', label: 'طالب مسجّل' },
  { num: '٤.٩', label: 'تقييم المنصة' },
  { num: '+٤٠', label: 'درس متاح' },
]

const reasons = [
  'شرح مبسّط يناسب جميع المستويات',
  'أساليب حل سريعة واختصارات ذكية',
  'اختبارات على نمط الاختبار الحقيقي',
  'متابعة فردية وتتبع تقدم الطالب',
  'وصول مدى الحياة للمحتوى',
  'دعم مستمر من فريق المنصة',
]

export default function About() {
  return (
    <div className="qm-home qm-info">
      <section className="qm-info-hero">
        <div className="qm-info-orb qm-info-orb-one" />
        <div className="qm-info-orb qm-info-orb-two" />
        <span className="qm-info-kicker">تعرف علينا</span>
        <h1>من نحن</h1>
        <p>منصة قدرات المغربي — رحلتنا ورسالتنا</p>
      </section>

      <div className="qm-info-body">
        <div className="qm-info-card">
          <h2><span className="qm-info-num">١</span>عن المنصة</h2>
          <p>
            منصة قدرات المغربي هي منصة تعليمية إلكترونية متخصصة في تأهيل طلاب المرحلة الثانوية في المملكة العربية السعودية لاجتياز اختبار القدرات العامة (الكمي) بأعلى الدرجات. تأسست المنصة على يد المعلم المغربي، المتخصص في تدريس القدرات الكمي لسنوات طويلة، بهدف توفير تجربة تعليمية احترافية وميسّرة لكل طالب.
          </p>
        </div>

        <div className="qm-info-card">
          <h2><span className="qm-info-num">٢</span>رسالتنا</h2>
          <p>
            نؤمن بأن كل طالب قادر على التميز إذا وجد الأسلوب الصحيح والشرح المبسّط. رسالتنا هي تقديم محتوى تعليمي عالي الجودة يجمع بين الشرح المعمّق والحلول السريعة والاختصارات الذكية، مع متابعة فردية لضمان تقدم كل طالب.
          </p>
        </div>

        <div className="qm-info-stats">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="qm-info-stat-num">{s.num}</div>
              <div className="qm-info-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="qm-info-card">
          <h2><span className="qm-info-num">٣</span>لماذا قدرات المغربي ؟</h2>
          <ul className="qm-info-check-list">
            {reasons.map((item, i) => (
              <li key={i}><span>✓</span><span>{item}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
