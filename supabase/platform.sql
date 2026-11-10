-- Platform upgrade, assembled with the canonical bank by backend:sql.
-- Apply upgrade.sql as the project owner. No browser credential can run DDL.
alter table public.csl_profiles add column if not exists active boolean not null default true;
alter table public.csl_profiles add column if not exists photo_path text;

create table if not exists public.csl_settings (
 id boolean primary key default true check(id), rules jsonb not null, game jsonb not null, version bigint not null default 1
);
-- @seed-settings@
create table if not exists public.csl_wallets (
 user_id uuid primary key references public.csl_profiles(user_id) on delete cascade,
 credits integer not null default 0 check(credits between 0 and 10000000)
);
create table if not exists public.csl_credit_ledger (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.csl_profiles(user_id) on delete cascade,
 kind text not null, reference text not null, amount integer not null, note text not null default '', created_at timestamptz not null default now(),
 unique(user_id,kind,reference)
);
create index if not exists csl_credit_ledger_user_time on public.csl_credit_ledger(user_id,created_at);
create table if not exists public.csl_items (
 id text primary key check(id ~ '^[a-z0-9_-]{1,64}$'), name text not null check(char_length(name) between 2 and 80),
 description text not null default '' check(char_length(description)<=500), price integer not null check(price between 1 and 10000),
 stock integer not null check(stock between 0 and 100000), icon text not null, color text not null, category text not null,
 active boolean not null default true, version bigint not null default 1
);
-- @seed-items@
create table if not exists public.csl_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.csl_profiles(user_id) on delete cascade,
 request_id uuid not null, item_id text not null references public.csl_items(id), item_name text not null, price integer not null check(price>0),
 code text not null unique, status text not null default 'reserved' check(status in ('reserved','collected','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,request_id)
);
create index if not exists csl_orders_user_time on public.csl_orders(user_id,created_at desc);
create table if not exists public.csl_question_overrides (
 question_id text primary key, question jsonb not null, active boolean not null default true, version bigint not null default 1,
 updated_at timestamptz not null default now()
);
create table if not exists csl_private.question_versions (
 question_id text not null references csl_private.questions(id), revision integer not null check(revision>=0), question jsonb not null,
 primary key(question_id,revision)
);
alter table csl_private.question_versions enable row level security;
revoke all on csl_private.question_versions from public,anon,authenticated;
create or replace function csl_private.normalized_answers(value jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(a||jsonb_build_object('question_version',coalesce(a->'question_version','0'::jsonb))),'[]') from jsonb_array_elements(value) a;
$$;
revoke all on function csl_private.normalized_answers(jsonb) from public,anon,authenticated;
create table if not exists public.csl_attempt_notes (
 attempt_id uuid primary key references public.csl_quiz_attempts(id) on delete cascade,
 note text not null check(char_length(note)<=500), teacher_id uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.csl_teacher_activity (
 id bigint generated always as identity primary key, actor uuid references auth.users(id) on delete set null,
 action text not null, subject text not null, note text not null default '', before_value jsonb, after_value jsonb,
 created_at timestamptz not null default now()
);
create table if not exists csl_private.teacher_requests (
 actor uuid not null references auth.users(id) on delete cascade, request_id uuid not null, action text not null, body jsonb not null, result jsonb not null,
 primary key(actor,request_id)
);
do $$ declare t text; begin
 foreach t in array array['csl_settings','csl_wallets','csl_credit_ledger','csl_items','csl_orders','csl_question_overrides','csl_attempt_notes','csl_teacher_activity'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
alter table csl_private.teacher_requests enable row level security;
revoke all on csl_private.teacher_requests from public,anon,authenticated;

create or replace function public.csl_has_access() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.csl_profiles where user_id=(select auth.uid()) and active);
$$;
revoke all on function public.csl_has_access() from public,anon;
grant execute on function public.csl_has_access() to authenticated;
create or replace function public.csl_is_teacher() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.csl_teachers t join public.csl_profiles p using(user_id) where t.user_id=(select auth.uid()) and p.active);
$$;
create or replace function csl_private.actor(expected uuid default null) returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); begin
 if uid is null or (expected is not null and expected is distinct from uid) then raise exception 'Sign in with the account that started this action.' using errcode='42501'; end if;
 if not public.csl_has_access() then raise exception 'Your account is paused. Please contact your teacher.' using errcode='42501'; end if;
 return uid;
