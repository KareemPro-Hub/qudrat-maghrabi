import { Link } from 'react-router-dom'
import { Play, Star, BookOpen } from 'lucide-react'
import StatsCounter from '../components/StatsCounter'

const features = [
  {
    icon: '🎯',
    title: 'تأسيس وتجميع متدرج',
    desc: 'شرح شامل لكل أبواب الكمي يبدأ معك من الصفر، ويسير معك خطوة بخطوة حتى تتقن حل أصعب أسئلة الاختبار.',
  },
  {
    icon: '🎬',
    title: 'شرح احترافي بجودة عالية',
    desc: 'محتوى مرئي متميز بجودة عالية يضمن لك رؤية واضحة بدون إطالة أو تشتيت؛ لتوفر وقتك وجهدك.',
  },
  {
    icon: '📊',
    title: 'تابع تطورك أول بأول',
    desc: 'لوحة تحكم ذكية تقيس تقدمك اليومي، وتضمن لك إنهاء المنهج والتجميعات قبل وقت كافٍ من اختبارك.',
  },
  {
    icon: '📝',
    title: 'اختبارات تحاكي الواقع',
    desc: 'تمرّن بأسئلة حقيقية واكسر حاجز الرهبة قبل الاختبار؛ لتعرف نقاط قوتك وتضمن جاهزيتك الكاملة ليوم الاختبار.',
  },
  {
    icon: '💬',
    title: 'مجتمع تفاعلي معك بالرحلة',
    desc: 'لن تدرس بمفردك؛ نحن معك خطوة بخطوة نجيب على أسئلتك، نتابع إنجازك، ونحفزك حتى تصل للدرجة الكاملة.',
  },
  {
    icon: '📱',
    title: 'تطبيق مجاني للجوال والآيباد',
    desc: 'ادرس وتمرّن من أي مكان وفي أي وقت، عبر تطبيق iOS وAndroid',
  },
]

