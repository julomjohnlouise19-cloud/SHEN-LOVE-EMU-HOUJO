-- Existing classroom project: run this entire additive script. Preserves all existing records.
begin;
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
