import type { Question, RNG } from "./types";
import { shuffle } from "./random";

export type ArcadeCategory = "life" | "chemistry" | "physics" | "earth";
export interface ArcadeRules {
  seconds: [number, number, number];
  motion: [number, number, number];
  points: number;
  penalty: number;
  coins: number;
  timeCost: number;
  dartCost: number;
}
export const defaultArcadeRules: ArcadeRules = {
  seconds: [20, 16, 12],
  motion: [5, 3.5, 2],
  points: 100,
  penalty: 25,
  coins: 3,
  timeCost: 3,
  dartCost: 2,
};
export interface ArcadeFeedback {
  kind: "correct" | "wrong" | "timeout" | "miss";
  text: string;
  answer?: string;
  explanation?: string;
  multiplier: number;
}
export interface ArcadeState {
  version: 1;
  revision: number;
  id: string;
  userId: string;
  category: ArcadeCategory;
  ids: string[];
  index: number;
  score: number;
  coins: number;
  combo: number;
  correct: number;
  darts: number;
  wrong: string[];
  timeUsed: boolean;
  dartUsed: boolean;
  deadline: number;
  reloadUntil: number;
  created: number;
  completed: boolean;
  rules: ArcadeRules;
  feedback?: ArcadeFeedback;
}
export type ArcadeAction =
  | { type: "shoot"; option: string }
  | { type: "timeout" }
  | { type: "time" }
  | { type: "dart" };
export const arcadeLevel = (index: number) =>
  Math.min(2, Math.floor(index / 3));
export const arcadeMultiplier = (combo: number) =>
  Math.min(3, 1 + Math.floor(combo / 3));
export function isArcadeQuestion(q: Question) {
  return (
    q.reviewed &&
    q.type === "mcq" &&
    typeof q.answer === "string" &&
    q.options?.length === 4
  );
}
export function validArcadeRules(value: unknown): value is ArcadeRules {
  const v = value as ArcadeRules | null;
  return (
    !!v &&
    Array.isArray(v.seconds) &&
    v.seconds.length === 3 &&
    v.seconds.every((n) => Number.isInteger(n) && n >= 8 && n <= 60) &&
    v.seconds[0] >= v.seconds[1] &&
    v.seconds[1] >= v.seconds[2] &&
    Array.isArray(v.motion) &&
    v.motion.length === 3 &&
    v.motion.every((n) => Number.isFinite(n) && n >= 1.25 && n <= 8) &&
    v.motion[0] >= v.motion[1] &&
    v.motion[1] >= v.motion[2] &&
    [v.points, v.penalty, v.coins, v.timeCost, v.dartCost].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 500,
    ) &&
    v.penalty <= v.points &&
    v.coins <= 10 &&
    v.timeCost <= 20 &&
    v.dartCost <= 20
  );
}
export function startArcade(
  id: string,
  userId: string,
  category: ArcadeCategory,
  questions: Question[],
  now: number,
  rng: RNG,
  rules = defaultArcadeRules,
): ArcadeState {
  if (!validArcadeRules(rules)) throw new Error("Check the arcade settings.");
  const pool = questions.filter(
    (q) => q.deckId.startsWith(`${category}.`) && isArcadeQuestion(q),
  );
  const ids = (["easy", "medium", "hard"] as const).flatMap((level) =>
    shuffle(
      pool.filter((q) => q.level === level).map((q) => q.id),
      rng,
    ).slice(0, 3),
  );
  if (ids.length !== 9)
    throw new Error("This category needs nine reviewed four-choice cards.");
  return {
    version: 1,
    revision: 0,
    id,
    userId,
    category,
    ids,
    index: 0,
    score: 0,
    coins: 0,
    combo: 0,
    correct: 0,
    darts: 2,
    wrong: [],
    timeUsed: false,
    dartUsed: false,
    deadline: now + rules.seconds[0] * 1000,
    reloadUntil: now,
    created: now,
    completed: false,
    rules: structuredClone(rules),
  };
}
export function arcadeAction(
  state: ArcadeState,
  question: Question,
  action: ArcadeAction,
  now: number,
): ArcadeState {
  if (state.completed || state.ids[state.index] !== question.id)
    throw new Error("That discovery has already moved on.");
  const s = structuredClone(state);
  s.revision++;
  const answerText =
    question.options?.find((o) => o.id === question.answer)?.text ??
    String(question.answer);
  const advance = () => {
    s.index++;
    s.completed = s.index >= s.ids.length;
    s.darts = 2;
    s.wrong = [];
    s.timeUsed = false;
    s.dartUsed = false;
    s.deadline = s.completed
      ? now
      : now + 1000 + s.rules.seconds[arcadeLevel(s.index)] * 1000;
    s.reloadUntil = now + 1000;
  };
  if (now >= s.deadline) {
    s.combo = 0;
    s.score = Math.max(0, s.score - s.rules.penalty);
    s.coins = Math.max(0, s.coins - 1);
    s.feedback = {
      kind: "timeout",
      text: "Time’s up. Let’s discover why.",
      answer: answerText,
      explanation: question.explanation,
      multiplier: 1,
    };
    advance();
    return s;
  }
  if (action.type === "timeout") return structuredClone(state);
  if (action.type === "time") {
    if (s.timeUsed || s.coins < s.rules.timeCost)
      throw new Error(
        "Extra time needs more round coins, or was already used on this card.",
      );
    s.coins -= s.rules.timeCost;
    s.timeUsed = true;
    s.deadline += 5000;
    return s;
  }
  if (action.type === "dart") {
    if (s.dartUsed || s.coins < s.rules.dartCost)
      throw new Error(
        "An extra dart needs more round coins, or was already used on this card.",
      );
    s.coins -= s.rules.dartCost;
    s.dartUsed = true;
    s.darts++;
    return s;
  }
  if (now < s.reloadUntil)
    throw new Error("Reloading. Your next dart is ready in one second.");
  if (s.wrong.includes(action.option)) throw new Error("Try another target.");
  if (
    action.option !== "__miss__" &&
    !question.options?.some((o) => o.id === action.option)
  )
    throw new Error("Aim at a target to shoot.");
  s.darts--;
  s.reloadUntil = now + 1000;
  if (action.option === question.answer) {
    s.combo++;
    s.correct++;
    const multiplier = arcadeMultiplier(s.combo);
    s.score += s.rules.points * multiplier;
    s.coins += s.rules.coins;
    s.feedback = {
      kind: "correct",
      text:
        multiplier > 1
          ? `Bullseye! ×${multiplier} combo.`
          : "Bullseye! A bright discovery.",
      answer: answerText,
      explanation: question.explanation,
      multiplier,
    };
    advance();
  } else {
    s.combo = 0;
    s.score = Math.max(0, s.score - s.rules.penalty);
    s.coins = Math.max(0, s.coins - 1);
    if (action.option !== "__miss__") s.wrong.push(action.option);
    s.feedback = {
      kind: action.option === "__miss__" ? "miss" : "wrong",
      text: s.darts
        ? "A mix-up. Reload and try another target."
        : "Out of darts. A new discovery is next.",
      multiplier: 1,
    };
    if (!s.darts) {
      s.feedback.answer = answerText;
      s.feedback.explanation = question.explanation;
      advance();
    }
  }
  return s;
}