end $$;
create or replace function csl_private.teacher() returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); begin
 if not public.csl_is_teacher() then raise exception 'Teacher access is required.' using errcode='42501'; end if; return uid;
end $$;
drop policy if exists csl_profiles_read on public.csl_profiles;
create policy csl_profiles_read on public.csl_profiles for select to authenticated using(public.csl_has_access() and (user_id=auth.uid() or public.csl_is_teacher()));
drop policy if exists csl_attempts_read on public.csl_quiz_attempts;
create policy csl_attempts_read on public.csl_quiz_attempts for select to authenticated using(public.csl_has_access() and (user_id=auth.uid() or public.csl_is_teacher()));

create or replace function csl_private.create_wallet() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.csl_wallets(user_id,credits) values(new.user_id,coalesce((select (rules->>'starterMerits')::int from public.csl_settings where id),24)) on conflict do nothing;
 return new;
end $$;
drop trigger if exists csl_profile_wallet on public.csl_profiles;
create trigger csl_profile_wallet after insert on public.csl_profiles for each row execute function csl_private.create_wallet();
insert into public.csl_wallets(user_id,credits) select user_id,(select (rules->>'starterMerits')::int from public.csl_settings where id) from public.csl_profiles on conflict do nothing;

create or replace function csl_private.credit_award(uid uuid,kind_value text,ref text,requested integer) returns integer language plpgsql security definer set search_path='' as $$
declare cfg jsonb; used integer; award integer; day_value date; begin
 if requested<0 or requested>10000 then raise exception 'Invalid credit award.'; end if;
 perform 1 from public.csl_wallets where user_id=uid for update;
 if exists(select 1 from public.csl_credit_ledger where user_id=uid and kind=kind_value and reference=ref) then return 0; end if;
 select rules into cfg from public.csl_settings where id;
 day_value:=(clock_timestamp() at time zone (cfg->>'timezone'))::date;
 select coalesce(sum(amount),0) into used from public.csl_credit_ledger where user_id=uid and kind in ('quiz','arcade') and (created_at at time zone (cfg->>'timezone'))::date=day_value;
 award:=greatest(0,least(requested,(cfg->>'dailyCap')::int-used));
 insert into public.csl_credit_ledger(user_id,kind,reference,amount) values(uid,kind_value,ref,award);
 update public.csl_wallets set credits=credits+award where user_id=uid;
 return award;
end $$;
create or replace function csl_private.credit_attempt(attempt uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.csl_quiz_attempts; cfg jsonb; earned integer:=0; streak integer:=0; entry jsonb; rate integer; begin
 select * into a from public.csl_quiz_attempts where id=attempt;
 if not found then raise exception 'Quiz record not found.'; end if;
 select rules into cfg from public.csl_settings where id;
 rate:=(cfg->>case a.level when 'easy' then 'meritEasy' when 'medium' then 'meritMedium' else 'meritHard' end)::int;
 for entry in select value from jsonb_array_elements(a.responses) loop
  if (entry->>'correct')::boolean then
   streak:=streak+1; earned:=earned+rate+case when streak%(cfg->>'comboEvery')::int=0 then (cfg->>'comboBonus')::int else 0 end;
  else streak:=0; end if;
 end loop;
 perform csl_private.credit_award(a.user_id,'quiz',a.id::text,earned);
end $$;

create or replace function public.csl_backend_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions),'platform',2);
$$;
create or replace function public.csl_my_profile() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); p public.csl_profiles; begin
 select * into p from public.csl_profiles where user_id=uid;
 return jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'grade',p.grade,'section',p.section,'is_teacher',public.csl_is_teacher(),'photo_path',p.photo_path,'credits',(select credits from public.csl_wallets where user_id=uid));
end $$;
create or replace function public.csl_update_profile(p_name text,p_grade integer,p_section text,p_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); begin
 if char_length(btrim(p_name)) not between 2 and 40 or p_grade not between 7 and 10 or char_length(p_section)>40 or p_name is null or p_grade is null or p_section is null then raise exception 'Check your name, grade and section.'; end if;
 update public.csl_profiles set display_name=btrim(p_name),grade=p_grade,section=btrim(p_section) where user_id=uid;
