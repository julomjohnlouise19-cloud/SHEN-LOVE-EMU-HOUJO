import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
export function verifyStudio(sql: (input: string) => string) {
  const uid = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  const login = (n: number) =>
    `reset role; set role authenticated; set request.jwt.claim.sub='${uid(n)}';`;
  const quote = (v: unknown) =>
    `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
  const text = (v: string) => `'${v.replaceAll("'", "''")}'`;
  const data = <T>(s: string): T => JSON.parse(sql(s).trim());
  const command = (action: string, body: unknown, request = randomUUID()) =>
    `public.csl_studio_command('${request}',${text(action)},${quote(body)})`;
  sql(`reset role; select public.test_assert((public.csl_backend_status()->>'platform')::int=3,'studio upgrade installed');
    set role anon; select public.test_denied('select public.csl_studio_data(''quizzes'')');
    select public.test_denied('select public.csl_preferences()');
    ${login(1)} select public.test_denied('select public.csl_studio_data(''health'')');
    select public.test_denied('select public.csl_studio_command(gen_random_uuid(),''role'',''{}'')');
    select public.test_denied('select * from public.csl_record_labels');
    select public.test_denied('update public.csl_preferences set theme=''sunset''');
    select public.test_assert(public.csl_preferences()->>'theme'='meadow','default preferences');
    select public.csl_preferences('aurora','A curious scientist.');
    select public.test_assert(public.csl_preferences()->>'bio'='A curious scientist.','saved personal introduction');
    select public.test_rejected('select public.csl_preferences(''invalid'',''hello'')');
    select public.test_rejected('select public.csl_studio_data(''quizzes'',''{"from":"2026-12-01","to":"2026-11-01"}'')');
    select public.test_assert((public.csl_studio_data('quizzes','{"from":"2050-01-01"}')->>'total')::int=0,'date filters applied'); reset role;`);
  const own = data<{ rows: { user_id: string }[] }>(
    `${login(1)} select public.csl_studio_data('quizzes');`,
  );
  if (!own.rows.length || own.rows.some((r) => r.user_id !== uid(1)))
    throw new Error("Personal records crossed account boundaries.");
  type Row = {
    id: string;
    metadata_version: number;
    archived: boolean;
    user_id: string;
  };
  const rows = data<{ rows: Row[] }>(
    `${login(3)} select public.csl_studio_data('quizzes');`,
  ).rows;
  const record = rows.find((r) => r.user_id === uid(1))!;
  const evidence = sql(
    `reset role; select md5(to_jsonb(a)::text) from public.csl_quiz_attempts a where id='${record.id}';`,
  ).trim();
  const body = {
      kind: "quizzes",
      ids: [record.id],
      versions: { [record.id]: 0 },
      archived: true,
      reason: "Archive a reviewed class record",
    },
    request = randomUUID();
  sql(`${login(3)} select ${command("records", body, request)}; select ${command("records", body, request)};
    select public.test_rejected(${text(`select ${command("records", { ...body, archived: false }, request)}`)});
    ${login(1)} select public.test_assert((public.csl_studio_data('quizzes','{"state":"archived"}')->>'total')::int=1,'student can view own archived evidence');
    ${login(2)} select public.test_assert((public.csl_studio_data('quizzes','{"state":"archived"}')->>'total')::int=0,'archive stays scoped to its owner');
    ${login(3)} select public.test_rejected(${text(`select ${command("records", { ...body, archived: false })}`)}); reset role;
    select public.test_assert((select count(*)=1 from public.csl_teacher_activity where action='studio:records' and note='Archive a reviewed class record'),'archive retry creates one audit');`);
  if (
    sql(
      `select md5(to_jsonb(a)::text) from public.csl_quiz_attempts a where id='${record.id}';`,
    ).trim() !== evidence
  )
    throw new Error("Archive changed original evidence.");
  sql(`${login(3)} select ${command("records", { ...body, versions: { [record.id]: 1 }, archived: false, reason: "Restore reviewed evidence" })};
    select public.test_rejected(${text(`select ${command("role", { user_id: uid(3), is_teacher: false, was_teacher: true, reason: "Own role change" })}`)});
    select ${command("role", { user_id: uid(2), is_teacher: true, was_teacher: false, reason: "Approve a class co-teacher" })};
    ${login(2)} select public.test_assert(public.csl_is_teacher(),'teacher delegation is authoritative'); select public.csl_studio_data('health');
    ${login(3)} select ${command("role", { user_id: uid(2), is_teacher: false, was_teacher: true, reason: "Return to student access" })};
    ${login(2)} select public.test_denied('select public.csl_studio_data(''health'')'); reset role;`);
  const game = data<{ rows: Row[] }>(
    `${login(3)} select public.csl_studio_data('games');`,
  ).rows[0];
  const balance = sql(
    `reset role; select credits from public.csl_wallets where user_id='${game.user_id}';`,
  ).trim();
  sql(`${login(3)} select ${command("records", { kind: "games", ids: [game.id], versions: { [game.id]: 0 }, archived: true, reason: "Organize an arcade result" })};
    ${login(1)} select public.test_assert(jsonb_array_length(public.csl_arcade_rankings('all'))=0,'archived round leaves active rankings');
    ${login(3)} select ${command("records", { kind: "games", ids: [game.id], versions: { [game.id]: 1 }, archived: false, reason: "Restore arcade result" })};
    ${login(1)} select public.test_assert(jsonb_array_length(public.csl_arcade_rankings('all'))>0,'restored round returns to rankings'); reset role;`);
  if (
    sql(
      `select credits from public.csl_wallets where user_id='${game.user_id}';`,
    ).trim() !== balance
  )
    throw new Error("Archiving changed credits.");
  sql(`update public.csl_wallets w set opening_credits=credits-coalesce((select sum(amount)::int from public.csl_credit_ledger l where l.user_id=w.user_id),0);
    insert into auth.users(id,email,raw_user_meta_data) values('${uid(4)}','studio-fixture@example.test','{"display_name":"Fresh Scientist"}');
    select public.test_assert((select opening_credits=credits from public.csl_wallets where user_id='${uid(4)}'),'new wallets reconcile from starter credits');
    ${login(3)} select public.csl_studio_data('overview');
    select public.test_assert(not exists(select 1 from jsonb_array_elements(public.csl_studio_data('health')->'rows') r where (r->>'issues')::int<>0),'valid evidence and ledger health'); reset role;`);
  sql(readFileSync("supabase/studio-upgrade.sql", "utf8"));
  sql(readFileSync("supabase/studio-upgrade.sql", "utf8"));
  sql(`${login(1)} select public.test_assert(public.csl_preferences()->>'theme'='aurora','upgrade rerun preserves personal style');
    ${login(3)} select public.test_assert((public.csl_studio_data('games')->'rows'->0->>'metadata_version')::int=2,'upgrade rerun preserves archive history'); reset role;`);
  console.log(
    "Studio PostgreSQL passed: scoped record catalogs/date filters, archive/restore/retry/version checks, unchanged evidence/credits, rankings, teacher delegation, preferences, ledger health and upgrade reruns.",
  );
}
