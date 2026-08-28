import * as Sentry from '@sentry/react'

// رصد الأخطاء: أي خطأ يقع عند أي طالب بيتبعت هنا تلقائيًا عشان نعرف بيه
// فورًا بدل ما نستنى شكوى. الـ DSN ده عنوان استقبال عام (مش سر) وبيتشحن
// جوه ملفات الموقع أصلًا، فمفيش مشكلة إنه يبان في الكود.
const SENTRY_DSN =
  'https://c97ea23bc96ea1d444d3c742471619af@o4511987733757952.ingest.de.sentry.io/4511987761741904'

export function initErrorMonitoring() {
  // في التطوير المحلي مش محتاجين نبعت أخطاء
  if (import.meta.env.DEV) return

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    // ما نبعتش بيانات شخصية للطلاب — تفاصيل الخطأ التقنية بس
    sendDefaultPii: false,
    // مفيش تتبع أداء ولا تسجيل جلسات، رصد أخطاء فقط
    tracesSampleRate: 0,
  })
}
