-- Existing platform-3 classroom: one daily wheel reward in shared class credits.
-- Keeps accounts, balances, records, reservations and all device practice history.
begin;
-- Shared daily wheel: one server-owned class-credit receipt per classroom day.
do $$ begin
 if to_regprocedure('csl_private.teacher()') is null then raise exception 'Install the platform-3 Studio upgrade before the class-credit wheel.'; end if;
end $$;
create or replace function csl_private.wheel_now() returns timestamptz
language sql volatile set search_path='' as $$ select clock_timestamp(); $$;
revoke all on function csl_private.wheel_now() from public,anon,authenticated;
create or replace function csl_private.wheel_entropy() returns bigint
language sql volatile set search_path='' as $$
 select ('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint;
$$;
revoke all on function csl_private.wheel_entropy() from public,anon,authenticated;
create table if not exists csl_private.daily_wheel_claims (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.csl_profiles(user_id) on delete cascade,
 request_id uuid not null, claim_date date not null, timezone text not null,
 maximum integer not null check(maximum between 0 and 500),
 credits integer not null check(credits>=0 and credits<=maximum),
 slot integer not null check(slot between 0 and 5),
 created_at timestamptz not null default now(),
 unique(user_id,request_id), unique(user_id,claim_date)
);
alter table csl_private.daily_wheel_claims enable row level security;
revoke all on csl_private.daily_wheel_claims from public,anon,authenticated;
create or replace function csl_private.wheel_receipt(c csl_private.daily_wheel_claims) returns jsonb
language sql immutable set search_path='' as $$
 select case when (c).id is null then null else jsonb_build_object('claim_date',(c).claim_date,'credits',(c).credits,'slot',(c).slot,'maximum',(c).maximum) end;
$$;
revoke all on function csl_private.wheel_receipt(csl_private.daily_wheel_claims) from public,anon,authenticated;
create or replace function csl_private.wheel_snapshot(uid uuid,p_time timestamptz) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare tz text; today date; r jsonb; cap integer; student_value boolean; saved csl_private.daily_wheel_claims; balance integer;
begin
 select rules into r from public.csl_settings where id;
 tz:=coalesce(r->>'timezone','Asia/Manila');
 cap:=csl_private.integer_field(r,'spinMax',0,500);
 today:=(p_time at time zone tz)::date;
 student_value:=not public.csl_is_teacher();
 select credits into balance from public.csl_wallets where user_id=uid for share;
 select * into saved from csl_private.daily_wheel_claims where user_id=uid and claim_date=today;
 return jsonb_build_object('version',1,'basis','class_credits','student',student_value,'timezone',tz,'server_day',today,
 'maximum',cap,'eligible',student_value and saved.id is null,'balance',coalesce(balance,0),'receipt',csl_private.wheel_receipt(saved));
end $$;
revoke all on function csl_private.wheel_snapshot(uuid,timestamptz) from public,anon,authenticated;
create or replace function csl_private.wheel_snapshot(uid uuid) returns jsonb
language sql volatile security definer set search_path='' as $$
 select csl_private.wheel_snapshot(uid,csl_private.wheel_now());
$$;
revoke all on function csl_private.wheel_snapshot(uuid) from public,anon,authenticated;
create or replace function public.csl_daily_wheel() returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); begin return csl_private.wheel_snapshot(uid); end $$;
revoke all on function public.csl_daily_wheel() from public,anon;
grant execute on function public.csl_daily_wheel() to authenticated;
create or replace function public.csl_spin_daily_wheel(p_user_id uuid,p_expected_date date,p_request_id uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); tz text; today date; at_time timestamptz; r jsonb; cap integer; balance integer;
 saved csl_private.daily_wheel_claims; entropy bigint; outcomes bigint; ceiling bigint; reward integer; slot_value integer;
begin
 if public.csl_is_teacher() then raise exception 'Daily wheel claims are for student accounts.'; end if;
 if p_request_id is null or p_expected_date is null then raise exception 'Choose a valid daily wheel request.'; end if;
 select rules into r from public.csl_settings where id for share;
 select credits into balance from public.csl_wallets where user_id=uid for update;
 if not found then raise exception 'Your classroom wallet is not ready. Contact your teacher.'; end if;
 at_time:=csl_private.wheel_now();
 select * into saved from csl_private.daily_wheel_claims where user_id=uid and request_id=p_request_id;
 if found then
  if saved.claim_date is distinct from p_expected_date then raise exception 'This spin ID was already used for another date.'; end if;
  return jsonb_build_object('wheel',csl_private.wheel_snapshot(uid,at_time),'awarded',0,'already_claimed',true,'receipt',csl_private.wheel_receipt(saved));
 end if;
 tz:=coalesce(r->>'timezone','Asia/Manila');
 today:=(at_time at time zone tz)::date;
 if p_expected_date is distinct from today then raise exception 'A new classroom day has started. Refresh the wheel before spinning.'; end if;
 select * into saved from csl_private.daily_wheel_claims where user_id=uid and claim_date=today;
 if found then return jsonb_build_object('wheel',csl_private.wheel_snapshot(uid,at_time),'awarded',0,'already_claimed',true,'receipt',csl_private.wheel_receipt(saved)); end if;
 cap:=csl_private.integer_field(r,'spinMax',0,500);
 outcomes:=(cap+1)*6; ceiling:=4294967296-(4294967296%outcomes);
 loop
  entropy:=csl_private.wheel_entropy();
  exit when entropy<ceiling;
 end loop;
 reward:=(entropy%(cap+1))::integer; slot_value:=((entropy/(cap+1))%6)::integer;
 if balance+reward>10000000 then raise exception 'Your class-credit balance cannot hold another reward. Contact your teacher.'; end if;
 insert into csl_private.daily_wheel_claims(user_id,request_id,claim_date,timezone,maximum,credits,slot)
 values(uid,p_request_id,today,tz,cap,reward,slot_value) returning * into saved;
 insert into public.csl_credit_ledger(user_id,kind,reference,amount,note)
 values(uid,'daily_wheel',saved.id::text,reward,'Daily wheel: '||today||' ('||tz||')');
 update public.csl_wallets set credits=credits+reward where user_id=uid;
 return jsonb_build_object('wheel',csl_private.wheel_snapshot(uid,at_time),'awarded',reward,'already_claimed',false,'receipt',csl_private.wheel_receipt(saved));
end $$;
revoke all on function public.csl_spin_daily_wheel(uuid,date,uuid) from public,anon;
grant execute on function public.csl_spin_daily_wheel(uuid,date,uuid) to authenticated;
create or replace function public.csl_backend_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions),'platform',3,
 'accounts',case when to_regprocedure('public.csl_scientist_profile(uuid)') is null then 0 else 1 end,
 'community',case when to_regprocedure('public.csl_classmate_directory(text,boolean,integer)') is not null then 2 when to_regprocedure('public.csl_social_home()') is not null then 1 else 0 end,
 'profile_styles',case when to_regprocedure('public.csl_profile_styles(uuid[])') is null then 0 else 1 end,
 'credit_rankings',case when to_regprocedure('public.csl_credit_leaderboard(text,integer,integer)') is null then 0 else 1 end,
 'daily_calendar',case when to_regprocedure('public.csl_daily_calendar()') is null then 0 else 1 end,
 'daily_wheel',case when to_regprocedure('public.csl_daily_wheel()') is null then 0 else 1 end);
$$;
revoke all on function public.csl_backend_status() from public;
grant execute on function public.csl_backend_status() to anon,authenticated;
notify pgrst,'reload schema';

commit;
