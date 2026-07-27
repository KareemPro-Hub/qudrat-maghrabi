-- نفس تشديد الصلاحيات المطبّق على باقي دوال التريجر: لا تُستدعى مباشرةً من العميل
revoke execute on function public.notify_lesson_completed() from public;
revoke execute on function public.notify_lesson_completed() from anon;
revoke execute on function public.notify_lesson_completed() from authenticated;
