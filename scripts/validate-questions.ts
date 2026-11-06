import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateQuestions, type Misconception } from "../src/core/validate";
import type { Question } from "../src/core/types";
import { generators } from "../src/core/generators";
import { seededRng } from "../src/core/random";
export async function readQuestions(): Promise<Question[]> {
  const root = fileURLToPath(
    new URL("../src/data/questions/", import.meta.url),
  );
  const files = await readdir(root, { recursive: true });
  return (
    await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(
          async (f) =>
            JSON.parse(await readFile(`${root}/${f}`, "utf8")) as Question[],
        ),
    )
  ).flat();
}
export async function check(complete = true) {
  const qs = await readQuestions(),
    misconceptions = JSON.parse(
      await readFile(
        new URL("../src/data/misconceptions.json", import.meta.url),
        "utf8",
      ),
    ) as Misconception[];
  const errors = validateQuestions(qs, misconceptions, complete);
  for (const [name, generate] of Object.entries(generators))
    for (let seed = 0; seed < 200; seed++) {
      const q = generate(seededRng(seed));
      if (
        !q.prompt ||
        q.distractors.length < 3 ||
        !Number.isFinite(q.answer) ||
        q.distractors.some((d) => !Number.isFinite(d) || d === q.answer)
      )
        errors.push(`${name} failed seed ${seed}`);
    }
  if (errors.length)
    throw new Error(
      `Question validation failed (${errors.length}):\n${errors.slice(0, 120).join("\n")}`,
    );
  console.log(
    `Validated ${qs.length} reviewed questions, ${misconceptions.length} misconception repairs and ${Object.keys(generators).length * 200} generated items.`,
  );
}
if (process.argv[1]?.endsWith("validate-questions.ts"))
  await check(!process.argv.includes("--partial"));
