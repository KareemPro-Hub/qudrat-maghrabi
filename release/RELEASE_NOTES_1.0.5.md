# ملاحظات الإصدار — 1.0.5 (7)

## نص "ما الجديد" للمتجرين (عربي)

المنهج كامل أمامك من أول لحظة:

• تقدر تشوف كل دروس الكورس وأبوابه قبل الاشتراك، والدرس المدفوع يظهر عليه قفل.
• الضغط على درس مقفول يفتح لك باقات الاشتراك مباشرة.
• عدد دروس كل باب بقى دقيقًا، ولم تعد الأبواب تظهر فارغة.
• إصلاح مشكلة كانت تمنع الوصول إلى الدروس المجانية من قائمة الكورسات.
• إصلاح تعليق شاشة التحميل عند ضعف الاتصال.
• إصلاح أزرار الدعم والتواصل على أجهزة أندرويد.
• إصلاح رابط استعادة كلمة المرور القادم بالبريد.
• إصلاح زر "استعادة المشتريات" وتحسين موثوقية عمليات الشراء.
• تحسينات في حفظ تقدّم الدروس ونتائج الاختبارات الموقوتة.

## أوامر البناء

Android:

    cd "/Users/KareemMac/Documents/Flutter/qudrat_maghrabi_app"
    flutter build appbundle --release --dart-define-from-file=config/supabase.dev.json

الناتج: build/app/outputs/bundle/release/app-release.aab

iOS:

    cd "/Users/KareemMac/Documents/Flutter/qudrat_maghrabi_app"
    ./tool/build_ios_release.sh

الناتج: build/ios/ipa/*.ipa

## قبل الرفع

- تأكد من وجود android/key.properties وملف مفتاح الرفع.
- تأكد من تسجيل الدخول بحساب Apple داخل Xcode.
