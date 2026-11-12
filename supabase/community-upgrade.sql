-- Existing platform-3 classroom: run this entire additive script in SQL Editor.
-- Preserves accounts, photos, quiz records, credits, supplies and private profile data.
begin;
-- Shared learning scores and consent-based classroom profiles. No Auth credentials are exposed.
do $$ begin
 if to_regclass('public.csl_record_labels') is null then raise exception 'Install the Studio upgrade before the community upgrade.'; end if;
end $$;
create table if not exists public.csl_social_profiles (
 user_id uuid primary key references public.csl_profiles(user_id) on delete cascade,
 username text unique check(username ~ '^[a-z][a-z0-9_]{2,19}$' and username not in ('admin','teacher','system','support','moderator')),
 listed boolean not null default false,
 share_photo boolean not null default false,
 share_bio boolean not null default false,
 share_grade boolean not null default false,
 version bigint not null default 1,
 updated_at timestamptz not null default now(),
 check(not listed or username is not null)
);
create table if not exists csl_private.friendships (
 user_low uuid not null references public.csl_profiles(user_id) on delete cascade,
 user_high uuid not null references public.csl_profiles(user_id) on delete cascade,
 requested_by uuid not null references public.csl_profiles(user_id) on delete cascade,
 status text not null check(status in ('pending','accepted','declined','blocked')),
 blocked_by uuid references public.csl_profiles(user_id) on delete cascade,
 version bigint not null default 1,
 updated_at timestamptz not null default now(),
 primary key(user_low,user_high), check(user_low<user_high),
 check(requested_by in (user_low,user_high)),
 check((status='blocked' and blocked_by in (user_low,user_high)) or (status<>'blocked' and blocked_by is null))
);
create index if not exists csl_friendships_high on csl_private.friendships(user_high,status);
create table if not exists csl_private.social_actions (
 user_id uuid not null references public.csl_profiles(user_id) on delete cascade,
 request_id uuid not null, action text not null, payload jsonb not null, result jsonb not null,
 created_at timestamptz not null default now(), primary key(user_id,request_id)
);
create index if not exists csl_social_action_limit on csl_private.social_actions(user_id,created_at desc);
alter table public.csl_social_profiles enable row level security;
alter table csl_private.friendships enable row level security;
alter table csl_private.social_actions enable row level security;
revoke all on public.csl_social_profiles,csl_private.friendships,csl_private.social_actions from public,anon,authenticated;

-- One best result per subject deck, difficulty and classroom calendar day.
create or replace view csl_private.community_best as
 select distinct on (a.user_id,a.deck_id,a.level,(a.received_at at time zone coalesce((select rules->>'timezone' from public.csl_settings where id),'Asia/Manila'))::date)
 a.user_id,a.deck_id,a.level,a.correct,a.total,
 (a.received_at at time zone coalesce((select rules->>'timezone' from public.csl_settings where id),'Asia/Manila'))::date classroom_day
 from public.csl_quiz_attempts a left join public.csl_record_labels l on l.quiz_id=a.id
 where not coalesce(l.archived,false)
 order by a.user_id,a.deck_id,a.level,(a.received_at at time zone coalesce((select rules->>'timezone' from public.csl_settings where id),'Asia/Manila'))::date,a.correct desc,a.total,a.received_at,a.id;
revoke all on csl_private.community_best from public,anon,authenticated;

create or replace function csl_private.community_visible(target uuid,viewer uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.csl_profiles p join public.csl_social_profiles s using(user_id)
 where p.user_id=target and p.active and s.listed and s.username is not null
 and not exists(select 1 from public.csl_teachers where user_id=target)
 and not exists(select 1 from csl_private.friendships f where f.user_low=least(target,viewer) and f.user_high=greatest(target,viewer) and f.status='blocked'));
$$;
revoke all on function csl_private.community_visible(uuid,uuid) from public,anon,authenticated;

