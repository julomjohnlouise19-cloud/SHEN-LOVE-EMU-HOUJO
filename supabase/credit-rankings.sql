-- Rank current classroom-wallet balances. Quiz evidence and the legacy points
-- API remain intact. Only already-visible student profiles can be returned.
do $$ begin
 if to_regprocedure('public.csl_classmate_directory(text,boolean,integer)') is null then
  raise exception 'Install community-upgrade.sql before the credit leaderboard update.';
 end if;
end $$;
create or replace function public.csl_credit_leaderboard(p_scope text default 'school',p_offset integer default 0,p_grade integer default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); result jsonb;
begin
 if p_scope is null or p_scope not in ('school','friends') or p_offset is null or p_offset<0 or p_offset>100000 or (p_grade is not null and p_grade not between 7 and 10) then raise exception 'Choose a valid class-credit ranking view.'; end if;
 with balances as (
  select p.user_id,p.display_name account_name,w.credits
  from public.csl_profiles p join public.csl_social_profiles s using(user_id) join public.csl_wallets w using(user_id)
  where csl_private.community_visible(p.user_id,uid)
  and (p_grade is null or (s.share_grade and p.grade=p_grade))
  and (p_scope='school' or p.user_id=uid or exists(select 1 from csl_private.friendships f where f.user_low=least(p.user_id,uid) and f.user_high=greatest(p.user_id,uid) and f.status='accepted'))
 ), ranked as (select *,dense_rank() over(order by credits desc) rank from balances), cards as (
  select r.*,csl_private.community_card(r.user_id,uid)||jsonb_build_object('rank',r.rank,'credits',r.credits) card from ranked r
 ), paged as (select * from cards order by credits desc,account_name,user_id limit 20 offset p_offset)
 select jsonb_build_object('basis','class_credits','rows',coalesce((select jsonb_agg(card order by credits desc,account_name,user_id) from paged),'[]'),
 'total',(select count(*) from ranked),'you',(select card from cards where user_id=uid),'server_now',now()) into result;
 return result;
end $$;
revoke all on function public.csl_credit_leaderboard(text,integer,integer) from public,anon;
grant execute on function public.csl_credit_leaderboard(text,integer,integer) to authenticated;
create or replace function public.csl_backend_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions),'platform',3,
 'accounts',case when to_regprocedure('public.csl_scientist_profile(uuid)') is null then 0 else 1 end,
 'community',case when to_regprocedure('public.csl_classmate_directory(text,boolean,integer)') is not null then 2 when to_regprocedure('public.csl_social_home()') is not null then 1 else 0 end,
 'profile_styles',case when to_regprocedure('public.csl_profile_styles(uuid[])') is null then 0 else 1 end,
 'credit_rankings',case when to_regprocedure('public.csl_credit_leaderboard(text,integer,integer)') is null then 0 else 1 end);
$$;
revoke all on function public.csl_backend_status() from public;
grant execute on function public.csl_backend_status() to anon,authenticated;
notify pgrst,'reload schema';
