---
name: xcode-cloud
description: Xcode Cloud مفعَّل وشغّال لبناء ورفع نسخة iOS تلقائيًا — الإعداد والأخطاء اللي حصلت وحلّها. اقرأها قبل أي عمل على نشر iOS.
type: project
---

## الحالة: ✅ مفعَّل وناجح (2026-09-22، Build 6)

كل `git push` على `flutter-app` → أبل تبني وترفع لـTestFlight تلقائيًا.
مافيش بناء محلي ولا Transporter بعد كده (السكربت المحلي
`./tool/build_ios_release.sh` باقي كخطة بديلة وشغّال).

- التطبيق: `com.alimaghrabi.qudrat.ios` · الفريق: Ali Maghrabi (`ZJ9N48228T`)
- المستودع: `KareemPro-Hub/qudrat-maghrabi` (GitHub App مثبَّت على الريبو ده بس)
- الفرع: `flutter-app` · الـWorkflow: **Default**
- **Action: Archive - iOS** (Scheme: Runner · Distribution Preparation: **App Store Connect**)
  — ودي اللي بترفع البناء لـApp Store Connect/TestFlight لوحدها.
- **Post-Actions: فاضي عن قصد.** TestFlight post-action بيطلب مجموعة مختبرين
  («Deployments must be configured with testers») ومفيش مجموعات، وهو أصلًا
  مش مطلوب للرفع.
- مجانية ضمن عضوية Apple Developer (25 ساعة بناء شهريًا).

## متغيّرات البيئة في الـWorkflow (Xcode ▸ Integrate ▸ Manage Workflows ▸ Environment)
| الاسم | Secret | القيمة |
|---|---|---|
| `SUPABASE_URL` | ✅ | من `config/supabase.dev.json` |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | من `config/supabase.dev.json` |
| `PLATFORM_BASE_URL` | — | `https://www.qudratmaghrabi.com` |

🔒 كريم هو اللي بيحط القيم بنفسه — Claude ما بيلمسش المفاتيح.

## السكربت: `ios/ci_scripts/ci_post_clone.sh`
بيثبّت Flutter 3.47.2، يولّد `config/supabase.ci.json` من المتغيّرات السرية،
يشغّل `tool/configure_ios_release.sh`، `flutter pub get`، وبعدها
`flutter build ios --release --no-codesign --config-only`.

- **نسخة تانية احتياطية في جذر المستودع** `ci_scripts/` — بس **أبل بتقرا اللي جنب
  مشروع Xcode يعني `ios/ci_scripts/`**. فيه حماية جوّه السكربت تمنع تنزيل Flutter مرتين.
- لازم يكون **executable في Git (100755)**. على الـVM اللي Claude بيشتغل منه
  البِت ده مابيتحفظش لوحده، فلازم:
  `git update-index --chmod=+x ios/ci_scripts/ci_post_clone.sh`

## 🔴 الأخطاء اللي حصلت فعلًا وحلّها (للمرة الجاية)
1. **«Post-Clone script not found at ci_scripts/ci_post_clone.sh»**
   → الملف مش executable في Git. الحل: `git update-index --chmod=+x`.
2. **«Could not resolve package dependencies: ...FlutterGeneratedPluginSwiftPackage
   doesn't exist»** → السكربت ما اشتغلش خالص (مكان غلط أو مش executable).
   أبل بتقرا `ios/ci_scripts/` مش الجذر.
3. **«a resolved file is required ... dependencies were added: sentry-cocoa»**
   → **السبب الجذري الأساسي:** `Package.resolved` كان untracked في Git.
   xcodebuild على سيرفر أبل بيشتغل بحل تبعيات SwiftPM **مقفول**، فلازم الملفين
   دول يكونوا مدفوعين:
   - `ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`
   - `ios/Runner.xcworkspace/xcshareddata/swiftpm/Package.resolved`
   ⚠️ أي حزمة SwiftPM جديدة تتضاف مستقبلًا → لازم تدفع `Package.resolved` معاها.
4. **«pod install: No Podfile found»** → المشروع بيستخدم SwiftPM مش CocoaPods.
   الخطوة بقت شرطية على وجود `Podfile`.
5. **«An internal error has occurred. This operation will be retried on another
   build worker»** (3 محاولات) → خطأ من أبل نفسها، أو كان بسبب نسختين من
   السكربت بينزّلوا Flutter مرتين. اتصلح.

## ملاحظات تشغيلية
- **الطابور عند أبل** بيوصل 12-20 دقيقة قبل ما البناء يبدأ؛ المدة ظاهرة في
  Overview («Queuing (Nmin)»).
- ✅ **شرط «Branch Changes» اتظبط على `flutter-app`** (2026-09-22). كان على `main`
  فكان أي دفع على المنصة يبدأ بناء iOS فاشل، والدفع على `flutter-app` ما يبدأش حاجة.
- **الـWorkflow يتعدّل من الويب أسهل بكتير من Xcode:**
  App Store Connect ▸ Xcode Cloud ▸ Runner ▸ Workflows ▸ Default.
  هناك الكتابة والقوائم شغّالة عادي (على عكس Xcode).
- «Completed with 50 issues» = 50 تحذير من المكتبات، مش أخطاء. البناء ناجح.
- TestFlight فوري بلا مراجعة؛ النشر على App Store لسه محتاج مراجعة أبل (1-3 أيام).

## قيود بيئة Claude (مهمة جدًا لتوفير وقت كريم)
- **Xcode مصنّف "click only"**: Claude يشوف ويضغط الأزرار بس — **ممنوع الكتابة،
  ضغط المفاتيح، وقوائم التطبيق (app_menu)**، ومش ممكن رفع الصلاحية.
- **الضغط من الشاشة الكاملة داخل نافذة Xcode مرفوض** (الـhit-test بيرجع
  "الدوك/مركز الإشعارات")؛ اللي بينفع بس هو **شريط القوائم وقوائمه المنسدلة**.
- **اختيار صف في جدول/قائمة داخل نافذة Xcode مش ممكن** من الخلفية.
- النتيجة: أي خطوة في Xcode فيها **كتابة أو اختيار من قائمة** → كريم يعملها،
  وClaude يقول له الخيار والزر بس.
- App Store Connect على المتصفح كان بيطلع **صفحات فاضية** لفترة بعد تسجيل الدخول
  في Xcode، وبعدين رجع طبيعي. لو حصلت تاني: استنى دقايق وحدّث الصفحة.
