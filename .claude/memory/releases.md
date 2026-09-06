---
name: releases
description: سجل إصدارات تطبيق قدرات المغربي وأوامر البناء والنشر ومعرّفاته في المتاجر
type: project
---

## معرّفات التطبيق (مؤكَّدة 2026-09-02)
- **iOS bundle id: `com.alimaghrabi.qudrat.ios`** ⚠️ مش `com.qudratmaghrabi.app`. سرّ `APPLE_BUNDLE_ID` في Supabase لازم يساوي ده، وإلا `verifyAppleSubscription` بترفض كل عملية شراء.
- **App Store trackId: `6799747012`** — <https://apps.apple.com/sa/app/id6799747012>
- **Android package: `com.qudratmaghrabi.app`** (مطابق للقيمة الافتراضية لـ `GOOGLE_PLAY_PACKAGE_NAME`).
- حساب Play Console: `qudrat.maghrabi.pro@gmail.com` — `/u/2` — رقم الحساب `7379435584231493005`.

## السجل
- **1.1.2 (14)** — 2026-09-02.
  - **iOS: أُرسلت للمراجعة ✅ — الحالة «Waiting for Review»**، إصدار تلقائي بعد الموافقة، بلا Phased Release.
  - **Android: منشور على الموقع ✅** — commit `fd59be5` على `main`. md5 القديم `908b988b…` والجديد `52a9e27d…`، و`android-version.json` بقى 1.1.2/14.
  - آخر commit على `flutter-app`: **`f1d645d`**. المحتوى:
    1. `f9eaca5` «ملفات الدرس» بدل «ملخص الدرس» + حذف قائمة الدروس المكررة داخل الدرس.
    2. `f9eaca5` كرت الكورس الواحد بعرض الشاشة في الرئيسية.
    3. `323a340` زر دعم واضح بدل الأيقونة الصغيرة.
    4. `fb108d1` تصحيح تاريخ انتهاء الاشتراك (`.toLocal()`).
    5. `a02db25` فلتر Sentry لضجيج انقطاع الشبكة + مهلة 20 ثانية على طلب رمز فيديو Bunny.
    6. `2bd7b4d` إزالة `can_use_parent_portal` من كود التطبيق + رفع النسخة.
    7. `4b1c27d` **إصلاح كشف تسجيل الشاشة على iOS** (كان مايشتغلش إطلاقًا).
    8. `6d52fa9` + `72c3b7f` علامة مائية باسم الطالب فوق الفيديو + كشف لقطة الشاشة وتسجيلها.
    9. `f1d645d` استبعاد `_to_delete/` من `flutter analyze`.
  - **الفحص قبل البناء:** `flutter analyze` نظيف و**51 اختبار نجحوا**.
- **1.1.1 (13)** — **نُشر فعليًا 2026-09-02 الساعة 07:18 UTC**. زر «عرفني الإجابة الصحيحة» بفيديو Bunny.
- **1.1.0 (12)** — سُحبت يدويًا (Developer Rejected) ودُمج محتواها في 1.1.1.
- **1.0.9 (11)** — إصلاح الخروج التلقائي عند ضعف الشبكة، عودة البصمة، الأسعار الاحتياطية. نُشر.

## 🔴 صياغة «ما الجديد» — قاعدة ثابتة من كريم (2026-09-05)
**نقاط موجزة مركّزة قوية، بالعربية الفصحى.** لا عامية، ولا جمل طويلة، ولا شرح زائد. كل نقطة سطر واحد يوصّل الفائدة للطالب مباشرة.
مثال على الصياغة المطلوبة:
> • عرض صورة السؤال كاملة في شاشة مراجعة الإجابات.
> • تحسين وضوح زر الدعم في جميع الشاشات.

## تذكيرات دائمة
- `pubspec.yaml` و`lib/core/config/app_metadata.dart` لازم يتطابقا.
- **⚠️ ابنِ بالسكربت مش بأمر flutter مباشر:** `./tool/build_ios_release.sh` — هو اللي بيحط `--dart-define-from-file` **وبيتحقق** إن إعدادات Supabase دخلت جوّه البناء. البناء بـ`flutter build ipa` لوحده بينتج تطبيق بيقع عند الإقلاع بخطأ `StateError: Supabase configuration is missing`.
- **أبل لا تقبل نسختين في المراجعة معًا.** للتحقق إن الطريق فاضي من غير تسجيل دخول: `fetch('https://itunes.apple.com/lookup?bundleId=com.alimaghrabi.qudrat.ios&country=sa')` ← لو `version` = آخر نسخة رفعناها يبقى اتوافق عليها ونُشر.
- لسحب نسخة من المراجعة: صفحة النسخة ← «remove this version from review» ← Remove.

## خطوات إرسال نسخة iOS من المتصفح (مجرَّبة بالكامل 2026-09-02)
1. `https://appstoreconnect.apple.com/apps/6799747012/distribution/ios/version/inflight`
2. لو مفيش نسخة قيد التجهيز: اضغط **+** جنب «iOS App» في القائمة الجانبية → اكتب رقم النسخة → **Create**.
3. املأ `textarea#whatsNew` بنص «ما الجديد».
4. قسم **Build** → **Add Build** → علّم على الـ build → **Done**.
5. **Save** (يبقى disabled لما يتحفظ).
6. تأكّد من `input[name=releaseType][value=AFTER_APPROVAL]` مختار و`phasedReleaseState=UNAVAILABLE`.
7. **Add for Review** → الحالة تبقى «Ready for Review».
8. لوحة **Draft Submission** بتفتح من اليمين → **Submit for Review** → الحالة تبقى «Waiting for Review».

## البناء والنشر
- **iOS:** `cd "<مجلد التطبيق>" && ./tool/build_ios_release.sh` ← كريم يرفع الـ IPA من `build/ios/ipa/*.ipa` عبر **Transporter** ← **وأنا أكمّل من App Store Connect بنفسي**.
- **Android:** `flutter build apk --release` ← الـ APK بيتوزّع **من موقع المنصة مش من المتجر بس**:
  1. انسخ `build/app/outputs/flutter-apk/app-release.apk` إلى `public/downloads/qudrat-maghrabi.apk` في مشروع المنصة.
  2. حدّث `public/downloads/android-version.json` **في نفس الوقت**.
  3. ارفع الاتنين مع بعض على `main`.
  4. تأكّد بـ `md5sum` إن الـ APK الجديد فعلًا مختلف عن القديم.
  - لو اتحدّث الـ JSON من غير الـ APK: الطلاب يشوفوا لافتة تحديث وينزّلوا نسخة قديمة. والعكس: مش هيعرفوا إن في تحديث.
