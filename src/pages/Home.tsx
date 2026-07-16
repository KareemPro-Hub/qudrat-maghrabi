import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const trustStats = [
  { icon: 'student', value: '2,000+', label: 'طالب مسجّل' },
  { icon: '▶', value: '200+', label: 'درس مرئي' },
  { icon: 'target', value: '98%', label: 'هدفنا لدرجتك' },
  { icon: 'question', value: '10,000+', label: 'بنك أسئلة تجميعات' },
]

const programs = [
  { icon: 'foundation', title: 'تأسيس الكمي', desc: 'ابدأ من الصفر وثبّت أساسياتك.' },
  { icon: 'quiz', title: 'حل اختبار بعد كل درس', desc: 'طبّق مباشرة وتأكد من فهمك.' },
  { icon: 'archive', title: 'حلول تجميعات السنوات السابقة', desc: 'حلول مشروحة لأشهر التجميعات.', featured: true },
  { icon: 'group', title: 'جروب تفاعلي للدعم والمساعدة', desc: 'متابعة مستمرة وإجابة على استفساراتك.' },
]

const valuePoints = [
  { title: 'تأسيس وتجميع متدرج', desc: 'من الصفر حتى إتقان أصعب الأسئلة.', path: 'M4 19h4v-4h4v-4h4V7h4M15 4h5v5' },
  { title: 'شرح احترافي بجودة عالية', desc: 'دروس واضحة ومركزة بدون تطويل.', path: 'rect' },
  { title: 'اختبارات تحاكي الواقع', desc: 'تدريب فعلي يجهزك ليوم الاختبار.', path: 'exam' },
  { title: 'متابعة دقيقة لتقدمك', desc: 'اعرف مستواك ودرجاتك أولًا بأول.', path: 'M4 19V5M4 19h16M7 15l4-4 3 2 5-7' },
  { title: 'مجتمع تفاعلي معك', desc: 'دعم مستمر وإجابة عن استفساراتك.', path: 'community' },
  { title: 'تطبيق للجوال والآيباد', desc: 'تعلّم في أي وقت ومن أي مكان.', path: 'device' },
]

const plans = [
  {
    key: 'basic', number: '01', kicker: 'بداية ثابتة', name: 'الأساسية', price: '99',
    features: ['دروس التأسيس', 'اختبارات قصيرة', 'تقارير الأداء'],
    cta: 'اختر الباقة', extra: 'qm-basic',
    icon: <><path d="M6 4.5h11a2 2 0 0 1 2 2V20H7a3 3 0 0 1-3-3V6.5a2 2 0 0 1 2-2Z" /><path d="M7 4.5V20M9.5 9H16M9.5 12H15" /></>,
  },
  {
    key: 'hot', number: '02', kicker: 'رحلة متكاملة', name: 'الشاملة', price: '199',
    features: ['جميع الدروس', 'محاكاة غير محدودة', 'خطة ذكية مخصصة'],
    cta: 'ابدأ الآن', extra: 'qm-hot', popular: true,
    icon: <><circle cx="12" cy="12" r="8" /><path d="m14.8 9.2-1.6 4-4 1.6 1.6-4 4-1.6Z" /></>,
  },
  {
    key: 'pro', number: '03', kicker: 'أقصى استفادة', name: 'الاحترافية', price: '299',
    features: ['كل مزايا الشاملة', 'جلسات مراجعة', 'دعم مباشر'],
    cta: 'اختر الباقة', extra: 'qm-pro',
    icon: <><path d="m5 8 3.5 3L12 5l3.5 6L19 8l-1.5 10h-11L5 8Z" /><path d="M7 18h10" /></>,
  },
]

const testimonials = [
  { kind: 'voice', warm: false, quote: 'شرح بسيط ومباشر، ارتفعت درجتي من 72 إلى 91 خلال شهرين.', name: 'سارة', city: 'الرياض', time: '0:42' },
  { kind: 'whatsapp', quote: 'أكثر شيء أفادني تحليل الأخطاء بعد كل محاكاة.', name: 'عبدالرحمن', city: 'جدة',
    chat: ['تحليل الأخطاء فرق معي جدًا 👌', 'وكل محاكاة نتيجتي تتحسن !'] },
  { kind: 'voice', warm: true, quote: 'الخطة اليومية جعلت المذاكرة أخف ونتيجتي أفضل بكثير.', name: 'نورة', city: 'الدمام', time: '0:36' },
]

