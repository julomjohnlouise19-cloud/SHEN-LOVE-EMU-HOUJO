import type {
  Rules,
  User,
  Question,
  Answer,
  Context,
  Difficulty,
} from "./types";
export const defaultRules: Rules = {
  starterMerits: 24,
  comboBonus: 1,
  timezone: "Asia/Manila",
  meritEasy: 3,
  meritMedium: 5,
  meritHard: 7,
  dailyCap: 120,
  correctXP: 12,
  attemptXP: 3,
  xpPerLevel: 120,
  comboEvery: 3,
  reviewReward: 2,
  dailyReward: 10,
  questReward: 8,
  spinMax: 12,
  skillsLevel: 4,
};
export const levelOf = (user: User, rules: Rules) =>
  Math.floor(user.xp / rules.xpPerLevel) + 1;
export function recommendDifficulty(mastery?: {
  correct: number;
  attempts: number;
}): Difficulty {
  if (!mastery || mastery.attempts < 8) return "medium";
  const accuracy = mastery.correct / mastery.attempts;
  return accuracy > 0.8 ? "hard" : accuracy < 0.45 ? "easy" : "medium";
}
export function rankScientists(users: User[]): User[] {
  return users
    .filter((u) => u.role === "student" && u.id !== "guest")
    .sort((a, b) => b.xp - a.xp || a.created - b.created);
}
export function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ");
}
export function isCorrect(q: Question, value: Answer): boolean {
  if (q.type === "calc") {
    const actual = Number(String(value).trim());
    return (
      String(value).trim() !== "" &&
      Number.isFinite(actual) &&
      Math.abs(actual - Number(q.answer)) <= (q.tolerance ?? 0.01)
    );
  }
  if (Array.isArray(q.answer))
    return (
      Array.isArray(value) &&
      q.answer.length === value.length &&
      q.answer.every((a, i) => a === value[i])
    );
  if (typeof q.answer === "object")
    return (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(q.answer).every(
        (k) => (q.answer as Record<string, string>)[k] === value[k],
      )
    );
  return (
    typeof value === "string" &&
    [q.answer, ...(q.accept ?? [])].some(
      (a) => normalize(a) === normalize(value),
    )
  );
}
export function answerLabel(q: Question): string {
  if (Array.isArray(q.answer))
    return q.answer
      .map((a) => q.options?.find((o) => o.id === a)?.text ?? a)
      .join(" → ");
  if (typeof q.answer === "object")
    return Object.entries(q.answer)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
  return (
    q.options?.find((o) => o.id === q.answer)?.text ??
    `${q.answer}${q.unit ? ` ${q.unit}` : ""}`
  );
}
export function reward(
  correct: boolean,
  level: string,
  combo: number,
  earned: number,
  ctx: Context,
) {
  const base =
    level === "easy"
      ? ctx.rules.meritEasy
      : level === "hard"
        ? ctx.rules.meritHard
        : ctx.rules.meritMedium;
  return {
    merits: correct
      ? Math.max(
          0,
          Math.min(
            base +
              Math.floor(combo / ctx.rules.comboEvery) * ctx.rules.comboBonus,
            ctx.rules.dailyCap - earned,
          ),
        )
      : 0,
    xp: correct ? ctx.rules.correctXP : ctx.rules.attemptXP,
  };
}
export const questDefinitions = [
  {
    id: "curious",
    name: "Stay curious",
    description: "Answer 8 science questions",
    target: 8,
    key: "answers" as const,
    icon: "flask",
  },
  {
    id: "bright",
    name: "A bright little streak",
    description: "Get 5 answers right today",
    target: 5,
    key: "correct" as const,
    icon: "sparkles",
  },
];
export function validRules(r: Rules): boolean {
  if (!r || typeof r.timezone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: r.timezone });
  } catch {
    return false;
  }
  return Object.entries(defaultRules).every(
    ([key, v]) =>
      typeof v === "string" ||
      (Number.isSafeInteger(r[key as keyof Rules]) &&
        Number(r[key as keyof Rules]) >=
          (["xpPerLevel", "comboEvery", "skillsLevel"].includes(key) ? 1 : 0) &&
        Number(r[key as keyof Rules]) <= 10000),
  );
}
