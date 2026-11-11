import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
export function verifySuggestions(sql: (input: string) => string) {
  const uid = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  const login = (n: number) =>
    `reset role; set role authenticated; set request.jwt.claim.sub='${uid(n)}';`;
  const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;
  const id = randomUUID();
  const call = `select public.csl_send_suggestion('${id}','idea','A helpful science idea','Please add more helpful examples for cells.','life.cells','')`;
  sql(`reset role; set role anon; select public.test_assert(public.csl_suggestions_status()->>'version'='1','suggestion capability');
    select public.test_denied('select public.csl_suggestion_inbox()');
    ${login(1)} select public.test_denied('select * from public.csl_suggestions');
    select public.test_denied(${quote(`select public.csl_send_suggestion('${randomUUID()}','idea','Valid title','A valid message for a different actor.','','','${uid(2)}')`)});
    select public.test_denied('select public.csl_suggestion_inbox(true)');
    ${call}; ${call};
    select public.test_assert((public.csl_suggestion_inbox()->>'total')::int=1,'idempotent suggestion');
    ${login(2)} select public.test_assert((public.csl_suggestion_inbox()->>'total')::int=0,'another student cannot read it');
    select public.test_rejected(${quote(call)});
    select public.test_denied('select public.csl_reply_suggestion(''${id}'',1,''done'',''A reply'')');
    ${login(3)} select public.test_assert((public.csl_suggestion_inbox(true)->>'total')::int=1,'teacher inbox');
    select public.test_rejected('select public.csl_reply_suggestion(''${id}'',1,''done'','''')');
    select public.csl_reply_suggestion('${id}',1,'reviewing','Thank you. We are reviewing this idea.');
    select public.test_rejected('select public.csl_reply_suggestion(''${id}'',1,''done'',''A stale reply'')');
    select public.csl_reply_suggestion('${id}',2,'done','We added examples to the lesson.');
    select public.csl_reply_suggestion('${id}',2,'done','We added examples to the lesson.');
    ${login(1)} select public.test_assert(public.csl_suggestion_inbox()->'rows'->0->>'status'='done','author sees reply');
    select public.test_assert(public.csl_suggestion_inbox()->'rows'->0->>'message'='Please add more helpful examples for cells.','original message preserved');
    reset role; select public.test_assert((select count(*)=2 from public.csl_teacher_activity where action='suggestion' and subject='${id}'),'audited replies without retry duplication');
    update public.csl_profiles set active=false where user_id='${uid(2)}';
    ${login(2)} select public.test_denied('select public.csl_suggestion_inbox()'); reset role;
    update public.csl_profiles set active=true where user_id='${uid(2)}';`);
  for (let n = 0; n < 5; n++)
    sql(
      `${login(4)} select public.csl_send_suggestion('${randomUUID()}','question','A little question','Can we explore a little more science?');`,
    );
  sql(
    `${login(4)} select public.test_rejected('select public.csl_send_suggestion(''${randomUUID()}'',''idea'',''Another idea'',''This should reach the daily limit.'')'); reset role;`,
  );
  sql(readFileSync("supabase/suggestions-upgrade.sql", "utf8"));
  sql(
    `${login(1)} select public.test_assert(public.csl_suggestion_inbox()->'rows'->0->>'reply'='We added examples to the lesson.','upgrade rerun preserves replies'); reset role;`,
  );
  console.log(
    "Suggestions PostgreSQL passed: ownership, teacher permissions, daily limits, retries, audit, optimistic versions and upgrade preservation.",
  );
}
