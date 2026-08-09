# تجهيز مراجعة المتاجر

## بيانات التطبيق

- الاسم: قدرات المغربي
- معرّف حزمة iOS: `com.alimaghrabi.qudrat.ios`
- معرّف حزمة Android: `com.qudratmaghrabi.app`
- الإصدار الأول: `1.0.0 (2)`
- iOS: الحد الأدنى 15، والبناء باستخدام iOS SDK 26 أو أحدث.
- Android: الحد الأدنى API 24، والمستهدف API 36.

## روابط المراجعة

- الخصوصية: https://www.qudratmaghrabi.com/privacy
- الشروط: https://www.qudratmaghrabi.com/terms
- حذف الحساب: https://www.qudratmaghrabi.com/account-deletion
- الدعم: https://www.qudratmaghrabi.com/contact

## منتجات الاشتراك

- `com.qudratmaghrabi.app.subscription.monthly`
- `com.qudratmaghrabi.app.subscription.quarterly`
- `com.qudratmaghrabi.app.subscription.semiannual`

يجب إنشاء المنتجات بالمعرّفات نفسها، وتفعيل التجديد التلقائي، وربط إشعارات الخادم بواجهة `store-server-notification`، وضبط أسرار Apple وGoogle الخاصة بالتحقق في Supabase قبل اختبار Sandbox.

## بيانات الخصوصية التي يجب التصريح بها

التطبيق لا يعرض إعلانات ولا يتتبع المستخدم عبر التطبيقات. البيانات المرتبطة بالحساب تشمل الاسم، البريد الإلكتروني، رقم الجوال الاختياري، معرّف المستخدم، سجل الاشتراك، تقدم الدروس، ونتائج الاختبارات. تُستخدم لتشغيل الحساب والمحتوى والاشتراك والدعم فقط.

## قبل إرسال المراجعة

1. إنشاء حساب طالب تجريبي للمراجع، والتأكد من وجود درس فيديو واختبار واشتراك Sandbox قابل للتجربة.
2. إدخال بيانات الحساب وخطوات الوصول للمحتوى المدفوع في ملاحظات المراجعة.
3. إكمال App Privacy في App Store Connect وData safety وحذف الحساب في Google Play.
4. رفع لقطات شاشة عربية حقيقية من النسخة النهائية لكل مقاس مطلوب.
5. اختبار الشراء والاستعادة والإلغاء والتجديد وإشعارات الخادم في Sandbox وGoogle Play internal testing.
6. حفظ نسخة آمنة من مفتاح رفع Android وملف `android/key.properties` خارج Git.
7. تسجيل Apple ID داخل Xcode وإنشاء Provisioning Profile لمعرّف الحزمة قبل إنشاء IPA.
