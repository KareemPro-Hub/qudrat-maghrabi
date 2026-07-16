import { Link } from 'react-router-dom'

export default function Refund() {
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4">

        <div className="text-center mb-14">
          <h1 className="text-4xl font-black text-brand-navy mb-4">سياسة الاسترداد</h1>
          <p className="text-gray-400 text-sm">آخر تحديث: يونيو 2025</p>
        </div>

        <div className="card mb-6 border-r-4 border-brand-pink">
          <p className="text-gray-600 leading-loose text-lg">
            نحرص في منصة قدرات المغربي على رضا طلابنا الكامل. لذلك نقدم سياسة استرداد واضحة وعادلة تضمن حقوق جميع الأطراف.
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              title: '١. ضمان استرداد ٧ أيام',
              body: 'نقدم ضمان استرداد كامل خلال ٧ أيام من تاريخ الشراء، شريطة ألا يكون الطالب قد شاهد أكثر من ٢٠٪ من محتوى الكورس. يُعدّ هذا الضمان دليلًا على ثقتنا التامة في جودة محتوانا التعليمي.'
            },
            {
              title: '٢. حالات الاسترداد المقبولة',
              body: 'يحق للطالب طلب الاسترداد في الحالات التالية: عدم قدرته على الوصول للمحتوى بسبب خلل تقني من جانب المنصة، أو إذا كان محتوى الكورس مختلفًا جوهريًا عما هو موصوف، أو في حال وجود ظروف استثنائية يتم تقييمها بشكل فردي.'
            },
            {
              title: '٣. حالات الاسترداد غير المقبولة',
              body: 'لا يحق طلب الاسترداد في الحالات التالية: بعد مرور أكثر من ٧ أيام على تاريخ الشراء، أو بعد مشاهدة أكثر من ٢٠٪ من محتوى الكورس، أو في حال انتهاك شروط الاستخدام، أو بسبب عدم رضا عام دون وجود سبب موضوعي محدد.'
            },
            {
              title: '٤. آلية طلب الاسترداد',
              body: 'لطلب الاسترداد، يُرجى التواصل مع فريق الدعم عبر البريد الإلكتروني Qudrat.Maghrabi.Pro@gmail.com مع ذكر اسمك الكامل ورقم الطلب وسبب طلب الاسترداد. سيتم الرد على طلبك خلال ٢٤-٤٨ ساعة عمل.'
            },
            {
              title: '٥. مدة استرداد المبلغ',
              body: 'بعد الموافقة على طلب الاسترداد، يتم إعادة المبلغ إلى وسيلة الدفع الأصلية خلال ٥-١٠ أيام عمل، وفقًا لسياسات البنك أو شركة البطاقة الائتمانية الخاصة بك.'
            },
          ].map((section, i) => (
            <div key={i} className="card">
              <h2 className="text-xl font-black text-brand-navy mb-3">{section.title}</h2>
              <p className="text-gray-600 leading-loose">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="card mt-8 text-center bg-purple-50 border-purple-100">
          <p className="text-gray-600 mb-4">هل لديك استفسار حول سياسة الاسترداد ؟</p>
          <Link to="/contact" className="btn-primary inline-block py-3 px-8">تواصل معنا</Link>
        </div>

      </div>
    </div>
  )
}
