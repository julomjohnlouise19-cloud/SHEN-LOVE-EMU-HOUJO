-- Existing platform-3 project: run the entire additive script in SQL Editor.
-- Preserves accounts, quiz evidence, balances, stock and reservations.
begin;
do $$ begin if to_regclass('public.csl_preferences') is null then raise exception 'Install the Studio upgrade before the account-details upgrade.'; end if; end $$;
create or replace function csl_private.integer_field(v jsonb,k text,lo integer,hi integer) returns integer language plpgsql immutable set search_path='' as $$
declare n integer; begin
 if (jsonb_typeof(v->k)='number' and (v->>k) ~ '^-?[0-9]+$') is not true then raise exception 'Use a whole number for %.',k; end if;
 n:=(v->>k)::integer; if n<lo or n>hi then raise exception '% must be between % and %.',k,lo,hi; end if; return n;
exception when numeric_value_out_of_range then raise exception 'That number is too large.';
end $$;
create or replace function csl_private.valid_game(g jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare v jsonb; previous numeric:=100; n numeric; begin
 if jsonb_typeof(g)<>'object' or jsonb_array_length(g->'seconds')<>3 or jsonb_array_length(g->'motion')<>3 then return false; end if;
 for v in select value from jsonb_array_elements(g->'seconds') loop
  if jsonb_typeof(v)<>'number' or v::text !~ '^[0-9]+$' then return false; end if;
  n:=v::text::numeric; if n<8 or n>60 or n>previous then return false; end if; previous:=n;
 end loop;
 previous:=100;
 for v in select value from jsonb_array_elements(g->'motion') loop
  if jsonb_typeof(v)<>'number' then return false; end if;
  n:=v::text::numeric; if n<1.25 or n>8 or n>previous then return false; end if; previous:=n;
 end loop;
 perform csl_private.integer_field(g,'points',1,500),csl_private.integer_field(g,'penalty',1,500),csl_private.integer_field(g,'coins',1,10),csl_private.integer_field(g,'timeCost',1,20),csl_private.integer_field(g,'dartCost',1,20);
 return (g->>'penalty')::int<=(g->>'points')::int;
exception when others then return false;
end $$;
create or replace function csl_private.valid_rules(r jsonb) returns boolean language plpgsql stable set search_path='' as $$
declare k text; begin
 if jsonb_typeof(r)<>'object' or not exists(select 1 from pg_catalog.pg_timezone_names where name=r->>'timezone') then return false; end if;
 if r?'pickupLocation' and (jsonb_typeof(r->'pickupLocation') is distinct from 'string' or char_length(btrim(r->>'pickupLocation')) not between 2 and 160) then return false; end if;
 foreach k in array array['starterMerits','comboBonus','meritEasy','meritMedium','meritHard','dailyCap','correctXP','attemptXP','xpPerLevel','comboEvery','reviewReward','dailyReward','questReward','spinMax','skillsLevel'] loop
  perform csl_private.integer_field(r,k,case when k in ('xpPerLevel','comboEvery','skillsLevel') then 1 else 0 end,case when k='xpPerLevel' then 10000 when k='dailyCap' then 1000 when k='starterMerits' then 200 when k='skillsLevel' then 100 else 500 end);
 end loop;
 return true;
exception when others then return false;
end $$;

create or replace function public.csl_teacher_command(p_request_id uuid,p_action text,p_body jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=csl_private.teacher(); previous csl_private.teacher_requests; result jsonb:='{"ok":true}'; before_value jsonb; after_value jsonb;
 target text; note_value text:=''; target_user uuid; n integer; balance integer; item public.csl_items; ord public.csl_orders; cfg public.csl_settings;
 q jsonb; old_q jsonb; entry jsonb; ids text[]:='{}'; version_value bigint; active_value boolean;
begin
 if p_request_id is null or jsonb_typeof(p_body) is distinct from 'object' or octet_length(p_body::text)>100000 then raise exception 'This change could not be validated.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request_id::text,2));
 select * into previous from csl_private.teacher_requests where actor=uid and request_id=p_request_id;
 if found then
  if previous.action is distinct from p_action or previous.body is distinct from p_body then raise exception 'This change ID was already used.'; end if;
  return previous.result;
 end if;
 if p_action='student' then
  if p_body?'reason' then note_value:=btrim(p_body->>'reason'); if note_value is null or char_length(note_value) not between 3 and 300 then raise exception 'Add a reason of 3-300 characters.'; end if; end if;
  target_user:=(p_body->>'user_id')::uuid; target:=target_user::text;
  select to_jsonb(p) into before_value from public.csl_profiles p where user_id=target_user for update;
  if before_value is null then raise exception 'Student not found.'; end if;
  if char_length(btrim(p_body->>'display_name')) not between 2 and 40 or char_length(p_body->>'section')>40 or jsonb_typeof(p_body->'active') is distinct from 'boolean' or p_body->>'display_name' is null or p_body->>'section' is null then raise exception 'Check the student name, section and account status.'; end if;
  n:=csl_private.integer_field(p_body,'grade',7,10);
  if (p_body->>'active')::boolean=false and exists(select 1 from public.csl_teachers where user_id=target_user) then raise exception 'Teacher access is managed by the site owner.'; end if;
  if p_body->>'expected_updated' is distinct from md5(before_value::text) then raise exception 'This student profile changed. Refresh before saving.'; end if;
  update public.csl_profiles set display_name=btrim(p_body->>'display_name'),grade=n,section=btrim(p_body->>'section'),active=(p_body->>'active')::boolean where user_id=target_user returning to_jsonb(csl_profiles.*) into after_value;
 elsif p_action='credits' then
  target_user:=(p_body->>'user_id')::uuid; target:=target_user::text;
  n:=csl_private.integer_field(p_body,'delta',-10000,10000); note_value:=btrim(p_body->>'reason');
  if char_length(note_value) not between 3 and 300 or note_value is null then raise exception 'Add a reason of 3–300 characters.'; end if;
  select credits into balance from public.csl_wallets where user_id=target_user for update;
  if not found or balance+n<0 then raise exception 'Check the student and balance. Credits cannot go below zero.'; end if;
  before_value:=jsonb_build_object('credits',balance);
  update public.csl_wallets set credits=credits+n where user_id=target_user;
  insert into public.csl_credit_ledger(user_id,kind,reference,amount,note) values(target_user,'teacher',p_request_id::text,n,note_value);
  after_value:=jsonb_build_object('credits',balance+n);
 elsif p_action='item' then
  target:=p_body->>'id';
  if target is null or target !~ '^[a-z0-9_-]{1,64}$' or char_length(btrim(p_body->>'name')) not between 2 and 80 or char_length(p_body->>'description')>500 or char_length(btrim(p_body->>'category')) not between 2 and 40 or p_body->>'name' is null or p_body->>'description' is null or p_body->>'category' is null then raise exception 'Check the supply name, description and category.'; end if;
  if (p_body->>'icon' in ('pencils','notebook','ruler','markers','goggles','sticky') and p_body->>'color' in ('yellow','green','blue','peach','lilac') and jsonb_typeof(p_body->'active')='boolean') is not true then raise exception 'Choose a valid supply illustration, color and visibility.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target,3));
  select * into item from public.csl_items where id=target for update;
  version_value:=case when found then item.version else 0 end;
  if csl_private.integer_field(p_body,'version',0,2147483647)<>version_value then raise exception 'This supply changed. Refresh before saving.'; end if;
  before_value:=case when version_value=0 then null else to_jsonb(item) end;
  insert into public.csl_items(id,name,description,price,stock,icon,color,category,active,version)
   values(target,btrim(p_body->>'name'),p_body->>'description',csl_private.integer_field(p_body,'price',1,10000),csl_private.integer_field(p_body,'stock',0,100000),p_body->>'icon',p_body->>'color',btrim(p_body->>'category'),(p_body->>'active')::boolean,version_value+1)
   on conflict(id) do update set name=excluded.name,description=excluded.description,price=excluded.price,stock=excluded.stock,icon=excluded.icon,color=excluded.color,category=excluded.category,active=excluded.active,version=excluded.version
   returning to_jsonb(csl_items.*) into after_value;
 elsif p_action='claim' then
  target:=p_body->>'id';
  select * into ord from public.csl_orders where id=target::uuid for update;
  if not found or ord.status<>'reserved' then raise exception 'This reservation has already been handled. Refresh the claims.'; end if;
  before_value:=to_jsonb(ord); note_value:=left(coalesce(p_body->>'reason',''),300);
  if p_body->>'status'='collected' then
   if upper(btrim(p_body->>'code')) is distinct from ord.code then raise exception 'Check the claim code shown by the student.'; end if;
   update public.csl_orders set status='collected',updated_at=now() where id=ord.id returning to_jsonb(csl_orders.*) into after_value;
  elsif p_body->>'status'='cancelled' then
   if char_length(btrim(note_value))<3 then raise exception 'Add a cancellation reason.'; end if;
   perform 1 from public.csl_wallets where user_id=ord.user_id for update;
   update public.csl_wallets set credits=credits+ord.price where user_id=ord.user_id;
   update public.csl_items set stock=stock+1,version=version+1 where id=ord.item_id;
   insert into public.csl_credit_ledger(user_id,kind,reference,amount,note) values(ord.user_id,'refund',ord.id::text,ord.price,note_value);
   update public.csl_orders set status='cancelled',updated_at=now() where id=ord.id returning to_jsonb(csl_orders.*) into after_value;
  else raise exception 'Choose collection or cancellation.'; end if;
 elsif p_action in ('rules','game') then
  target:='settings'; select * into cfg from public.csl_settings where id for update;
  if csl_private.integer_field(p_body,'version',1,2147483647)<>cfg.version then raise exception 'These settings changed. Refresh before saving.'; end if;
  before_value:=to_jsonb(cfg);
  if p_action='rules' then
   if not csl_private.valid_rules(p_body->'rules') then raise exception 'Check the learning rules, limits and timezone.'; end if;
   update public.csl_settings set rules=p_body->'rules',version=version+1 where id returning to_jsonb(csl_settings.*) into after_value;
  else
   if not csl_private.valid_game(p_body->'game') then raise exception 'Use three decreasing time and movement levels, with valid score and coin settings.'; end if;
   update public.csl_settings set game=p_body->'game',version=version+1 where id returning to_jsonb(csl_settings.*) into after_value;
  end if;
 elsif p_action='question' then
  q:=p_body->'question'; target:=q->>'id';
  perform pg_advisory_xact_lock(hashtextextended(coalesce(target,''),4));
  select question into old_q from csl_private.questions where id=target;
  if not found then raise exception 'Choose an existing published card.'; end if;
  if (q->>'deckId'=old_q->>'deckId' and q->>'level'=old_q->>'level' and q->>'type'=old_q->>'type' and q->>'topic'=q->>'deckId' and char_length(btrim(q->>'prompt')) between 10 and 500 and char_length(q->>'explanation') between 20 and 220 and char_length(btrim(q->>'scienceFact')) between 2 and 500 and q->'reviewed'='true'::jsonb and jsonb_typeof(p_body->'active')='boolean') is not true then raise exception 'Keep the card identity and type. Add a reviewed prompt, explanation and science fact.'; end if;
  perform csl_private.integer_field(q,'gradeBand',7,10);
  if jsonb_typeof(q->'answer') is distinct from jsonb_typeof(old_q->'answer') then raise exception 'Keep the answer format for this card type.'; end if;
  if q->'options' is not null then
   if jsonb_typeof(q->'options')<>'array' or jsonb_array_length(q->'options')<>jsonb_array_length(old_q->'options') then raise exception 'Keep the expected number of choices.'; end if;
   for entry in select value from jsonb_array_elements(q->'options') loop
    if (char_length(entry->>'id') between 1 and 80 and char_length(btrim(entry->>'text')) between 1 and 300 and not (entry->>'id'=any(ids))) is not true then raise exception 'Use different choice IDs and nonempty choice text.'; end if; ids:=array_append(ids,entry->>'id');
   end loop;
   if q->>'type' in ('mcq','truefalse','diagram','data') and not (q->>'answer'=any(ids)) then raise exception 'Choose exactly one listed correct answer.'; end if;
  end if;
  select coalesce(max(version),0) into version_value from public.csl_question_overrides where question_id=target;
  if csl_private.integer_field(p_body,'version',0,2147483647)<>version_value then raise exception 'This card changed. Refresh before saving.'; end if;
  active_value:=(p_body->>'active')::boolean;
  if not active_value and (select count(*) from csl_private.questions b left join public.csl_question_overrides o on o.question_id=b.id where b.question->>'deckId'=q->>'deckId' and b.question->>'level'=q->>'level' and b.id<>target and coalesce(o.active,true))<8 then raise exception 'Keep at least eight active cards at each deck level.'; end if;
  if not active_value and q->>'type'='mcq' and (select count(*) from csl_private.questions b left join public.csl_question_overrides o on o.question_id=b.id where split_part(b.question->>'deckId','.',1)=split_part(q->>'deckId','.',1) and b.question->>'level'=q->>'level' and b.question->>'type'='mcq' and b.id<>target and coalesce(o.active,true))<3 then raise exception 'Keep three arcade cards at each category level.'; end if;
  before_value:=jsonb_build_object('question',old_q,'active',coalesce((select active from public.csl_question_overrides where question_id=target),true),'version',version_value);
  insert into csl_private.question_versions(question_id,revision,question) values(target,version_value,old_q) on conflict do nothing;
  insert into csl_private.question_versions(question_id,revision,question) values(target,version_value+1,q);
  insert into public.csl_question_overrides(question_id,question,active,version) values(target,q,active_value,version_value+1) on conflict(question_id) do update set question=q,active=active_value,version=version_value+1,updated_at=now();
  update csl_private.questions set question=q where id=target;
  after_value:=jsonb_build_object('question',q,'active',active_value,'version',version_value+1);
 elsif p_action='feedback' then
  target:=p_body->>'attempt_id'; note_value:=btrim(p_body->>'note');
  if note_value is null or char_length(note_value)>500 or not exists(select 1 from public.csl_quiz_attempts where id=target::uuid) then raise exception 'Choose a quiz record and a note of up to 500 characters.'; end if;
  select to_jsonb(n) into before_value from public.csl_attempt_notes n where attempt_id=target::uuid;
  insert into public.csl_attempt_notes(attempt_id,note,teacher_id) values(target::uuid,note_value,uid) on conflict(attempt_id) do update set note=excluded.note,teacher_id=uid,updated_at=now() returning to_jsonb(csl_attempt_notes.*) into after_value;
 else raise exception 'This teacher action is not available.'; end if;
 insert into public.csl_teacher_activity(actor,action,subject,note,before_value,after_value) values(uid,p_action,target,note_value,before_value,after_value);
 result:=jsonb_build_object('ok',true,'value',after_value);
 insert into csl_private.teacher_requests(actor,request_id,action,body,result) values(uid,p_request_id,p_action,p_body,result);
 return result;
end $$;
revoke all on function public.csl_teacher_command(uuid,text,jsonb) from public,anon;
grant execute on function public.csl_teacher_command(uuid,text,jsonb) to authenticated;

create or replace function public.csl_teacher_data(p_view text,p_filters jsonb default '{}',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.teacher(); result jsonb; query_value text:=left(coalesce(p_filters->>'search',''),100); grade_value integer:=nullif(p_filters->>'grade','')::int; section_value text:=left(coalesce(p_filters->>'section',''),40); off_value integer:=greatest(0,least(coalesce(p_offset,0),1000000)); begin
 if p_view='overview' then
  result:=jsonb_build_object('stats',jsonb_build_object(
   'students',(select count(*) from public.csl_profiles p where not exists(select 1 from public.csl_teachers t where t.user_id=p.user_id)),
   'active',(select count(*) from public.csl_profiles p where active and not exists(select 1 from public.csl_teachers t where t.user_id=p.user_id)),
   'attempts',(select count(*) from public.csl_quiz_attempts),
   'correct',(select coalesce(sum(correct),0) from public.csl_quiz_attempts),
   'answers',(select coalesce(sum(total),0) from public.csl_quiz_attempts),
   'pending',(select count(*) from public.csl_orders where status='reserved'),
   'low_stock',(select count(*) from public.csl_items where active and stock<=5),
   'games',(select count(*) from public.csl_arcade_sessions where state->>'completed'='true')),
   'charts',coalesce((select jsonb_agg(to_jsonb(c)) from (select deck_id,count(*) attempts,sum(correct) correct,sum(total) total from public.csl_quiz_attempts group by deck_id order by count(*) desc,deck_id limit 12) c),'[]'),
   'rows','[]'::jsonb,'total',0);
 elsif p_view='students' then
  with filtered as (
   select p.*,w.credits,exists(select 1 from public.csl_teachers t where t.user_id=p.user_id) is_teacher,
    md5(to_jsonb(p)::text) expected_updated,(select count(*) from public.csl_quiz_attempts a where a.user_id=p.user_id) attempts
   from public.csl_profiles p join public.csl_wallets w using(user_id)
   where (query_value='' or p.display_name ilike '%'||query_value||'%') and (grade_value is null or p.grade=grade_value) and (section_value='' or p.section ilike '%'||section_value||'%')
  ) select jsonb_build_object('total',count(*),'rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by display_name,user_id limit 50 offset off_value) r),'[]')) into result from filtered;
 elsif p_view='shop' then
  with filtered as (select * from public.csl_items where query_value='' or name ilike '%'||query_value||'%')
  select jsonb_build_object('total',count(*),'rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by active desc,name,id limit 50 offset off_value) r),'[]')) into result from filtered;
 elsif p_view='claims' then
  with filtered as (
   select o.*,p.display_name,p.grade,p.section from public.csl_orders o join public.csl_profiles p using(user_id)
   where (query_value='' or p.display_name ilike '%'||query_value||'%' or o.code ilike '%'||query_value||'%') and (grade_value is null or p.grade=grade_value) and (section_value='' or p.section ilike '%'||section_value||'%') and (coalesce(p_filters->>'status','')='' or o.status=p_filters->>'status')
  ) select jsonb_build_object('total',count(*),'rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by created_at desc,id desc limit 50 offset off_value) r),'[]')) into result from filtered;
 elsif p_view='reports' then
  with filtered as (
   select a.id,a.user_id,p.display_name,p.grade,p.section,a.deck_id,a.level,a.mode,a.correct,a.total,a.received_at,a.responses,coalesce(n.note,'') teacher_note
   from public.csl_quiz_attempts a join public.csl_profiles p using(user_id) left join public.csl_attempt_notes n on n.attempt_id=a.id
   where (query_value='' or p.display_name ilike '%'||query_value||'%') and (grade_value is null or p.grade=grade_value) and (section_value='' or p.section ilike '%'||section_value||'%') and (coalesce(p_filters->>'deck','')='' or a.deck_id=p_filters->>'deck')
  ) select jsonb_build_object('total',count(*),'stats',jsonb_build_object('attempts',count(*),'correct',coalesce(sum(correct),0),'answers',coalesce(sum(total),0)),'rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by received_at desc,id desc limit 50 offset off_value) r),'[]')) into result from filtered;
 elsif p_view='content' then
  with filtered as (
   select b.question,coalesce(o.active,true) active,coalesce(o.version,0) version from csl_private.questions b left join public.csl_question_overrides o on o.question_id=b.id
   where (query_value='' or b.question->>'prompt' ilike '%'||query_value||'%') and (coalesce(p_filters->>'deck','')='' or b.question->>'deckId'=p_filters->>'deck')
  ) select jsonb_build_object('total',count(*),'rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by question->>'deckId',question->>'level',question->>'id' limit 50 offset off_value) r),'[]')) into result from filtered;
 elsif p_view='settings' then
  select jsonb_build_object('rows',jsonb_build_array(to_jsonb(s)),'total',1) into result from public.csl_settings s where id;
 elsif p_view='activity' then
  with filtered as (
   select a.*,p.display_name actor_name from public.csl_teacher_activity a left join public.csl_profiles p on p.user_id=a.actor where query_value='' or a.action ilike '%'||query_value||'%' or a.note ilike '%'||query_value||'%'
  ) select jsonb_build_object('total',count(*),'rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by created_at desc,id desc limit 50 offset off_value) r),'[]')) into result from filtered;
 else raise exception 'Choose a teacher workspace section.'; end if;
 return result;
end $$;
revoke all on function public.csl_teacher_data(text,jsonb,integer) from public,anon;
grant execute on function public.csl_teacher_data(text,jsonb,integer) to authenticated;
revoke all on function csl_private.integer_field(jsonb,text,integer,integer),csl_private.valid_game(jsonb),csl_private.valid_rules(jsonb) from public,anon,authenticated;

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

commit;
