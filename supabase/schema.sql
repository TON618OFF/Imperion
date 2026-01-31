create extension if not exists pgcrypto;

create type public.lesson_type as enum ('theory','practice','exam');
create type public.difficulty as enum ('лёгкий','средний','сложный');
create type public.programming_language as enum ('python','javascript','cpp','c','go');
create type public.progress_status as enum ('не_начат','в_процессе','завершён');
create type public.achievement_rarity as enum ('common','rare','epic','legendary');
create type public.user_role as enum ('пользователь','ментор','администратор');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  username text,
  avatar_url text,
  bio text,
  role public.user_role not null default 'пользователь',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique on public.profiles (username) where username is not null;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system',
  language_code text not null default 'ru',
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_xp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp bigint not null default 0,
  level integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid,
  lecture_id uuid,
  amount integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists xp_transactions_user_id_created_at_idx on public.xp_transactions (user_id, created_at desc);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  type public.lesson_type not null,
  difficulty public.difficulty not null,
  language public.programming_language not null,
  order_index integer not null default 0,
  estimated_minutes integer,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_language_difficulty_idx on public.lessons (language, difficulty);
create index if not exists lessons_published_order_idx on public.lessons (published, order_index);

create table if not exists public.lesson_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  order_index integer not null default 0,
  content_markdown text,
  starter_code text,
  solution_code text,
  tests jsonb not null default '{}'::jsonb,
  max_attempts integer,
  created_at timestamptz not null default now()
);

create index if not exists lesson_items_lesson_id_order_idx on public.lesson_items (lesson_id, order_index);

create table if not exists public.lesson_hints (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.lesson_items(id) on delete cascade,
  order_index integer not null default 0,
  hint_markdown text not null,
  penalty_xp integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lesson_hints_item_id_order_idx on public.lesson_hints (item_id, order_index);

create table if not exists public.user_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status public.progress_status not null default 'не_начат',
  started_at timestamptz,
  completed_at timestamptz,
  best_score numeric,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists user_lesson_progress_user_id_status_idx on public.user_lesson_progress (user_id, status);

create table if not exists public.user_lesson_item_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.lesson_items(id) on delete cascade,
  status public.progress_status not null default 'не_начат',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.code_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  item_id uuid references public.lesson_items(id) on delete set null,
  language public.programming_language not null,
  code text not null,
  stdin text,
  piston_result jsonb not null default '{}'::jsonb,
  passed boolean,
  score numeric,
  created_at timestamptz not null default now()
);

create index if not exists code_submissions_user_id_created_at_idx on public.code_submissions (user_id, created_at desc);
create index if not exists code_submissions_lesson_id_created_at_idx on public.code_submissions (lesson_id, created_at desc);

create table if not exists public.user_hint_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  hint_id uuid not null references public.lesson_hints(id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (user_id, hint_id)
);

create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  language public.programming_language not null,
  title text not null,
  summary text,
  order_index integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'xp_transactions_lesson_id_fkey'
  ) then
    alter table public.xp_transactions
    add constraint xp_transactions_lesson_id_fkey
    foreign key (lesson_id) references public.lessons(id)
    on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'xp_transactions_lecture_id_fkey'
  ) then
    alter table public.xp_transactions
    add constraint xp_transactions_lecture_id_fkey
    foreign key (lecture_id) references public.lectures(id)
    on delete set null;
  end if;
end
$$;

create index if not exists lectures_language_order_idx on public.lectures (language, order_index);
create index if not exists lectures_published_order_idx on public.lectures (published, order_index);

create table if not exists public.lecture_sections (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  title text,
  order_index integer not null default 0,
  content_markdown text not null,
  created_at timestamptz not null default now()
);

create index if not exists lecture_sections_lecture_id_order_idx on public.lecture_sections (lecture_id, order_index);

create table if not exists public.user_lecture_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  last_section_id uuid references public.lecture_sections(id) on delete set null,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lecture_id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  rarity public.achievement_rarity not null default 'common',
  icon text,
  points integer not null default 0,
  criteria_type text,
  criteria jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, achievement_id)
);

create index if not exists user_achievements_user_id_earned_at_idx on public.user_achievements (user_id, earned_at desc);

