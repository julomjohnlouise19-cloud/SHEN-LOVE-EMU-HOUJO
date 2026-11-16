-- Seven weeks of server-owned daily class-credit rewards. No existing balance is reset.
do $$ begin
 if to_regprocedure('csl_private.teacher()') is null then raise exception 'Install the platform-3 Studio upgrade before daily rewards.'; end if;
end $$;
create or replace function csl_private.calendar_now() returns timestamptz
language sql volatile set search_path='' as $$ select clock_timestamp(); $$;
revoke all on function csl_private.calendar_now() from public,anon,authenticated;

create table if not exists csl_private.daily_calendar_config (
 id boolean primary key default true check(id),
 enabled boolean not null default true,
 daily_credits integer not null default 5 check(daily_credits between 1 and 20),
 weekly_credits integer not null default 10 check(weekly_credits between 1 and 40),
 version bigint not null default 1, check(weekly_credits>=daily_credits)
);
insert into csl_private.daily_calendar_config(id) values(true) on conflict do nothing;
create table if not exists csl_private.daily_calendar_members (
 user_id uuid primary key references public.csl_profiles(user_id) on delete cascade,
 started_on date not null, timezone text not null,
 daily_credits integer not null check(daily_credits between 1 and 20),
 weekly_credits integer not null check(weekly_credits between 1 and 40),
 created_at timestamptz not null default now(), check(weekly_credits>=daily_credits)
);
create table if not exists csl_private.daily_calendar_claims (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references csl_private.daily_calendar_members(user_id) on delete cascade,
 request_id uuid not null, day_number integer not null check(day_number between 1 and 49),
 claim_date date not null, credits integer not null check(credits between 1 and 40),
 created_at timestamptz not null default now(),
 unique(user_id,request_id), unique(user_id,day_number), unique(user_id,claim_date)
);
alter table csl_private.daily_calendar_config enable row level security;
alter table csl_private.daily_calendar_members enable row level security;
alter table csl_private.daily_calendar_claims enable row level security;
revoke all on csl_private.daily_calendar_config,csl_private.daily_calendar_members,csl_private.daily_calendar_claims from public,anon,authenticated;

create or replace function csl_private.calendar_snapshot(uid uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare member csl_private.daily_calendar_members; cfg csl_private.daily_calendar_config;
 tz text; today date; day_value integer; student_value boolean;
begin
 select * into cfg from csl_private.daily_calendar_config where id;
 select * into member from csl_private.daily_calendar_members where user_id=uid;
 select coalesce(member.timezone,rules->>'timezone','Asia/Manila') into tz from public.csl_settings where id;
 today:=(csl_private.calendar_now() at time zone tz)::date;
 day_value:=case when member.user_id is null then 1 else today-member.started_on+1 end;
 student_value:=not exists(select 1 from public.csl_teachers where user_id=uid);
 return jsonb_build_object('version',1,'student',student_value,'enabled',cfg.enabled,'timezone',tz,'server_day',today,
  'started_on',member.started_on,'day_index',day_value,'daily_credits',coalesce(member.daily_credits,cfg.daily_credits),'weekly_credits',coalesce(member.weekly_credits,cfg.weekly_credits),
  'eligible',cfg.enabled and student_value and day_value between 1 and 49 and not exists(select 1 from csl_private.daily_calendar_claims where user_id=uid and claim_date=today),
  'balance',(select credits from public.csl_wallets where user_id=uid),
  'claims',coalesce((select jsonb_agg(jsonb_build_object('day_number',day_number,'claim_date',claim_date,'credits',credits) order by day_number) from csl_private.daily_calendar_claims where user_id=uid),'[]'::jsonb));
end $$;
revoke all on function csl_private.calendar_snapshot(uuid) from public,anon,authenticated;
create or replace function public.csl_daily_calendar() returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); begin return csl_private.calendar_snapshot(uid); end $$;
revoke all on function public.csl_daily_calendar() from public,anon;
grant execute on function public.csl_daily_calendar() to authenticated;

create or replace function public.csl_claim_daily_calendar(p_user_id uuid,p_expected_date date,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); cfg csl_private.daily_calendar_config; member csl_private.daily_calendar_members;
 previous csl_private.daily_calendar_claims; claim csl_private.daily_calendar_claims;
 tz text; today date; day_value integer; reward integer; balance integer;