create or replace function csl_private.community_card(target uuid,viewer uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; relation csl_private.friendships;
begin
 if target<>viewer and not csl_private.community_visible(target,viewer) then return null; end if;
 select * into relation from csl_private.friendships where user_low=least(target,viewer) and user_high=greatest(target,viewer);
 select jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'username',coalesce(s.username,''),
  'photo_path',case when s.share_photo then p.photo_path else null end,
  'bio',case when s.share_bio then coalesce(f.bio,'') else '' end,
  'grade',case when s.share_grade then p.grade else null end,
  'points',coalesce(t.correct,0)*10,'correct',coalesce(t.correct,0),'answers',coalesce(t.answers,0),'discoveries',coalesce(t.discoveries,0),
  'level',1+floor((coalesce(t.correct,0)*12+(coalesce(t.answers,0)-coalesce(t.correct,0))*3)/120.0)::int,
  'relationship',case when relation.status='accepted' then 'friends' when relation.status='blocked' then 'blocked'
    when relation.status='pending' and relation.requested_by=viewer then 'outgoing' when relation.status='pending' then 'incoming' else 'none' end,
  'friendship_version',coalesce(relation.version,0)) into result
 from public.csl_profiles p join public.csl_social_profiles s using(user_id) left join public.csl_preferences f using(user_id)
 left join lateral(select sum(correct) correct,sum(total) answers,count(*) discoveries from csl_private.community_best where user_id=p.user_id) t on true
 where p.user_id=target and p.active;
 return result;
end $$;
revoke all on function csl_private.community_card(uuid,uuid) from public,anon,authenticated;

create or replace function public.csl_social_home() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); cfg public.csl_social_profiles; counts jsonb;
begin
 insert into public.csl_social_profiles(user_id) values(uid) on conflict do nothing;
 select * into cfg from public.csl_social_profiles where user_id=uid;
 select jsonb_build_object('friends',count(*) filter(where f.status='accepted'),
  'incoming',count(*) filter(where f.status='pending' and requested_by<>uid),
  'outgoing',count(*) filter(where f.status='pending' and requested_by=uid)) into counts
 from csl_private.friendships f where uid in (user_low,user_high)
 and cfg.listed and csl_private.community_visible(case when user_low=uid then user_high else user_low end,uid);
 return counts||jsonb_build_object('teacher',public.csl_is_teacher(),'settings',jsonb_build_object('username',coalesce(cfg.username,''),'listed',cfg.listed,'share_photo',cfg.share_photo,'share_bio',cfg.share_bio,'share_grade',cfg.share_grade,'version',cfg.version));
end $$;
revoke all on function public.csl_social_home() from public,anon;
grant execute on function public.csl_social_home() to authenticated;

create or replace function public.csl_save_social_profile(p_username text,p_listed boolean,p_share_photo boolean,p_share_bio boolean,p_share_grade boolean,p_version bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); handle text:=lower(btrim(p_username)); old public.csl_social_profiles;
begin
 if public.csl_is_teacher() then raise exception 'Student sharing is available to student accounts. Teachers can view the class leaderboard.'; end if;
 if handle is null or handle !~ '^[a-z][a-z0-9_]{2,19}$' or handle in ('admin','teacher','system','support','moderator') or p_listed is null or p_share_photo is null or p_share_bio is null or p_share_grade is null then raise exception 'Choose a valid classroom username and sharing choices.'; end if;
 insert into public.csl_social_profiles(user_id) values(uid) on conflict do nothing;
 select * into old from public.csl_social_profiles where user_id=uid for update;
 if old.version is distinct from p_version then raise exception 'Your sharing settings changed. Refresh before saving.'; end if;
 begin
  update public.csl_social_profiles set username=handle,listed=p_listed,share_photo=p_share_photo,share_bio=p_share_bio,share_grade=p_share_grade,version=version+1,updated_at=now() where user_id=uid;
 exception when unique_violation then raise exception 'That username is already taken. Choose another one.';
 end;
 return public.csl_social_home();
