-- The Cozy Science Lab: run the generated setup.sql in Supabase SQL Editor.
-- No project secret or database password belongs in this file.
begin;
create schema if not exists csl_private;
revoke all on schema csl_private from public, anon, authenticated;

create table if not exists public.csl_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  grade integer not null default 7 check (grade between 7 and 10),
  section text not null default '' check (char_length(section) <= 40),
  created_at timestamptz not null default now()
);
create table if not exists public.csl_teachers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists csl_private.questions (
  id text primary key,
  question jsonb not null
);
create table if not exists public.csl_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.csl_profiles(user_id) on delete cascade,
  client_run_id uuid not null,
  deck_id text not null check (char_length(deck_id) between 3 and 100),
  level text not null check (level in ('easy','medium','hard')),
  mode text not null check (mode in ('practice','review','daily','boss')),
  started_at timestamptz not null,
  received_at timestamptz not null default now(),
  submitted_answers jsonb not null,
  responses jsonb not null,
  correct integer not null check (correct between 0 and total),
  total integer not null check (total between 1 and 8),
  unique(user_id,client_run_id)
);
create index if not exists csl_quiz_attempts_user_time on public.csl_quiz_attempts(user_id,received_at desc,id desc);
create index if not exists csl_quiz_attempts_time on public.csl_quiz_attempts(received_at desc,id desc);
alter table public.csl_profiles enable row level security;
alter table public.csl_teachers enable row level security;
alter table public.csl_quiz_attempts enable row level security;
alter table csl_private.questions enable row level security;
revoke all on public.csl_profiles, public.csl_teachers, public.csl_quiz_attempts, csl_private.questions from public, anon, authenticated;
grant select on public.csl_profiles,public.csl_quiz_attempts to authenticated;

create or replace function public.csl_is_teacher() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.csl_teachers where user_id=(select auth.uid())); $$;
revoke all on function public.csl_is_teacher() from public,anon;
grant execute on function public.csl_is_teacher() to authenticated;
drop policy if exists csl_profiles_read on public.csl_profiles;
create policy csl_profiles_read on public.csl_profiles for select to authenticated using (user_id=(select auth.uid()) or (select public.csl_is_teacher()));
drop policy if exists csl_attempts_read on public.csl_quiz_attempts;
create policy csl_attempts_read on public.csl_quiz_attempts for select to authenticated using (user_id=(select auth.uid()) or (select public.csl_is_teacher()));

create or replace function csl_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text; v_grade integer;
begin
  v_name:=left(btrim(coalesce(new.raw_user_meta_data->>'display_name','Scientist')),40);
  if char_length(v_name)<2 then v_name:='Scientist'; end if;
  v_grade:=case when coalesce(new.raw_user_meta_data->>'grade','') ~ '^(7|8|9|10)$' then (new.raw_user_meta_data->>'grade')::integer else 7 end;
  insert into public.csl_profiles(user_id,display_name,grade,section)
    values(new.id,v_name,v_grade,left(coalesce(new.raw_user_meta_data->>'section',''),40)) on conflict(user_id) do nothing;
  return new;
end $$;
revoke all on function csl_private.create_profile() from public,anon,authenticated;
drop trigger if exists csl_auth_profile on auth.users;
create trigger csl_auth_profile after insert on auth.users for each row execute function csl_private.create_profile();
insert into public.csl_profiles(user_id,display_name,grade,section)
select id,case when char_length(btrim(coalesce(raw_user_meta_data->>'display_name','')))>1 then left(btrim(raw_user_meta_data->>'display_name'),40) else 'Scientist' end,
case when coalesce(raw_user_meta_data->>'grade','') ~ '^(7|8|9|10)$' then (raw_user_meta_data->>'grade')::integer else 7 end,
left(coalesce(raw_user_meta_data->>'section',''),40) from auth.users on conflict(user_id) do nothing;

create or replace function public.csl_backend_status() returns jsonb
language sql stable security definer set search_path = ''
as $$ select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions)); $$;
revoke all on function public.csl_backend_status() from public;
grant execute on function public.csl_backend_status() to anon,authenticated;

create or replace function public.csl_my_profile() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.csl_profiles;
begin
  if auth.uid() is null then raise exception 'Sign in to view your profile.' using errcode='42501'; end if;
  select * into p from public.csl_profiles where user_id=auth.uid();
  if not found then raise exception 'Your cloud profile is not ready. Ask your teacher to finish setup.'; end if;
  return jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'grade',p.grade,'section',p.section,'is_teacher',public.csl_is_teacher());
end $$;
revoke all on function public.csl_my_profile() from public,anon;
grant execute on function public.csl_my_profile() to authenticated;

