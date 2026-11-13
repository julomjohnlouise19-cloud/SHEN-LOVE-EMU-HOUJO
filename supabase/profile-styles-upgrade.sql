-- Existing community-v2 classroom: optional shared profile designs.
-- Keeps all accounts, photos, learning records, supplies and existing privacy choices.
begin;
-- Optional classroom sharing bridge for account-owned profile designs.
-- Personal designs already save through Auth. This adds authorized peer/teacher
-- reads and access only to the current explicitly shared banner.
do $$ begin
 if to_regprocedure('public.csl_classmate_directory(text,boolean,integer)') is null then
  raise exception 'Install community-upgrade.sql before the profile design sharing update.';
 end if;
end $$;

create or replace function csl_private.profile_design(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v jsonb; border_id text; banner text; pos_x integer:=50; pos_y integer:=50;
begin
 select u.raw_user_meta_data->'csl_profile_style' into v from auth.users u where u.id=target;
 if jsonb_typeof(v) is distinct from 'object' or v->'version' is distinct from '1'::jsonb then v:='{}'; end if;
 border_id:=coalesce(v->>'border','');
 if border_id not in ('ocean-treasures','violet-enchantment','crystal-butterflies','crimson-eclipse','peppermint-swirl','lantern-tides','golden-fortune','moon-garden','berry-starlight','lucky-clover','sakura-fan','lotus-serenity','forest-vine','moon-lantern','golden-rose','star-voyager','harvest-glow') then border_id:=''; end if;
 banner:=v->>'banner_path';
 if banner is not null and (split_part(banner,'/',1)<>target::text or banner !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' or not exists(select 1 from storage.objects where bucket_id='csl-avatars' and name=banner)) then banner:=null; end if;
 if jsonb_typeof(v->'x')='number' and v->>'x' ~ '^(100|[0-9]{1,2})$' then pos_x:=(v->>'x')::integer; end if;
 if jsonb_typeof(v->'y')='number' and v->>'y' ~ '^(100|[0-9]{1,2})$' then pos_y:=(v->>'y')::integer; end if;
 return jsonb_build_object('version',1,'border',border_id,'banner_path',banner,'x',pos_x,'y',pos_y,'share_banner',coalesce(v->'share_banner'='true'::jsonb,false));
end $$;
revoke all on function csl_private.profile_design(uuid) from public,anon,authenticated;

create or replace function public.csl_profile_styles(p_users uuid[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); teacher boolean:=public.csl_is_teacher(); result jsonb;
begin
 if p_users is null or cardinality(p_users) not between 1 and 50 or array_position(p_users,null) is not null then raise exception 'Choose between 1 and 50 scientist profiles.'; end if;
 with permitted as (
  select p.user_id,csl_private.profile_design(p.user_id) design
  from public.csl_profiles p where p.user_id=any(p_users) and (p.active or teacher)
  and (p.user_id=uid or teacher or csl_private.community_visible(p.user_id,uid))
 ) select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'design',
  case when user_id=uid or teacher or design->'share_banner'='true'::jsonb then design
  else jsonb_set(design,'{banner_path}','null'::jsonb) end) order by user_id),'[]') into result from permitted;
 return result;
end $$;
revoke all on function public.csl_profile_styles(uuid[]) from public,anon;
grant execute on function public.csl_profile_styles(uuid[]) to authenticated;

create or replace function public.csl_can_view_profile_banner(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.csl_has_access() and exists(
  select 1 from public.csl_profiles p cross join lateral(select csl_private.profile_design(p.user_id) design) s
  where p.active and csl_private.community_visible(p.user_id,auth.uid())
  and s.design->'share_banner'='true'::jsonb and s.design->>'banner_path'=p_path
 );
$$;
revoke all on function public.csl_can_view_profile_banner(text) from public,anon;
grant execute on function public.csl_can_view_profile_banner(text) to authenticated;
drop policy if exists csl_shared_profile_banner on storage.objects;
create policy csl_shared_profile_banner on storage.objects for select to authenticated
 using(bucket_id='csl-avatars' and public.csl_can_view_profile_banner(name));

create or replace function public.csl_backend_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions),'platform',3,
 'accounts',case when to_regprocedure('public.csl_scientist_profile(uuid)') is null then 0 else 1 end,
 'community',case when to_regprocedure('public.csl_classmate_directory(text,boolean,integer)') is not null then 2 when to_regprocedure('public.csl_social_home()') is not null then 1 else 0 end,
 'profile_styles',case when to_regprocedure('public.csl_profile_styles(uuid[])') is null then 0 else 1 end);
$$;
revoke all on function public.csl_backend_status() from public;
grant execute on function public.csl_backend_status() to anon,authenticated;
notify pgrst,'reload schema';

commit;
