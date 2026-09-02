---
name: bunny-video-security
description: حماية فيديوهات Bunny Stream — الإعدادات الفعلية وما تمنعه وما لا تمنعه
type: project
---
- المكتبة: `Qudrat Al-Maghribi Lessons` — Library ID **706043**، حساب Bunny بالدفع حسب الاستخدام.
- **اكتشاف مهم (2026-08-31):** الكود في `api/bunny-token.ts` كان يوقّع توكن صحيحًا، لكن **Embed view token authentication كان مقفولًا في Bunny**، فأي شخص معه رابط الـ embed يشاهد بلا اشتراك ولا تسجيل دخول. التوكن كان بلا أثر.
- **فُعِّل**: Embed view token authentication ✅ — تحقّقت: فتح `iframe.mediadelivery.net/embed/706043/<videoId>` بلا توكن يرجع **403**.
- **فُعِّل**: MediaCage Basic DRM (مجاني) ✅ — يمنع التحميل ويشفّر الملفات، ويعطّل MP4 fallback و Early-Play.
- مفعّل أصلًا: Block direct url file access ✅ · Enable direct play مقفول ✅.
- **منع تسجيل الشاشة غير متاح**: يحتاج MediaCage Enterprise DRM بـ 99$ شهريًا (مذكور صراحةً في لوحة Bunny أن Basic لا يمنع تسجيل الشاشة).
- Allowed domains فارغة (أي نطاق يستطيع التضمين) — لم تُضبط عمدًا لأن WebView في التطبيق قد لا يرسل referer، وضبطها قد يكسر التشغيل.

**How to apply:** الإعدادات في `dash.bunny.net/stream/706043/security/general` و`/security/drm`. صيغة التوكن: `sha256(TOKEN_KEY + videoId + expires)` والعميل يبني `?token=..&expires=..` (موجود في `Learn.tsx`, `QuizResult.tsx`, و`lesson_player_screen.dart`). أي تعطيل للتشغيل بعد تغيير إعداد يُرجَع بضغطة واحدة من نفس الصفحة.

⚠️ **مهلة الطلب:** طلب رمز الفيديو من التطبيق عليه `.timeout(20s)` من 1.1.2 — قبلها كان بيعلّق بلا نهاية على شبكة ضعيفة.