create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.bootstrap_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles(id)
  values (v_uid)
  on conflict (id) do nothing;

  insert into public.user_settings(user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  insert into public.user_xp(user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  insert into public.user_streaks(user_id)
  values (v_uid)
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function public.bootstrap_current_user() to authenticated;

create or replace function public.evaluate_lesson_submission(p_lesson_id uuid, p_piston_result jsonb)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_expected_stdout text;
  v_stdout text;
  v_stderr text;
  v_code text;
begin
  select li.tests->>'expected_stdout'
  into v_expected_stdout
  from public.lesson_items li
  where li.lesson_id = p_lesson_id
  order by li.order_index asc
  limit 1;

  if v_expected_stdout is null then
    return false;
  end if;

  v_stdout := coalesce(p_piston_result->>'stdout', p_piston_result->>'output', '');
  v_stderr := coalesce(p_piston_result->>'stderr', '');
  v_code := coalesce(p_piston_result->>'code', '0');

  v_stdout := regexp_replace(v_stdout, E'\\r\\n', E'\\n', 'g');
  v_expected_stdout := regexp_replace(v_expected_stdout, E'\\r\\n', E'\\n', 'g');

  v_stdout := regexp_replace(v_stdout, E'[\\s\\n]+$', '', 'g');
  v_expected_stdout := regexp_replace(v_expected_stdout, E'[\\s\\n]+$', '', 'g');

  if v_code <> '0' then
    return false;
  end if;

  if regexp_replace(v_stderr, E'[\\s\\n]+$', '', 'g') <> '' then
    return false;
  end if;

  return v_stdout = v_expected_stdout;
end;
$$;

create or replace function public.complete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_now timestamptz;
  v_already_completed boolean;
  v_has_passed boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select (status = 'завершён')
  into v_already_completed
  from public.user_lesson_progress
  where user_id = v_uid and lesson_id = p_lesson_id;

  if coalesce(v_already_completed, false) then
    return;
  end if;

  select exists (
    select 1
    from public.code_submissions cs
    where cs.user_id = v_uid
      and cs.lesson_id = p_lesson_id
      and public.evaluate_lesson_submission(p_lesson_id, cs.piston_result) = true
  ) into v_has_passed;

  if not coalesce(v_has_passed, false) then
    raise exception 'Lesson requirements not satisfied';
  end if;

  v_now := now();

  insert into public.user_lesson_progress(user_id, lesson_id, status, started_at, completed_at, last_attempt_at, updated_at)
  values (v_uid, p_lesson_id, 'завершён', v_now, v_now, v_now, v_now)
  on conflict (user_id, lesson_id) do update
  set status = 'завершён',
      completed_at = v_now,
      last_attempt_at = v_now,
      updated_at = v_now;
end;
$$;

grant execute on function public.complete_lesson(uuid) to authenticated;

create or replace function public.complete_lecture(p_lecture_id uuid, p_last_section_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_now timestamptz;
  v_already_completed boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select completed
  into v_already_completed
  from public.user_lecture_progress
  where user_id = v_uid and lecture_id = p_lecture_id;

  if coalesce(v_already_completed, false) then
    return;
  end if;

  v_now := now();

  insert into public.user_lecture_progress(user_id, lecture_id, last_section_id, completed, updated_at)
  values (v_uid, p_lecture_id, p_last_section_id, true, v_now)
  on conflict (user_id, lecture_id) do update
  set last_section_id = coalesce(excluded.last_section_id, public.user_lecture_progress.last_section_id),
      completed = true,
      updated_at = v_now;
end;
$$;

grant execute on function public.complete_lecture(uuid, uuid) to authenticated;

create or replace function public.compute_level(p_xp bigint) returns integer
language sql
immutable
as $$
select greatest(1, floor(sqrt(greatest(p_xp, 0) / 100.0))::int + 1)
$$;

create or replace function public.award_achievement(p_user_id uuid, p_slug text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement_id uuid;
begin
  select id into v_achievement_id
  from public.achievements
  where slug = p_slug and published = true;

  if v_achievement_id is null then
    return;
  end if;

  insert into public.user_achievements(user_id, achievement_id, metadata)
  values (p_user_id, v_achievement_id, coalesce(p_metadata, '{}'::jsonb))
  on conflict do nothing;
end;
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.user_settings(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_xp(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_streaks(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.add_xp_from_transaction() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_xp bigint;
  v_new_level integer;
begin
  update public.user_xp
  set xp = xp + new.amount,
      updated_at = now()
  where user_id = new.user_id
  returning xp into v_new_xp;

  if v_new_xp is null then
    insert into public.user_xp(user_id, xp, level)
    values (new.user_id, greatest(0, new.amount), public.compute_level(greatest(0, new.amount)))
    on conflict (user_id) do update set xp = public.user_xp.xp + excluded.xp;

    select xp into v_new_xp from public.user_xp where user_id = new.user_id;
  end if;

  v_new_level := public.compute_level(v_new_xp);

  update public.user_xp
  set level = v_new_level,
      updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists xp_transactions_apply on public.xp_transactions;
create trigger xp_transactions_apply
after insert on public.xp_transactions
for each row execute procedure public.add_xp_from_transaction();

create or replace function public.on_lesson_completed_awards() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date;
  v_prev_date date;
  v_current integer;
  v_best integer;
  v_lang public.programming_language;
  v_total_lang_lessons integer;
  v_completed_lang_lessons integer;
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.status = 'завершён' and (old.status is distinct from new.status) then
    insert into public.xp_transactions(user_id, lesson_id, amount, reason, metadata)
    values (new.user_id, new.lesson_id, 100, 'lesson_completed', jsonb_build_object('lesson_id', new.lesson_id));

    v_today := (now() at time zone 'utc')::date;
    select last_activity_date, current_streak, best_streak
    into v_prev_date, v_current, v_best
    from public.user_streaks
    where user_id = new.user_id
    for update;

    if v_prev_date is null then
      v_current := 1;
    elsif v_prev_date = v_today then
      v_current := v_current;
    elsif v_prev_date = (v_today - 1) then
      v_current := v_current + 1;
    else
      v_current := 1;
    end if;

    v_best := greatest(coalesce(v_best, 0), v_current);

    update public.user_streaks
    set current_streak = v_current,
        best_streak = v_best,
        last_activity_date = v_today,
        updated_at = now()
    where user_id = new.user_id;

    perform public.award_achievement(new.user_id, 'first_lesson', jsonb_build_object('lesson_id', new.lesson_id));

    if v_current >= 3 then
      perform public.award_achievement(new.user_id, 'streak_3');
    end if;
    if v_current >= 7 then
      perform public.award_achievement(new.user_id, 'streak_7');
    end if;
    if v_current >= 30 then
      perform public.award_achievement(new.user_id, 'streak_30');
    end if;

    select language into v_lang from public.lessons where id = new.lesson_id;

    if v_lang is not null then
      select count(*) into v_total_lang_lessons
      from public.lessons
      where language = v_lang and published = true;

      select count(*) into v_completed_lang_lessons
      from public.user_lesson_progress ulp
      join public.lessons l on l.id = ulp.lesson_id
      where ulp.user_id = new.user_id and ulp.status = 'завершён' and l.language = v_lang and l.published = true;

      if v_total_lang_lessons > 0 and v_completed_lang_lessons >= v_total_lang_lessons then
        perform public.award_achievement(new.user_id, 'language_mastery_' || v_lang::text);
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists user_lesson_progress_completed_awards on public.user_lesson_progress;
create trigger user_lesson_progress_completed_awards
after insert or update on public.user_lesson_progress
for each row execute procedure public.on_lesson_completed_awards();

create or replace function public.prevent_uncomplete_lesson_progress() returns trigger
language plpgsql
as $$
begin
  if old.status = 'завершён' and new.status is distinct from old.status then
    raise exception 'Lesson progress cannot be reverted once completed';
  end if;
  return new;
end;
$$;

drop trigger if exists user_lesson_progress_prevent_uncomplete on public.user_lesson_progress;
create trigger user_lesson_progress_prevent_uncomplete
before update on public.user_lesson_progress
for each row execute procedure public.prevent_uncomplete_lesson_progress();

create or replace function public.on_lecture_completed_awards() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.completed = true and (old.completed is distinct from new.completed) then
    insert into public.xp_transactions(user_id, lecture_id, amount, reason, metadata)
    values (new.user_id, new.lecture_id, 25, 'lecture_completed', jsonb_build_object('lecture_id', new.lecture_id));

    perform public.award_achievement(new.user_id, 'first_lecture', jsonb_build_object('lecture_id', new.lecture_id));
  end if;
  return new;
end;
$$;

drop trigger if exists user_lecture_progress_completed_awards on public.user_lecture_progress;
create trigger user_lecture_progress_completed_awards
after insert or update on public.user_lecture_progress
for each row execute procedure public.on_lecture_completed_awards();

create or replace function public.prevent_uncomplete_lecture_progress() returns trigger
language plpgsql
as $$
begin
  if old.completed = true and new.completed is distinct from old.completed then
    raise exception 'Lecture progress cannot be reverted once completed';
  end if;
  return new;
end;
$$;

drop trigger if exists user_lecture_progress_prevent_uncomplete on public.user_lecture_progress;
create trigger user_lecture_progress_prevent_uncomplete
before update on public.user_lecture_progress
for each row execute procedure public.prevent_uncomplete_lecture_progress();

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons for each row execute procedure public.set_updated_at();
create trigger lectures_set_updated_at before update on public.lectures for each row execute procedure public.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute procedure public.set_updated_at();
create trigger user_xp_set_updated_at before update on public.user_xp for each row execute procedure public.set_updated_at();
create trigger user_lesson_progress_set_updated_at before update on public.user_lesson_progress for each row execute procedure public.set_updated_at();
create trigger user_lesson_item_progress_set_updated_at before update on public.user_lesson_item_progress for each row execute procedure public.set_updated_at();
create trigger user_lecture_progress_set_updated_at before update on public.user_lecture_progress for each row execute procedure public.set_updated_at();
create trigger user_streaks_set_updated_at before update on public.user_streaks for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_xp enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_items enable row level security;
alter table public.lesson_hints enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.user_lesson_item_progress enable row level security;
alter table public.code_submissions enable row level security;
alter table public.user_hint_usage enable row level security;
alter table public.lectures enable row level security;
alter table public.lecture_sections enable row level security;
alter table public.user_lecture_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_streaks enable row level security;

create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_update_admin on public.profiles for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'администратор')
);

create policy user_settings_select_own on public.user_settings for select to authenticated using (auth.uid() = user_id);
create policy user_settings_update_own on public.user_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_xp_select_own on public.user_xp for select to authenticated using (auth.uid() = user_id);

create policy xp_transactions_select_own on public.xp_transactions for select to authenticated using (auth.uid() = user_id);

create policy lessons_select_published on public.lessons for select using (published = true);
create policy lessons_mentor_all on public.lessons for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
);
create policy lesson_items_select on public.lesson_items for select
using (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_id and l.published = true
  )
);
create policy lesson_items_mentor_all on public.lesson_items for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
);
create policy lesson_hints_select on public.lesson_hints for select
using (
  exists (
    select 1
    from public.lesson_items li
    join public.lessons l on l.id = li.lesson_id
    where li.id = item_id and l.published = true
  )
);
create policy lesson_hints_mentor_all on public.lesson_hints for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
);

create policy user_lesson_progress_select_own on public.user_lesson_progress for select to authenticated using (auth.uid() = user_id);
create policy user_lesson_progress_insert_own on public.user_lesson_progress for insert to authenticated with check (auth.uid() = user_id and status <> 'завершён');
create policy user_lesson_progress_update_own on public.user_lesson_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and status <> 'завершён');

