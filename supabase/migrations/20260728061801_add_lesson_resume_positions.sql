alter table public.lesson_progress
  add column last_position_seconds integer not null default 0,
  add column duration_seconds integer not null default 0;

alter table public.lesson_progress
  add constraint lesson_progress_position_nonnegative
    check (last_position_seconds >= 0),
  add constraint lesson_progress_duration_nonnegative
    check (duration_seconds >= 0),
  add constraint lesson_progress_position_within_duration
    check (duration_seconds = 0 or last_position_seconds <= duration_seconds + 5);

comment on column public.lesson_progress.last_position_seconds is
  'Exact last playback position used to resume a lesson.';
comment on column public.lesson_progress.duration_seconds is
  'Last known video duration for reliable progress and resume.';
