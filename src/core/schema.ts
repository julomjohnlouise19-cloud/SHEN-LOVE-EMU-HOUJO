import type { Question } from "./types";
import { decks } from "../data/catalog";
export const object = (v: unknown): v is Record<string, unknown> =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  !Object.keys(v).some((k) =>
    ["__proto__", "constructor", "prototype"].includes(k),
  );
export function isQuestion(v: unknown): v is Question {
  if (!object(v)) return false;
  const textFields = [
    "id",
    "deckId",
    "prompt",
    "explanation",
    "scienceFact",
    "topic",
    "curriculumArea",
  ];
  if (
    !textFields.every(
      (k) =>
        typeof v[k] === "string" &&
        (v[k] as string).length > 0 &&
        (v[k] as string).length <= 3000,
    )
  )
    return false;
  const deck = decks.find((d) => d.id === v.deckId);
  if (
    !deck ||
    !deck.grades.includes(Number(v.gradeBand)) ||
    !["easy", "medium", "hard"].includes(String(v.level)) ||
    ![
      "mcq",
      "truefalse",
      "input",
      "order",
      "match",
      "diagram",
      "calc",
      "data",
    ].includes(String(v.type)) ||
    !["remember", "understand", "apply", "analyze"].includes(String(v.bloom)) ||
    typeof v.reviewed !== "boolean"
  )
    return false;
  if (
    typeof v.answer !== "string" &&
    !(
      Array.isArray(v.answer) && v.answer.every((a) => typeof a === "string")
    ) &&
    !(
      object(v.answer) &&
      Object.values(v.answer).every((a) => typeof a === "string")
    )
  )
    return false;
  if (
    v.options !== undefined &&
    (!Array.isArray(v.options) ||
      !v.options.every(
        (o) =>
          object(o) &&
          typeof o.id === "string" &&
          typeof o.text === "string" &&
          (o.misconception === undefined ||
            typeof o.misconception === "string"),
      ))
  )
    return false;
  if (
    v.accept !== undefined &&
    (!Array.isArray(v.accept) || !v.accept.every((a) => typeof a === "string"))
  )
    return false;
  if (
    v.tolerance !== undefined &&
    (typeof v.tolerance !== "number" ||
      v.tolerance < 0 ||
      !Number.isFinite(v.tolerance))
  )
    return false;
  if (v.ph !== undefined && typeof v.ph !== "boolean") return false;
  if (v.diagram !== undefined && typeof v.diagram !== "string") return false;
  if (
    v.data !== undefined &&
    (!object(v.data) ||
      !Array.isArray(v.data.headers) ||
      !v.data.headers.every((h) => typeof h === "string") ||
      !Array.isArray(v.data.rows) ||
      !v.data.rows.every(
        (r) => Array.isArray(r) && r.every((c) => typeof c === "string"),
      ))
  )
    return false;
  return true;
}
