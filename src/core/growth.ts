import type { Rules, Run, User } from "./types";
import { decks, branchById } from "../data/catalog";
import { addDays } from "./time";

export const cozyTitles = [
  {
    level: 1,
    name: "Curious Seedling",
    icon: "sprout",
    note: "Every little question is a beginning.",
  },
  {
    level: 5,
    name: "Lab Assistant",
    icon: "flask",
    note: "Your careful discoveries are taking root.",
  },
  {
    level: 10,
    name: "Junior Scientist",
    icon: "atom",
    note: "Look at all the connections you are making.",
  },
  {
    level: 20,
    name: "Professor",
    icon: "trophy",
    note: "Keep wondering. There is always more to learn.",
  },
] as const;

export function cozyTitle(level: number) {
  return (
    [...cozyTitles].reverse().find((title) => level >= title.level) ??
    cozyTitles[0]
  );
}

export function learningGrowth(
  user: Pick<User, "xp">,
  rules: Pick<Rules, "xpPerLevel">,
) {
  const level = Math.floor(user.xp / rules.xpPerLevel) + 1;
  return {
    level,
    title: cozyTitle(level),
    nextTitle: cozyTitles.find((title) => title.level > level),
    currentXP: user.xp % rules.xpPerLevel,
    remainingXP: rules.xpPerLevel - (user.xp % rules.xpPerLevel),
    percent: ((user.xp % rules.xpPerLevel) / rules.xpPerLevel) * 100,
  };
}

export function activeLearningStreak(
  user: Pick<User, "lastDay" | "streak">,
  today: string,
) {
  return user.lastDay === today || user.lastDay === addDays(today, -1)
    ? user.streak
    : 0;
}

export interface LearningBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: number;
  target: number;
  topicId?: string;
  branch?: string;
}

export function learningBadges(
  user: User,
  runs: Run[],
  today: string,
): LearningBadge[] {
  const own = runs.filter((run) => run.userId === user.id);
  const correct = Object.values(user.mastery).reduce(
    (n, mastery) => n + mastery.correct,
    0,
  );
  const completed = Object.values(user.mastery).reduce(
    (n, mastery) => n + mastery.completed,
    0,
  );
  const perfect = own.some(
    (run) =>
      run.completed &&
      run.answers.length > 0 &&
      run.answers.every((answer) => answer.correct),
  );
  const perfectEasy = own.some(
    (run) =>
      run.level === "easy" &&
      run.completed &&
      run.ids.length === 8 &&
      run.answers.length === 8 &&
      run.answers.every((answer) => answer.correct),
  );
  const bestEasy = Math.max(
    0,
    ...own
      .filter((run) => run.level === "easy" && run.ids.length === 8)
      .map((run) => run.answers.filter((answer) => answer.correct).length),
  );
  const badge = (
    value: Omit<LearningBadge, "earned">,
    unlocked = value.progress >= value.target,
  ): LearningBadge => {
    const earned = user.badges.includes(value.id) || unlocked;
    return {
      ...value,
      earned,
      progress: earned ? value.target : Math.min(value.target, value.progress),
    };
  };
  return [
    badge({
      id: "first-deck",
      name: "First little discovery",
      description: "Complete your first science deck.",
      icon: "sprout",
      progress: completed,
      target: 1,
    }),
    badge({
      id: "ten-right",
      name: "First 10 correct",
      description: "Make 10 correct connections across your science decks.",
      icon: "sparkles",
      progress: correct,
      target: 10,
    }),
    badge(
      {
        id: "perfect-easy",
        name: "Perfect easy deck",
        description: "Answer all eight questions correctly in one easy deck.",
        icon: "star",
        progress: bestEasy,
        target: 8,
      },
      perfectEasy,
    ),
    badge(
      {
        id: "week-streak",
        name: "7-day streak",
        description:
          "Answer a science question on seven consecutive classroom days.",
        icon: "flame",
        progress: activeLearningStreak(user, today),
        target: 7,
      },
      user.streak >= 7,
    ),
    badge({
      id: "perfect-deck",
      name: "A perfect little run",
      description:
        "Answer every question correctly in a completed deck at any difficulty.",
      icon: "trophy",
      progress: perfect ? 1 : 0,
      target: 1,
    }),
    ...decks.map((deck) =>
      badge({
        id: `topic:${deck.id}`,
        name: `${deck.name} explorer`,
        description: `Complete a ${deck.name} deck. Every difficulty counts.`,
        icon: branchById(deck.branch)?.icon ?? "flask",
        progress: user.mastery[deck.id]?.completed ?? 0,
        target: 1,
        topicId: deck.id,
        branch: deck.branch,
      }),
    ),
  ];
}
