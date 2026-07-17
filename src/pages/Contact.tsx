const contactChannels = [
  { icon: '/contact-icons/email.webp', title: 'البريد الإلكتروني', value: 'Qudrat.Maghrabi.Pro@gmail.com', sub: 'نرد خلال 24 ساعة', href: 'mailto:Qudrat.Maghrabi.Pro@gmail.com' },
  { icon: '/contact-icons/whatsapp.webp', title: 'واتساب', value: '+966 54 806 6321', sub: 'السبت – الخميس، ٩ص – ١٠م', href: 'https://wa.me/966548066321' },
  { icon: '/contact-icons/youtube.webp', title: 'يوتيوب', value: 'قدرات المغربي', sub: 'محتوى مجاني ومتجدد', href: 'https://www.youtube.com/@QudratAlmaghrabi' },
  { icon: '/contact-icons/x.webp', title: 'تويتر / X', value: '@QudratMaghrabi', sub: 'تابعنا للأخبار والتحديثات', href: '' },
]

export default function Contact() {
  return (
    <div className="qm-home qm-info">
      <section className="qm-info-hero">
        <div className="qm-info-orb qm-info-orb-one" />
        <div className="qm-info-orb qm-info-orb-two" />
        <span className="qm-info-kicker">نسعد بتواصلك</span>
        <h1>تواصل معنا</h1>
        <p>نحن هنا للإجابة على جميع استفساراتك</p>
      </section>

      <div className="qm-info-body">
        <div className="qm-info-contact-grid">
          {contactChannels.map((item, i) => {
            const content = (
              <>
                <div className="qm-info-contact-icon"><img src={item.icon} alt="" loading="lazy" /></div>
                <h3>{item.title}</h3>
                <p className="qm-info-contact-value" dir="ltr">{item.value}</p>
                <p className="qm-info-contact-sub">{item.sub}</p>
              </>
            )
            return item.href ? (
              <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="qm-info-contact-card">
                {content}
              </a>
            ) : (
              <div key={i} className="qm-info-contact-card">
                {content}
              </div>
            )
          })}
        </div>

        <div className="qm-info-card">
          <h2><span className="qm-info-num">⏱</span>ساعات الدعم</h2>
          <p style={{ marginBottom: 16 }}>فريق الدعم متاح للرد على استفساراتك في الأوقات التالية:</p>
          <div>
            <div className="qm-info-hours-row">
              <span>السبت – الخميس</span>
              <b>٩:٠٠ ص – ١٠:٠٠ م</b>
            </div>
            <div className="qm-info-hours-row">
              <span>الجمعة</span>
              <span className="qm-info-closed">مغلق</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
