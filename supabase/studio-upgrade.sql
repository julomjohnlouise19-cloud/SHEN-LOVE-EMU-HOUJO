-- Existing platform-2 project: copy this entire file into SQL Editor and Run.
-- Preserves accounts, answers, scores, credits, stock and teacher edits.
begin;
do $$ begin if to_regclass('public.csl_arcade_sessions') is null then raise exception 'Install the complete setup.sql first.'; end if; end $$;
-- Platform 3: classroom record care, personal style and delegated teacher access.
-- Standalone existing-project upgrade is generated as studio-upgrade.sql.
create table if not exists public.csl_preferences (
 user_id uuid primary key references public.csl_profiles(user_id) on delete cascade,
 theme text not null default 'meadow' check(theme in ('meadow','aurora','sunset')),
 bio text not null default '' check(char_length(bio)<=160)
);
create table if not exists public.csl_record_labels (
 id uuid primary key default gen_random_uuid(),
 quiz_id uuid unique references public.csl_quiz_attempts(id) on delete cascade,
 arcade_id uuid unique references public.csl_arcade_sessions(id) on delete cascade,
 archived boolean not null default false, reason text not null check(char_length(reason) between 3 and 300),
 actor uuid references public.csl_profiles(user_id) on delete set null,
 version bigint not null default 1, updated_at timestamptz not null default now(),
 check(num_nonnulls(quiz_id,arcade_id)=1)
);
alter table public.csl_preferences enable row level security;
alter table public.csl_record_labels enable row level security;
revoke all on public.csl_preferences,public.csl_record_labels from public,anon,authenticated;
create index if not exists csl_labels_archived on public.csl_record_labels(archived,updated_at desc);
create index if not exists csl_quizzes_saved on public.csl_quiz_attempts(received_at desc,id);
create index if not exists csl_games_completed on public.csl_arcade_sessions(completed_at desc,id) where completed_at is not null;
create index if not exists csl_profiles_class on public.csl_profiles(grade,section);

-- Establish an opening balance without changing existing credits or historical entries.
alter table public.csl_wallets add column if not exists opening_credits integer;
update public.csl_wallets w set opening_credits=w.credits-coalesce((select sum(l.amount)::integer from public.csl_credit_ledger l where l.user_id=w.user_id),0) where opening_credits is null;
alter table public.csl_wallets alter column opening_credits set default 0;
alter table public.csl_wallets alter column opening_credits set not null;
create or replace function csl_private.create_wallet() returns trigger language plpgsql security definer set search_path='' as $$
declare starter integer:=coalesce((select (rules->>'starterMerits')::int from public.csl_settings where id),24); begin
 insert into public.csl_wallets(user_id,credits,opening_credits) values(new.user_id,starter,starter) on conflict do nothing; return new;
end $$;

create or replace function public.csl_preferences(p_theme text default null,p_bio text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); result jsonb; begin
 if p_theme is not null or p_bio is not null then
  if (p_theme in ('meadow','aurora','sunset') and p_bio is not null and char_length(p_bio)<=160) is not true then raise exception 'Choose a lab color and a short introduction.'; end if;
  insert into public.csl_preferences(user_id,theme,bio) values(uid,p_theme,btrim(p_bio)) on conflict(user_id) do update set theme=excluded.theme,bio=excluded.bio;
 end if;
 select jsonb_build_object('theme',theme,'bio',bio) into result from public.csl_preferences where user_id=uid;
 return coalesce(result,'{"theme":"meadow","bio":""}'::jsonb);
end $$;
revoke all on function public.csl_preferences(text,text) from public,anon;
grant execute on function public.csl_preferences(text,text) to authenticated;

