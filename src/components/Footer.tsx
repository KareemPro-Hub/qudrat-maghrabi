import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="qm-site-footer qm-home">
      <div className="qm-footer-orb qm-footer-orb-one" />
      <div className="qm-footer-orb qm-footer-orb-two" />

      <div className="qm-footer-cta qm-wrap">
        <div>
          <span>خطوتك القادمة تبدأ هنا</span>
          <h2>جاهز ترفع درجتك في القدرات؟</h2>
          <p>ابدأ بخطة واضحة وتدريبات ذكية توصلك لهدفك بثقة.</p>
        </div>
        <Link to="/register">ابدأ رحلتك الآن <b>←</b></Link>
      </div>

      <div className="qm-footer-main qm-wrap">
        <div className="qm-footer-brand">
          <Link className="qm-brand" to="/">
            <img src="/home/brand/logo.png" alt="قدرات المغربي" />
          </Link>
          <p>منصة تعليمية متخصصة في إعداد طلاب الثانوية لاختبار القدرات الكمي بأسلوب بسيط وفعّال.</p>
          <div className="qm-social-links">
            <a href="#" aria-label="إكس">𝕏</a>
            <a href="#" aria-label="إنستغرام">◎</a>
            <a href="#" aria-label="يوتيوب">▶</a>
          </div>
        </div>

        <div className="qm-footer-column">
          <h3>المنصة</h3>
          <Link to="/courses">الكورسات</Link>
          <Link to="/about">مميزاتنا</Link>
          <Link to="/#qm-prices">الأسعار</Link>
          <Link to="/#qm-reviews">آراء الطلاب</Link>
        </div>

        <div className="qm-footer-column">
          <h3>الدعم</h3>
          <Link to="/contact">مركز المساعدة</Link>
          <Link to="/contact">تواصل معنا</Link>
          <Link to="/terms">الشروط والأحكام</Link>
          <Link to="/privacy">سياسة الخصوصية</Link>
        </div>

        <div className="qm-footer-news">
          <h3>ابقَ على اطلاع</h3>
          <p>نصائح أسبوعية ونماذج مجانية تساعدك في الاستعداد.</p>
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="البريد الإلكتروني" aria-label="البريد الإلكتروني" />
            <button type="submit" aria-label="اشتراك">←</button>
          </form>
          <small>بالاشتراك أنت توافق على سياسة الخصوصية.</small>
        </div>
      </div>

      <div className="qm-wrap">
        <div className="qm-footer-bottom">
          <p>© {new Date().getFullYear()} قدرات المغربي. جميع الحقوق محفوظة.</p>
          <div><span>صنع للطلاب الطموحين</span><i /><span>المملكة العربية السعودية</span></div>
        </div>
        <div className="qm-footer-credit">
          نُسِجَت ملامح هذا الإبداع البصري والرقمي بروح وإبداع{' '}
          <a href="https://kareempro.com" target="_blank" rel="noopener noreferrer">Kareem Pro</a>
        </div>
      </div>
    </footer>
  )
}
