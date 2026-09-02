---
name: email-confirmation
description: مشكلة تأكيد البريد التي كانت تمنع الطلاب من الدخول، وكيف عولجت نهائيًا
type: project
---
- الأعراض: الطالب يسجّل ثم يظل التطبيق/الموقع يطلب البريد وكلمة المرور — لأن `auth.users.email_confirmed_at` فارغ فيُرفض الدخول.
- في 2026-08-31 كان 57 من 109 حسابًا غير مؤكَّد (كلهم خلال 14 يومًا)، أي أكثر من نصف المسجّلين محجوبين.
- رسائل التأكيد كانت تُرسَل فعلًا (`confirmation_sent_at` مضبوط للجميع) — المشكلة في الوصول (سبام) أو أن الطالب لا يضغط الرابط، لا في الإرسال.
- **عولجت نهائيًا (2026-08-31):**
  1. تفعيل كل الحسابات العالقة يدويًا → 0 غير مؤكَّد، دون المساس بكلمات المرور.
  2. تعطيل "Confirm email" في Supabase → Authentication → Sign In / Providers → User Signups. الطالب الآن يدخل فور التسجيل.
- لم يُعدَّل أي كود. مسارات `email_not_confirmed` في `src/pages/Auth.tsx` و`src/lib/passkeys.ts` و`supabase_auth_repository.dart:313` صارت غير مستخدمة عمليًا لكنها غير ضارة وتُركت كما هي.

**How to apply:** أمر التفعيل اليدوي عند الحاجة (Supabase MCP):
`update auth.users set email_confirmed_at = now(), raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('email_verified', true), updated_at = now() where deleted_at is null and email_confirmed_at is null and confirmation_sent_at is not null;`
**Why:** خسارة أكثر من نصف المسجّلين كانت أخطر بكثير من فائدة تأكيد البريد.
- لا تحفظ بيانات الطلاب (بريد/هاتف) في Git.