create policy user_lesson_item_progress_select_own on public.user_lesson_item_progress for select to authenticated using (auth.uid() = user_id);
create policy user_lesson_item_progress_insert_own on public.user_lesson_item_progress for insert to authenticated with check (auth.uid() = user_id);
create policy user_lesson_item_progress_update_own on public.user_lesson_item_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy code_submissions_select_own on public.code_submissions for select to authenticated using (auth.uid() = user_id);
create policy code_submissions_insert_own on public.code_submissions for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    passed is null
    or passed = public.evaluate_lesson_submission(lesson_id, piston_result)
  )
);

create policy user_hint_usage_select_own on public.user_hint_usage for select to authenticated using (auth.uid() = user_id);
create policy user_hint_usage_insert_own on public.user_hint_usage for insert to authenticated with check (auth.uid() = user_id);

create policy lectures_select_published on public.lectures for select using (published = true);
create policy lectures_mentor_all on public.lectures for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
);
create policy lecture_sections_select on public.lecture_sections for select
using (
  exists (
    select 1
    from public.lectures lec
    where lec.id = lecture_id and lec.published = true
  )
);
create policy lecture_sections_mentor_all on public.lecture_sections for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('ментор', 'администратор'))
);

create policy user_lecture_progress_select_own on public.user_lecture_progress for select to authenticated using (auth.uid() = user_id);
create policy user_lecture_progress_insert_own on public.user_lecture_progress for insert to authenticated with check (auth.uid() = user_id and completed = false);
create policy user_lecture_progress_update_own on public.user_lecture_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and completed = false);

