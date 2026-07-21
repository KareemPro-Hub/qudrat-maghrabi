import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CurrencySymbol from '../components/CurrencySymbol'

const trustStats = [
  { icon: 'student', target: 2000, suffix: '+', label: 'طالب مسجّل' },
  { icon: '▶', target: 200, suffix: '+', label: 'درس مرئي' },
  { icon: 'target', target: 98, suffix: '%', label: 'هدفنا لدرجتك' },
  { icon: 'question', target: 10000, suffix: '+', label: 'بنك أسئلة تجميعات' },
]

const programs = [
  { icon: 'foundation', title: 'تأسيس الكمي', desc: 'ابدأ من الصفر وثبّت أساسياتك.' },
  { icon: 'quiz', title: 'حل اختبار بعد كل درس', desc: 'طبّق مباشرة وتأكد من فهمك.' },
  { icon: 'archive', title: 'حلول تجميعات السنوات السابقة', desc: 'حلول مشروحة لأشهر التجميعات.', featured: true },
  { icon: 'group', title: 'جروب تفاعلي للدعم والمساعدة', desc: 'متابعة مستمرة وإجابة على استفساراتك.' },
]

const valuePoints = [
  { title: 'شرح احترافي بجودة عالية', desc: 'دروس واضحة ومركزة بدون تطويل.', path: 'rect' },
  { title: 'بث مباشر أسبوعي مع الطلاب', desc: 'لتحقيق أقصى استفادة من المنصة.', path: 'exam' },
  { title: 'متابعة دقيقة لتقدمك', desc: 'اعرف مستواك ودرجاتك أولًا بأول.', path: 'growth' },
  { title: 'تطبيق للجوال والآيباد', desc: 'تعلّم في أي وقت ومن أي مكان.', path: 'device' },
]

const plans = [
  {
    key: 'basic', kicker: 'لمدة شهر واحد', name: 'الأساسية', price: '49',
    features: [
      { text: 'تأسيس قوي يبدأ بك من الصفر', ok: true },
      { text: 'فيديوهات احترافية بجودة عالية', ok: true },
      { text: 'اختبار تطبيقي بعد كل درس', ok: true },
      { text: 'تحليل إجاباتك بالذكاء الاصطناعي', ok: false },
      { text: 'تقارير تكشف مستواك بدقة', ok: false },
    ],
    cta: 'ابدأ الآن', extra: '',
  },
  {
    key: 'hot', kicker: 'لمدة 3 أشهر', name: 'المميزة', price: '99',
    features: [
      { text: 'جميع مزايا الباقة الأساسية', ok: true },
      { text: 'أحدث بنوك أسئلة المحوسب', ok: true },
      { text: 'محاكاة مكثفة بلا حدود', ok: true },
      { text: 'حلول التجميعات بأسرع الاستراتيجيات', ok: true },
      { text: 'خطة ذكية تناسب نقاط ضعفك', ok: false },
    ],
    cta: 'ابدأ الآن', extra: ' qm-hot',
  },
  {
    key: 'pro', kicker: 'لمدة 6 أشهر', name: 'الاحترافية', price: '179',
    features: [
      { text: 'جميع مزايا الباقة المميزة', ok: true },
      { text: 'بث مباشر أسبوعي مع الطلاب', ok: true },
      { text: 'قروب تفاعلي للدعم المستمر', ok: true },
      { text: 'جلسات مراجعة مركزة ومباشرة', ok: true },
      { text: 'تحليل شامل وخطة تفوق شخصية', ok: true },
    ],
    cta: 'ابدأ الآن', extra: ' qm-pro',
  },
]

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="qm-wa-icon">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
  </svg>
)

type Testimonial = {
  kind: 'voice' | 'whatsapp'
  name: string
  warm?: boolean
  quote?: string
  city?: string
  time?: string
  audio?: string
  image?: string
  chat?: string[]
}

