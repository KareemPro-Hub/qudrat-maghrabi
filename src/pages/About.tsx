export default function About() {
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4">

        <div className="text-center mb-14">
          <h1 className="text-4xl font-black text-brand-navy mb-4">من نحن</h1>
          <p className="text-gray-500 text-lg">منصة قدرات المغربي — رحلتنا ورسالتنا</p>
        </div>

        <div className="card mb-8">
          <h2 className="text-2xl font-black text-brand-navy mb-4">عن المنصة</h2>
          <p className="text-gray-600 leading-loose text-lg">
            منصة قدرات المغربي هي منصة تعليمية إلكترونية متخصصة في تأهيل طلاب المرحلة الثانوية في المملكة العربية السعودية لاجتياز اختبار القدرات العامة (الكمي) بأعلى الدرجات. تأسست المنصة على يد المعلم المغربي، المتخصص في تدريس القدرات الكمي لسنوات طويلة، بهدف توفير تجربة تعليمية احترافية وميسّرة لكل طالب.
          </p>
        </div>

        <div className="card mb-8">
          <h2 className="text-2xl font-black text-brand-navy mb-4">رسالتنا</h2>
          <p className="text-gray-600 leading-loose text-lg">
            نؤمن بأن كل طالب قادر على التميز إذا وجد الأسلوب الصحيح والشرح المبسّط. رسالتنا هي تقديم محتوى تعليمي عالي الجودة يجمع بين الشرح المعمّق والحلول السريعة والاختصارات الذكية، مع متابعة فردية لضمان تقدم كل طالب.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { num: '+١٢٠٠', label: 'طالب مسجّل' },
            { num: '٤.٩', label: 'تقييم المنصة' },
            { num: '+٤٠', label: 'درس متاح' },
          ].map((s, i) => (
            <div key={i} className="card text-center">
              <div className="text-4xl font-black gradient-text mb-2">{s.num}</div>
              <div className="text-gray-500 font-bold">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-2xl font-black text-brand-navy mb-4">لماذا قدرات المغربي ؟</h2>
          <ul className="space-y-3 text-gray-600 text-lg">
            {[
              'شرح مبسّط يناسب جميع المستويات',
              'أساليب حل سريعة واختصارات ذكية',
              'اختبارات على نمط الاختبار الحقيقي',
              'متابعة فردية وتتبع تقدم الطالب',
              'وصول مدى الحياة للمحتوى',
              'دعم مستمر من فريق المنصة',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-brand-pink text-xl">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
