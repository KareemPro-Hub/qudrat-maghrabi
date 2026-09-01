-- دالة إشعار المحتوى الجديد دالة Trigger، مش محتاجة تتنادى من الـ API إطلاقًا.
-- كانت مكشوفة للتنفيذ من anon عبر /rest/v1/rpc، فبنسحب الصلاحية.
revoke execute on function public.notify_students_of_new_content() from public, anon, authenticated;
