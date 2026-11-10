// Tests always create and destroy an isolated Docker database; never use a project credential.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import type { Question } from "../src/core/types";
import { isCorrect } from "../src/core/rules";

const image = "postgres:17-alpine";
const name = `cozy-db-test-${randomUUID()}`;
const env = { ...process.env };
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete env[key];
function docker(args: string[], input?: string) {
  const result = spawnSync(
    "docker",
    ["--host=unix:///var/run/docker.sock", ...args],
    { env, input, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}
function sql(input: string) {
  return docker(
    [
      "exec",
      "-i",
      name,
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
    ],
    input,
  );
}
const json = (value: unknown) =>
  `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const text = (value: string) => `'${value.replaceAll("'", "''")}'`;
const uid = (i: number) => `00000000-0000-4000-8000-00000000000${i}`;
const login = (i: number) =>
  `set role authenticated; set request.jwt.claim.sub='${uid(i)}';`;
const questions = readdirSync("src/data/questions")
  .sort()
  .flatMap((dir) =>
    readdirSync(`src/data/questions/${dir}`)
      .sort()
      .flatMap(
        (file) =>
          JSON.parse(
            readFileSync(`src/data/questions/${dir}/${file}`, "utf8"),
          ) as Question[],
      ),
  );
const cards = questions
  .filter((q) => q.deckId === "life.cells" && q.level === "medium")
  .slice(0, 8);
const answers = cards.map((q) => ({ question_id: q.id, value: q.answer }));
const call = (run: number, value = answers, owner = 1) =>
  `public.csl_record_quiz('${uid(run)}','life.cells','medium','practice','2026-11-10T00:00:00Z',${json(value)},'${uid(owner)}')`;
let started = false;
try {
  docker([
    "run",
    "--detach",
    "--name",
    name,
    "--network",
    "none",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    image,
  ]);
  started = true;
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      docker(["exec", name, "pg_isready", "-U", "postgres"]);
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!ready) throw new Error("The isolated test database did not start.");
  sql(`create role anon nologin; create role authenticated nologin;
    create schema auth; grant usage on schema auth to anon,authenticated;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
    create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'Assertion: %',label; end if; end $$;
    create function public.test_denied(statement text) returns void language plpgsql as $$ begin begin execute statement; exception when insufficient_privilege then return; end; raise exception 'Expected access denial: %',statement; end $$;`);
  const setup = readFileSync("supabase/setup.sql", "utf8");
  sql(setup);
  sql(`insert into auth.users values
    ('${uid(1)}','student1@example.test','{"display_name":"Student One","grade":8,"section":"A","role":"admin","is_teacher":true}'),
    ('${uid(2)}','student2@example.test','{"display_name":"Student Two","grade":9,"section":"B"}'),
    ('${uid(3)}','teacher@example.test','{"display_name":"Teacher","grade":10}');
    insert into public.csl_teachers(user_id) values('${uid(3)}');
    select public.test_assert((select count(*)=972 from csl_private.questions),'972 seeded questions');`);
  let parity = "";
  for (const q of questions) {
    const wrong =
      typeof q.answer === "string"
        ? "__wrong__"
        : Array.isArray(q.answer)
          ? []
          : {};
    for (const value of [q.answer, wrong, ...(q.accept ?? [])]) {
      parity += `select public.test_assert(csl_private.correct_answer(${json(q)},${json(value)})=${isCorrect(q, value)},${text(`grading ${q.id}`)});\n`;
    }
  }
  sql(parity);
  sql(`${login(1)}
    select public.test_assert(not public.csl_is_teacher(),'signup metadata cannot grant teacher access');
    select public.test_assert((select count(*)=1 from public.csl_profiles),'student sees own profile only');
    select public.test_assert(public.csl_my_profile()->>'display_name'='Student One','Auth profile trigger');
    select public.test_assert((public.csl_my_profile()->>'grade')::int=8,'profile metadata grade');
    select public.test_denied('select * from csl_private.questions');
    select public.test_denied('select * from public.csl_teachers');
    select public.test_denied('insert into public.csl_teachers(user_id) values(''${uid(1)}'')');
    select public.test_denied('update public.csl_profiles set grade=10');
    select public.test_denied('delete from public.csl_quiz_attempts');
    select public.test_assert((${call(4)}->>'correct')::int=8,'server grades canonical answers');
    select public.test_assert((${call(4)}->>'correct')::int=8,'idempotent retry');
    select public.test_assert((select count(*)=1 from public.csl_quiz_attempts),'no duplicate attempt');
    select public.test_assert((select count(*)=1 from public.csl_list_records()),'own report');
    select public.csl_update_profile('New Name',10,'C','${uid(1)}');
    select public.test_assert(public.csl_my_profile()->>'display_name'='New Name','profile update RPC');
    do $$ begin begin perform ${call(4, [{ question_id: cards[0].id, value: "__wrong__" }])}; exception when raise_exception then if sqlerrm like '%different submission%' then return; end if; raise; end; raise exception 'Different payload was accepted'; end $$;
    do $$ begin begin perform ${call(5, [answers[0], answers[0]])}; exception when raise_exception then if sqlerrm like '%repeated card%' then return; end if; raise; end; raise exception 'Duplicate card was accepted'; end $$;
    reset role; ${login(2)}
    select public.test_assert((select count(*)=0 from public.csl_list_records()),'student cannot view another student record');
    select public.test_denied(${text(`select ${call(8)}`)});
    select public.test_denied(${text(`select public.csl_update_profile('Wrong account',10,'','${uid(1)}')`)});
    select public.test_assert((select count(*)=0 from public.csl_quiz_attempts where user_id='${uid(1)}'),'RLS protects direct queries');
    select public.test_assert((${call(6, [{ question_id: cards[0].id, value: "__wrong__" }], 2)}->>'correct')::int=0,'wrong answer graded on server');
    reset role; ${login(3)}
    select public.test_assert(public.csl_is_teacher(),'owner-assigned teacher');
    select public.test_assert((select count(*)=3 from public.csl_profiles),'teacher class profiles');
    select public.test_assert((select count(*)=2 from public.csl_list_records()),'teacher class records');
    select public.test_assert((select count(*)=1 from public.csl_list_records(1,1)),'report pagination');
    select public.test_denied('update public.csl_quiz_attempts set correct=8');
    reset role; set role anon; reset request.jwt.claim.sub;
    select public.test_assert((public.csl_backend_status()->>'questions')::int=972,'anonymous setup check');
    select public.test_denied('select * from public.csl_profiles');
    select public.test_denied('select public.csl_my_profile()');
    select public.test_denied('select public.csl_list_records()');
    select public.test_denied(${text(`select ${call(7)}`)});
    reset role;`);
  sql(setup);
  sql(
    "select public.test_assert((select count(*)=2 from public.csl_quiz_attempts),'rerunning setup preserves records');",
  );
  console.log(
    `PostgreSQL passed: ${questions.length} grading cases + alternatives, Auth profiles, RLS, teacher access, immutable records, retries and setup rerun.`,
  );
} finally {
  if (started) docker(["rm", "--force", name]);
}