create or replace function public.csl_update_profile(p_name text,p_grade integer,p_section text,p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Sign in to update your own profile.' using errcode='42501'; end if;
  if char_length(btrim(p_name)) not between 2 and 40 or p_grade not between 7 and 10 or char_length(p_section)>40 or p_name is null or p_grade is null or p_section is null then raise exception 'Check your name, grade and section.'; end if;
  update public.csl_profiles set display_name=btrim(p_name),grade=p_grade,section=btrim(p_section) where user_id=auth.uid();
end $$;
revoke all on function public.csl_update_profile(text,integer,text,uuid) from public,anon;
grant execute on function public.csl_update_profile(text,integer,text,uuid) to authenticated;

create or replace function csl_private.normalize_answer(v text) returns text
language sql immutable set search_path = ''
as $$ select regexp_replace(translate(lower(regexp_replace(v,'^[[:space:]]+|[[:space:]]+$','','g')), '.,!?',''),'[[:space:]]+',' ','g'); $$;
create or replace function csl_private.correct_answer(q jsonb,v jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare a jsonb; actual double precision; expected double precision;
begin
  if q->>'type'='calc' then
    if jsonb_typeof(v)<>'string' or not (btrim(v#>>'{}') ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$') then return false; end if;
    actual:=(v#>>'{}')::double precision; expected:=(q->>'answer')::double precision;
    return abs(actual-expected)<=coalesce((q->>'tolerance')::double precision,0.01);
  elsif jsonb_typeof(q->'answer')='array' then return coalesce(jsonb_typeof(v)='array' and q->'answer'=v,false);
  elsif jsonb_typeof(q->'answer')='object' then return coalesce(jsonb_typeof(v)='object' and (q->'answer')<@v,false);
  end if;
  if jsonb_typeof(v)<>'string' then return false; end if;
  for a in select value from jsonb_array_elements(jsonb_build_array(q->'answer')||coalesce(q->'accept','[]'::jsonb)) loop
    if csl_private.normalize_answer(a#>>'{}')=csl_private.normalize_answer(v#>>'{}') then return true; end if;
  end loop;
  return false;
exception when numeric_value_out_of_range or invalid_text_representation then return false;
end $$;
revoke all on function csl_private.normalize_answer(text),csl_private.correct_answer(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.csl_record_quiz(p_client_run_id uuid,p_deck_id text,p_level text,p_mode text,p_started_at timestamptz,p_answers jsonb,p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); previous public.csl_quiz_attempts; entry jsonb; q jsonb; graded jsonb:='[]'; seen text[]:='{}'; ok boolean; correct_count integer:=0; total_count integer; created_id uuid; chosen jsonb;
begin
  if uid is null or p_user_id is distinct from uid then raise exception 'Sign in with the account that completed this quiz.' using errcode='42501'; end if;
  if not exists(select 1 from public.csl_profiles where user_id=uid) then raise exception 'Your cloud profile is not ready.'; end if;
  if p_client_run_id is null or p_deck_id is null or char_length(p_deck_id)>100 or p_level is null or p_level not in ('easy','medium','hard') or p_mode is null or p_mode not in ('practice','review','daily','boss') or p_started_at is null or p_started_at>'2100-01-01'::timestamptz or p_started_at<'2020-01-01'::timestamptz or p_answers is null or jsonb_typeof(p_answers)<>'array' or octet_length(p_answers::text)>100000 then raise exception 'This quiz record is not valid.'; end if;
  total_count:=jsonb_array_length(p_answers);
  if total_count not between 1 and 8 then raise exception 'Save between one and eight answered cards.'; end if;
  -- Serialize concurrent retries for this authenticated user's attempt.
  perform pg_advisory_xact_lock(hashtextextended(uid::text||p_client_run_id::text,0));
  select * into previous from public.csl_quiz_attempts where user_id=uid and client_run_id=p_client_run_id;
  if found then
    if previous.deck_id<>p_deck_id or previous.level<>p_level or previous.mode<>p_mode or previous.submitted_answers<>p_answers then raise exception 'This attempt ID already belongs to a different submission.'; end if;
    return jsonb_build_object('id',previous.id,'correct',previous.correct,'total',previous.total);
  end if;
  for entry in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(entry)<>'object' or jsonb_typeof(entry->'question_id')<>'string' or not (entry?'value') or jsonb_typeof(entry->'value') not in ('string','array','object') or (entry->>'question_id')=any(seen) then raise exception 'This quiz contains an invalid or repeated card.'; end if;
    seen:=array_append(seen,entry->>'question_id');
    select question into q from csl_private.questions where id=entry->>'question_id';
    if not found or q->>'deckId'<>p_deck_id or (p_mode<>'review' and q->>'level'<>p_level) then raise exception 'This quiz card does not match the published question bank.'; end if;
    ok:=csl_private.correct_answer(q,entry->'value');
    if ok then correct_count:=correct_count+1; end if;
    chosen:=null;
    if not ok then select value into chosen from jsonb_array_elements(coalesce(q->'options','[]')) where value->>'id'=entry->>'value'; end if;
    graded:=graded||jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('question_id',entry->>'question_id','value',entry->'value','correct',ok,'prompt',q->>'prompt','misconception',chosen->>'misconception')));
  end loop;
  insert into public.csl_quiz_attempts(user_id,client_run_id,deck_id,level,mode,started_at,submitted_answers,responses,correct,total)
    values(uid,p_client_run_id,p_deck_id,p_level,p_mode,p_started_at,p_answers,graded,correct_count,total_count) returning id into created_id;
  return jsonb_build_object('id',created_id,'correct',correct_count,'total',total_count);
end $$;
revoke all on function public.csl_record_quiz(uuid,text,text,text,timestamptz,jsonb,uuid) from public,anon;
grant execute on function public.csl_record_quiz(uuid,text,text,text,timestamptz,jsonb,uuid) to authenticated;

create or replace function public.csl_list_records(p_limit integer default 100,p_offset integer default 0)
returns table(id uuid,user_id uuid,display_name text,grade integer,section text,deck_id text,level text,mode text,correct integer,total integer,received_at timestamptz,responses jsonb)
language sql stable security invoker set search_path = '' as $$
  select a.id,a.user_id,p.display_name,p.grade,p.section,a.deck_id,a.level,a.mode,a.correct,a.total,a.received_at,a.responses
  from public.csl_quiz_attempts a join public.csl_profiles p on p.user_id=a.user_id
  order by a.received_at desc,a.id desc limit greatest(1,least(coalesce(p_limit,100),100)) offset greatest(0,least(coalesce(p_offset,0),1000000));
$$;
revoke all on function public.csl_list_records(integer,integer) from public,anon;
grant execute on function public.csl_list_records(integer,integer) to authenticated;
commit;
