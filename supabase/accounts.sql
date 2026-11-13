-- Additive teacher profile details; account bans continue to use the existing active flag.
create or replace function public.csl_scientist_profile(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=csl_private.teacher(); result jsonb; begin
 if p_user_id is null then raise exception 'Choose a scientist account.'; end if;
 select jsonb_build_object(
  'user_id',p.user_id,'display_name',p.display_name,'grade',p.grade,'section',p.section,'active',p.active,
  'is_teacher',exists(select 1 from public.csl_teachers t where t.user_id=p.user_id),
  'photo_path',p.photo_path,'created_at',p.created_at,'email',coalesce(u.email,''),
  'expected_updated',md5(to_jsonb(p)::text),
  'credits',coalesce(w.credits,0),'theme',coalesce(f.theme,'meadow'),'bio',coalesce(f.bio,''),
  'attempts',(select count(*) from public.csl_quiz_attempts q where q.user_id=p.user_id),
  'correct',(select coalesce(sum(q.correct),0) from public.csl_quiz_attempts q where q.user_id=p.user_id),
  'answers',(select coalesce(sum(q.total),0) from public.csl_quiz_attempts q where q.user_id=p.user_id),
  'pending_reservations',(select count(*) from public.csl_orders o where o.user_id=p.user_id and o.status='reserved'),
  'terms_accepted',coalesce(u.raw_user_meta_data->'terms_accepted'='true'::jsonb,false),
  'terms_version',left(coalesce(u.raw_user_meta_data->>'terms_version',''),32),
  'terms_accepted_at',left(coalesce(u.raw_user_meta_data->>'terms_accepted_at',''),40)
 ) into result from public.csl_profiles p join auth.users u on u.id=p.user_id
 left join public.csl_wallets w using(user_id) left join public.csl_preferences f using(user_id)
 where p.user_id=p_user_id;
 if result is null then raise exception 'Scientist not found.'; end if;
 return result;
end $$;
revoke all on function public.csl_scientist_profile(uuid) from public,anon;
grant execute on function public.csl_scientist_profile(uuid) to authenticated;
create or replace function public.csl_backend_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions),'platform',3,'profile_styles',case when to_regprocedure('public.csl_profile_styles(uuid[])') is null then 0 else 1 end,'credit_rankings',case when to_regprocedure('public.csl_credit_leaderboard(text,integer,integer)') is null then 0 else 1 end,'accounts',1,'community',case when to_regprocedure('public.csl_classmate_directory(text,boolean,integer)') is not null then 2 when to_regprocedure('public.csl_social_home()') is null then 0 else 1 end);
$$;
revoke all on function public.csl_backend_status() from public;
grant execute on function public.csl_backend_status() to anon,authenticated;
notify pgrst, 'reload schema';
