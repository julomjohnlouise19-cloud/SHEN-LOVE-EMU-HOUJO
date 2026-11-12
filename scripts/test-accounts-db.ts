import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
export function verifyAccounts(sql: (input: string) => string) {
  const uid = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  const login = (n: number) =>
    `reset role; set role authenticated; set request.jwt.claim.sub='${uid(n)}';`;
  const text = (v: string) => `'${v.replaceAll("'", "''")}'`;
  const json = (v: unknown) => `${text(JSON.stringify(v))}::jsonb`;
  const data = <T>(statement: string): T => JSON.parse(sql(statement).trim());
  const command = (action: string, body: unknown, request = randomUUID()) =>
    `public.csl_teacher_command('${request}',${text(action)},${json(body)})`;
  const upgrade = readFileSync("supabase/accounts-upgrade.sql", "utf8");
  sql(upgrade);
  sql(`reset role; update auth.users set raw_user_meta_data=raw_user_meta_data||' {"terms_accepted":true,"terms_version":"1.0","terms_accepted_at":"2026-11-12T00:00:00Z"}'::jsonb where id='${uid(1)}';
    set role anon; select public.test_assert(public.csl_backend_status()->>'accounts'='1','profile details capability');
    select public.test_denied('select public.csl_scientist_profile(''${uid(1)}'')');
    ${login(1)} select public.test_denied('select public.csl_scientist_profile(''${uid(1)}'')');
    select public.test_denied('select public.csl_scientist_profile(''${uid(2)}'')');
    select public.test_denied('select * from auth.users');
    ${login(3)} select public.test_assert(public.csl_scientist_profile('${uid(1)}')->>'email'='student1@example.test','teacher may read student email');
    select public.test_assert(public.csl_scientist_profile('${uid(1)}')->>'bio'='A curious scientist.','teacher sees saved introduction');
    select public.test_assert(public.csl_scientist_profile('${uid(1)}')->>'theme'='aurora','teacher sees saved colors');
    select public.test_assert(public.csl_scientist_profile('${uid(1)}')->>'terms_accepted'='true','submitted agreement recorded');
    select public.test_assert(public.csl_scientist_profile('${uid(1)}')->>'terms_version'='1.0','submitted agreement version');
    select public.test_assert(public.csl_scientist_profile('${uid(2)}')->>'terms_accepted'='false','no invented agreement for old accounts');
    select public.test_assert(not (public.csl_scientist_profile('${uid(1)}') ?| array['password','raw_user_meta_data','notebook','access_token']),'private auth and device content excluded');
    reset role;`);
  type Profile = {
    user_id: string;
    display_name: string;
    grade: number;
    section: string;
    expected_updated: string;
    active: boolean;
  };
  const profile = () =>
    data<Profile>(
      `${login(3)} select public.csl_scientist_profile('${uid(1)}');`,
    );
  const stateHash = () =>
    sql(
      `reset role; select md5(jsonb_build_object('wallets',(select jsonb_agg(to_jsonb(w) order by user_id) from public.csl_wallets w),'records',(select jsonb_agg(to_jsonb(q) order by id) from public.csl_quiz_attempts q),'orders',(select jsonb_agg(to_jsonb(o) order by id) from public.csl_orders o))::text);`,
    ).trim();
  const before = stateHash();
  const p = profile();
  const banBody = {
    user_id: p.user_id,
    display_name: p.display_name,
    grade: p.grade,
    section: p.section,
    expected_updated: p.expected_updated,
    active: false,
    reason: "Classroom access under teacher review",
  };
  const request = randomUUID();
  const ban = command("student", banBody, request);
  sql(`${login(3)} select ${ban}; select ${ban};
    reset role; select public.test_assert((select count(*)=1 from public.csl_teacher_activity where action='student' and note='Classroom access under teacher review'),'ban retry creates one reasoned audit');
    ${login(1)} select public.test_denied('select public.csl_my_profile()');
    select public.test_denied('select public.csl_my_lab(''${uid(1)}'')');
    select public.test_denied('select public.csl_preferences()');
    select public.test_denied('select public.csl_record_quiz(gen_random_uuid(),''life.cells'',''Medium'',''practice'',now(),''[]'',''${uid(1)}'')');
    select public.test_assert((select count(*)=0 from public.csl_list_records()),'RLS hides records from banned accounts');
    select public.test_denied('select public.csl_reserve_item(''${uid(1)}'',gen_random_uuid(),''pencil'',10,1)');
    select public.test_denied('select public.csl_suggestion_inbox()');
    select public.test_denied('select public.csl_scientist_profile(''${uid(2)}'')'); reset role;`);
  if (stateHash() !== before)
    throw new Error("Ban changed credits, reservations or quiz evidence.");
  const banned = profile();
  sql(`${login(3)} select public.test_rejected(${text(`select ${command("student", { ...banBody, expected_updated: banned.expected_updated, reason: "x" })}`)});
    select ${command("student", { ...banBody, expected_updated: banned.expected_updated, active: true, reason: "Teacher review complete" })};
    ${login(1)} select public.test_assert(public.csl_my_profile()->>'user_id'='${uid(1)}','restored account can return'); reset role;`);
  const teacher = data<Profile>(
    `${login(3)} select public.csl_scientist_profile('${uid(3)}');`,
  );
  sql(
    `${login(3)} select public.test_rejected(${text(`select ${command("student", { user_id: teacher.user_id, display_name: teacher.display_name, grade: teacher.grade, section: teacher.section, expected_updated: teacher.expected_updated, active: false, reason: "Teacher protection test" })}`)}); reset role;`,
  );
  const cfg = data<{ rules: Record<string, unknown>; version: number }>(
    `${login(3)} select public.csl_teacher_data('settings')->'rows'->0;`,
  );
  const rules = {
    ...cfg.rules,
    pickupLocation: "Grade 10 SSC classroom · Science corner",
  };
  sql(`${login(3)} select ${command("rules", { rules, version: cfg.version })};
    ${login(1)} select public.test_assert(public.csl_my_lab('${uid(1)}')->'rules'->>'pickupLocation'='Grade 10 SSC classroom · Science corner','students see the teacher collection point'); reset role;`);
  for (const invalid of [null, 42, "x", "x".repeat(161)])
    sql(
      `${login(3)} select public.test_rejected(${text(`select ${command("rules", { rules: { ...rules, pickupLocation: invalid }, version: cfg.version + 1 })}`)}); reset role;`,
    );
  sql(upgrade);
  sql(upgrade);
  sql(`${login(3)} select public.test_assert(public.csl_scientist_profile('${uid(1)}')->>'terms_version'='1.0','upgrade rerun preserves agreement metadata');
    ${login(1)} select public.test_assert(public.csl_my_lab('${uid(1)}')->'rules'->>'pickupLocation'='Grade 10 SSC classroom · Science corner','upgrade rerun preserves collection location'); reset role;`);
  if (stateHash() !== before)
    throw new Error(
      "Account upgrade changed credits, reservations or quiz evidence.",
    );
  console.log(
    "Accounts PostgreSQL passed: teacher-only profile details, consent metadata, ban/restore permissions, preserved evidence/wallets/orders, protected teachers, reason audit, retries, pickup validation and upgrade reruns.",
  );
}
