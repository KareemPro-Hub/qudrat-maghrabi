-- Remove anonymous access from existing privileged RPCs and cover foreign keys used by the app.

revoke all on function public.auth_role() from public, anon;
revoke all on function public.get_course_stats() from public, anon;
revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.redeem_discount_code(text, uuid) from public, anon;

grant execute on function public.auth_role() to authenticated, service_role;
grant execute on function public.get_course_stats() to authenticated, service_role;
grant execute on function public.get_my_profile() to authenticated, service_role;
grant execute on function public.redeem_discount_code(text, uuid) to authenticated, service_role;

create index if not exists idx_discount_codes_created_by
  on public.discount_codes(created_by);
create index if not exists idx_enrollments_discount_code_id
  on public.enrollments(discount_code_id);
create index if not exists idx_quiz_questions_created_by
  on public.quiz_questions(created_by);
