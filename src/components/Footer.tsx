import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="qm-site-footer qm-home">
      <div className="qm-footer-orb qm-footer-orb-one" />
      <div className="qm-footer-orb qm-footer-orb-two" />

      <div className="qm-footer-cta qm-wrap">
        <div>
          <h2>جاهز ترفع درجتك في القدرات ؟</h2>
          <p>ابدأ بخطة واضحة وتدريبات ذكية توصلك لهدفك بثقة.</p>
        </div>
        <Link to="/login">ابدأ رحلتك الآن <b>←</b></Link>
      </div>

      <div className="qm-footer-main qm-wrap">
        <div className="qm-footer-brand">
          <p>نـصنع لـك بـدايـةً أقـوى نـحـو حـلمـك المنـشـود<br />ونمضي معك بثقة حتى الدرجة التي تستحقها</p>
          <div className="qm-social-links">
            <a href="#" aria-label="إكس">
              <span className="qm-social-icon qm-social-icon-x" />
            </a>
            <a href="#" aria-label="تيك توك">
              <span className="qm-social-icon qm-social-icon-tiktok" />
            </a>
            <a href="#" aria-label="سناب شات">
              <span className="qm-social-icon qm-social-icon-snapchat" />
            </a>
            <a href="https://www.youtube.com/@QudratAlmaghrabi" target="_blank" rel="noopener noreferrer" aria-label="يوتيوب">
              <span className="qm-social-icon qm-social-icon-youtube" />
            </a>
          </div>

          <div className="qm-store-badges">
            <a href="#" aria-label="حمّل من App Store">
              <img src="/app-badges/app-store.png" alt="Available on the App Store" loading="lazy" />
            </a>
            <a href="#" aria-label="حمّل من Google Play">
              <img src="/app-badges/google-play.png" alt="Get it on Google Play" loading="lazy" />
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
          <div><span>المملكة العربية السعودية</span></div>
        </div>
        <div className="qm-footer-credit">
          نُسِجَت ملامح هذا الإبداع البصري والرقمي بروح وإبداع{' '}
          <a href="https://kareempro.com" target="_blank" rel="noopener noreferrer">Kareem Pro</a>
        </div>
      </div>
    </footer>
  )
}
