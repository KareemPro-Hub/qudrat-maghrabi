const contactChannels = [
  { icon: '📧', title: 'البريد الإلكتروني', value: 'Qudrat.Maghrabi.Pro@gmail.com', sub: 'نرد خلال 24 ساعة', href: 'mailto:Qudrat.Maghrabi.Pro@gmail.com' },
  { icon: '💬', title: 'واتساب', value: '+966 54 806 6321', sub: 'السبت – الخميس، ٩ص – ١٠م', href: 'https://wa.me/966548066321' },
  { icon: '📺', title: 'يوتيوب', value: 'قدرات المغربي', sub: 'محتوى مجاني ومتجدد', href: 'https://www.youtube.com/@QudratAlmaghrabi' },
  { icon: '🐦', title: 'تويتر / X', value: '@QudratMaghrabi', sub: 'تابعنا للأخبار والتحديثات', href: '' },
]

export default function Contact() {
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4">

        <div className="text-center mb-14">
          <h1 className="text-4xl font-black text-brand-navy mb-4">تواصل معنا</h1>
          <p className="text-gray-500 text-lg">نحن هنا للإجابة على جميع استفساراتك</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {contactChannels.map((item, i) => {
            const content = (
              <>
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-black text-brand-navy text-lg mb-1">{item.title}</h3>
                <p className="text-brand-pink font-bold mb-1">{item.value}</p>
                <p className="text-gray-400 text-sm">{item.sub}</p>
              </>
            )
            return item.href ? (
              <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="card text-center hover:shadow-lg transition-shadow">
                {content}
              </a>
            ) : (
              <div key={i} className="card text-center">
                {content}
              </div>
            )
          })}
        </div>

        <div className="card">
          <h2 className="text-xl font-black text-brand-navy mb-2">ساعات الدعم</h2>
          <p className="text-gray-500 mb-4 text-sm">فريق الدعم متاح للرد على استفساراتك في الأوقات التالية:</p>
          <div className="space-y-2 text-gray-600">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span>السبت – الخميس</span>
              <span className="font-bold">٩:٠٠ ص – ١٠:٠٠ م</span>
            </div>
            <div className="flex justify-between">
              <span>الجمعة</span>
              <span className="font-bold text-gray-400">مغلق</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
