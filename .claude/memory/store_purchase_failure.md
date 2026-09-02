---
name: store-purchase-failure
description: قصة عطل الدفع عبر متجر التطبيقات وحلّه — Apple اتظبطت، وجوجل بلاي لسه ناقصة مفتاحها. اقرأه عند أي شكوى «دفعت والمحتوى مقفول» أو قبل أي شغل على الاشتراكات.
type: project
---

## الحادثة (2026-09-01) — **اتحلّت لـ Apple**
- أول عملية دفع فعلية من داخل التطبيق (iOS). طالب دفع **SAR 59.99** (الباقة الاحترافية / semiannual) والمحتوى فضل مقفول على المنصة والتطبيق.

## السبب الجذري
- أسرار Edge Functions في Supabase كانت **فاضية تمامًا** — مفاتيح Apple مش موجودة.
- فـ`verify-store-purchase` كان بيرمي `StoreConfigurationError` ويرجّع 503، ومفيش `store_subscriptions` ولا `enrollments` بتتعمل، فالـ RLS يقفل المحتوى.
- **الأخطر:** مفيش أي حاجة كانت بتقول للأدمن إن ده حصل. لولا إن الطالب كان صاحب المنصة نفسه، العطل كان هيفضل مخفي.

## الحل (2026-09-02)
1. المستخدم أضاف مفاتيح Apple في Supabase Secrets.
2. `verify-store-purchase` و`store-server-notification` اتعمل لهم إعادة نشر.
3. الطالب ضغط «استعادة المشتريات» فوصلت للخادم واتحقّقت بنجاح.

## دليل النجاح المؤكَّد (فحص 2026-09-02)
- `store_purchase_events` فيه صف `client_verification` بمعرّف معاملة Apple الحقيقي **`300003329528861`**، `processed=true`.
- `store_subscriptions`: `apple` / `semiannual` / `status=active` / `auto_renew=true` / لغاية `2027-03-01 22:27+00`.
- `enrollments`: `payment_reference` بقى معرّف المعاملة الحقيقي واستبدل التفعيل اليدوي تلقائيًا.
- انتحال هوية الطالب: 5 دروس + 4 اختبارات + الملفات ظاهرة.

## 🔴 جرد الأسرار الفعلي (2026-09-02) — مؤكَّد
الأسرار المخصّصة الموجودة فعلًا في المشروع (**أسماء فقط، لا قيم**):
`APPLE_BUNDLE_ID` · `APPLE_IAP_ISSUER_ID` · `APPLE_IAP_KEY_ID` · `APPLE_IAP_PRIVATE_KEY`
(الباقي أسرار Supabase المحجوزة الافتراضية.)

**`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` غير موجود** ⇒ أي طالب يشتري من **جوجل بلاي** هيتخصم منه والمحتوى يفضل مقفول، بنفس عطل Apple بالظبط. لازم يتضاف.

### إزاي تتقرا قائمة الأسرار من غير ما تُعرض قيمها
صفحة Secrets في لوحة Supabase أحيانًا بتفضل بيضا فاضية. البديل: من تبويب فيه جلسة Supabase مفتوحة، نفّذ في سياق الصفحة:
`fetch('https://api.supabase.com/v1/projects/<ref>/secrets', {headers:{Authorization:'Bearer '+JSON.parse(localStorage.getItem('supabase.dashboard.auth.token')).access_token}})`
ورجّع `.map(x => x.name)` بس — **الأسماء فقط، من غير القيم إطلاقًا**.

## تسجيل الفشل وتنبيه الأدمن — **مفعّل للمتجرين** (v5)
`verify-store-purchase` v5 فيه `recordStoreVerificationFailure()`:
- بيسجّل صف `client_verification_failed` في `store_purchase_events` بـ`processed=false` و`processing_error`، بمعرّف حدث فريد = `failed:` + SHA-256 لـ `studentId:productId:purchaseId` (الفهرس الفريد على `(platform, external_event_id)` فبيفصل المتجرين تلقائيًا).
- وبيبعت إشعار `warning` لكل أدمن نشط بنص فيه اسم المتجر (App Store / Google Play).
- بيتنادى في الحالتين: فشل التحقق (catch) وفشل التفعيل (`recordError`).
- **كان Apple بس** (`platform === 'apple'`) لحد ما اتعمّم في commit `5f710d8` على `main`.

### الاختبارات اللي اتعملت
- محتوى الدالة المنشورة (v5) اتقارن بايت-بايت بملفات الريبو: مطابق تمامًا (sha256).
- `_shared/store_verification.ts` لم يتغيّر إطلاقًا (نفس الهاش) — مسار Apple سليم.
- محاكاة الإدخالات في transaction ثم rollback: صف فشل لـ`apple` وصف لـ`google` + إشعار `warning` للأدمن — كلهم مروا بدون خطأ. الأدمن النشط الوحيد: `qudrat.maghrabi.pro@gmail.com`.

## ⚠️ الباقي — على المستخدم
1. **يضيف `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** (حساب خدمة من Google Cloud مربوط بـ Play Console بصلاحية Android Publisher) في Supabase Secrets. من غيره أندرويد واقع.
2. **شراء حقيقي واحد من كل متجر** للتأكيد النهائي.
3. **عادة بعد كل تحديث للتطبيق:** جرّب «استعادة المشتريات» مرة.

## ملاحظة تصميمية متبقية
`store-server-notification` بيرجّع `202 bound:false` لأي إشعار عن عملية شراء مش مسجّلة في `store_subscriptions` — يعني إشعار Apple مش قادر ينقذ عملية فشل تحققها من التطبيق. ممكن يتربط عبر `appAccountToken` لو رجعنا للموضوع.