const faqs = [
  { q: 'هل يناسبني الكورس إذا كان مستواي مبتدئًا ؟', a: 'نعم، يبدأ مسار التأسيس من المفاهيم الأساسية ثم ينتقل تدريجيًا للتطبيق.' },
  { q: 'هل الاختبارات مشابهة لاختبار القدرات ؟', a: 'النموذج البصري يحاكي زمن الاختبار ونمط الأسئلة لأغراض العرض.' },
  { q: 'كم مدة الاشتراك ؟', a: 'تختلف المدة حسب الباقة المختارة ويمكنك رؤية التفاصيل ضمن الأسعار.' },
]

function TrustIcon({ type }: { type: string }) {
  if (type === 'student') return <span className="qm-trust-icon-img qm-mask-icon" style={{ WebkitMaskImage: "url(/home/nav-icons/book-open-reader.png)", maskImage: "url(/home/nav-icons/book-open-reader.png)" }} />
  if (type === 'target') return <span className="qm-trust-icon-img qm-mask-icon" style={{ WebkitMaskImage: "url(/home/nav-icons/bullseye-arrow.png)", maskImage: "url(/home/nav-icons/bullseye-arrow.png)" }} />
  if (type === 'question') return <span className="qm-trust-icon-img qm-mask-icon" style={{ WebkitMaskImage: "url(/home/nav-icons/message-question.png)", maskImage: "url(/home/nav-icons/message-question.png)" }} />
  if (type === '▶') return <span className="qm-trust-icon-img qm-mask-icon" style={{ WebkitMaskImage: "url(/home/nav-icons/screen-play.png)", maskImage: "url(/home/nav-icons/screen-play.png)" }} />
  return <>{type}</>
}

function ProgramIcon({ type }: { type: string }) {
  if (type === 'foundation') return <span className="qm-program-icon-img qm-mask-icon qm-program-icon-foundation" style={{ WebkitMaskImage: "url(/home/nav-icons/dictionary-open.png)", maskImage: "url(/home/nav-icons/dictionary-open.png)" }} />
  if (type === 'quiz') return <span className="qm-program-icon-img qm-mask-icon qm-program-icon-quiz" style={{ WebkitMaskImage: "url(/home/nav-icons/quiz-alt.png)", maskImage: "url(/home/nav-icons/quiz-alt.png)" }} />
  if (type === 'archive') return <span className="qm-program-icon-img qm-mask-icon" style={{ WebkitMaskImage: "url(/home/nav-icons/ballot.png)", maskImage: "url(/home/nav-icons/ballot.png)" }} />
  if (type === 'group') return <span className="qm-program-icon-img qm-mask-icon qm-program-icon-group" style={{ WebkitMaskImage: "url(/home/nav-icons/users-alt.png)", maskImage: "url(/home/nav-icons/users-alt.png)" }} />
  return null
}

function ValueIcon({ path }: { path: string }) {
  if (path === 'rect') return <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3V9Z" /></svg>
  if (path === 'exam') return <svg viewBox="0 0 24 24"><path d="M8 4h8M9 3v3h6V3M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" /><path d="m8 12 2 2 5-5M8 17h7" /></svg>
  if (path === 'community') return <svg viewBox="0 0 24 24"><path d="M8.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path d="M3 19c.4-3.2 2.2-5 5.5-5s5.1 1.8 5.5 5M14 14c3.8-.5 6 1.2 6.5 4" /></svg>
  if (path === 'device') return <svg viewBox="0 0 24 24"><rect x="3" y="5" width="12" height="15" rx="2" /><rect x="16" y="8" width="5" height="10" rx="1.5" /><path d="M8 17h2M18 15.5h1" /></svg>
  return <svg viewBox="0 0 24 24"><path d={path} /></svg>
}

