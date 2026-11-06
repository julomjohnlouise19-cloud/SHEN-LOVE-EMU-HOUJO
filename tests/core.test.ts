import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { AppState, Command, Context, Question } from "../src/core/types";
import { applyResult, execute } from "../src/core/commands";
import { defaultRules, isCorrect } from "../src/core/rules";
import { initialState } from "../src/store/seed";
import { dayKey } from "../src/core/time";
import { seededRng, shuffle } from "../src/core/random";
import { generators } from "../src/core/generators";
import cells from "../src/data/questions/life/cells.json";
const time = Date.parse("2026-11-06T03:00:00Z");
const context = (seed = 42): Context => ({
  clock: { now: () => time },
  rng: seededRng(seed),
  rules: { ...defaultRules },
});
function command(s: AppState, c: Command, actor = "guest", ctx = context()) {
  return applyResult(s, actor, c, execute(s, actor, c, ctx), ctx);
}
const start = (s: AppState) =>
  command(s, {
    type: "StartRun",
    run: {
      id: "run",
      deckId: "life.cells",
      level: "medium",
      ids: (cells as Question[])
        .filter((q) => q.level === "medium")
        .slice(0, 8)
        .map((q) => q.id),
      mode: "practice",
    },
  });
describe("science rule engine", () => {
  it("replays seeded shuffles without mutating their input", () => {
    const a = [1, 2, 3, 4];
    expect(shuffle(a, seededRng(9))).toEqual(shuffle(a, seededRng(9)));
    expect(a).toEqual([1, 2, 3, 4]);
  });
  it("uses Manila calendar days across a UTC date boundary", () => {
    expect(dayKey({ now: () => Date.parse("2026-11-05T16:00:00Z") })).toBe(
      "2026-11-06",
    );
    expect(dayKey({ now: () => Date.parse("2026-11-05T15:59:59Z") })).toBe(
      "2026-11-05",
    );
  });
  it("submits each card once and adds a wrong answer to spaced review", () => {
    const s = start(initialState("", "", time)),
      q = (cells as Question[]).find((q) => q.id === s.runs[0].ids[0])!;
    const wrong = q.options!.find((o) => o.id !== q.answer)!.id;
    const next = command(s, {
      type: "SubmitAnswer",
      runId: "run",
      question: q,
      value: wrong,
    });
    expect(next.users[0].review).toHaveLength(1);
    expect(next.users[0].review[0].misconception).toBeTruthy();
    expect(next.users[0].xp).toBe(3);
    expect(() =>
      command(next, {
        type: "SubmitAnswer",
        runId: "run",
        question: q,
        value: wrong,
      }),
    ).toThrow("already been answered");
    expect(s.users[0].review).toHaveLength(0);
  });
  it("finishes an eight-card run with mastery, streak and a badge", () => {
    let s = start(initialState("", "", time));
    for (const id of s.runs[0].ids) {
      const q = (cells as Question[]).find((q) => q.id === id)!;
      s = command(s, {
        type: "SubmitAnswer",
        runId: "run",
        question: q,
        value: q.answer,
      });
    }
    expect(s.runs[0].completed).toBe(true);
    expect(s.users[0].mastery["life.cells"]).toEqual({
      attempts: 8,
      correct: 8,
      completed: 1,
    });
    expect(s.users[0].badges).toContain("perfect-deck");
    expect(s.users[0].streak).toBe(1);
  });
  it("keeps last-item purchases atomic and codes unique", () => {
    let s = initialState("", "", time);
    s.users[0].merits = 500;
    s.items[0].stock = 1;
    s = command(s, { type: "BuyItem", itemId: "pencil" });
    expect(s.items[0].stock).toBe(0);
    expect(s.users[0].merits).toBe(465);
    expect(() => command(s, { type: "BuyItem", itemId: "pencil" })).toThrow(
      "sold out",
    );
    expect(s.purchases[0].code).toMatch(/^CSL-[A-Z0-9]{6}$/);
    expect(s.notifications.find((n) => n.userId === "admin")).toBeTruthy();
  });
  it("rejects insufficient balance without changing inventory", () => {
    const s = initialState("", "", time);
    expect(() =>
      execute(s, "guest", { type: "BuyItem", itemId: "goggles" }, context()),
    ).toThrow("more merits");
    expect(s.items[4].stock).toBe(8);
  });
  it("redeems once, checks ownership, and requires admin for collection", () => {
    let s = initialState("", "", time);
    s.users[0].merits = 100;
    s = command(s, { type: "BuyItem", itemId: "pencil" });
    const p = s.purchases[0];
    expect(() =>
      command(s, { type: "ClaimPurchase", purchaseId: p.id }),
    ).toThrow("admin");
    s = command(s, { type: "RedeemCode", code: p.code.toLowerCase() });
    expect(() => command(s, { type: "RedeemCode", code: p.code })).toThrow(
      "already",
    );
    s = command(s, { type: "ClaimPurchase", purchaseId: p.id }, "admin");
    expect(s.purchases[0].status).toBe("claimed");
  });
  it("does not allow repeated spins or forged admin actions", () => {
    const s = command(initialState("", "", time), { type: "SpinWheel" });
    expect(() => command(s, { type: "SpinWheel" })).toThrow("tomorrow");
    expect(() =>
      command(s, {
        type: "AdminGivePoints",
        userId: "guest",
        amount: 10,
        reason: "test",
      }),
    ).toThrow("admin");
  });
  it("undoes only the latest transaction and protects later work", () => {
    let s = command(
      initialState("", "", time),
      {
        type: "AdminGivePoints",
        userId: "guest",
        amount: 8,
        reason: "Class effort",
      },
      "admin",
    );
    const id = s.audit[0].id;
    const undone = command(s, { type: "Undo", auditId: id }, "admin");
    expect(undone.users[0].merits).toBe(24);
    s = command(s, { type: "SpinWheel" });
    expect(() => command(s, { type: "Undo", auditId: id }, "admin")).toThrow(
      "newer work",
    );
  });
  it("matches synonyms, ordered answers and numeric tolerance", () => {
    const base = (cells as Question[])[0];
    expect(
      isCorrect(
        {
          ...base,
          type: "input",
          answer: "cell membrane",
          accept: ["membrane"],
        },
        " MEMBRANE ",
      ),
    ).toBe(true);
    expect(
      isCorrect(
        { ...base, type: "calc", answer: "2.5", tolerance: 0.01 },
        "2.505",
      ),
    ).toBe(true);
    expect(isCorrect({ ...base, type: "calc", answer: "0" }, "")).toBe(false);
    expect(
      isCorrect({ ...base, type: "order", answer: ["a", "b"] }, ["b", "a"]),
    ).toBe(false);
  });
  it("property: merits never cross the daily cap during arbitrarily long play", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 80 }),
        (correct) => {
          let s = initialState("", "", time);
          for (let i = 0; i < correct.length; i++) {
            const q = (cells as Question[])[0];
            s = command(s, {
              type: "StartRun",
              run: {
                id: `r${i}`,
                deckId: q.deckId,
                level: "hard",
                ids: [q.id],
                mode: "practice",
              },
            });
            s = command(s, {
              type: "SubmitAnswer",
              runId: `r${i}`,
              question: q,
              value: correct[i] ? q.answer : "wrong",
            });
          }
          expect(s.users[0].daily["2026-11-06"].merits).toBeLessThanOrEqual(
            120,
          );
          expect(s.users[0].merits).toBeGreaterThanOrEqual(24);
        },
      ),
      { numRuns: 40 },
    );
  });
});
const recompute: Record<string, (v: Record<string, number>) => number> = {
  distance: (v) => v.time * v.speed,
  time: (v) => v.distance / v.speed,
  speed: (v) => v.distance / v.time,
  density: (v) => v.mass / v.volume,
  force: (v) => v.acceleration * v.mass,
  work: (v) => v.distance * v.force,
  power: (v) => v.work / v.time,
  kinetic: (v) => (v.mass * v.speed * v.speed) / 2,
  potential: (v) => v.height * v.gravity * v.mass,
  ohm: (v) => v.voltage / v.resistance,
  series: (v) => v.r2 + v.r1,
  parallel: (v) => 1 / (1 / v.r1 + 1 / v.r2),
  wave: (v) => v.wavelength * v.frequency,
  boyle: (v) => v.v1 * (v.p1 / v.p2),
  charles: (v) => (v.t2 / v.t1) * v.v1,
  massNumber: (v) => v.neutrons + v.protons,
  ratio: (v) => (100 * v.part) / v.total,
  ph: (v) => -Math.log10(10 ** -v.exponent),
  punnett: (v) => v.count * 0.25,
};
describe("independent generator checks", () => {
  for (const [name, generate] of Object.entries(generators))
    it(`${name}: recomputes 200 seeded answers independently`, () => {
      for (let seed = 0; seed < 200; seed++) {
        const q = generate(seededRng(seed));
        expect(q.answer).toBeCloseTo(recompute[name](q.values), 8);
        expect(q.distractors).not.toContain(q.answer);
        expect(q.distractors.length).toBeGreaterThanOrEqual(3);
      }
    });
});