create policy achievements_select on public.achievements for select using (published = true);

create policy user_achievements_select_own on public.user_achievements for select to authenticated using (auth.uid() = user_id);

create policy user_streaks_select_own on public.user_streaks for select to authenticated using (auth.uid() = user_id);

insert into public.achievements (slug, title, description, rarity, points, criteria_type, criteria, published)
values
  ('first_lesson', 'Первые шаги', 'Завершите первый урок', 'common', 10, 'lesson_completed_count', jsonb_build_object('min', 1), true),
  ('first_lecture', 'Первая лекция', 'Завершите первую лекцию', 'common', 5, 'lecture_completed_count', jsonb_build_object('min', 1), true),
  ('streak_3', 'Серия 3 дня', 'Учитесь 3 дня подряд', 'common', 10, 'streak', jsonb_build_object('min_days', 3), true),
  ('streak_7', 'Серия 7 дней', 'Учитесь 7 дней подряд', 'rare', 25, 'streak', jsonb_build_object('min_days', 7), true),
  ('streak_30', 'Серия 30 дней', 'Учитесь 30 дней подряд', 'legendary', 100, 'streak', jsonb_build_object('min_days', 30), true),
  ('language_mastery_python', 'Мастер Python', 'Завершите все уроки по Python', 'epic', 75, 'language_mastery', jsonb_build_object('language', 'python'), true),
  ('language_mastery_javascript', 'Мастер JavaScript', 'Завершите все уроки по JavaScript', 'epic', 75, 'language_mastery', jsonb_build_object('language', 'javascript'), true),
  ('language_mastery_cpp', 'Мастер C++', 'Завершите все уроки по C++', 'epic', 75, 'language_mastery', jsonb_build_object('language', 'cpp'), true),
  ('language_mastery_c', 'Мастер C', 'Завершите все уроки по C', 'epic', 75, 'language_mastery', jsonb_build_object('language', 'c'), true),
  ('language_mastery_go', 'Мастер Go', 'Завершите все уроки по Go', 'epic', 75, 'language_mastery', jsonb_build_object('language', 'go'), true)
