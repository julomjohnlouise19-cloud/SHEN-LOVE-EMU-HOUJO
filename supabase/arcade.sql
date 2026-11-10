create table if not exists public.csl_arcade_sessions (
 id uuid primary key, user_id uuid not null references public.csl_profiles(user_id) on delete cascade,
 category text not null check(category in ('life','chemistry','physics','earth')), state jsonb not null, questions jsonb not null,
 created_at timestamptz not null default now(), completed_at timestamptz
);
create index if not exists csl_arcade_sessions_user_time on public.csl_arcade_sessions(user_id,created_at desc);
create table if not exists csl_private.arcade_commands (
 session_id uuid not null references public.csl_arcade_sessions(id) on delete cascade, command_id uuid not null, body jsonb not null,
 primary key(session_id,command_id)
);
alter table public.csl_arcade_sessions enable row level security;
alter table csl_private.arcade_commands enable row level security;
revoke all on public.csl_arcade_sessions,csl_private.arcade_commands from public,anon,authenticated;

create or replace function csl_private.now_ms() returns bigint language sql volatile set search_path='' as $$ select floor(extract(epoch from clock_timestamp())*1000)::bigint; $$;
create or replace function csl_private.arcade_view(game_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare g public.csl_arcade_sessions; q jsonb; begin
 select * into g from public.csl_arcade_sessions where id=game_id;
 if not found then raise exception 'This arcade round could not be found.'; end if;
 q:=case when (g.state->>'completed')::boolean then null else g.questions->(g.state->>'index')::int end;
 return jsonb_build_object('state',g.state,'question',q-'answer'-'accept'-'tolerance'-'explanation'-'scienceFact','serverNow',csl_private.now_ms());
end $$;
create or replace function public.csl_arcade_start(p_user_id uuid,p_category text,p_request_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); previous public.csl_arcade_sessions; cards jsonb:='[]'; chunk jsonb; ids jsonb; cfg jsonb; t bigint; lev text; begin
 if p_category is null or p_category not in ('life','chemistry','physics','earth') or p_request_id is null then raise exception 'Choose a science arcade category.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||'arcade',5));
 select * into previous from public.csl_arcade_sessions where id=p_request_id;
 if found then
  if previous.user_id<>uid or previous.category<>p_category then raise exception 'This round ID was already used.'; end if; return csl_private.arcade_view(previous.id);
 end if;
 foreach lev in array array['easy','medium','hard'] loop
  select coalesce(jsonb_agg(question),'[]') into chunk from (
   select b.question from csl_private.questions b left join public.csl_question_overrides o on o.question_id=b.id
   where split_part(b.question->>'deckId','.',1)=p_category and b.question->>'level'=lev and b.question->>'type'='mcq' and jsonb_array_length(b.question->'options')=4 and coalesce(o.active,true)
   order by random() limit 3
  ) bank;
  if jsonb_array_length(chunk)<>3 then raise exception 'This category needs three reviewed four-choice cards at every level.'; end if;
  cards:=cards||chunk;
 end loop;
 select jsonb_agg(value->>'id') into ids from jsonb_array_elements(cards);
 select game into cfg from public.csl_settings where id; t:=csl_private.now_ms();
 update public.csl_arcade_sessions set completed_at=now() where user_id=uid and completed_at is null;
 insert into public.csl_arcade_sessions(id,user_id,category,questions,state)
 values(p_request_id,uid,p_category,cards,jsonb_build_object('version',1,'revision',0,'id',p_request_id,'userId',uid,'category',p_category,'ids',ids,'index',0,'score',0,'coins',0,'combo',0,'correct',0,'darts',2,'wrong','[]'::jsonb,'timeUsed',false,'dartUsed',false,'deadline',t+(cfg->'seconds'->>0)::int*1000,'reloadUntil',t,'created',t,'completed',false,'rules',cfg));
 return csl_private.arcade_view(p_request_id);
end $$;
revoke all on function public.csl_arcade_start(uuid,text,uuid) from public,anon;
grant execute on function public.csl_arcade_start(uuid,text,uuid) to authenticated;

create or replace function public.csl_arcade_current(p_user_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); game_id uuid; begin
 select id into game_id from public.csl_arcade_sessions where user_id=uid and completed_at is null order by created_at desc limit 1;
 if game_id is null then return null; end if; return csl_private.arcade_view(game_id);
end $$;
revoke all on function public.csl_arcade_current(uuid) from public,anon;
grant execute on function public.csl_arcade_current(uuid) to authenticated;

create or replace function public.csl_arcade_action(p_user_id uuid,p_session_id uuid,p_command_id uuid,p_question_id text,p_action text,p_option text default '') returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(p_user_id); g public.csl_arcade_sessions; s jsonb; q jsonb; cfg jsonb; old_body jsonb; body jsonb; feedback jsonb;
 t bigint; idx integer; score_value integer; coins_value integer; combo_value integer; correct_value integer; darts_value integer; wrong_value jsonb; multiplier integer:=1;
 deadline_value bigint; reload_value bigint; time_used boolean; dart_used boolean; advance boolean:=false; complete boolean:=false; answer_text text; explanation text;
begin
 if p_command_id is null or p_action is null or p_action not in ('shoot','timeout','time','dart') or char_length(coalesce(p_option,''))>80 then raise exception 'This arcade action is not valid.'; end if;
 select * into g from public.csl_arcade_sessions where id=p_session_id for update;
 if not found or g.user_id<>uid then raise exception 'This round belongs to another account.' using errcode='42501'; end if;
 body:=jsonb_build_object('question',p_question_id,'action',p_action,'option',coalesce(p_option,''));
 select b.body into old_body from csl_private.arcade_commands b where session_id=g.id and command_id=p_command_id;
 if found then
  if old_body<>body then raise exception 'This shot ID was already used.'; end if; return csl_private.arcade_view(g.id);
 end if;
 s:=g.state;
 if (s->>'completed')::boolean or g.completed_at is not null then raise exception 'This arcade round is finished.'; end if;
 idx:=(s->>'index')::int; q:=g.questions->idx;
 if q->>'id' is distinct from p_question_id then raise exception 'This discovery already moved on. Refresh the round.'; end if;
 cfg:=s->'rules'; t:=csl_private.now_ms(); deadline_value:=(s->>'deadline')::bigint; reload_value:=(s->>'reloadUntil')::bigint;
 score_value:=(s->>'score')::int; coins_value:=(s->>'coins')::int; combo_value:=(s->>'combo')::int; correct_value:=(s->>'correct')::int; darts_value:=(s->>'darts')::int;
 wrong_value:=s->'wrong'; time_used:=(s->>'timeUsed')::boolean; dart_used:=(s->>'dartUsed')::boolean; feedback:=s->'feedback';
 select value->>'text' into answer_text from jsonb_array_elements(q->'options') where value->>'id'=q->>'answer';
 explanation:=coalesce(q->>'explanation','A new science discovery is ready.');
 if t>=deadline_value then
  score_value:=greatest(0,score_value-(cfg->>'penalty')::int); coins_value:=greatest(0,coins_value-1); combo_value:=0; advance:=true;
  feedback:=jsonb_build_object('kind','timeout','text','Time’s up. Let’s discover why.','answer',answer_text,'explanation',explanation,'multiplier',1);
 elsif p_action='timeout' then return csl_private.arcade_view(g.id);
 elsif p_action='time' then
  if time_used or coins_value<(cfg->>'timeCost')::int then raise exception 'Extra time needs more round coins, or was already used on this card.'; end if;
  coins_value:=coins_value-(cfg->>'timeCost')::int; time_used:=true; deadline_value:=deadline_value+5000;
 elsif p_action='dart' then
  if dart_used or coins_value<(cfg->>'dartCost')::int then raise exception 'An extra dart needs more round coins, or was already used on this card.'; end if;
  coins_value:=coins_value-(cfg->>'dartCost')::int; dart_used:=true; darts_value:=darts_value+1;
 else
  if t<reload_value then raise exception 'Reloading. Your next dart is ready in one second.'; end if;
  if wrong_value?coalesce(p_option,'') then raise exception 'Try another target.'; end if;
  if coalesce(p_option,'')<>'__miss__' and not exists(select 1 from jsonb_array_elements(q->'options') where value->>'id'=p_option) then raise exception 'Aim at one of the targets to shoot.'; end if;
  darts_value:=darts_value-1; reload_value:=t+1000;
  if p_option=q->>'answer' then
   combo_value:=combo_value+1; correct_value:=correct_value+1; multiplier:=least(3,1+combo_value/3);
   score_value:=score_value+(cfg->>'points')::int*multiplier; coins_value:=coins_value+(cfg->>'coins')::int; advance:=true;
   feedback:=jsonb_build_object('kind','correct','text',case when multiplier>1 then 'Bullseye! ×'||multiplier||' combo.' else 'Bullseye! A bright discovery.' end,'answer',answer_text,'explanation',explanation,'multiplier',multiplier);
  else
   combo_value:=0; score_value:=greatest(0,score_value-(cfg->>'penalty')::int); coins_value:=greatest(0,coins_value-1);
   if p_option<>'__miss__' then wrong_value:=wrong_value||jsonb_build_array(p_option); end if;
   feedback:=jsonb_build_object('kind',case when p_option='__miss__' then 'miss' else 'wrong' end,'text',case when darts_value>0 then 'A mix-up. Reload and try another target.' else 'Out of darts. A new discovery is next.' end,'multiplier',1);
   if darts_value=0 then advance:=true; feedback:=feedback||jsonb_build_object('answer',answer_text,'explanation',explanation); end if;
  end if;
 end if;
 if advance then
  idx:=idx+1; complete:=idx>=9; darts_value:=2; wrong_value:='[]'; time_used:=false; dart_used:=false; reload_value:=t+1000;
  deadline_value:=case when complete then t else t+1000+(cfg->'seconds'->>least(2,idx/3))::int*1000 end;
 end if;
 s:=s||jsonb_build_object('revision',(s->>'revision')::int+1,'index',idx,'score',score_value,'coins',coins_value,'combo',combo_value,'correct',correct_value,'darts',darts_value,'wrong',wrong_value,'timeUsed',time_used,'dartUsed',dart_used,'deadline',deadline_value,'reloadUntil',reload_value,'completed',complete,'feedback',feedback);
 update public.csl_arcade_sessions set state=s,completed_at=case when complete then now() else null end where id=g.id;
 insert into csl_private.arcade_commands(session_id,command_id,body) values(g.id,p_command_id,body);
 if complete then perform csl_private.credit_award(uid,'arcade',g.id::text,correct_value); end if;
 return csl_private.arcade_view(g.id);
end $$;
revoke all on function public.csl_arcade_action(uuid,uuid,uuid,text,text,text) from public,anon;
grant execute on function public.csl_arcade_action(uuid,uuid,uuid,text,text,text) to authenticated;

create or replace function public.csl_arcade_rankings(p_category text default 'all') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=csl_private.actor(); result jsonb; begin
 if p_category is null or p_category not in ('all','life','chemistry','physics','earth') then raise exception 'Choose a leaderboard category.'; end if;
 with best as (
  select distinct on(g.user_id) g.user_id,p.display_name,g.category,(g.state->>'score')::int score,(g.state->>'correct')::int correct,g.completed_at
  from public.csl_arcade_sessions g join public.csl_profiles p using(user_id)
  where p.active and g.state->>'completed'='true' and (p_category='all' or g.category=p_category)
  order by g.user_id,(g.state->>'score')::int desc,(g.state->>'correct')::int desc,g.completed_at,g.id
 ), ranked as (select row_number() over(order by score desc,correct desc,completed_at,user_id) rank,* from best)
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') into result from (select * from ranked order by rank limit 100) r;
 return result;
end $$;
revoke all on function public.csl_arcade_rankings(text) from public,anon;
grant execute on function public.csl_arcade_rankings(text) to authenticated;
revoke all on function csl_private.now_ms(),csl_private.arcade_view(uuid) from public,anon,authenticated;
