---
name: xcode-cloud
description: خدمة Xcode Cloud لبناء نسخة iOS ورفعها تلقائيًا — مؤجَّلة بقرار كريم. اقرأها لو طلب أتمتة البناء أو سأل عن Xcode Cloud.
type: project
---

## ما هي
خدمة من أبل تبني التطبيق وتشغّل الاختبارات وترفعه إلى App Store **تلقائيًا**
على سيرفرات أبل بمجرد `git push` — بلا فتح Xcode ولا Transporter.
الوثائق: <https://developer.apple.com/documentation/Xcode/Xcode-Cloud/>

## التكلفة
**مجانية ضمن عضوية Apple Developer الحالية** — 25 ساعة بناء شهريًا، وهي أكثر
من الحاجة بكثير (كريم يبني بضع مرات في الشهر).

## لماذا تهمّ كريم
دورة النشر الحالية ثلاث خطوات يدوية عليه: `./tool/build_ios_release.sh` ثم
الرفع بـTransporter ثم الانتظار. مع Xcode Cloud تصير: Claude يدفع الكود،
والباقي تلقائي.

## ⚠️ عائقان لا بد من حلّهما قبل التفعيل
1. **Flutter غير مثبَّت على Xcode Cloud.** يحتاج `ci_scripts/ci_post_clone.sh`
   يثبّت Flutter مع كل بناء (يضيف ~5 دقائق لكل بناء).
2. **إعدادات Supabase ليست على GitHub** (وهذا صحيح أمنيًا): ملف
   `config/supabase.*.json` متجاهَل في `.gitignore`، والسكربت الحالي يمرّره
   بـ`--dart-define-from-file`. الحل: قيمه تُحفَظ **متغيّرات بيئة سرية** في
   App Store Connect، ويولّد `ci_post_clone.sh` الملف منها قبل البناء.
   🔒 **كريم هو من يضع القيم بنفسه** — Claude لا يتعامل مع المفاتيح.

بدون الخطوة 2 سيُبنى تطبيق يسقط عند الإقلاع بخطأ
`StateError: Supabase configuration is missing` (نفس فخّ البناء بـ`flutter build ipa` وحده).

## الحالة
**مؤجَّلة بقرار كريم (2026-09-21):** «خلينا زي ما احنا وخلاص». لا تُقترح مجددًا
إلا إذا سأل عنها أو اشتكى من طول دورة النشر اليدوية.
