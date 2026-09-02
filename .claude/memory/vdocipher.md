---
name: vdocipher
description: حساب VdoCipher الجديد وإعداداته وخطة الانتقال من Bunny
type: project
---
- أُنشئ حساب VdoCipher في 2026-08-31 بالبريد `qudrat.maghrabi.pro@gmail.com` (أنشأه المستخدم بنفسه — إنشاء الحسابات ممنوع على Claude).
- **الباقة التجريبية: Trial — صالحة حتى 30 سبتمبر 2026**، بحدود 5 GB تخزين و5 GB نقل بيانات.
- الإعدادات المضبوطة: URL Whitelist = `qudratmaghrabi.com` ✅ · تحميل الفيديو الأصلي معطّل افتراضيًا ✅.
- **الحماية الفعلية:**
  - أندرويد وسطح المكتب: Widevine DRM افتراضيًا ✅ (يمنع تسجيل الشاشة على أندرويد).
  - iOS: تشفير خاص وليس DRM حقيقيًا، **ولا يمنع التقاط الشاشة**. لتفعيل FairPlay (الذي يمنع التقاط الشاشة على أبل) يجب التقدّم بطلب شهادة FairPlay من Apple عبر حساب المطوّر، وVdoCipher تدمجها مجانًا لكن **فقط مع باقة مدفوعة**.
- يوجد حساب VdoCipher قديم آخر باسم `mr.ali.maths1@gmail.com` باقة Starter انتهت في 15 أغسطس 2026 وبه 11.1 GB — لم يُستخدم.
- الوضع الحالي على Bunny (library 706043) يبقى كما هو حتى يكتمل التقييم؛ لا تنقل شيئًا قبل قرار المستخدم.

**How to apply:** لوحة التحكم `vdocipher.com/dashboard`. الأقسام المهمة: Security > Security Settings (whitelist) · Security > iOS Playback (FairPlay) · Config (مفاتيح API) · Custom Player. التكامل يحتاج API Secret Key في متغيرات بيئة Vercel، ونقطة تُصدر OTP لكل مشاهدة بدل توكن Bunny.
