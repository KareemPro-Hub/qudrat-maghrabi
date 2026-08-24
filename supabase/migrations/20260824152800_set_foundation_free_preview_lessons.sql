-- Keep exactly the first three published lessons of the foundation course
-- available as the free preview shown by the website and mobile apps.

with target_courses as (
  select id
  from public.courses
  where title = 'دورة تأسيس 2027'
    and is_published = true
    and parent_course_id is not null
),
ranked_lessons as (
  select
    l.id,
    row_number() over (
      partition by l.course_id
      order by l.order_index asc, l.created_at asc, l.id asc
    ) as lesson_rank
  from public.lessons l
  where l.course_id in (select id from target_courses)
    and l.is_published = true
)
update public.lessons l
set is_free_preview = (ranked_lessons.lesson_rank <= 3)
from ranked_lessons
where l.id = ranked_lessons.id;
