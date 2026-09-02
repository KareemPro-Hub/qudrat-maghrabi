---
name: quiz-explanation-video
description: مشكلة زر «عرفني الإجابة الصحيحة» وفيديو شرح الإجابة في الاختبارات/الواجبات، وسببها الجذري والإصلاح. اقرأها عند أي سؤال عن explanation_video_id أو شرح الإجابة أو فيديو الواجب.
type: project
---

## الشكوى (2026-09-01)
«فيديوهات Bunny غير موجودة في عرفني الإجابة في الواجبات» — وحقل «شرح الإجابة — رقم فيديو Bunny» يظهر فاضيًا عند إعادة فتح السؤال.

## ما فُحص وثبت أنه سليم (لا تلمسه)
- عمود `quiz_questions.explanation_video_id` موجود (text)، وصلاحيات SELECT/INSERT/UPDATE ممنوحة لـ authenticated و anon على مستوى العمود.
- سياسات RLS على `quiz_questions`: insert/update/delete/select لـ admin/teacher/quiz_manager فقط — سليمة.
- `AdminQuizzes.tsx`: `emptyQ` و`openEditQuestion` و`handleSaveQuestion` و`handleUpdateQuestion` كلها تمرّر `explanation_video_id` صح. مسار الحفظ والقراءة سليم منذ commit 59e5898 (26 أغسطس 2026).
- RPC `get_quiz_review(p_quiz_id, p_result_id)` يرجع `explanation_video_id` ضمن أعمدته — سليم.
- `src/pages/QuizResult.tsx` يعرض الزر ومكوّن `ExplanationVideo` — سليم.

## السبب الجذري الحقيقي
`api/bunny-token.ts` كان يتحقق من ملكية الفيديو **عبر جدول `lessons` فقط** (`.eq('video_id', ...)`)، وفيديو شرح الإجابة ليس درسًا — فكل طلب توقيع له كان يرجع 404 `Video is not available`. أي أن الزر كان يفشل دائمًا على المنصة مهما كان الرقم صحيحًا.

**الإصلاح** (commit `f8c5d08` على main): لو الفيديو غير موجود في الدروس، يُبحث عنه في `quiz_questions.explanation_video_id` ضمن اختبارات نفس الكورس، ولو وُجد يُوقَّع التوكن بشرط `has_active_course_access` (بدون معاينة مجانية — فيديو الشرح للمشترك فقط). `lesson?.is_free_preview` صار اختياريًا لأن lesson قد يكون null.

## الثغرة الثانية — التطبيق
`quiz_result_screen.dart` كان يقرأ `explanationVideoId` من السيرفر ولا يعرضه إطلاقًا: لا زر ولا مشغّل. أُضيف (commit `05ae4c4` على فرع flutter-app):
- `StudentQuizRepository.requestExplanationVideo({courseId, videoId})` + تنفيذها في `supabase_student_quiz_repository.dart` (POST على `/api/bunny-token` بنفس أسلوب `SupabaseStudentLearningRepository.requestVideo`، والمستودع لم يعد `const` وصار يأخذ `http.Client` اختياريًا).
- زر «عرفني الإجابة الصحيحة» داخل `_ReviewQuestionCard` + شاشة `_ExplanationVideoScreen` (WebView + iframe Bunny بتوكن مؤقت، بدون كشف الرابط).
- `test/fakes/fake_student_quiz_repository.dart` أُضيفت له الدالة + عدّاد `explanationVideoCalls`.

## حالة البيانات وقتها
51 سؤالًا في القاعدة، **واحد فقط** به رقم فيديو (`26139d2e-16a0-405a-8734-a45235bd1e37`) في اختبار «تجريبي» غير المنشور. الواجبات الحقيقية المنشورة (3 اختبارات × 10 أسئلة) لا تحتوي أي أرقام فيديو — أي أن الحقل الفاضي سببه أنه لم يُملأ أصلًا، لا خلل في الحفظ.

## ما يتبقّى للتحقق النهائي
اختبار حيّ: وضع رقم فيديو Bunny صالح في سؤال داخل واجب منشور، ثم حلّ الواجب بحساب طالب مشترك والضغط على الزر — على المنصة وعلى التطبيق.

## ⚠️ ملاحظة مرتبطة
فيديو شرح الإجابة **مالوش علامة مائية** لحد دلوقتي — انظر [screenshot_protection](screenshot_protection.md).
