import { Link } from 'react-router-dom'

const sections = [
  {
    title: 'ضمان استرداد ٧ أيام',
    body: 'نقدم ضمان استرداد كامل خلال ٧ أيام من تاريخ الشراء، شريطة ألا يكون الطالب قد شاهد أكثر من ٢٠٪ من محتوى الكورس. يُعدّ هذا الضمان دليلًا على ثقتنا التامة في جودة محتوانا التعليمي.'
  },
  {
    title: 'حالات الاسترداد المقبولة',
    body: 'يحق للطالب طلب الاسترداد في الحالات التالية: عدم قدرته على الوصول للمحتوى بسبب خلل تقني من جانب المنصة، أو إذا كان محتوى الكورس مختلفًا جوهريًا عما هو موصوف، أو في حال وجود ظروف استثنائية يتم تقييمها بشكل فردي.'
  },
  {
    title: 'حالات الاسترداد غير المقبولة',
    body: 'لا يحق طلب الاسترداد في الحالات التالية: بعد مرور أكثر من ٧ أيام على تاريخ الشراء، أو بعد مشاهدة أكثر من ٢٠٪ من محتوى الكورس، أو في حال انتهاك شروط الاستخدام، أو بسبب عدم رضا عام دون وجود سبب موضوعي محدد.'
  },
  {
    title: 'آلية طلب الاسترداد',
    body: 'لطلب الاسترداد، يُرجى التواصل مع فريق الدعم عبر البريد الإلكتروني Qudrat.Maghrabi.Pro@gmail.com مع ذكر اسمك الكامل ورقم الطلب وسبب طلب الاسترداد. سيتم الرد على طلبك خلال ٢٤-٤٨ ساعة عمل.'
  },
  {
    title: 'مدة استرداد المبلغ',
    body: 'بعد الموافقة على طلب الاسترداد، يتم إعادة المبلغ إلى وسيلة الدفع الأصلية خلال ٥-١٠ أيام عمل، وفقًا لسياسات البنك أو شركة البطاقة الائتمانية الخاصة بك.'
  },
]

const arabicNums = ['١', '٢', '٣', '٤', '٥', '٦']

export default function Refund() {
  return (
    <div className="qm-home qm-info">
      <section className="qm-info-hero">
        <div className="qm-info-orb qm-info-orb-one" />
        <div className="qm-info-orb qm-info-orb-two" />
        <span className="qm-info-kicker">رضاك يهمنا</span>
        <h1>سياسة الاسترداد</h1>
        <p className="qm-info-updated">آخر تحديث: يونيو 2025</p>
      </section>

      <div className="qm-info-body">
        <div className="qm-info-card qm-info-highlight" style={{ marginBottom: 22 }}>
          <p>
            نحرص في منصة قدرات المغربي على رضا طلابنا الكامل. لذلك نقدم سياسة استرداد واضحة وعادلة تضمن حقوق جميع الأطراف.
          </p>
        </div>

        {sections.map((section, i) => (
          <div key={i} className="qm-info-card">
            <h2><span className="qm-info-num">{arabicNums[i]}</span>{section.title}</h2>
            <p>{section.body}</p>
          </div>
        ))}

        <div className="qm-info-cta" style={{ marginTop: 22 }}>
          <p>هل لديك استفسار حول سياسة الاسترداد ؟</p>
          <Link to="/contact" className="qm-primary">تواصل معنا</Link>
        </div>
      </div>
    </div>
  )
}
