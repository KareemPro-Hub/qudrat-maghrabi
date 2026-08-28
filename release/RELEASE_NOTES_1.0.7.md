# ملاحظات الإصدار — 1.0.7 (9)

نسخة أندرويد للتوزيع المباشر من موقع المنصة.

## الجديد

- رصد الأخطاء: أي خطأ غير متوقع يقع عند الطالب بيتسجّل تلقائيًا مع رقم
  النسخة ويوصل تنبيه فوري، بدل ما نعرف بالمشكلة من شكوى بعد ساعات.
  من غير أي بيانات شخصية للطلاب — تفاصيل الخطأ التقنية بس.

## خطوات الرفع

1. cd "/Users/KareemMac/Documents/Flutter/qudrat_maghrabi_app"
2. flutter build apk --release --dart-define-from-file=config/supabase.dev.json
3. نسخ الناتج إلى public/downloads/qudrat-maghrabi.apk في مشروع المنصة.
4. تحديث public/downloads/android-version.json ليكون build = 9.
5. commit + push للمنصة، والتأكد من وصول النشر.

ملاحظة: النسخة دي أول واحدة اللي الطلاب هيشوفوا تنبيه التحديث بسببها،
لأن 1.0.6 هي أول نسخة فيها الميزة.
