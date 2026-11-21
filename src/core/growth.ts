import type { Rules, Run, User, Difficulty } from "./types";
import { decks, branchById } from "../data/catalog";
import { cozyBadges } from "../data/cozy-badges";
import { validCalendarDate } from "./daily-calendar";
import { addDays } from "./time";

export function nextBadgeGoals(badges: readonly LearningBadge[]) {
  return badges
    .filter((badge) => !badge.topicId && !badge.earned && badge.target > 0)
    .sort(
      (a, b) =>
        Math.min(1, b.progress / b.target) - Math.min(1, a.progress / a.target),
    )
    .slice(0, 4);
}

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
  buddy?: number;
  unit?: string;
  action?:
    | { label: string; deckId: string; level: Difficulty }
    | { label: string; route: "/review" | "/island" };
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
  const explored = decks.filter(
    (deck) => (user.mastery[deck.id]?.completed ?? 0) > 0,
  );
  const fullRuns = own.filter(
    (run) =>
      decks.some((deck) => deck.id === run.deckId) &&
      run.mode !== "review" &&
      run.completed &&
      run.ids.length === 8 &&
      run.answers.length === 8 &&
      new Set(run.answers.map((answer) => answer.questionId)).size === 8 &&
      run.answers.every((answer) => run.ids.includes(answer.questionId)),
  );
  const correctIn = (run: Run) =>
    run.answers.filter((answer) => answer.correct).length;
  const best = (test: (run: Run) => boolean) =>
    Math.max(0, ...fullRuns.filter(test).map(correctIn));
  const reviewed = new Set([
    ...own
      .filter(
        (run) =>
          run.mode === "review" && decks.some((deck) => deck.id === run.deckId),
      )
      .flatMap((run) =>
        run.answers
          .filter(
            (answer) => answer.correct && run.ids.includes(answer.questionId),
          )
          .map((answer) => answer.questionId),
      ),
    ...user.review
      .filter(
        (card) =>
          decks.some((deck) => deck.id === card.deckId) &&
          card.box > 0 &&
          card.lastReviewed &&
          validCalendarDate(card.lastReviewed) &&
          card.lastReviewed <= today,
      )
      .map((card) => card.questionId),
  ]);
  const freshTopic = (branch?: string) =>
    decks.find(
      (deck) =>
        (!branch || deck.branch === branch) &&
        !explored.some((value) => value.id === deck.id),
    ) ?? decks.find((deck) => !branch || deck.branch === branch)!;
  const missingBranch =
    decks.find(
      (deck) =>
        deck.branch !== "skills" &&
        !explored.some((value) => value.branch === deck.branch),
    ) ?? freshTopic();
  const evidence: Record<string, [number, number]> = {
    "buddy:brave-bean": [
      decks.reduce(
        (total, deck) => total + (user.mastery[deck.id]?.attempts ?? 0),
        0,
      ),
      20,
    ],
    "buddy:study-snuggle": [
      Object.entries(user.daily).filter(
        ([date, value]) =>
          validCalendarDate(date) && date <= today && value.answers > 0,
      ).length,
      3,
    ],
    "buddy:brainwave": [best((run) => run.level === "medium"), 6],
    "buddy:pocket-medic": [
      explored.filter((deck) => ["life.cells", "life.body"].includes(deck.id))
        .length,
      2,
    ],
    "buddy:connection-cat": [
      new Set(explored.map((deck) => deck.branch)).size,
      3,
    ],
    "buddy:clipboard": [
      fullRuns.filter((run) => correctIn(run) >= 6).length,
      3,
    ],
    "buddy:careful-paws": [
      best((run) =>
        decks.some(
          (deck) => deck.id === run.deckId && deck.branch === "skills",
        ),
      ),
      7,
    ],
    "buddy:aha-again": [reviewed.size, 5],
    "buddy:fizz-purr": [
      explored.filter((deck) => deck.branch === "chemistry").length,
      2,
    ],
    "buddy:notebook-nav": [explored.length, 5],
    "buddy:big-idea": [best((run) => run.level === "hard"), 6],
  };
  const practice = (
    deckId: string,
    level: Difficulty = "easy",
    label = "Practice for this buddy",
  ): NonNullable<LearningBadge["action"]> => ({ deckId, level, label });
  const actions: Record<string, NonNullable<LearningBadge["action"]>> = {
    "buddy:brainwave": practice(
      "life.cells",
      "medium",
      "Try a medium Cells deck",
    ),
    "buddy:pocket-medic": practice(
      explored.some((deck) => deck.id === "life.cells")
        ? "life.body"
        : "life.cells",
      "easy",
      "Explore body science",
    ),
    "buddy:connection-cat": practice(
      missingBranch.id,
      "easy",
      "Explore a new science branch",
    ),
    "buddy:careful-paws": practice(
      "skills.data",
      "medium",
      "Practice Science Skills",
    ),
    "buddy:aha-again": { label: "Open my Review Box", route: "/review" },
    "buddy:fizz-purr": practice(
      freshTopic("chemistry").id,
      "easy",
      "Explore a Chemistry topic",
    ),
    "buddy:notebook-nav": practice(
      freshTopic().id,
      "easy",
      "Explore a fresh topic",
    ),
    "buddy:big-idea": practice("life.cells", "hard", "Try a hard Cells deck"),
  };
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
    ...cozyBadges.map((value) =>
      badge({
        id: value.id,
        name: value.name,
        description: value.description,
        icon: value.icon,
        unit: value.unit,
        buddy: value.art,
        progress: evidence[value.id][0],
        target: evidence[value.id][1],
        action: actions[value.id] ?? practice("life.cells"),
      }),
    ),
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
