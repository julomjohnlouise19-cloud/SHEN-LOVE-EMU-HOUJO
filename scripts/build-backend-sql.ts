import { readFile, writeFile, readdir } from "node:fs/promises";
import type { Question } from "../src/core/types";
import { defaultRules } from "../src/core/rules";
import { defaultArcadeRules } from "../src/core/arcade";
import { initialState } from "../src/store/seed";
const questions: Question[] = [];
for (const branch of (await readdir("src/data/questions")).sort()) {
  for (const file of (await readdir(`src/data/questions/${branch}`))
    .filter((name) => name.endsWith(".json"))
    .sort()) {
    questions.push(
      ...JSON.parse(
        await readFile(`src/data/questions/${branch}/${file}`, "utf8"),
      ),
    );
  }
}
if (questions.length !== 972)
  throw new Error("Expected the complete reviewed 972-question bank.");
const data = JSON.stringify(questions);
if (data.includes("$csl_bank$"))
  throw new Error("Unexpected SQL delimiter in the authored question bank.");
const quote = (value: unknown) =>
  `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const schema = await readFile("supabase/schema.sql", "utf8");
let platform = await readFile("supabase/platform.sql", "utf8");
platform = platform
  .replace(
    "-- @seed-settings@",
    `insert into public.csl_settings(id,rules,game) values(true,${quote(defaultRules)},${quote(defaultArcadeRules)}) on conflict(id) do nothing;`,
  )
  .replace(
    "-- @seed-items@",
    `insert into public.csl_items(id,name,description,price,stock,icon,color,category) select v->>'id',v->>'name',v->>'description',(v->>'price')::int,(v->>'stock')::int,v->>'icon',v->>'color',v->>'category' from jsonb_array_elements(${quote(initialState("", "", 0).items)}) v on conflict(id) do nothing;`,
  );
const originalQuiz = schema.match(
  /create or replace function public\.csl_record_quiz\([\s\S]*?grant execute on function public\.csl_record_quiz\([^;]+;/,
)?.[0];
if (!originalQuiz?.includes("return jsonb_build_object('id',created_id"))
  throw new Error(
    "The quiz award integration must match the validated original RPC.",
  );
const creditedQuiz = originalQuiz
  .replace(
    "declare uid uuid:=auth.uid();",
    "declare uid uuid:=csl_private.actor(p_user_id);",
  )
  .replace(
    "  return jsonb_build_object('id',created_id",
    "  perform csl_private.credit_attempt(created_id);\n  return jsonb_build_object('id',created_id",
  )
  .replace(
    "previous.submitted_answers<>p_answers",
    "csl_private.normalized_answers(previous.submitted_answers)<>csl_private.normalized_answers(p_answers)",
  )
  .replace(
    "    select question into q from csl_private.questions where id=entry->>'question_id';",
    () =>
      "    if entry?'question_version' and (jsonb_typeof(entry->'question_version')='number' and entry->>'question_version' ~ '^[0-9]{1,10}$') is not true then raise exception 'This question version is not valid.'; end if;\n    select question into q from csl_private.question_versions where question_id=entry->>'question_id' and revision=coalesce((entry->>'question_version')::integer,0);",
  );
if (!creditedQuiz.includes("from csl_private.question_versions"))
  throw new Error(
    "Question-version grading must be included in the generated upgrade.",
  );
const seed = `with bank as (select value from jsonb_array_elements($csl_bank$${data}$csl_bank$::jsonb)), seeded as (insert into csl_private.questions(id,question) select value->>'id',value from bank on conflict(id) do update set question=coalesce((select question from public.csl_question_overrides where question_id=excluded.id),excluded.question) returning id) insert into csl_private.question_versions(question_id,revision,question) select value->>'id',0,value from bank, (select count(*) from seeded) s on conflict do nothing;`;
const studio = await readFile("supabase/studio.sql", "utf8");
const suggestions = await readFile("supabase/suggestions.sql", "utf8");
const accounts = await readFile("supabase/accounts.sql", "utf8");
const community = await readFile("supabase/community.sql", "utf8");
const profileStyles = await readFile("supabase/profile-styles.sql", "utf8");
const creditRankings = await readFile("supabase/credit-rankings.sql", "utf8");
const teacher = await readFile("supabase/teacher.sql", "utf8");
const upgrade = `-- The Cozy Science Lab: existing-project upgrade. Keeps accounts, quiz records, teacher edits and stock.\nbegin;\n${platform}\n${await readFile("supabase/arcade.sql", "utf8")}\n${teacher}\n${creditedQuiz}\n${seed}\n${studio}\n${suggestions}\n${accounts}\n${community}\n${profileStyles}\n${creditRankings}\ncommit;\n`;
const outputs = {
  "supabase/credit-rankings-upgrade.sql": `-- Existing community-v2 classroom: current class-credit rankings and shared profile designs.\n-- Preserves accounts, wallets, stock, reservations, quiz records, friendships and opt-outs.\nbegin;\n${profileStyles}\n${creditRankings}\ncommit;\n`,
  "supabase/profile-styles-upgrade.sql": `-- Existing community-v2 classroom: optional shared profile designs.\n-- Keeps all accounts, photos, learning records, supplies and existing privacy choices.\nbegin;\n${profileStyles}\ncommit;\n`,
  "supabase/community-upgrade.sql": `-- Existing platform-3 classroom: run this entire additive script in SQL Editor.\n-- Preserves accounts, photos, quiz records, credits, supplies and private profile data.\nbegin;\n${community}\ncommit;\n`,
  "supabase/accounts-upgrade.sql": `-- Existing platform-3 project: run the entire additive script in SQL Editor.\n-- Preserves accounts, quiz evidence, balances, stock and reservations.\nbegin;\ndo $$ begin if to_regclass('public.csl_preferences') is null then raise exception 'Install the Studio upgrade before the account-details upgrade.'; end if; end $$;\n${teacher}\n${accounts}\ncommit;\n`,
  "supabase/suggestions-upgrade.sql": `-- Existing classroom project: run this entire additive script. Preserves all existing records.\nbegin;\n${suggestions}\ncommit;\n`,
  "supabase/setup.sql": `${schema}\n${upgrade}`,
  "supabase/upgrade.sql": upgrade,
  "supabase/studio-upgrade.sql": `-- Existing platform-2 project: copy this entire file into SQL Editor and Run.\n-- Preserves accounts, answers, scores, credits, stock and teacher edits.\nbegin;\ndo $$ begin if to_regclass('public.csl_arcade_sessions') is null then raise exception 'Install the complete setup.sql first.'; end if; end $$;\n${studio}\n${suggestions}\ncommit;\n`,
};
if (process.argv.includes("--check")) {
  for (const [path, sql] of Object.entries(outputs))
    if ((await readFile(path, "utf8")) !== sql)
      throw new Error(`Run npm run backend:sql to refresh ${path}.`);
} else
  for (const [path, sql] of Object.entries(outputs)) await writeFile(path, sql);
console.log(
  `Supabase setup SQL ${process.argv.includes("--check") ? "verified" : "generated"}: ${questions.length} canonical cards.`,
);