begin
 if public.csl_is_teacher() then raise exception 'Daily calendar rewards are for student accounts.'; end if;
 if p_user_id is null or p_expected_date is null or p_request_id is null then raise exception 'Refresh your calendar before claiming.'; end if;
 select * into cfg from csl_private.daily_calendar_config where id for share;
 select credits into balance from public.csl_wallets where user_id=uid for update;
 if not found then raise exception 'Your classroom wallet is not ready. Contact your teacher.'; end if;
 select * into previous from csl_private.daily_calendar_claims where user_id=uid and request_id=p_request_id;
 if found then
  if previous.claim_date is distinct from p_expected_date then raise exception 'This claim ID was already used for another date.'; end if;
  return jsonb_build_object('calendar',csl_private.calendar_snapshot(uid),'awarded',0,'already_claimed',true,'receipt',jsonb_build_object('day_number',previous.day_number,'claim_date',previous.claim_date,'credits',previous.credits));
 end if;
 if not cfg.enabled then raise exception 'Daily claims are paused by your teacher. Calendar dates continue to move forward.'; end if;
 select * into member from csl_private.daily_calendar_members where user_id=uid;
 select coalesce(member.timezone,rules->>'timezone','Asia/Manila') into tz from public.csl_settings where id;
 today:=(csl_private.calendar_now() at time zone tz)::date;
 if p_expected_date is distinct from today then raise exception 'A new classroom day has started. Refresh your calendar before claiming.'; end if;
 if member.user_id is null then
  insert into csl_private.daily_calendar_members(user_id,started_on,timezone,daily_credits,weekly_credits)
  values(uid,today,tz,cfg.daily_credits,cfg.weekly_credits) returning * into member;
 end if;
 day_value:=today-member.started_on+1;
 if day_value not between 1 and 49 then raise exception 'Your seven-week calendar has ended. Thank you for showing up for science.'; end if;
 select * into previous from csl_private.daily_calendar_claims where user_id=uid and day_number=day_value;
 if found then
  return jsonb_build_object('calendar',csl_private.calendar_snapshot(uid),'awarded',0,'already_claimed',true,'receipt',jsonb_build_object('day_number',previous.day_number,'claim_date',previous.claim_date,'credits',previous.credits));
 end if;
 reward:=case when day_value%7=0 then member.weekly_credits else member.daily_credits end;
 if balance+reward>10000000 then raise exception 'Your class-credit balance cannot hold another reward. Contact your teacher.'; end if;
 insert into csl_private.daily_calendar_claims(user_id,request_id,day_number,claim_date,credits)
 values(uid,p_request_id,day_value,today,reward) returning * into claim;
 insert into public.csl_credit_ledger(user_id,kind,reference,amount,note)
 values(uid,'daily_calendar',claim.id::text,reward,'Daily calendar: day '||day_value||' of 49 ('||today||')');
 update public.csl_wallets set credits=credits+reward where user_id=uid;
 return jsonb_build_object('calendar',csl_private.calendar_snapshot(uid),'awarded',reward,'already_claimed',false,'receipt',jsonb_build_object('day_number',claim.day_number,'claim_date',claim.claim_date,'credits',claim.credits));
end $$;
revoke all on function public.csl_claim_daily_calendar(uuid,date,uuid) from public,anon;
grant execute on function public.csl_claim_daily_calendar(uuid,date,uuid) to authenticated;

create or replace function public.csl_calendar_settings(p_enabled boolean default null,p_daily integer default null,p_weekly integer default null,p_version bigint default null,p_request_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.teacher(); cfg csl_private.daily_calendar_config; old_value jsonb;
 previous csl_private.teacher_requests; body jsonb; result jsonb;
begin
 if p_enabled is not null or p_daily is not null or p_weekly is not null or p_version is not null or p_request_id is not null then
  if p_enabled is null or p_daily is null or p_weekly is null or p_version is null or p_request_id is null or p_daily not between 1 and 20 or p_weekly not between 1 and 40 or p_weekly<p_daily then raise exception 'Use daily credits from 1-20 and seventh-day credits from 1-40, at least as much as a normal day.'; end if;
  body:=jsonb_build_object('enabled',p_enabled,'daily',p_daily,'weekly',p_weekly,'version',p_version);
  perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request_id::text,2));
  select * into previous from csl_private.teacher_requests where actor=uid and request_id=p_request_id;
  if found then
   if previous.action is distinct from 'daily_calendar_settings' or previous.body is distinct from body then raise exception 'This change ID was already used.'; end if;
   return previous.result;
  end if;
  select * into cfg from csl_private.daily_calendar_config where id for update;
  if cfg.version is distinct from p_version then raise exception 'These calendar settings changed. Refresh before saving.'; end if;
  old_value:=to_jsonb(cfg);
  update csl_private.daily_calendar_config set enabled=p_enabled,daily_credits=p_daily,weekly_credits=p_weekly,version=version+1 where id returning * into cfg;
  insert into public.csl_teacher_activity(actor,action,subject,note,before_value,after_value)
  values(uid,'daily_calendar_settings','49-day calendar','Updated daily reward defaults; existing calendars retain their initial rewards and timezone.',old_value,to_jsonb(cfg));
 else select * into cfg from csl_private.daily_calendar_config where id;
 end if;
 result:=jsonb_build_object('enabled',cfg.enabled,'daily_credits',cfg.daily_credits,'weekly_credits',cfg.weekly_credits,'version',cfg.version,
  'enrolled',(select count(*) from csl_private.daily_calendar_members),
  'claims_today',(select count(*) from csl_private.daily_calendar_claims c join csl_private.daily_calendar_members m using(user_id) where c.claim_date=(csl_private.calendar_now() at time zone m.timezone)::date),
  'credits_awarded',(select coalesce(sum(credits),0) from csl_private.daily_calendar_claims));
 if p_request_id is not null then insert into csl_private.teacher_requests(actor,request_id,action,body,result) values(uid,p_request_id,'daily_calendar_settings',body,result); end if;
 return result;
end $$;
revoke all on function public.csl_calendar_settings(boolean,integer,integer,bigint,uuid) from public,anon;
grant execute on function public.csl_calendar_settings(boolean,integer,integer,bigint,uuid) to authenticated;

create or replace function public.csl_backend_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions),'platform',3,
 'accounts',case when to_regprocedure('public.csl_scientist_profile(uuid)') is null then 0 else 1 end,
 'community',case when to_regprocedure('public.csl_classmate_directory(text,boolean,integer)') is not null then 2 when to_regprocedure('public.csl_social_home()') is not null then 1 else 0 end,
 'profile_styles',case when to_regprocedure('public.csl_profile_styles(uuid[])') is null then 0 else 1 end,
 'credit_rankings',case when to_regprocedure('public.csl_credit_leaderboard(text,integer,integer)') is null then 0 else 1 end,
 'daily_calendar',case when to_regprocedure('public.csl_daily_calendar()') is null then 0 else 1 end);
$$;
revoke all on function public.csl_backend_status() from public;
grant execute on function public.csl_backend_status() to anon,authenticated;
notify pgrst,'reload schema';
