import { describe, expect, it } from "vitest";
import { learningBadges, nextBadgeGoals } from "../src/core/growth";
import { cozyBadges } from "../src/data/cozy-badges";
import { decks, deckById } from "../src/data/catalog";
import { initialState } from "../src/store/seed";
import { execute, applyResult } from "../src/core/commands";
import { defaultRules } from "../src/core/rules";
import { seededRng } from "../src/core/random";
import type { Command, Context, Run, Question } from "../src/core/types";
import cells from "../src/data/questions/life/cells.json";

const today = "2026-11-21",
  now = Date.parse(today + "T04:00:00Z");
const user = () => structuredClone(initialState("", "", now).users[0]);
const fixtureRun = (
  id: string,
  level: Run["level"],
  correct = 8,
  deckId = "life.cells",
  owner = "guest",
): Run => ({
  id,
  level,
  deckId,
  userId: owner,
  completed: true,
  created: now,
  mode: "practice",
  ids: Array.from({ length: 8 }, (_, index) => "q" + index),
  answers: Array.from({ length: 8 }, (_, index) => ({
    questionId: "q" + index,
    value: "answer",
    correct: index < correct,
    merits: 0,
    xp: 0,
  })),
});
const find = (owner: ReturnType<typeof user>, id: string, runs: Run[] = []) =>
  learningBadges(owner, runs, today).find(
    (badge) => badge.id === "buddy:" + id,
  )!;