end $$;
create or replace function public.csl_my_lab(p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); cfg public.csl_settings; begin
 select * into cfg from public.csl_settings where id;
 return jsonb_build_object('credits',(select credits from public.csl_wallets where user_id=uid),'rules',cfg.rules,'game',cfg.game,'settings_version',cfg.version,
  'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.category,i.name) from public.csl_items i where active),'[]'),
  'orders',coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from (select * from public.csl_orders where user_id=uid order by created_at desc limit 200) o),'[]'),
  'overrides',coalesce((select jsonb_agg(jsonb_build_object('question',question,'active',active,'version',version)) from public.csl_question_overrides),'[]'));
end $$;
revoke all on function public.csl_my_lab(uuid) from public,anon;
grant execute on function public.csl_my_lab(uuid) to authenticated;

create or replace function public.csl_reserve_item(p_user_id uuid,p_request_id uuid,p_item_id text,p_expected_price integer,p_expected_version bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); item public.csl_items; previous public.csl_orders; result public.csl_orders; balance integer; begin
 if p_request_id is null then raise exception 'A reservation ID is required.'; end if;
 select credits into balance from public.csl_wallets where user_id=uid for update;
 select * into previous from public.csl_orders where user_id=uid and request_id=p_request_id;
 if found then
  if previous.item_id is distinct from p_item_id or previous.price is distinct from p_expected_price then raise exception 'This reservation ID belongs to another request.'; end if;
  return to_jsonb(previous);
 end if;
 select * into item from public.csl_items where id=p_item_id for update;
 if not found or not item.active or item.stock<1 then raise exception 'This item is out of stock. Refresh the shelf.'; end if;
 if item.price is distinct from p_expected_price or item.version is distinct from p_expected_version then raise exception 'This item changed. Refresh the shelf and review its price before reserving.'; end if;
 if balance<item.price then raise exception 'You need more class credits for this item.'; end if;
 update public.csl_wallets set credits=credits-item.price where user_id=uid;
 update public.csl_items set stock=stock-1,version=version+1 where id=item.id;
 insert into public.csl_orders(user_id,request_id,item_id,item_name,price,code) values(uid,p_request_id,item.id,item.name,item.price,'CSL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))) returning * into result;
 insert into public.csl_credit_ledger(user_id,kind,reference,amount,note) values(uid,'reservation',result.id::text,-item.price,item.name);
 return to_jsonb(result);
end $$;
revoke all on function public.csl_reserve_item(uuid,uuid,text,integer,bigint) from public,anon;
grant execute on function public.csl_reserve_item(uuid,uuid,text,integer,bigint) to authenticated;

-- Images are private; signed read URLs are created only for authorized viewers.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('csl-avatars','csl-avatars',false,262144,array['image/webp'])
 on conflict(id) do update set public=false,file_size_limit=262144,allowed_mime_types=array['image/webp'];
drop policy if exists csl_avatar_read on storage.objects;
create policy csl_avatar_read on storage.objects for select to authenticated using(bucket_id='csl-avatars' and public.csl_has_access() and (split_part(name,'/',1)=auth.uid()::text or public.csl_is_teacher()));
drop policy if exists csl_avatar_insert on storage.objects;
create policy csl_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='csl-avatars' and public.csl_has_access() and split_part(name,'/',1)=auth.uid()::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
drop policy if exists csl_avatar_delete on storage.objects;
create policy csl_avatar_delete on storage.objects for delete to authenticated using(bucket_id='csl-avatars' and public.csl_has_access() and split_part(name,'/',1)=auth.uid()::text);
create or replace function public.csl_set_photo(p_user_id uuid,p_path text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); begin
 if p_path is not null and (split_part(p_path,'/',1)<>uid::text or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' or not exists(select 1 from storage.objects where bucket_id='csl-avatars' and name=p_path)) then raise exception 'Upload a valid profile photo to your own folder.'; end if;
 update public.csl_profiles set photo_path=p_path where user_id=uid;
end $$;
revoke all on function public.csl_set_photo(uuid,text) from public,anon;
grant execute on function public.csl_set_photo(uuid,text) to authenticated;

revoke all on function csl_private.actor(uuid),csl_private.teacher(),csl_private.create_wallet(),csl_private.credit_award(uuid,text,text,integer),csl_private.credit_attempt(uuid) from public,anon,authenticated;
