import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="qm-site-footer qm-home">
      <div className="qm-footer-orb qm-footer-orb-one" />
      <div className="qm-footer-orb qm-footer-orb-two" />

      <div className="qm-footer-cta qm-wrap">
        <div>
          <span>خطوتك القادمة تبدأ هنا</span>
          <h2>جاهز ترفع درجتك في القدرات ؟</h2>
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
            <a href="#" aria-label="إكس">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>
            </a>
            <a href="#" aria-label="تيك توك">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82c-1.12-1.08-1.67-2.64-1.75-4.17h-3.9v13.63c0 1.62-1.31 2.94-2.92 2.94-1.61 0-2.92-1.32-2.92-2.94 0-1.62 1.31-2.94 2.92-2.94.3 0 .58.05.85.13V8.5c-.28-.04-.56-.06-.85-.06-3.65 0-6.62 2.98-6.62 6.65 0 3.67 2.97 6.65 6.62 6.65s6.62-2.98 6.62-6.65V9.03a9.3 9.3 0 0 0 5.46 1.75V6.75c-1.2 0-2.34-.36-3.31-.97-.06-.03-.13-.07-.2-.11Z" /></svg>
            </a>
            <a href="#" aria-label="سناب شات">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10v8.5c0 .5.45.85.9.68l1.6-.6c.3-.12.65-.03.85.22l.9 1.1c.35.42.98.42 1.33 0l1.02-1.24c.24-.3.68-.3.92 0l1.02 1.24c.35.42.98.42 1.33 0l.9-1.1c.2-.25.55-.34.85-.22l1.6.6c.45.17.9-.18.9-.68V10c0-4.42-3.58-8-8-8Zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" /></svg>
            </a>
            <a href="#" aria-label="يوتيوب">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" /></svg>
            </a>
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
          <Link to="/refund">سياسة الاسترجاع</Link>
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

      <div className="qm-footer-payments qm-wrap">
        <span>وسائل الدفع المتاحة</span>
        <div className="qm-payment-logos">
          <span className="qm-payment-chip"><img src="/payments/visa.png" alt="Visa" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/mastercard.png" alt="Mastercard" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/apple-pay.png" alt="Apple Pay" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/alrajhi-bank.png" alt="مصرف الراجحي" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/stc-bank.png" alt="STC Bank" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/urpay.png" alt="Urpay" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/instapay.png" alt="InstaPay" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/vodafone-cash.png" alt="Vodafone Cash" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/orange-cash.png" alt="Orange Cash" loading="lazy" /></span>
          <span className="qm-payment-chip"><img src="/payments/paymob.png" alt="Paymob" loading="lazy" /></span>
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