end $$;
revoke all on function public.csl_save_social_profile(text,boolean,boolean,boolean,boolean,bigint) from public,anon;
grant execute on function public.csl_save_social_profile(text,boolean,boolean,boolean,boolean,bigint) to authenticated;

create or replace function public.csl_leaderboard(p_period text default 'week',p_scope text default 'school',p_offset integer default 0,p_grade integer default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); result jsonb; start_day date;
begin
 if p_period is null or p_period not in ('week','all') or p_scope is null or p_scope not in ('school','friends') or p_offset is null or p_offset<0 or p_offset>100000 or (p_grade is not null and p_grade not between 7 and 10) then raise exception 'Choose a valid leaderboard view.'; end if;
 start_day:=case when p_period='week' then date_trunc('week',now() at time zone coalesce((select rules->>'timezone' from public.csl_settings where id),'Asia/Manila'))::date else '-infinity'::date end;
 with scored as (
  select p.user_id,s.username,coalesce(sum(b.correct),0)*10 points,coalesce(sum(b.correct),0) correct,coalesce(sum(b.total),0) answers,count(b.user_id) discoveries
  from public.csl_profiles p join public.csl_social_profiles s using(user_id)
  left join csl_private.community_best b on b.user_id=p.user_id and b.classroom_day>=start_day
  where csl_private.community_visible(p.user_id,uid)
  and (p_grade is null or (s.share_grade and p.grade=p_grade))
  and (p_scope='school' or p.user_id=uid or exists(select 1 from csl_private.friendships f where f.user_low=least(p.user_id,uid) and f.user_high=greatest(p.user_id,uid) and f.status='accepted'))
  group by p.user_id,s.username
 ), ranked as (select *,dense_rank() over(order by points desc) rank from scored), cards as (
  select r.*,csl_private.community_card(r.user_id,uid)||jsonb_build_object('rank',r.rank,'points',r.points,'correct',r.correct,'answers',r.answers,'discoveries',r.discoveries) card from ranked r
 ), paged as (select * from cards order by points desc,username,user_id limit 20 offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(card order by points desc,username,user_id) from paged),'[]'),
 'total',(select count(*) from ranked),'you',(select card from cards where user_id=uid)) into result;
 return result;
end $$;
revoke all on function public.csl_leaderboard(text,text,integer,integer) from public,anon;
grant execute on function public.csl_leaderboard(text,text,integer,integer) to authenticated;

create or replace function public.csl_find_scientist(p_username text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); target uuid; handle text:=lower(regexp_replace(btrim(p_username),'^@',''));
begin
 if handle is null or handle !~ '^[a-z][a-z0-9_]{2,19}$' then raise exception 'Enter the complete username, using 3–20 letters, numbers or underscores.'; end if;
 select user_id into target from public.csl_social_profiles where username=handle;
 if target=uid then raise exception 'That is your username. Try a classmate’s username.'; end if;
 if target is null or not csl_private.community_visible(target,uid) then return null; end if;
 return csl_private.community_card(target,uid);
end $$;
revoke all on function public.csl_find_scientist(text) from public,anon;
grant execute on function public.csl_find_scientist(text) to authenticated;

create or replace function public.csl_scientist_card(p_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); begin return csl_private.community_card(p_user_id,uid); end $$;
revoke all on function public.csl_scientist_card(uuid) from public,anon;
grant execute on function public.csl_scientist_card(uuid) to authenticated;

