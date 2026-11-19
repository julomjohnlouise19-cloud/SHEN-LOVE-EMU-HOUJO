import { describe, expect, it } from "vitest";
import {
  cozyTitle,
  learningGrowth,
  learningBadges,
  activeLearningStreak,
} from "../src/core/growth";
import { defaultRules } from "../src/core/rules";
import { execute, applyResult } from "../src/core/commands";
import { initialState } from "../src/store/seed";
import { seededRng } from "../src/core/random";
import { decks } from "../src/data/catalog";
import type {
  AppState,
  Command,
  Context,
  Question,
  Run,
} from "../src/core/types";
import cells from "../src/data/questions/life/cells.json";

const now = Date.parse("2026-11-19T02:00:00Z"),
  today = "2026-11-19";
const ctx: Context = {
  clock: { now: () => now },
  rng: seededRng(22),
  rules: defaultRules,
};
const questions = (cells as Question[])
  .filter((q) => q.level === "easy")
  .slice(0, 8);
const apply = (state: AppState, command: Command) =>
  applyResult(
    state,
    "guest",
    command,
    execute(state, "guest", command, ctx),
    ctx,
  );
function run(owner = "guest", length = 8, level: Run["level"] = "easy"): Run {
  return {
    id: "example",
    userId: owner,
    deckId: "life.cells",
    level,
    mode: "practice",
    created: now,
    ids: questions.slice(0, length).map((q) => q.id),
    answers: questions.slice(0, length).map((q) => ({
      questionId: q.id,
      value: q.answer,
      correct: true,
      merits: 3,
      xp: 12,
    })),
    completed: true,
  };
}