export default function Home() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
    return () => clearTimeout(timer)
  }, [location.hash])

  return (
    <div className="qm-home">
      {/* ===== Hero ===== */}
      <section className="qm-hero">
        <nav className="qm-nav qm-wrap">
          <Link className="qm-brand qm-brand-full" to="/">
            <img src="/home/brand/logo.png" alt="قدرات المغربي" />
          </Link>
          <div className="qm-nav-links">
            <Link to="/"><span className="qm-nav-icon" aria-hidden="true"><img src="/home/nav-icons/home.png" alt="" /></span>الرئيسية</Link>
            <a href="#qm-courses"><span className="qm-nav-icon" aria-hidden="true"><img src="/home/nav-icons/online-course.png" alt="" /></span>الكورسات</a>
            <a href="#qm-prices"><span className="qm-nav-icon" aria-hidden="true"><img src="/home/nav-icons/tags.png" alt="" /></span>الأسعار</a>
            <a href="#qm-reviews"><span className="qm-nav-icon" aria-hidden="true"><img src="/home/nav-icons/thumbs-up-trust-v2.png" alt="" /></span>آراء الطلاب</a>
            <Link to="/contact"><span className="qm-nav-icon" aria-hidden="true"><img src="/home/nav-icons/headset.png" alt="" /></span>تواصل معنا</Link>
          </div>
          <Link className="qm-nav-cta" to="/register">ابدأ الآن</Link>
        </nav>

        <div className="qm-hero-grid qm-wrap">
          <div className="qm-hero-copy">
            <h1 className="qm-hero-title">
              <span className="qm-hero-title-row"><span>اكسر</span><span>خوفك</span></span>
              <span className="qm-hero-title-row">
                <span>وتفوّق</span>
                <span className="qm-hero-title-accent"><span>بجدارة</span><span className="qm-hero-rocket" aria-hidden="true">🚀</span></span>
              </span>
            </h1>
            <p className="qm-hero-lead">
              <span>انضم لدفعة </span><strong>التميز</strong><span> واكتشف أسرار وتكنيكات </span><strong>«المغربي»</strong>
              <span> التي حوّلت أعقد مسائل الرياضيات إلى </span><strong>خطوات سهلة ومضمونة لفوق الـ 95 بالكمي !</strong>
            </p>
            <div className="qm-hero-actions">
              <a className="qm-primary" href="#qm-courses">استكشف الكورسات</a>
              <button className="qm-watch" type="button"><i>▶</i> شاهد الفيديو</button>
            </div>
          </div>
          <div className="qm-hero-art">
            <div className="qm-arch">
              <img src="/home/hero-student.png" alt="طالب سعودي يحمل آيفون يعرض شعار المنصة وبطاقة معادلة" />
            </div>
          </div>
        </div>

        <div className="qm-trust qm-wrap">
          {trustStats.map((s) => (
            <article key={s.label}>
              <i><TrustIcon type={s.icon} /></i>
              <div><strong>{s.value}</strong><span>{s.label}</span></div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== Programs ===== */}
      <section id="qm-courses" className="qm-wrap qm-section">
        <div className="qm-program-heading"><div><h2>ماذا سنتعلم في هذا الكورس ؟</h2></div></div>
        <div className="qm-program-rail">
          {programs.map((p) => (
            <article key={p.title} className={p.featured ? 'qm-featured' : ''}>
              <span><ProgramIcon type={p.icon} /></span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
              {p.featured && <a href="#qm-prices">اعرف المزيد ←</a>}
            </article>
          ))}
        </div>
      </section>

      {/* ===== Value ===== */}
      <section className="qm-value qm-wrap qm-section">
        <div className="qm-value-heading">
          <div>
            <h2>لماذا <span className="qm-heading-accent">قدرات المغربي</span> ؟</h2>
            <p>كل ما تحتاجه في مكان واحد للوصول لأعلى الدرجات</p>
          </div>
        </div>
        <div className="qm-value-photo-frame">
          <img src="/home/student-woman-math.jpeg" alt="طالبة سعودية تراجع مسائل الرياضيات استعدادًا لاختبار القدرات" loading="lazy" />
        </div>
        <div className="qm-value-copy">
          <div className="qm-value-grid">
            {valuePoints.map((v) => (
              <article key={v.title}>
                <span><ValueIcon path={v.path} /></span>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="qm-prices" className="qm-pricing qm-section">
        <span className="qm-pricing-glow qm-pricing-glow-one" aria-hidden="true" />
        <span className="qm-pricing-glow qm-pricing-glow-two" aria-hidden="true" />
        <div className="qm-wrap">
          <header className="qm-pricing-heading">
            <span className="qm-pricing-heading-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m12 3 2.1 4.9L19 10l-4.9 2.1L12 17l-2.1-4.9L5 10l4.9-2.1L12 3Z" /><path d="m19 16 .8 1.8 1.7.7-1.7.8L19 21l-.8-1.7-1.7-.8 1.7-.7L19 16Z" /></svg>
            </span>
            <div><h2>اختر أفضل باقة مناسبة لك</h2><p className="qm-section-sub">خطط مرنة تناسب هدفك وموعد اختبارك</p></div>
          </header>

          <div className="qm-price-grid">
            {plans.map((plan) => (
              <article key={plan.key} className={`qm-price-card ${plan.extra}${plan.popular ? ' qm-hot' : ''}`}>
                <span className="qm-plan-aura" aria-hidden="true" />
                {plan.popular && (
                  <span className="qm-popular">
                    <svg viewBox="0 0 24 24"><path d="m12 3 2.5 5.3L20 9l-4 4 .9 5.7-4.9-2.6-4.9 2.6L8 13 4 9l5.5-.7L12 3Z" /></svg>
                    الأكثر اختيارًا
                  </span>
                )}
                <header className="qm-plan-head">
                  <span className="qm-plan-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{plan.icon}</svg></span>
                  <span className="qm-plan-number">{plan.number}</span>
                  <div><small>{plan.kicker}</small><h3>{plan.name}</h3></div>
                </header>
                <div className="qm-price-lockup"><strong>{plan.price}</strong><span>ر.س<small>للباقة</small></span></div>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}><svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7" /></svg><span>{f}</span></li>
                  ))}
                </ul>
                <Link to="/register">{plan.cta} <svg viewBox="0 0 24 24"><path d="M19 12H5m5-5-5 5 5 5" /></svg></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Reviews ===== */}
      <section id="qm-reviews" className="qm-reviews qm-wrap qm-section">
        <h2>قصص تفوقهم بدأت هنا</h2>
        <p className="qm-reviews-lead">تجارب حقيقية من طلاب صنعوا فرقًا في مستواهم ودرجاتهم.</p>
        <div className="qm-review-row">
          {testimonials.map((t) => (
            <article key={t.name} className="qm-testimonial-card">
              {t.kind === 'voice' ? (
                <div className={`qm-testimonial-media qm-voice-record${t.warm ? ' qm-warm' : ''}`}>
                  <div className="qm-media-label">
                    <svg viewBox="0 0 24 24"><path d="M20 11.5a8 8 0 1 1-3-6.2L20 4l-1.3 3A8 8 0 0 1 20 11.5Z" /><path d="M8.5 8.2c.5 3 2.3 4.8 5.3 5.3l1-1.6-2.2-1-1 1c-1.1-.5-2-1.4-2.5-2.5l1-1-1-2.2-1.6 1Z" /></svg>
                    <span>تسجيل واتساب</span>
                  </div>
                  <button className="qm-voice-play" aria-label={`تشغيل تسجيل ${t.name}`} type="button">
                    <svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z" /></svg>
                  </button>
                  <div className="qm-voice-wave" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <i key={i} />)}</div>
                  <time>{t.time}</time>
                </div>
              ) : (
                <div className="qm-testimonial-media qm-whatsapp-shot">
                  <div className="qm-chat-top"><span className="qm-chat-avatar">ع</span><i /><b>محادثة واتساب</b></div>
                  <div className="qm-chat-bubbles">{t.chat!.map((c) => <span key={c}>{c}</span>)}</div>
                </div>
              )}
              <blockquote>“{t.quote}”</blockquote>
              <footer>
                <span className="qm-student-avatar">{t.name.charAt(0)}</span>
                <div><b>{t.name}</b><small>{t.city}</small></div>
                <span className="qm-verified">✓ تجربة موثّقة</span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="qm-faq qm-wrap qm-section">
        <h2>الأسئلة الشائعة</h2>
        {faqs.map((f, i) => (
          <details key={f.q} open={i === 0}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  )
}
