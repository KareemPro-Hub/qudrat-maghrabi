// الشاشة اللي بتظهر للطلاب وأولياء الأمور لما الأدمن يفعّل وضع الصيانة.
export default function Maintenance() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{
        background:
          'radial-gradient(1100px 520px at 50% -12%, #f3e8ff 0%, transparent 62%), linear-gradient(180deg, #fdfbff 0%, #f7f2fb 100%)',
      }}
    >
      <div className="w-full max-w-md text-center">
        <img
          src="/admin/logo.png"
          alt="قدرات المغربي"
          className="w-24 h-24 mx-auto mb-8 object-contain"
        />

        <div
          className="rounded-3xl bg-white px-7 py-10"
          style={{ boxShadow: '0 24px 60px -28px rgba(76, 29, 149, .35)' }}
        >
          <span
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 gradient-bg"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8"
            >
              <path d="M12 8v4l2.5 2" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>

          <h1 className="text-2xl font-black text-brand-navy mb-4 leading-snug">
            نُجهّز لك تحديثًا جديدًا
          </h1>

          <p className="text-gray-500 leading-relaxed mb-6">
            المنصة تحت الصيانة لفترة قصيرة، ونعود قريبًا بإذن الله.
          </p>

          <div className="rounded-2xl bg-purple-50 text-brand-purple font-bold py-3 px-4">
            تقدّمك واشتراكك في أمان
          </div>
        </div>

        <p className="text-gray-400 text-sm mt-7">قدرات المغربي</p>
      </div>
    </div>
  )
}
