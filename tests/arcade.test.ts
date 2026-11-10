import { describe, it, expect } from "vitest";
import cells from "../src/data/questions/life/cells.json";
import {
  arcadeAction,
  arcadeLevel,
  arcadeMultiplier,
  defaultArcadeRules,
  isArcadeQuestion,
  startArcade,
  validArcadeRules,
} from "../src/core/arcade";
import { seededRng } from "../src/core/random";
import type { Question } from "../src/core/types";
const questions = cells as Question[];
const start = () =>
  startArcade("round", "scientist", "life", questions, 1000, seededRng(91));
const question = (id: string) => questions.find((q) => q.id === id)!;
describe("science target rounds", () => {
  it("draws nine unique four-choice cards with three progressive levels", () => {
    const state = start();
    expect(new Set(state.ids).size).toBe(9);
    expect(state.deadline).toBe(21000);
    expect(state.ids.map((id) => question(id).level)).toEqual([
      "easy",
      "easy",
      "easy",
      "medium",
      "medium",
      "medium",
      "hard",
      "hard",
      "hard",
    ]);
    expect(state.ids.every((id) => isArcadeQuestion(question(id)))).toBe(true);
    expect([0, 3, 6].map(arcadeLevel)).toEqual([0, 1, 2]);
    expect(defaultArcadeRules.motion).toEqual([5, 3.5, 2]);
  });
  it("scores combos and enforces a full one-second reload without mutating the input", () => {
    const old = start(),
      copy = structuredClone(old),
      q = question(old.ids[0]);
    const next = arcadeAction(
      old,
      q,
      { type: "shoot", option: String(q.answer) },
      1000,
    );
    expect(old).toEqual(copy);
    expect(next).toMatchObject({
      index: 1,
      score: 100,
      coins: 3,
      combo: 1,
      correct: 1,
      reloadUntil: 2000,
    });
    const second = question(next.ids[1]);
    expect(() =>
      arcadeAction(
        next,
        second,
        { type: "shoot", option: String(second.answer) },
        1999,
      ),
    ).toThrow("Reloading");
    expect(
      arcadeAction(
        next,
        second,
        { type: "shoot", option: String(second.answer) },
        2000,
      ).score,
    ).toBe(200);
  });
  it("wrong targets and misses consume darts, break combos and cannot create negative balances", () => {
    let state = start();
    const q = question(state.ids[0]);
    const wrong = q.options!.find((o) => o.id !== q.answer)!.id;
    state = arcadeAction(state, q, { type: "shoot", option: wrong }, 1000);
    expect(state).toMatchObject({
      index: 0,
      darts: 1,
      score: 0,
      coins: 0,
      combo: 0,
    });
    expect(() =>
      arcadeAction(state, q, { type: "shoot", option: wrong }, 2000),
    ).toThrow("another target");
    state = arcadeAction(state, q, { type: "shoot", option: "__miss__" }, 2000);
    expect(state).toMatchObject({ index: 1, darts: 2, score: 0, coins: 0 });
    expect(state.feedback?.answer).toBeTruthy();
  });
  it("timeouts advance one card, count as wrong and cannot be bought away after expiry", () => {
    const state = start(),
      q = question(state.ids[0]);
    expect(arcadeAction(state, q, { type: "timeout" }, 2000)).toEqual(state);
    const next = arcadeAction(state, q, { type: "time" }, state.deadline);
    expect(next).toMatchObject({ index: 1, score: 0, coins: 0, combo: 0 });
    expect(next.feedback?.kind).toBe("timeout");
    expect(() =>
      arcadeAction(next, q, { type: "timeout" }, next.deadline),
    ).toThrow("already moved");
  });
  it("purchases one time boost and one extra dart per card using earned round coins", () => {
    let state = start(),
      now = 1000;
    for (let i = 0; i < 3; i++) {
      now = Math.max(now, state.reloadUntil);
      const q = question(state.ids[state.index]);
      state = arcadeAction(
        state,
        q,
        { type: "shoot", option: String(q.answer) },
        now,
      );
    }
    expect(state).toMatchObject({ score: 400, coins: 9, combo: 3, index: 3 });
    const q = question(state.ids[3]),
      deadline = state.deadline;
    state = arcadeAction(state, q, { type: "time" }, now);
    expect(state.deadline).toBe(deadline + 5000);
    expect(state.coins).toBe(6);
    expect(() => arcadeAction(state, q, { type: "time" }, now)).toThrow(
      "already used",
    );
    state = arcadeAction(state, q, { type: "dart" }, now);
    expect(state.darts).toBe(3);
    expect(state.coins).toBe(4);
    expect(() => arcadeAction(state, q, { type: "dart" }, now)).toThrow(
      "already used",
    );
  });
  it("finishes a complete round with bounded multipliers and a fresh purse next round", () => {
    let state = start();
    while (!state.completed) {
      const q = question(state.ids[state.index]);
      state = arcadeAction(
        state,
        q,
        { type: "shoot", option: String(q.answer) },
        state.reloadUntil,
      );
    }
    expect(state).toMatchObject({
      completed: true,
      index: 9,
      score: 2000,
      coins: 27,
      correct: 9,
      combo: 9,
    });
    expect([0, 3, 6, 99].map(arcadeMultiplier)).toEqual([1, 2, 3, 3]);
    expect(start().coins).toBe(0);
  });
  it("rejects broken timing, score and power-up settings", () => {
    expect(validArcadeRules(defaultArcadeRules)).toBe(true);
    for (const bad of [
      { ...defaultArcadeRules, seconds: [20, 30, 12] },
      { ...defaultArcadeRules, motion: [5, 0, 2] },
      { ...defaultArcadeRules, timeCost: -1 },
      { ...defaultArcadeRules, penalty: 101 },
    ])
      expect(validArcadeRules(bad)).toBe(false);
  });
});
