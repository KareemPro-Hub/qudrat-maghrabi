import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-brand-navy text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="mb-4">
              <img src="/logo.png" alt="قدرات المغربي" className="h-14 w-auto object-contain" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              منصة تعليمية متخصصة في اختبار القدرات الكمي لطلاب الثانوي في المملكة العربية السعودية.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-bold text-lg mb-4 gradient-text">روابط سريعة</h3>
            <ul className="space-y-2">
              {[
                { to: '/courses', label: 'الكورسات' },
                { to: '/about', label: 'عن المنصة' },
                { to: '/register', label: 'التسجيل' },
                { to: '/login', label: 'تسجيل الدخول' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-gray-400 hover:text-brand-pink transition-colors text-sm font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4 gradient-text">تواصل معنا</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>📧 info@qudratmaghrabi.com</li>
              <li>🐦 @QudratMaghrabi</li>
              <li>📺 YouTube: قدرات المغربي</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} منصة قدرات المغربي — جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  )
}