const testimonials = [
  {
    name: 'أحمد الغامدي',
    score: '95',
    text: 'بفضل منصة قدرات المغربي حصلت على 95 في اختبار القدرات. الشرح واضح جداً والاختبارات تساعد كثيراً.',
    city: 'الرياض',
  },
  {
    name: 'سارة العتيبي',
    score: '92',
    text: 'أفضل منصة تعليمية جربتها للقدرات. المنهج منظم وفريق الدعم متجاوب ومحترف.',
    city: 'جدة',
  },
  {
    name: 'محمد القحطاني',
    score: '98',
    text: 'ما توقعت أوصل لـ98 في القدرات الكمي! المنصة غيرت أسلوب مذاكرتي كلياً.',
    city: 'الدمام',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="relative bg-hero-gradient text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full" style={{background: 'radial-gradient(circle, #FF8008, transparent)'}} />
          <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full" style={{background: 'radial-gradient(circle, #8B35C4, transparent)'}} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Text column */}
          <div className="text-center lg:text-right order-2 lg:order-1">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-6 py-2 mb-8 text-sm font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-brand-pink animate-pulse flex-shrink-0" />
              طريقك المختصر لتجاوز عقبة الكمي في المملكة 🇸🇦
            </div>

            {/* Headline */}
            <h1 className="font-extrabold mb-6" style={{fontSize: 'clamp(2.2rem, 6vw, 4.2rem)', lineHeight: '1.4'}}>
              تبي الكامل بالكمي ؟
              <br />
              <span className="gradient-text">ابدأ رحلتك من هنا</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-lg md:text-xl text-gray-200 mb-5 font-bold tracking-wide">
              تأسيس ذكي • تجميعات حديثة • حلول بثوانٍ
            </p>

            {/* Description */}
            <p className="text-base md:text-lg text-gray-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-loose">
              انضم لدفعة <span className="text-white font-black">التميز</span> واكتشف أسرار وتكنيكات "<span className="text-white font-black">المغربي</span>" التي حوّلت أعقد مسائل الرياضيات إلى <span className="text-white font-black">خطوات سهلة ومضمونة لفوق الـ 95 بالكمي !</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link to="/register" className="btn-primary text-lg py-4 px-12 w-full sm:w-auto">
                ابدأ رحلتك الآن — مجانًا
              </Link>
              <Link to="/courses" className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white font-bold py-4 px-10 rounded-2xl transition-all duration-200 border border-white/20 w-full sm:w-auto">
                <Play size={18} fill="white" />
                استعرض الكورسات
              </Link>
            </div>
          </div>

          {/* Image column */}
          <div className="relative flex justify-center items-center order-1 lg:order-2 py-6">

            {/* Glow behind student */}
            <div className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full opacity-40" style={{background: 'radial-gradient(circle, #E91E8C 0%, #8B35C4 45%, transparent 70%)', filter: 'blur(40px)'}} />

            {/* Dashed orbit rings */}
            <svg className="absolute w-[105%] h-[105%] animate-spin-slow pointer-events-none" viewBox="0 0 400 400" style={{animationDuration: '40s'}}>
              <circle cx="200" cy="200" r="190" fill="none" stroke="#FF8008" strokeWidth="1.5" strokeDasharray="6 10" opacity="0.5" />
            </svg>
            <svg className="absolute w-[88%] h-[88%] pointer-events-none" viewBox="0 0 400 400" style={{animation: 'spin 30s linear infinite reverse'}}>
              <circle cx="200" cy="200" r="190" fill="none" stroke="#E91E8C" strokeWidth="1.5" strokeDasharray="2 8" opacity="0.5" />
            </svg>

            {/* Floating badges */}
            <div className="absolute top-2 left-0 md:left-4 bg-white text-brand-navy font-black text-sm md:text-base px-4 py-2 rounded-2xl shadow-brand-lg flex items-center gap-2 z-20 animate-float">
              <span className="text-xl">🎯</span> فوق الـ 95٪
            </div>
            <div className="absolute bottom-8 right-0 md:right-2 bg-white text-brand-navy font-black text-sm md:text-base px-4 py-2 rounded-2xl shadow-brand-lg flex items-center gap-2 z-20 animate-float" style={{animationDelay: '1.2s'}}>
              <span className="text-xl">📈</span> +5000 طالب
            </div>

            {/* Student image */}
            <img
              src="/hero-student.png"
              alt="طالب يدرس في منصة قدرات المغربي"
              className="relative z-10 w-64 sm:w-80 md:w-[26rem] h-auto object-contain"
              style={{filter: 'drop-shadow(0 25px 35px rgba(0,0,0,0.45))'}}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsCounter />

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="section-title">لماذا قدرات المغربي ؟</h2>
          <p className="section-subtitle">كل ما تحتاجه في مكان واحد للوصول لأعلى الدرجات</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card group">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-black text-brand-navy mb-2 group-hover:gradient-text transition-all">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 mb-20">
        <div className="gradient-bg rounded-3xl p-10 md:p-14 text-white text-center shadow-brand-lg">
          <h2 className="text-3xl md:text-4xl font-black mb-4">جاهز تبدأ رحلتك للتفوق؟</h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            انضم لأكثر من ٥٠٠٠ طالب حققوا درجاتهم المستهدفة مع منصة قدرات المغربي
          </p>
          <Link to="/register" className="inline-block bg-white text-brand-purple font-black py-4 px-10 rounded-2xl hover:bg-gray-100 transition-all duration-200 shadow-lg text-lg" style={{color: '#8B35C4'}}>
            سجّل الآن مجانًا ←
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-title">قالوا عنّا</h2>
            <p className="section-subtitle">آراء طلابنا الذين حققوا نتائج مميزة</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="card">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#E91E8C" color="#E91E8C" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-brand-navy">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.city}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black gradient-text">{t.score}</div>
                    <div className="text-xs text-gray-400">درجته</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