describe("cozy learning growth", () => {
  it("uses existing XP rules at exact title/level boundaries and keeps growing past Professor", () => {
    for (const [xp, level, title] of [
      [0, 1, "Curious Seedling"],
      [479, 4, "Curious Seedling"],
      [480, 5, "Lab Assistant"],
      [1080, 10, "Junior Scientist"],
      [2280, 20, "Professor"],
      [3600, 31, "Professor"],
    ] as const) {
      const growth = learningGrowth({ xp }, defaultRules);
      expect([growth.level, growth.title.name]).toEqual([level, title]);
      expect(growth.currentXP + growth.remainingXP).toBe(
        defaultRules.xpPerLevel,
      );
      expect(growth.percent).toBeGreaterThanOrEqual(0);
      expect(growth.percent).toBeLessThan(100);
    }
    expect(learningGrowth({ xp: 200 }, { xpPerLevel: 50 }).title.name).toBe(
      "Lab Assistant",
    );
    expect(cozyTitle(20).name).toBe("Professor");
    expect(
      learningGrowth({ xp: 2280 }, defaultRules).nextTitle,
    ).toBeUndefined();
  });

  it("retains historical topic/milestone evidence, covers every topic and leaves inputs unchanged", () => {
    const state = initialState("", "", now),
      user = state.users[0];
    user.mastery["life.body"] = { completed: 2, correct: 12, attempts: 16 };
    user.badges.push("week-streak", "legacy-keepsake");
    const before = structuredClone(user);
    const badges = learningBadges(user, [], today);
    expect(badges.filter((badge) => badge.topicId)).toHaveLength(decks.length);
    expect(
      badges.filter((badge) => badge.earned).map((badge) => badge.id),
    ).toEqual(
      expect.arrayContaining([
        "first-deck",
        "ten-right",
        "week-streak",
        "topic:life.body",
      ]),
    );
    expect(
      badges.find(
        (badge) =>
          badge.id ===
          "topic:" + decks.find((deck) => deck.id !== "life.body")!.id,
      )?.earned,
    ).not.toBe(true);
    expect(user).toEqual(before);
  });

  it("requires a complete eight-question easy run, ignores another student's run and keeps partial progress honest", () => {
    const user = initialState("", "", now).users[0];
    for (const examples of [
      [run("someone-else")],
      [run("guest", 1)],
      [run("guest", 8, "medium")],
    ])
      expect(
        learningBadges(user, examples, today).find(
          (badge) => badge.id === "perfect-easy",
        )?.earned,
      ).toBe(false);
    const partial = {
      ...run(),
      completed: false,
      answers: run().answers.slice(0, 3),
    };
    expect(
      learningBadges(user, [partial], today).find(
        (badge) => badge.id === "perfect-easy",
      ),
    ).toMatchObject({ earned: false, progress: 3, target: 8 });
    expect(
      learningBadges(user, [run()], today).find(
        (badge) => badge.id === "perfect-easy",
      )?.earned,
    ).toBe(true);
  });

  it("shows the active classroom-day streak without taking away an earned seven-day badge", () => {
    const user = initialState("", "", now).users[0];
    user.lastDay = "2026-11-18";
    user.streak = 6;
    expect(activeLearningStreak(user, today)).toBe(6);
    expect(activeLearningStreak(user, "2026-11-20")).toBe(0);
    expect(
      learningBadges(user, [], "2026-11-20").find(
        (badge) => badge.id === "week-streak",
      ),
    ).toMatchObject({ earned: false, progress: 0 });
    user.badges.push("week-streak");
    expect(
      learningBadges(user, [], "2026-11-20").find(
        (badge) => badge.id === "week-streak",
      ),
    ).toMatchObject({ earned: true, progress: 7 });
  });

  it("awards actual quiz achievements once with no extra XP/merits, and rejects replayed answers", () => {
    let state = initialState("", "", now);
    state.users[0].xp = 468;
    const oldMerits = state.users[0].merits;
    state = apply(state, {
      type: "StartRun",
      run: {
        id: "earned",
        deckId: "life.cells",
        level: "easy",
        mode: "practice",
        ids: questions.map((q) => q.id),
      },
    });
    for (const question of questions)
      state = apply(state, {
        type: "SubmitAnswer",
        runId: "earned",
        question,
        value: question.answer,
      });
    expect(state.users[0].badges).toEqual(
      expect.arrayContaining([
        "first-deck",
        "perfect-deck",
        "perfect-easy",
        "topic:life.cells",
      ]),
    );
    expect(new Set(state.users[0].badges).size).toBe(
      state.users[0].badges.length,
    );
    expect(state.users[0].xp).toBe(468 + 96);
    expect(state.users[0].merits - oldMerits).toBe(
      state.runs[0].answers.reduce((total, answer) => total + answer.merits, 0),
    );
    expect(
      state.events.find((event) => event.type === "LevelUp")?.text,
    ).toContain("Lab Assistant");
    expect(
      state.events.filter(
        (event) =>
          event.type === "BadgeEarned" &&
          event.data?.badgeId === "perfect-easy",
      ),
    ).toHaveLength(1);
    const before = structuredClone(state);
    expect(() =>
      apply(state, {
        type: "SubmitAnswer",
        runId: "earned",
        question: questions[7],
        value: questions[7].answer,
      }),
    ).toThrow("finished");
    expect(state).toEqual(before);
  });

  it("backfills genuine old achievements quietly and preserves saved badge IDs", () => {
    let state = initialState("", "", now);
    state.users[0].mastery["life.body"] = {
      completed: 1,
      correct: 8,
      attempts: 8,
    };
    state.users[0].badges.push("old-favorite");
    state = apply(state, {
      type: "StartRun",
      run: {
        id: "new",
        deckId: "life.cells",
        level: "easy",
        mode: "practice",
        ids: questions.map((q) => q.id),
      },
    });
    state = apply(state, {
      type: "SubmitAnswer",
      runId: "new",
      question: questions[0],
      value: questions[0].answer,
    });
    expect(state.users[0].badges).toEqual(
      expect.arrayContaining(["old-favorite", "first-deck", "topic:life.body"]),
    );
    expect(
      state.events.filter((event) => event.type === "BadgeEarned"),
    ).toHaveLength(0);
  });
});
