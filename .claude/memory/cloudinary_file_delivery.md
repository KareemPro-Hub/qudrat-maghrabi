# حجب كتاب التأسيس في Cloudinary — 2026-10-07

- أثناء تشخيص شكوى عدم عمل الحساب، ظهرت صفحة متصفح `HTTP ERROR 401` على `res.cloudinary.com`؛ لا تُعتبر هذه الصورة دليلًا على فشل تسجيل الدخول للمنصة.
- الملف: **تحميل كتاب التاسيس** في درس **الأعداد العشرية**، `lesson_files.id = 4144a0d4-ce03-4081-bdd6-f82102572afe`.
- الرابط: `https://res.cloudinary.com/dzgfvs0gi/image/upload/v1787752443/xkeuagnp53qvq6pf9ycl.pdf`.
- تحقق مباشر بـHEAD مع Referer الموقع: HTTP **401**، و`X-Cld-Error: deny or ACL failure`.
- حساب الطالب محل الفحص نشط وبريده مؤكد وله اشتراك ساري، ودالة `has_active_course_access` سمحت بكورس الملف؛ لا تُحفظ هويته أو بريده في Git.
- صفحة الموقع الرئيسية و`/auth` و`/dashboard` أعادت HTTP 200 أثناء الفحص، وهذا فحص استجابة HTTP فقط وليس اختبار واجهة تفاعليًا.
- المؤكد: Cloudinary يرفض تسليم الملف. **الإعداد المحدد المسبب للحجب لم يُتحقق منه**؛ منع تسليم PDF/ZIP في إعدادات الحساب أو قيود الوصول احتمالات تحتاج مراجعة.
- المرجع الرسمي: https://cloudinary.com/documentation/ts_what_are_the_common_error_codes_returned_in_the_x_cld_error_header_when_delivering_assets
- لم تُغير إعدادات Cloudinary أو قاعدة البيانات أو كود المنتج؛ المطلوب في هذه المرحلة تشخيص الحالة أولًا. عند متابعة الإصلاح تُراجع قيود الملف وإعداد السماح بتسليم PDF دون إلغاء قيود أخرى أو تغيير صلاحيات الاشتراك.
