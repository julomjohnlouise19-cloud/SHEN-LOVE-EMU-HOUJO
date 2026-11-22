import type { User } from "./types";
import type { StudyGuide } from "../data/study-guides";
import { validCalendarDate } from "./daily-calendar";
import { addDays } from "./time";

export const LEARNING_DAY_GOAL = 8;
export function learningWeek(
  user: Pick<User, "daily">,
  anchor: string,
  today: string,
) {
  if (!validCalendarDate(anchor) || !validCalendarDate(today))
    throw new Error("Choose a valid learning date.");
  const offset = (new Date(anchor + "T12:00:00Z").getUTCDay() + 6) % 7;
  const first = addDays(anchor, -offset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(first, index),
      future = date > today;
    const answers = future ? 0 : (user.daily[date]?.answers ?? 0);
    const correct = future ? 0 : (user.daily[date]?.correct ?? 0);
    return {
      date,
      future,
      answers,
      correct,
      today: date === today,
      goalMet: answers >= LEARNING_DAY_GOAL,
    };
  });
}
export function shiftLearningMonth(month: string, amount: number) {
  if (!validCalendarDate(month + "-01") || !Number.isInteger(amount))
    throw new Error("Choose a valid learning month.");
  const date = new Date(month + "-15T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
export function learningMonth(
  user: Pick<User, "daily">,
  month: string,
  today: string,
) {
  if (!validCalendarDate(month + "-01") || !validCalendarDate(today))
    throw new Error("Choose a valid learning date.");
  const first = new Date(month + "-01T12:00:00Z");
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const days = Array.from({ length: last.getUTCDate() }, (_, index) => {
    const date = month + "-" + String(index + 1).padStart(2, "0");
    const future = date > today;
    const answers = future ? 0 : (user.daily[date]?.answers ?? 0);
    const correct = future ? 0 : (user.daily[date]?.correct ?? 0);
    return {
      date,
      day: index + 1,
      answers,
      correct,
      future,
      today: date === today,
      goalMet: answers >= LEARNING_DAY_GOAL,
    };
  });
  return {
    month,
    offset: (first.getUTCDay() + 6) % 7,
    days,
    activeDays: days.filter((day) => day.answers > 0).length,
    goalDays: days.filter((day) => day.goalMet).length,
    answers: days.reduce((total, day) => total + day.answers, 0),
  };
}
export interface DailyVocabulary {
  term: string;
  meaning: string;
  deckId: string;
}
export function vocabularyCollection(
  guides: readonly Pick<StudyGuide, "deckId" | "terms">[],
) {
  const entries = new Map<string, DailyVocabulary>();
  for (const guide of guides)
    for (const [term, meaning] of guide.terms) {
      const key = term.trim().toLocaleLowerCase();
      if (key && meaning.trim() && !entries.has(key))
        entries.set(key, { term, meaning, deckId: guide.deckId });
    }
  return [...entries.values()];
}
export function vocabularyForDay(
  entries: readonly DailyVocabulary[],
  day: string,
) {
  if (!validCalendarDate(day))
    throw new Error("Choose a valid vocabulary date.");
  if (!entries.length) return undefined;
  const index = Math.floor(Date.parse(day + "T00:00:00Z") / 86_400_000);
  return entries[((index % entries.length) + entries.length) % entries.length];
}
