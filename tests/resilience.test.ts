import { describe, it, expect } from "vitest";
import { initialState } from "../src/store/seed";
import { migrateState } from "../src/core/migrations";
import { execute, applyResult } from "../src/core/commands";
import {
  defaultRules,
  recommendDifficulty,
  rankScientists,
} from "../src/core/rules";
import { seededRng } from "../src/core/random";
import { validState, parseBackup } from "../src/store/schema";
import { validateQuestions } from "../src/core/validate";
import { misconceptionCounts } from "../src/core/analytics";
import type { AppState, Command, Context, Question } from "../src/core/types";
import cells from "../src/data/questions/life/cells.json";
import misconceptions from "../src/data/misconceptions.json";
const now = Date.parse("2026-11-06T08:00:00Z");
const ctx: Context = {
  clock: { now: () => now },
  rng: seededRng(12),
  rules: defaultRules,
};
const run = (s: AppState, c: Command, actor = "guest") =>
  applyResult(s, actor, c, execute(s, actor, c, ctx), ctx);
describe("learning and recovery invariants", () => {
  it("does not charge a different price from the confirmed card", () => {
    const s = initialState("", "", now);
    s.users[0].merits = 200;
    expect(() =>
      run(s, { type: "BuyItem", itemId: "pencil", expectedPrice: 30 }),
    ).toThrow("price changed");
    expect(s.users[0].merits).toBe(200);
    expect(s.items[0].stock).toBe(24);
  });
  it("keeps audit history compact and only retains the undoable inverse", () => {
    let s = initialState("", "", now);
    for (let i = 0; i < 50; i++)
      s = run(
        s,
        {
          type: "AdminGivePoints",
          userId: "guest",
          amount: 1,
          reason: "Class participation",
        },
        "admin",
      );
    expect(s.audit).toHaveLength(50);
    expect(s.audit.filter((a) => a.inverse)).toHaveLength(1);
    expect(JSON.stringify(s).length).toBeLessThan(50000);
    s = run(s, { type: "Undo", auditId: s.audit.at(-1)!.id }, "admin");
    expect(s.users[0].merits).toBe(73);
  });
  it("filters misconception analytics by section and excludes undone answers", () => {
    const s = initialState("", "", now);
    s.users[0].section = "SSC Curiosity";
    const event = {
      id: "7-0",
      type: "AnswerSubmitted",
      actor: "guest",
      time: now,
      text: "mix-up",
      data: { misconception: "cells.mixup" },
    };
    expect(misconceptionCounts([event], s.users, "SSC Curiosity")).toEqual({
      "cells.mixup": 1,
    });
    expect(misconceptionCounts([event], s.users, "Other section")).toEqual({});
    expect(
      misconceptionCounts(
        [
          event,
          {
            id: "8-0",
            type: "ChangeUndone",
            actor: "admin",
            time: now,
            text: "undo",
            data: { undoneRev: 7 },
          },
        ],
        s.users,
      ),
    ).toEqual({});
  });
  it("migrates v1/v2 in order while keeping progress", () => {
    const s = initialState("", "", now);
    s.users[0].merits = 87;
    const old = {
      ...s,
      version: 1,
      rules: { ...s.rules, starterMerits: undefined, comboBonus: undefined },
    };
    const json = JSON.parse(JSON.stringify(old)) as unknown;
    const migrated = migrateState(json);
    expect(validState(migrated)).toBe(true);
    expect((migrated as AppState).users[0].merits).toBe(87);
    expect((migrated as AppState).rules.starterMerits).toBe(24);
    expect(migrateState(migrated)).toEqual(migrated);
  });
  it("strips imported sessions and inverse patches", () => {
    const s = run(initialState("", "", now), { type: "SpinWheel" });
    s.sessions = [
      { token: "untrusted", userId: "admin", expires: now + 10000 },
    ];
    const parsed = parseBackup(JSON.stringify(s));
    expect(parsed.sessions).toEqual([]);
    expect(parsed.audit.every((a) => a.inverse === undefined)).toBe(true);
  });
  it("rejects bad roles and malformed nested notes before restore", () => {
    const s = initialState("", "", now);
    const corrupt = JSON.parse(JSON.stringify(s)) as AppState;
    corrupt.users[0].notes = [
      { id: "bad" } as AppState["users"][0]["notes"][0],
    ];
    expect(() => parseBackup(JSON.stringify(corrupt))).toThrow("not a valid");
    expect(s.users[0].notes).toEqual([]);
  });
  it("moves a due review to a later box and stops same-day re-rewarding", () => {
    let s = initialState("", "", now);
    const q = (cells as Question[]).find(
      (q) => q.level === "medium" && q.type === "mcq",
    )!;
    s.users[0].review.push({
      questionId: q.id,
      deckId: q.deckId,
      box: 0,
      due: "2026-11-06",
    });
    s = run(s, {
      type: "StartRun",
      run: {
        id: "review1",
        deckId: q.deckId,
        level: q.level,
        ids: [q.id],
        mode: "review",
      },
    });
    s = run(s, {
      type: "SubmitAnswer",
      runId: "review1",
      question: q,
      value: q.answer,
    });
    expect(s.users[0].review[0]).toMatchObject({
      box: 1,
      due: "2026-11-08",
      lastReviewed: "2026-11-06",
    });
    s = run(s, {
      type: "StartRun",
      run: {
        id: "review2",
        deckId: q.deckId,
        level: q.level,
        ids: [q.id],
        mode: "review",
      },
    });
    expect(() =>
      run(s, {
        type: "SubmitAnswer",
        runId: "review2",
        question: q,
        value: q.answer,
      }),
    ).toThrow("not due");
  });
  it("pays a quest once and only after its requirement", () => {
    let s = initialState("", "", now);
    expect(() => run(s, { type: "ClaimQuest", questId: "curious" })).toThrow(
      "more discovery",
    );
    s.users[0].daily["2026-11-06"] = {
      answers: 8,
      correct: 5,
      merits: 30,
      spin: false,
      quests: [],
      challenge: false,
    };
    s = run(s, { type: "ClaimQuest", questId: "curious" });
    expect(s.users[0].merits).toBe(32);
    expect(() => run(s, { type: "ClaimQuest", questId: "curious" })).toThrow(
      "already",
    );
  });
  it("validates all questions before an atomic admin overlay import", () => {
    const s = initialState("", "", now),
      q = (cells as Question[])[0];
    expect(() =>
      run(
        s,
        {
          type: "AdminQuestions",
          overlays: [
            { op: "patch", question: q },
            { op: "patch", question: { ...q, id: "invalid", reviewed: false } },
          ],
        },
        "admin",
      ),
    ).toThrow("reviewed");
    expect(s.overlays).toEqual({});
    const next = run(
      s,
      {
        type: "AdminQuestions",
        overlays: [
          {
            op: "patch",
            question: {
              ...q,
              explanation: "A reviewed change to the science explanation.",
            },
          },
        ],
      },
      "admin",
    );
    expect(next.overlays[q.id]).toBeTruthy();
    expect(next.audit).toHaveLength(1);
  });
  it("uses mastery to recommend a gentle or more challenging level", () => {
    expect(recommendDifficulty()).toBe("medium");
    expect(recommendDifficulty({ correct: 2, attempts: 8 })).toBe("easy");
    expect(recommendDifficulty({ correct: 7, attempts: 8 })).toBe("hard");
    expect(recommendDifficulty({ correct: 5, attempts: 8 })).toBe("medium");
  });
  it("ranks learning XP and excludes guest/admin accounts", () => {
    const s = initialState("", "", now),
      a = { ...s.users[0], id: "a", xp: 100, created: 2 },
      b = { ...a, id: "b", created: 1 };
    expect(rankScientists([...s.users, a, b]).map((u) => u.id)).toEqual([
      "b",
      "a",
    ]);
  });
  it("rejects missing choices, unreviewed facts, duplicate choices and banned claims", () => {
    const q = (cells as Question[])[0];
    expect(
      validateQuestions([{ ...q, options: undefined }], misconceptions),
    ).toContain(`${q.id}: choice options are required`);
    expect(
      validateQuestions(
        [
          {
            ...q,
            reviewed: false,
            prompt: "Cells always have green chloroplasts.",
          },
        ],
        misconceptions,
      ).some((e) => e.includes("banned phrase")),
    ).toBe(true);
    expect(
      validateQuestions(
        [
          {
            ...q,
            options: [
              q.options![0],
              q.options![0],
              q.options![2],
              q.options![3],
            ],
          },
        ],
        misconceptions,
      ).some((e) => e.includes("duplicate options")),
    ).toBe(true);
  });
  it("blocks admin rule errors and negative stock/price", () => {
    const s = initialState("", "", now);
    expect(() =>
      run(
        s,
        { type: "AdminRules", rules: { ...defaultRules, xpPerLevel: 0 } },
        "admin",
      ),
    ).toThrow("rule values");
    expect(() =>
      run(
        s,
        { type: "AdminItem", item: { ...s.items[0], stock: -1 } },
        "admin",
      ),
    ).toThrow("stock");
  });
});