const testimonials: Testimonial[] = [
  { kind: 'voice', warm: false, name: 'عبد الله', audio: '/reviews/review-abdullah.mp3', time: '0:37' },
  { kind: 'whatsapp', name: 'نواف', image: '/reviews/chat-nawaf.webp' },
  { kind: 'voice', warm: true, name: 'فيصل', audio: '/reviews/review-faisal.mp3', time: '0:17' },
  { kind: 'whatsapp', name: 'خالد', image: '/reviews/chat-khalid.webp' },
  { kind: 'voice', warm: false, name: 'ريم', audio: '/reviews/review-reem.mp3', time: '0:17' },
  { kind: 'voice', warm: true, name: 'فهد', audio: '/reviews/review-fahd.mp3', time: '0:21' },
]

// شريط الإحصائيات — كاونتر تصاعدي عند الظهور + دخول متدرج
function TrustBar() {
  const barRef = useRef<HTMLDivElement | null>(null)
  const [started, setStarted] = useState(false)
  const [counts, setCounts] = useState<number[]>(trustStats.map(() => 0))

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const duration = 1800
    const startTime = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      setCounts(trustStats.map((s) => Math.round(s.target * eased)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started])

  return (
    <div className={`qm-trust qm-wrap${started ? ' qm-trust-in' : ''}`} ref={barRef}>
      {trustStats.map((s, i) => (
        <article key={s.label} style={{ transitionDelay: `${i * 0.12}s` }}>
          <i><TrustIcon type={s.icon} /></i>
          <div>
            <strong>{counts[i].toLocaleString('en-US')}{s.suffix}</strong>
            <span>{s.label}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function VoiceMedia({ t }: { t: Testimonial }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)

  const fmt = (s: number) => {
    if (!isFinite(s) || s <= 0) return t.time ?? '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) a.play()
    else a.pause()
  }

  return (
    <div className={`qm-testimonial-media qm-voice-record${t.warm ? ' qm-warm' : ''}${t.audio ? ' qm-voice-real' : ''}${playing ? ' qm-playing' : ''}`}>
      <div className="qm-media-label">
        <WhatsAppIcon />
        <span>تسجيل واتساب</span>
      </div>
      {t.audio && (
        <audio
          ref={audioRef}
          src={t.audio}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setElapsed(0) }}
          onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      )}
      <button className="qm-voice-play" aria-label={playing ? `إيقاف تسجيل ${t.name}` : `تشغيل تسجيل ${t.name}`} type="button" onClick={toggle}>
        {playing
          ? <svg viewBox="0 0 24 24"><path d="M8 6h3v12H8V6Zm5 0h3v12h-3V6Z" /></svg>
          : <svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z" /></svg>}
      </button>
      <div className="qm-voice-wave" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <i key={i} />)}</div>
      <time>{playing || elapsed > 0 ? fmt(elapsed) : fmt(duration)}</time>
    </div>
  )
}

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
  if (path === 'rect') return <i className="qm-icon-play" />
  if (path === 'exam') return <i className="qm-icon-live" />
  if (path === 'community') return <svg viewBox="0 0 24 24"><path d="M8.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path d="M3 19c.4-3.2 2.2-5 5.5-5s5.1 1.8 5.5 5M14 14c3.8-.5 6 1.2 6.5 4" /></svg>
  if (path === 'device') return <i className="qm-icon-device" />
  if (path === 'growth') return <i className="qm-icon-growth" />
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
            <Link to="/courses"><span className="qm-nav-icon" aria-hidden="true"><img src="/home/nav-icons/online-course.png" alt="" /></span>الكورسات</Link>
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
              <img src="/home/hero-student.webp" alt="طالب سعودي يحمل آيفون يعرض شعار المنصة وبطاقة معادلة" />
            </div>
          </div>
        </div>

        <TrustBar />
      </section>

      {/* ===== Programs ===== */}
      <section id="qm-courses" className="qm-wrap qm-section">
        <div className="qm-program-heading"><div><h2>كل ما تحتاجه لتحسم الدرجة 🎯</h2></div></div>
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
        <div className="qm-value-photo-frame">
          <img src="/home/student-woman-math.jpeg" alt="طالبة سعودية تراجع مسائل الرياضيات استعدادًا لاختبار القدرات" loading="lazy" />
        </div>
        <div className="qm-value-copy">
          <div className="qm-value-heading">
            <div>
              <h2>لماذا <span className="qm-heading-accent">قدرات المغربي</span> ؟</h2>
              <p>كل ما تحتاجه في مكان واحد للوصول لأعلى الدرجات</p>
            </div>
          </div>
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
              <svg viewBox="0 0 24 24"><path d="M12 3.5 20 8l-8 4.5L4 8l8-4.5Z" /><path d="m4 12 8 4.5L20 12" /><path d="m4 16 8 4.5L20 16" /></svg>
            </span>
            <div><h2>اختر <span className="qm-pricing-accent">أفضل باقة</span> مناسبة لك</h2><p className="qm-section-sub">خطط مرنة تناسب هدفك وموعد اختبارك</p></div>
          </header>

          <div className="qm-price-grid">
            {plans.map((plan) => (
              <article key={plan.key} className={`qm-price-card${plan.extra}`}>
                <header className="qm-price-cap">
                  <h3>{plan.name}</h3>
                  <small className="qm-price-duration">{plan.kicker}</small>
                  <div className="qm-price-lockup"><strong>{plan.price}</strong><span><CurrencySymbol currency="EGP" className="qm-price-sar" /></span></div>
                </header>
                <div className="qm-price-pocket">
                  <ul>
                    {plan.features.map((f) => (
                      <li key={f.text} className={f.ok ? undefined : 'qm-unavailable'}>
                        {f.ok
                          ? <svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7" /></svg>
                          : <svg viewBox="0 0 24 24"><path d="m8 8 8 8M16 8l-8 8" /></svg>}
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">{plan.cta} <svg viewBox="0 0 24 24"><path d="M19 12H5m5-5-5 5 5 5" /></svg></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Reviews ===== */}
      <section id="qm-reviews" className="qm-reviews qm-wrap qm-section">
        <header className="qm-reviews-heading">
          <span className="qm-reviews-heading-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7.5 5.5C5 7 3.8 9.4 3.8 12.4c0 2.6 1.6 4.4 3.7 4.4 1.9 0 3.3-1.4 3.3-3.3 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.7 1.4-3.2 3-4.2L7.5 5.5Zm9.2 0c-2.5 1.5-3.7 3.9-3.7 6.9 0 2.6 1.6 4.4 3.7 4.4 1.9 0 3.3-1.4 3.3-3.3 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.7 1.4-3.2 3-4.2l-2.5-.8Z" /></svg>
          </span>
          <div>
            <h2>قصص <span className="qm-reviews-accent">تفوقهم</span> بدأت هنا</h2>
            <p className="qm-reviews-lead">من خوف الاختبار إلى قصص تستحق الفخر.</p>
          </div>
          <span className="qm-reviews-stars" aria-hidden="true">
            <span className="qm-reviews-stars-row">
              {[0, 1, 2, 3, 4].map((s) => (
                <svg key={s} viewBox="0 0 24 24"><path d="m12 3 2.5 5.3L20 9l-4 4 .9 5.7-4.9-2.6-4.9 2.6L8 13 4 9l5.5-.7L12 3Z" /></svg>
              ))}
            </span>
            <span className="qm-reviews-stars-label">تقييم طلابنا</span>
          </span>
        </header>
        <div className="qm-review-row">
          {testimonials.map((t) => (
            <article key={t.name} className="qm-testimonial-card">
              {t.kind === 'voice' ? (
                <VoiceMedia t={t} />
              ) : (
                <div className="qm-testimonial-media qm-whatsapp-shot">
                  <div className="qm-chat-top"><span className="qm-chat-avatar">{t.name.charAt(0)}</span><i /><b>محادثة واتساب</b></div>
                  {t.image
                    ? <img className="qm-chat-image" src={t.image} alt={`محادثة واتساب من ${t.name}`} loading="lazy" />
                    : <div className="qm-chat-bubbles">{t.chat!.map((c) => <span key={c}>{c}</span>)}</div>}
                </div>
              )}
              {t.quote && <blockquote>“{t.quote}”</blockquote>}
              <footer>
                <span className="qm-student-avatar">{t.name.charAt(0)}</span>
                <div className={t.city ? undefined : 'qm-reviewer-big'}><b>{t.name}</b>{t.city && <small>{t.city}</small>}</div>
                <span className="qm-verified">✓ تجربة موثّقة</span>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