create or replace function public.csl_studio_command(p_request_id uuid,p_action text,p_body jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.teacher(); prior csl_private.teacher_requests; target_user uuid; old_role boolean; after_value jsonb; before_value jsonb; record_id uuid; ids uuid[]; old public.csl_record_labels; label public.csl_record_labels; kind_value text; reason_value text; archive_value boolean; target text; begin
 if p_request_id is null or jsonb_typeof(p_body) is distinct from 'object' or octet_length(p_body::text)>30000 then raise exception 'This workspace change could not be validated.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request_id::text,2));
 select * into prior from csl_private.teacher_requests where actor=uid and request_id=p_request_id;
 if found then
  if prior.action is distinct from 'studio:'||p_action or prior.body is distinct from p_body then raise exception 'This change ID was already used.'; end if; return prior.result;
 end if;
 reason_value:=btrim(p_body->>'reason');
 if reason_value is null or char_length(reason_value) not between 3 and 300 then raise exception 'Add a reason of 3–300 characters.'; end if;
 if p_action='role' then
  perform pg_advisory_xact_lock(hashtextextended('csl-teacher-roles',9));
  target_user:=(p_body->>'user_id')::uuid; target:=target_user::text;
  if target_user=uid then raise exception 'Ask another teacher or the project owner to change your own teaching access.'; end if;
  if jsonb_typeof(p_body->'is_teacher') is distinct from 'boolean' or jsonb_typeof(p_body->'was_teacher') is distinct from 'boolean' then raise exception 'Choose a valid teaching role.'; end if;
  perform 1 from public.csl_profiles where user_id=target_user and active for update;
  if not found then raise exception 'Choose an active scientist account.'; end if;
  select exists(select 1 from public.csl_teachers where user_id=target_user) into old_role;
  if old_role is distinct from (p_body->>'was_teacher')::boolean then raise exception 'Teaching access changed. Refresh the class before saving.'; end if;
  if (p_body->>'is_teacher')::boolean then insert into public.csl_teachers(user_id) values(target_user) on conflict do nothing;
  else
   if old_role and not exists(select 1 from public.csl_teachers t join public.csl_profiles p using(user_id) where t.user_id<>target_user and p.active) then raise exception 'Keep at least one active teacher.'; end if;
   delete from public.csl_teachers where user_id=target_user;
  end if;
  before_value:=jsonb_build_object('is_teacher',old_role); after_value:=jsonb_build_object('is_teacher',(p_body->>'is_teacher')::boolean);
 elsif p_action='records' then
  kind_value:=p_body->>'kind'; archive_value:=(p_body->>'archived')::boolean;
  if (kind_value in ('quizzes','games') and jsonb_typeof(p_body->'archived')='boolean' and jsonb_typeof(p_body->'ids')='array' and jsonb_typeof(p_body->'versions')='object') is not true then raise exception 'Choose quiz or arcade records and an archive action.'; end if;
  if jsonb_array_length(p_body->'ids') not between 1 and 100 then raise exception 'Choose between 1 and 100 records.'; end if;
  select array_agg(distinct value::uuid order by value::uuid) into ids from jsonb_array_elements_text(p_body->'ids');
  before_value:='[]'; after_value:='[]'; target:=kind_value;
  foreach record_id in array ids loop
   perform pg_advisory_xact_lock(hashtextextended(record_id::text,10));
   if kind_value='quizzes' then perform 1 from public.csl_quiz_attempts where id=record_id;
   else perform 1 from public.csl_arcade_sessions where id=record_id and completed_at is not null; end if;
   if not found then raise exception 'A selected record no longer exists or is unfinished. Refresh your records.'; end if;
   select * into old from public.csl_record_labels where quiz_id=record_id or arcade_id=record_id for update;
   if csl_private.integer_field(p_body->'versions',record_id::text,0,2147483647)<>coalesce(old.version,0) then raise exception 'A selected record changed. Refresh before saving.'; end if;
   before_value:=before_value||jsonb_build_array(jsonb_build_object('id',record_id,'archived',coalesce(old.archived,false),'version',coalesce(old.version,0)));
   if old.id is null then
    insert into public.csl_record_labels(quiz_id,arcade_id,archived,reason,actor) values(case when kind_value='quizzes' then record_id else null end,case when kind_value='games' then record_id else null end,archive_value,reason_value,uid) returning * into label;
   else update public.csl_record_labels set archived=archive_value,reason=reason_value,actor=uid,version=version+1,updated_at=now() where id=old.id returning * into label; end if;
   after_value:=after_value||jsonb_build_array(jsonb_build_object('id',record_id,'archived',label.archived,'version',label.version));
  end loop;
 else raise exception 'Choose an available workspace action.'; end if;
 insert into public.csl_teacher_activity(actor,action,subject,note,before_value,after_value) values(uid,'studio:'||p_action,target,reason_value,before_value,after_value);
 after_value:=jsonb_build_object('ok',true,'value',after_value);
 insert into csl_private.teacher_requests(actor,request_id,action,body,result) values(uid,p_request_id,'studio:'||p_action,p_body,after_value);
 return after_value;
end $$;
revoke all on function public.csl_studio_command(uuid,text,jsonb) from public,anon;
grant execute on function public.csl_studio_command(uuid,text,jsonb) to authenticated;

create or replace function public.csl_studio_data(p_view text,p_filters jsonb default '{}',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); teacher_value boolean:=public.csl_is_teacher(); result jsonb; cfg jsonb; search_value text:=left(coalesce(p_filters->>'search',''),100); off_value integer:=greatest(0,least(coalesce(p_offset,0),1000000)); state_value text:=coalesce(nullif(p_filters->>'state',''),'active'); sort_value text:=coalesce(p_filters->>'sort','newest'); start_value timestamptz; end_value timestamptz; begin
 if jsonb_typeof(p_filters) is distinct from 'object' or octet_length(p_filters::text)>3000 or state_value not in ('active','archived','all') or sort_value not in ('newest','oldest','best') then raise exception 'Choose valid record filters.'; end if;
 select rules into cfg from public.csl_settings where id;
 begin
  if nullif(p_filters->>'from','') is not null then start_value:=((p_filters->>'from')::date::timestamp at time zone (cfg->>'timezone')); end if;
  if nullif(p_filters->>'to','') is not null then end_value:=(((p_filters->>'to')::date+1)::timestamp at time zone (cfg->>'timezone')); end if;
 exception when others then raise exception 'Use valid start and end dates.'; end;
 if start_value>=end_value then raise exception 'The end date must follow the start date.'; end if;
 if p_view='quizzes' then
  with filtered as (
   select a.id,a.user_id,p.display_name,p.grade,p.section,a.deck_id,a.level,a.mode,a.correct,a.total,a.received_at,a.responses,coalesce(n.note,'') teacher_note,coalesce(m.archived,false) archived,coalesce(m.version,0) metadata_version,coalesce(m.reason,'') archive_reason
   from public.csl_quiz_attempts a join public.csl_profiles p using(user_id) left join public.csl_attempt_notes n on n.attempt_id=a.id left join public.csl_record_labels m on m.quiz_id=a.id
   where (teacher_value or a.user_id=uid) and (coalesce(p_filters->>'self','')<>'true' or a.user_id=uid) and (search_value='' or p.display_name ilike '%'||search_value||'%' or a.deck_id ilike '%'||search_value||'%')
    and (coalesce(p_filters->>'grade','')='' or p.grade=(p_filters->>'grade')::int) and (coalesce(p_filters->>'section','')='' or p.section ilike '%'||(p_filters->>'section')||'%')
    and (coalesce(p_filters->>'deck','')='' or a.deck_id=p_filters->>'deck')
    and (state_value='all' or coalesce(m.archived,false)=(state_value='archived')) and (start_value is null or a.received_at>=start_value) and (end_value is null or a.received_at<end_value)
  ) select jsonb_build_object('total',count(*),'stats',jsonb_build_object('attempts',count(*),'correct',coalesce(sum(correct),0),'answers',coalesce(sum(total),0)),'rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by case when sort_value='best' then correct::numeric/greatest(total,1) end desc nulls last,case when sort_value='oldest' then received_at end asc,case when sort_value<>'oldest' then received_at end desc,id desc limit 50 offset off_value) r),'[]')) into result from filtered;
 elsif p_view='games' then
  with filtered as (
   select g.id,g.user_id,p.display_name,p.grade,p.section,g.category,(g.state->>'score')::int score,(g.state->>'correct')::int correct,9 total,(g.state->>'coins')::int coins,g.completed_at received_at,coalesce(m.archived,false) archived,coalesce(m.version,0) metadata_version,coalesce(m.reason,'') archive_reason
   from public.csl_arcade_sessions g join public.csl_profiles p using(user_id) left join public.csl_record_labels m on m.arcade_id=g.id
   where g.completed_at is not null and (teacher_value or g.user_id=uid) and (coalesce(p_filters->>'self','')<>'true' or g.user_id=uid) and (search_value='' or p.display_name ilike '%'||search_value||'%' or g.category ilike '%'||search_value||'%')
    and (coalesce(p_filters->>'grade','')='' or p.grade=(p_filters->>'grade')::int) and (coalesce(p_filters->>'section','')='' or p.section ilike '%'||(p_filters->>'section')||'%')
    and (coalesce(p_filters->>'category','')='' or g.category=p_filters->>'category')
    and (state_value='all' or coalesce(m.archived,false)=(state_value='archived')) and (start_value is null or g.completed_at>=start_value) and (end_value is null or g.completed_at<end_value)
  ) select jsonb_build_object('total',count(*),'stats',jsonb_build_object('attempts',count(*),'correct',coalesce(sum(correct),0),'answers',count(*)*9,'best',coalesce(max(score),0)),'rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by case when sort_value='best' then score end desc nulls last,case when sort_value='oldest' then received_at end asc,case when sort_value<>'oldest' then received_at end desc,id desc limit 50 offset off_value) r),'[]')) into result from filtered;
 else
  if not teacher_value then raise exception 'Teacher access is required.' using errcode='42501'; end if;
  if p_view='overview' then
   result:=public.csl_teacher_data('overview');
   result:=result||jsonb_build_object('timeline',coalesce((select jsonb_agg(to_jsonb(day_row)) from (select d.value::date day_key,(select count(*) from public.csl_quiz_attempts a where (a.received_at at time zone (cfg->>'timezone'))::date=d.value::date) quizzes,(select count(*) from public.csl_arcade_sessions g where (g.completed_at at time zone (cfg->>'timezone'))::date=d.value::date) games from generate_series((now() at time zone (cfg->>'timezone'))::date-6,(now() at time zone (cfg->>'timezone'))::date,'1 day') d(value) order by d.value) day_row),'[]'));
  elsif p_view='health' then
   result:=jsonb_build_object('total',4,'stats',jsonb_build_object('quizzes',(select count(*) from public.csl_quiz_attempts),'games',(select count(*) from public.csl_arcade_sessions where completed_at is not null),'archived',(select count(*) from public.csl_record_labels where archived),'teachers',(select count(*) from public.csl_teachers t join public.csl_profiles p using(user_id) where p.active)),
    'rows',jsonb_build_array(
     jsonb_build_object('id','wallets','label','Class credit ledger','issues',(select count(*) from public.csl_wallets w where credits<>opening_credits+coalesce((select sum(amount) from public.csl_credit_ledger l where l.user_id=w.user_id),0)),'detail','Opening credits plus every recorded award, reservation and refund match the current wallet.'),
     jsonb_build_object('id','stock','label','Supply stock','issues',(select count(*) from public.csl_items where stock<0 or price<1),'detail','Every supply has a valid price and a non-negative stock balance.'),
     jsonb_build_object('id','quizzes','label','Quiz evidence','issues',(select count(*) from public.csl_quiz_attempts a where total<>jsonb_array_length(responses) or correct<>(select count(*) from jsonb_array_elements(responses) r where (r->>'correct')::boolean)),'detail','Saved answer evidence agrees with each original score.'),
     jsonb_build_object('id','games','label','Completed arcade rounds','issues',(select count(*) from public.csl_arcade_sessions where completed_at is not null and ((state->>'completed')::boolean is not true or (state->>'index')::int<>9)),'detail','Completed rounds contain nine resolved discoveries.')
    ));
  else raise exception 'Choose an available record view.'; end if;
 end if;
 return result;
end $$;
revoke all on function public.csl_studio_data(text,jsonb,integer) from public,anon;
grant execute on function public.csl_studio_data(text,jsonb,integer) to authenticated;

create or replace function public.csl_arcade_rankings(p_category text default 'all') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); result jsonb; begin
 if p_category is null or p_category not in ('all','life','chemistry','physics','earth') then raise exception 'Choose a leaderboard category.'; end if;
 with best as (
  select distinct on(g.user_id) g.user_id,p.display_name,g.category,(g.state->>'score')::int score,(g.state->>'correct')::int correct,g.completed_at
  from public.csl_arcade_sessions g join public.csl_profiles p using(user_id)
  where p.active and g.state->>'completed'='true' and (p_category='all' or g.category=p_category) and not exists(select 1 from public.csl_record_labels m where m.arcade_id=g.id and m.archived)
  order by g.user_id,(g.state->>'score')::int desc,(g.state->>'correct')::int desc,g.completed_at,g.id
 ), ranked as (select row_number() over(order by score desc,correct desc,completed_at,user_id) rank,* from best)
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') into result from (select * from ranked order by rank limit 100) r; return result;
end $$;
create or replace function public.csl_backend_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',1,'questions',(select count(*) from csl_private.questions),'platform',3,'profile_styles',case when to_regprocedure('public.csl_profile_styles(uuid[])') is null then 0 else 1 end,'accounts',case when to_regprocedure('public.csl_scientist_profile(uuid)') is null then 0 else 1 end,'community',case when to_regprocedure('public.csl_classmate_directory(text,boolean,integer)') is not null then 2 when to_regprocedure('public.csl_social_home()') is null then 0 else 1 end);
$$;

-- Private classroom suggestions. Requires the existing classroom setup; no old records are rewritten.
create table if not exists public.csl_suggestions (
 id uuid primary key, user_id uuid not null references public.csl_profiles(user_id) on delete cascade,
 category text not null check(category in ('idea','question','problem')),
 title text not null check(char_length(title) between 3 and 80),
 message text not null check(char_length(message) between 10 and 1500),
 deck_id text not null default '', question_id text not null default '',
 status text not null default 'new' check(status in ('new','reviewing','done')),
 reply text not null default '' check(char_length(reply)<=600), version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.csl_suggestions enable row level security;
revoke all on public.csl_suggestions from public,anon,authenticated;
create index if not exists csl_suggestions_author on public.csl_suggestions(user_id,created_at desc);
create index if not exists csl_suggestions_inbox on public.csl_suggestions(status,created_at desc);
create or replace function public.csl_suggestions_status() returns jsonb language sql stable set search_path='' as $$ select '{"version":1}'::jsonb $$;
revoke all on function public.csl_suggestions_status() from public;
grant execute on function public.csl_suggestions_status() to anon,authenticated;
create or replace function public.csl_send_suggestion(p_id uuid,p_category text,p_title text,p_message text,p_deck text default '',p_question text default '',p_actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_actor); old public.csl_suggestions; tz text:=coalesce((select rules->>'timezone' from public.csl_settings where id),'Asia/Manila'); result public.csl_suggestions; begin
 if p_id is null or (p_category in ('idea','question','problem') and char_length(btrim(p_title)) between 3 and 80 and char_length(btrim(p_message)) between 10 and 1500 and p_deck is not null and p_question is not null) is not true then raise exception 'Choose a category, a title of 3–80 characters and a message of 10–1500 characters.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,42));
 select * into old from public.csl_suggestions where id=p_id;
 if found then
  if old.user_id<>uid or (old.category,old.title,old.message,old.deck_id,old.question_id) is distinct from (p_category,btrim(p_title),btrim(p_message),p_deck,p_question) then raise exception 'This request was already used. Start a new suggestion.'; end if;
  return to_jsonb(old);
 end if;
 if p_deck<>'' and not exists(select 1 from csl_private.questions where question->>'deckId'=p_deck) then raise exception 'Choose a published science deck.'; end if;
 if p_question<>'' and not exists(select 1 from csl_private.questions where id=p_question and question->>'deckId'=p_deck) then raise exception 'The card does not belong to this science deck.'; end if;
 if (select count(*) from public.csl_suggestions where user_id=uid and created_at >= (date_trunc('day',now() at time zone tz) at time zone tz))>=5 then raise exception 'You have sent five suggestions today. You can save a draft and send it tomorrow.'; end if;
 insert into public.csl_suggestions(id,user_id,category,title,message,deck_id,question_id) values(p_id,uid,p_category,btrim(p_title),btrim(p_message),p_deck,p_question) returning * into result;
 return to_jsonb(result);
end $$;
create or replace function public.csl_suggestion_inbox(p_teacher boolean default false,p_status text default 'all',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); result jsonb; total bigint; begin
 if p_teacher then perform csl_private.teacher(); end if;
 if p_status not in ('all','new','reviewing','done') or p_status is null or p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'Choose a valid inbox filter or page.'; end if;
 select count(*) into total from public.csl_suggestions s where (p_teacher or s.user_id=uid) and (p_status='all' or s.status=p_status);
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') into result from (
  select s.*,p.display_name,p.grade,p.section from public.csl_suggestions s join public.csl_profiles p on p.user_id=s.user_id
  where (p_teacher or s.user_id=uid) and (p_status='all' or s.status=p_status) order by s.created_at desc,s.id limit 20 offset p_offset
 ) r;
 return jsonb_build_object('rows',result,'total',total);
end $$;
create or replace function public.csl_reply_suggestion(p_id uuid,p_version integer,p_status text,p_reply text,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_actor); old public.csl_suggestions; result public.csl_suggestions; begin
 perform csl_private.teacher();
 if p_status not in ('new','reviewing','done') or p_status is null or p_reply is null or char_length(p_reply)>600 or (p_status='done' and char_length(btrim(p_reply))<3) then raise exception 'Choose a status and add a short reply before resolving a suggestion (up to 600 characters).'; end if;
 select * into old from public.csl_suggestions where id=p_id for update;
 if not found then raise exception 'Suggestion not found.'; end if;
 if old.version is distinct from p_version then
  if old.status=p_status and old.reply=btrim(p_reply) then return to_jsonb(old); end if;
  raise exception 'Another teacher updated this suggestion. Refresh before saving.';
 end if;
 update public.csl_suggestions set status=p_status,reply=btrim(p_reply),version=version+1,updated_at=now() where id=p_id returning * into result;
 insert into public.csl_teacher_activity(actor,action,subject,note,before_value,after_value) values(uid,'suggestion',p_id::text,'Suggestion status or reply updated',to_jsonb(old),to_jsonb(result));
 return to_jsonb(result);
end $$;
revoke all on function public.csl_send_suggestion(uuid,text,text,text,text,text,uuid),public.csl_suggestion_inbox(boolean,text,integer),public.csl_reply_suggestion(uuid,integer,text,text,uuid) from public,anon;
grant execute on function public.csl_send_suggestion(uuid,text,text,text,text,text,uuid),public.csl_suggestion_inbox(boolean,text,integer),public.csl_reply_suggestion(uuid,integer,text,text,uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