create or replace function public.csl_friend_list(p_kind text default 'friends',p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); result jsonb;
begin
 if p_kind is null or p_kind not in ('friends','incoming','outgoing','blocked') or p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Choose a valid friends view.'; end if;
 with pairs as (
  select f.*,case when user_low=uid then user_high else user_low end target from csl_private.friendships f where uid in(user_low,user_high)
 ), chosen as (
  select * from pairs f where
  (p_kind='friends' and f.status='accepted' or p_kind='incoming' and f.status='pending' and f.requested_by<>uid or p_kind='outgoing' and f.status='pending' and f.requested_by=uid)
  and exists(select 1 from public.csl_social_profiles where user_id=uid and listed) and csl_private.community_visible(target,uid)
  or p_kind='blocked' and f.status='blocked' and f.blocked_by=uid
 ), cards as (
  select case when p_kind='blocked' then jsonb_build_object('user_id',c.target,'username',case when s.listed and p.active then s.username else '' end,'display_name',case when s.listed and p.active then p.display_name else 'Hidden scientist' end,'photo_path',null,'bio','','grade',null,'points',0,'correct',0,'answers',0,'discoveries',0,'level',1,'relationship','blocked','friendship_version',c.version)
   else csl_private.community_card(c.target,uid) end card,c.updated_at,c.target
  from chosen c join public.csl_profiles p on p.user_id=c.target left join public.csl_social_profiles s on s.user_id=c.target
 ), paged as (select * from cards order by updated_at desc,target limit 20 offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(card order by updated_at desc,target) from paged),'[]'),'total',(select count(*) from cards)) into result;
 return result;
end $$;
revoke all on function public.csl_friend_list(text,integer) from public,anon;
grant execute on function public.csl_friend_list(text,integer) to authenticated;

create or replace function public.csl_social_action(p_action text,p_target uuid,p_username text,p_version bigint,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); target uuid:=p_target; f csl_private.friendships; previous csl_private.social_actions; payload jsonb; result jsonb; handle text:=lower(regexp_replace(btrim(coalesce(p_username,'')),'^@',''));
begin
 if p_action is null or p_action not in ('send','accept','decline','cancel','remove','block','unblock') or p_request_id is null or p_version is null or p_version<0 then raise exception 'Choose a valid friend action.'; end if;
 if public.csl_is_teacher() then raise exception 'Friend requests are for student accounts.'; end if;
 payload:=jsonb_build_object('action',p_action,'target',p_target,'username',handle,'version',p_version);
 perform pg_advisory_xact_lock(hashtextextended(uid::text||'/'||p_request_id::text,1));
 select * into previous from csl_private.social_actions where user_id=uid and request_id=p_request_id;
 if found then
  if previous.payload<>payload then raise exception 'This action ID belongs to different details.'; end if;
  return previous.result;
 end if;
 if p_action='send' then
  if handle !~ '^[a-z][a-z0-9_]{2,19}$' then raise exception 'Enter the complete username.'; end if;
  select user_id into target from public.csl_social_profiles where username=handle;
 end if;
 if target is null or target=uid then raise exception 'Choose another scientist.'; end if;
 perform 1 from public.csl_profiles where user_id in(uid,target) order by user_id for update;
 perform csl_private.actor(uid);
 perform pg_advisory_xact_lock(hashtextextended(least(uid,target)::text||'/'||greatest(uid,target)::text,2));
 select * into f from csl_private.friendships where user_low=least(uid,target) and user_high=greatest(uid,target) for update;
 if p_action in ('send','accept') and (not exists(select 1 from public.csl_social_profiles where user_id=uid and listed) or not csl_private.community_visible(target,uid)) then raise exception 'Join classroom sharing and choose an available student.'; end if;
 if p_action='send' then
  if f.status='blocked' then raise exception 'This scientist is unavailable.'; end if;
  if f.status in ('pending','accepted') then
   result:=jsonb_build_object('ok',true,'state',case when f.status='accepted' then 'friends' when f.requested_by=uid then 'outgoing' else 'incoming' end);
  else
   if f.updated_at>now()-interval '1 day' then raise exception 'Please wait a day before sending another invitation to this scientist.'; end if;
   if (select count(*) from csl_private.social_actions where user_id=uid and action='send' and created_at>=now()-interval '1 day')>=10 then raise exception 'You can send ten invitations per day. Try again tomorrow.'; end if;
   if (select count(*) from csl_private.friendships where uid in(user_low,user_high) and status='pending')>=50 then raise exception 'You have fifty pending invitations. Review them before sending another.'; end if;
   insert into csl_private.friendships(user_low,user_high,requested_by,status) values(least(uid,target),greatest(uid,target),uid,'pending')
   on conflict(user_low,user_high) do update set requested_by=uid,status='pending',blocked_by=null,version=csl_private.friendships.version+1,updated_at=now();
   result:=jsonb_build_object('ok',true,'state','outgoing');
  end if;
 else
  if p_action='block' and f.user_low is null then
   if not csl_private.community_visible(target,uid) then raise exception 'Scientist not found.'; end if;
   insert into csl_private.friendships(user_low,user_high,requested_by,status,blocked_by) values(least(uid,target),greatest(uid,target),uid,'blocked',uid);
   result:=jsonb_build_object('ok',true,'state','blocked');
  else
   if f.user_low is null or f.version<>p_version then raise exception 'This invitation changed. Refresh before trying again.'; end if;
   if p_action in ('accept','decline') and (f.status<>'pending' or f.requested_by=uid) then raise exception 'Only the invited scientist can answer this request.'; end if;
   if p_action='cancel' and (f.status<>'pending' or f.requested_by<>uid) then raise exception 'Only your own pending invitation can be cancelled.'; end if;
   if p_action='remove' and f.status<>'accepted' then raise exception 'This friendship is no longer active.'; end if;
   if p_action='unblock' and (f.status<>'blocked' or f.blocked_by<>uid) then raise exception 'Only your own block can be removed.'; end if;
   if p_action='block' and f.status='blocked' then raise exception 'This scientist is unavailable.'; end if;
   if p_action='accept' and ((select count(*) from csl_private.friendships where uid in(user_low,user_high) and status='accepted')>=300 or (select count(*) from csl_private.friendships where target in(user_low,user_high) and status='accepted')>=300) then raise exception 'A scientist can have up to 300 friends.'; end if;
   update csl_private.friendships set status=case when p_action='accept' then 'accepted' when p_action='block' then 'blocked' else 'declined' end,
    blocked_by=case when p_action='block' then uid else null end,version=version+1,updated_at=now()
   where user_low=f.user_low and user_high=f.user_high;
   result:=jsonb_build_object('ok',true,'state',case when p_action='accept' then 'friends' when p_action='block' then 'blocked' else 'none' end);
  end if;
 end if;
 insert into csl_private.social_actions(user_id,request_id,action,payload,result) values(uid,p_request_id,p_action,payload,result);
 return result;
