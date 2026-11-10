import { readFile, writeFile, readdir } from "node:fs/promises";
import type { Question } from "../src/core/types";
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
const data = JSON.stringify(
  questions.map(
    ({
      id,
      deckId,
      level,
      type,
      prompt,
      answer,
      accept,
      tolerance,
      options,
    }) => ({
      id,
      deckId,
      level,
      type,
      prompt,
      answer,
      accept,
      tolerance,
      options,
    }),
  ),
);
if (data.includes("$csl_bank$"))
  throw new Error("Unexpected SQL delimiter in the authored question bank.");
const sql = `${await readFile("supabase/schema.sql", "utf8")}\n-- Published canonical answer bank. Never grant browser access to csl_private.\nbegin;\ninsert into csl_private.questions(id,question)\nselect value->>'id',value from jsonb_array_elements($csl_bank$${data}$csl_bank$::jsonb)\non conflict(id) do update set question=excluded.question;\ncommit;\n`;
if (process.argv.includes("--check")) {
  if ((await readFile("supabase/setup.sql", "utf8")) !== sql)
    throw new Error("Run npm run backend:sql to refresh supabase/setup.sql.");
} else await writeFile("supabase/setup.sql", sql);
console.log(
  `Supabase setup SQL ${process.argv.includes("--check") ? "verified" : "generated"}: ${questions.length} canonical cards.`,
);
