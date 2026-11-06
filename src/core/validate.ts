import glossary from "../data/glossary.json";
import type { Question } from "./types";
import { decks } from "../data/catalog";
import { isQuestion } from "./schema";
export interface Misconception {
  id: string;
  branch: string;
  wrong: string;
  correct: string;
}
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
export function similarity(a: string, b: string) {
  const x = new Set(words(a)),
    y = new Set(words(b));
  return [...x].filter((w) => y.has(w)).length / new Set([...x, ...y]).size;
}
const scienceWords = new Set(glossary.readabilityAllowlist);
function syllables(w: string) {
  if (scienceWords.has(w)) return 1;
  return Math.max(
    1,
    (
      w
        .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
        .match(/[aeiouy]{1,2}/g) ?? []
    ).length,
  );
}
export function readability(s: string) {
  const ws = words(s),
    sentences = s.split(/[.!?]+/).filter((t) => words(t).length);
  return {
    grade: ws.length
      ? (0.39 * ws.length) / Math.max(1, sentences.length) +
        (11.8 * ws.reduce((n, w) => n + syllables(w), 0)) / ws.length -
        15.59
      : 0,
    longest: Math.max(0, ...sentences.map((t) => words(t).length)),
  };
}
export function validateQuestions(
  questions: Question[],
  misconceptions: Misconception[],
  complete = false,
): string[] {
  const errors: string[] = [],
    seen = new Set<string>(),
    tags = new Set(misconceptions.map((m) => m.id));
  const perDeck = new Map<string, Question[]>();
  for (const q of questions) {
    const fail = (s: string) => errors.push(`${q.id || "unknown"}: ${s}`);
    if (!isQuestion(q)) {
      fail("schema violation");
      continue;
    }
    if (seen.has(q.id)) fail("duplicate id");
    seen.add(q.id);
    const deck = decks.find((d) => d.id === q.deckId)!;
    if (q.topic !== deck.id) fail("unknown topic");
    if (!q.reviewed) fail("not reviewed");
    if (q.explanation.length < 20 || q.explanation.length > 220)
      fail("explanation must contain 20–220 characters");
    if (!q.scienceFact.trim()) fail("missing science fact");
    if (["mcq", "truefalse"].includes(q.type) && !q.options) fail("choice options are required");
    if (q.type === "order" && (!Array.isArray(q.answer) || !q.options || q.answer.length !== q.options.length || new Set(q.answer).size !== q.answer.length || !q.answer.every(id => q.options!.some(o => o.id === id)))) fail("invalid ordered answer");
    if (q.type === "match" && (typeof q.answer !== "object" || Array.isArray(q.answer) || !Object.keys(q.answer).length)) fail("invalid match pairs");
    for (const s of [q.prompt, q.explanation]) {
      const r = readability(s);
      if (r.grade > 9) fail(`reading grade ${r.grade.toFixed(1)} exceeds 9`);
      if (r.longest > 25) fail(`sentence has ${r.longest} words`);
      if (
        /all of the above|none of the above|\balways\b|\bnever\b/i.test(s) &&
        !q.allowAbsolute?.note
      )
        fail("banned phrase");
    }
    if (q.options && !["order", "match"].includes(q.type)) {
      if (q.options.length < (q.type === "truefalse" ? 2 : 4))
        fail("not enough distractors");
      if (q.options.filter((o) => o.id === q.answer).length !== 1)
        fail("not exactly one correct choice");
      if (
        new Set(q.options.map((o) => o.text.trim().toLowerCase())).size !==
          q.options.length ||
        new Set(q.options.map((o) => o.id)).size !== q.options.length
      )
        fail("duplicate options");
      for (const o of q.options)
        if (o.misconception && !tags.has(o.misconception))
          fail("unknown misconception");
      if (
        q.level !== "easy" &&
        q.type === "mcq" &&
        q.options.filter((o) => o.id !== q.answer && o.misconception).length /
          (q.options.length - 1) <
          0.6
      )
        fail("not enough misconception tags");
    }
    if (
      q.type === "calc" &&
      (!Number.isFinite(Number(q.answer)) || (!q.unit && q.unit !== ""))
    )
      fail("invalid calculation");
    const list = perDeck.get(q.deckId) ?? [];
    list.push(q);
    perDeck.set(q.deckId, list);
  }
  for (const branch of ["life", "chemistry", "physics", "earth", "skills"]) {
    const group = questions.filter((q) => q.deckId.startsWith(`${branch}.`));
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        if (similarity(group[i].prompt, group[j].prompt) >= 0.85)
          errors.push(`${group[i].id} near-duplicates ${group[j].id}`);
  }
  for (const [id, qs] of perDeck) {
    const choices = qs.filter(
      (q) => q.options && !["order", "match"].includes(q.type),
    );
    if (choices.length >= 8) {
      const slots = [0, 0, 0, 0];
      let longest = 0;
      for (const q of choices) {
        const slot = q.options!.findIndex((o) => o.id === q.answer);
        slots[slot]++;
        const length = q.options![slot]?.text.length ?? 0;
        if (
          q.options!.filter(
            (o) =>
              o.text.length ===
              Math.max(...q.options!.map((o) => o.text.length)),
          ).length === 1 &&
          length === Math.max(...q.options!.map((o) => o.text.length))
        )
          longest++;
      }
      if (Math.max(...slots) / choices.length > 0.35)
        errors.push(`${id}: answer-position bias`);
      if (longest / choices.length > 0.4)
        errors.push(`${id}: longest-option bias`);
    }
    if (complete) {
      for (const level of ["easy", "medium", "hard"])
        if (qs.filter((q) => q.level === level).length < 12)
          errors.push(`${id}: fewer than 12 ${level} questions`);
      if (
        qs.filter((q) => q.type === "input").length < 2 ||
        qs.filter((q) => ["order", "match"].includes(q.type)).length < 2 ||
        !qs.some((q) => q.diagram) ||
        qs.filter(
          (q) => q.level === "hard" && ["calc", "data"].includes(q.type),
        ).length < 3
      )
        errors.push(`${id}: missing question-type coverage`);
    }
  }
  if (complete) {
    for (const d of decks)
      if (!perDeck.has(d.id)) errors.push(`${d.id}: missing deck`);
    if (questions.filter((q) => q.ph).length / questions.length < 0.15)
      errors.push("Less than 15% Philippine context");
    if (misconceptions.length < 60) errors.push("Fewer than 60 misconceptions");
  }
  return errors;
}