end $$;
revoke all on function public.csl_social_action(text,uuid,text,bigint,uuid) from public,anon;
grant execute on function public.csl_social_action(text,uuid,text,bigint,uuid) to authenticated;

create or replace function public.csl_can_view_shared_photo(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.csl_has_access() and exists(select 1 from public.csl_profiles p join public.csl_social_profiles s using(user_id)
 where p.photo_path=p_path and s.share_photo and csl_private.community_visible(p.user_id,auth.uid()));
$$;
revoke all on function public.csl_can_view_shared_photo(text) from public,anon;
grant execute on function public.csl_can_view_shared_photo(text) to authenticated;
do $$ begin
 if to_regclass('storage.objects') is not null then
  execute 'drop policy if exists csl_shared_avatar_read on storage.objects';
  execute 'create policy csl_shared_avatar_read on storage.objects for select to authenticated using(bucket_id=''csl-avatars'' and public.csl_can_view_shared_photo(name))';
 end if;
end $$;
create or replace function public.csl_backend_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions),'platform',3,
 'accounts',case when to_regprocedure('public.csl_scientist_profile(uuid)') is null then 0 else 1 end,'community',1);
$$;
revoke all on function public.csl_backend_status() from public;
grant execute on function public.csl_backend_status() to anon,authenticated;
notify pgrst,'reload schema';

commit;