on conflict (slug) do nothing;

create or replace view public.v_user_language_stats as
with lessons_completed as (
  select
    ulp.user_id,
    l.language,
    count(*) filter (where ulp.status = 'завершён')::int as lessons_completed
  from public.user_lesson_progress ulp
  join public.lessons l on l.id = ulp.lesson_id
  group by ulp.user_id, l.language
),
submissions_count as (
  select
    cs.user_id,
    cs.language,
    count(*)::int as submissions_count
  from public.code_submissions cs
  group by cs.user_id, cs.language
),
xp_by_lang as (
  select
    xt.user_id,
    l.language,
    sum(xt.amount)::bigint as total_xp
  from public.xp_transactions xt
  join public.lessons l on l.id = xt.lesson_id
  group by xt.user_id, l.language

  union all

  select
    xt.user_id,
    lec.language,
    sum(xt.amount)::bigint as total_xp
  from public.xp_transactions xt
  join public.lectures lec on lec.id = xt.lecture_id
  group by xt.user_id, lec.language
),
xp_agg as (
  select user_id, language, sum(total_xp)::bigint as total_xp
  from xp_by_lang
  group by user_id, language
),
keys as (
  select user_id, language from lessons_completed
  union
  select user_id, language from submissions_count
  union
  select user_id, language from xp_agg
)
select
  k.user_id,
  k.language,
  coalesce(lc.lessons_completed, 0) as lessons_completed,
  coalesce(sc.submissions_count, 0) as submissions_count,
  coalesce(xa.total_xp, 0) as total_xp
from keys k
left join lessons_completed lc on lc.user_id = k.user_id and lc.language = k.language
left join submissions_count sc on sc.user_id = k.user_id and sc.language = k.language
left join xp_agg xa on xa.user_id = k.user_id and xa.language = k.language;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_upload_own on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and auth.uid() = owner);
create policy avatars_update_own on storage.objects for update to authenticated using (bucket_id = 'avatars' and auth.uid() = owner) with check (bucket_id = 'avatars' and auth.uid() = owner);
create policy avatars_delete_own on storage.objects for delete to authenticated using (bucket_id = 'avatars' and auth.uid() = owner);

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