describe("the eleven Cozy buddies", () => {
  it("adds eleven distinct tasks and art positions without removing old badges or changing inputs", () => {
    const owner = user(),
      before = structuredClone(owner),
      badges = learningBadges(owner, [], today);
    expect(cozyBadges).toHaveLength(11);
    expect(new Set(cozyBadges.map((badge) => badge.id)).size).toBe(11);
    expect(cozyBadges.map((badge) => badge.art)).toEqual(
      Array.from({ length: 11 }, (_, index) => index),
    );
    expect(badges).toHaveLength(43);
    expect(badges.filter((badge) => badge.topicId)).toHaveLength(27);
    expect(badges.filter((badge) => badge.buddy !== undefined)).toHaveLength(
      11,
    );
    for (const badge of badges)
      if (badge.action && "deckId" in badge.action)
        expect(deckById(badge.action.deckId)).toBeTruthy();
    expect(owner).toEqual(before);
  });
  it("uses valid dated practice and counts known-topic attempts without inventing attendance", () => {
    const owner = user();
    owner.mastery["life.cells"] = { attempts: 19, correct: 3, completed: 1 };
    owner.mastery["invented.topic"] = {
      attempts: 500,
      correct: 500,
      completed: 50,
    };
    expect(find(owner, "brave-bean")).toMatchObject({
      earned: false,
      progress: 19,
    });
    owner.mastery["life.cells"].attempts++;
    expect(find(owner, "brave-bean").earned).toBe(true);
    for (const day of [
      "2026-11-01",
      "2026-11-03",
      today,
      "2099-01-01",
      "2026-02-30",
    ])
      owner.daily[day] = {
        merits: 0,
        answers: 1,
        correct: 0,
        spin: false,
        quests: [],
        challenge: false,
      };
    expect(find(owner, "study-snuggle")).toMatchObject({
      earned: true,
      progress: 3,
    });
    delete owner.daily[today];
    expect(find(owner, "study-snuggle")).toMatchObject({
      earned: false,
      progress: 2,
    });
  });
  it("requires complete owned eight-question evidence for medium, hard, Skills and consistent-run goals", () => {
    const owner = user(),
      medium = fixtureRun("medium", "medium", 6),
      hard = fixtureRun("hard", "hard", 6),
      skills = fixtureRun("skills", "medium", 7, "skills.data");
    for (const run of [
      { ...medium, userId: "another-student" },
      { ...medium, completed: false },
      { ...medium, deckId: "unknown" },
      { ...medium, answers: medium.answers.slice(0, 6) },
      { ...medium, answers: Array(8).fill(medium.answers[0]) },
      { ...medium, mode: "review" as const },
    ])
      expect(find(owner, "brainwave", [run]).earned).toBe(false);
    expect(find(owner, "brainwave", [medium])).toMatchObject({
      earned: true,
      progress: 6,
    });
    expect(find(owner, "big-idea", [hard]).earned).toBe(true);
    expect(find(owner, "careful-paws", [medium]).earned).toBe(false);
    expect(find(owner, "careful-paws", [skills]).earned).toBe(true);
    expect(find(owner, "clipboard", [medium, hard])).toMatchObject({
      earned: false,
      progress: 2,
    });
    expect(find(owner, "clipboard", [medium, hard, skills]).earned).toBe(true);
  });
  it("counts different real topics and branches instead of repeat completions", () => {
    const owner = user();
    owner.mastery["life.cells"] = { attempts: 80, correct: 80, completed: 10 };
    expect(find(owner, "pocket-medic").progress).toBe(1);
    expect(find(owner, "notebook-nav").progress).toBe(1);
    for (const id of [
      "life.body",
      "chemistry.atoms",
      "chemistry.matter",
      "physics.forces",
    ])
      owner.mastery[id] = { attempts: 8, correct: 8, completed: 1 };
    expect(find(owner, "pocket-medic").earned).toBe(true);
    expect(find(owner, "fizz-purr").earned).toBe(true);
    expect(find(owner, "connection-cat")).toMatchObject({
      earned: true,
      progress: 3,
    });
    expect(find(owner, "notebook-nav")).toMatchObject({
      earned: true,
      progress: 5,
    });
  });
  it("counts different correctly revisited review questions and retains earned keepsakes", () => {
    const owner = user(),
      first = { ...fixtureRun("review1", "easy", 3), mode: "review" as const },
      second = { ...fixtureRun("review2", "easy", 4), mode: "review" as const };
    owner.review.push({
      questionId: "fresh-review",
      deckId: "life.cells",
      box: 1,
      due: "2026-11-22",
      lastReviewed: today,
    });
    expect(
      find(owner, "aha-again", [
        first,
        second,
        fixtureRun("another", "easy", 8, "life.cells", "another-student"),
      ]),
    ).toMatchObject({ earned: true, progress: 5 });
    owner.review[0].lastReviewed = "2099-01-01";
    expect(find(owner, "aha-again", [first, second])).toMatchObject({
      earned: false,
      progress: 4,
    });
    owner.badges.push("buddy:aha-again", "old-keepsake");
    expect(find(owner, "aha-again")).toMatchObject({
      earned: true,
      progress: 5,
    });
    expect(owner.badges).toContain("old-keepsake");
  });
  it("suggests at most four real unearned goals, excludes all topic/deck options and handles a completed crew", () => {
    const owner = user();
    owner.mastery["life.cells"] = { attempts: 19, correct: 9, completed: 1 };
    const badges = learningBadges(owner, [], today),
      goals = nextBadgeGoals(badges);
    expect(goals).toHaveLength(4);
    expect(goals.every((badge) => !badge.topicId && !badge.earned)).toBe(true);
    expect(goals[0].id).toBe("buddy:brave-bean");
    owner.badges = badges
      .filter((badge) => !badge.topicId)
      .map((badge) => badge.id);
    expect(nextBadgeGoals(learningBadges(owner, [], today))).toEqual([]);
    expect(
      learningBadges(owner, [], today).some(
        (badge) => badge.topicId && !badge.earned,
      ),
    ).toBe(true);
  });
  it("earns a new buddy once through real answer commands without extra XP or merits", () => {
    const ctx: Context = {
      clock: { now: () => now },
      rng: seededRng(72),
      rules: defaultRules,
    };
    let state = initialState("", "", now),
      preowned = structuredClone(state);
    preowned.users[0].badges.push(...cozyBadges.map((badge) => badge.id));
    const questions = (cells as Question[])
      .filter((question) => question.level === "easy")
      .slice(0, 8);
    let earned = 0;
    function both(command: Command) {
      const result = execute(state, "guest", command, ctx);
      earned += result.events.filter(
        (event) =>
          event.type === "BadgeEarned" &&
          event.data?.badgeId === "buddy:brave-bean",
      ).length;
      state = applyResult(state, "guest", command, result, ctx);
      preowned = applyResult(
        preowned,
        "guest",
        command,
        execute(preowned, "guest", command, ctx),
        ctx,
      );
    }
    let last: Command | undefined;
    for (let run = 0; run < 3; run++) {
      both({
        type: "StartRun",
        run: {
          id: "new-buddy-" + run,
          deckId: "life.cells",
          level: "easy",
          mode: "practice",
          ids: questions.map((question) => question.id),
        },
      });
      for (const question of questions.slice(0, run === 2 ? 4 : 8)) {
        last = {
          type: "SubmitAnswer",
          runId: "new-buddy-" + run,
          question,
          value: question.answer,
        };
        both(last);
      }
    }
    expect(earned).toBe(1);
    expect(state.users[0].badges).toContain("buddy:brave-bean");
    expect(state.users[0].xp).toBe(preowned.users[0].xp);
    expect(state.users[0].merits).toBe(preowned.users[0].merits);
    expect(() => execute(state, "guest", last!, ctx)).toThrow(
      "already been answered",
    );
    expect(decks).toHaveLength(27);
    expect(state.runs).toHaveLength(3);
  });
});
