import { describe, expect, it } from "vitest";
import {
  activityTopics,
  puzzleWord,
  activityTerm,
} from "../src/data/activity-topics";
import { explorerPlanets } from "../src/data/activity-planets";
import {
  applyActivity,
  initialActivities,
  validActivities,
  wordBoard,
  wordPath,
  type ActivityCommand,
  type ActivityKind,
  type ActivityProgress,
} from "../src/core/activities";

const actor = { id: "student-one", role: "student" };
const act = (p: ActivityProgress, c: ActivityCommand) =>
  applyActivity(p, actor, c, 100000);
const begin = (kind: ActivityKind, topic = "life", seed = 7) =>
  act(initialActivities(actor.id), {
    type: "Begin",
    id: "test-round-0001",
    kind,
    topic: topic as "life",
    seed,
  }).patch;

describe("Discovery Activities", () => {
  it("offers complete, traceable activity vocabulary in every science branch", () => {
    for (const topic of activityTopics) {
      expect(topic.terms.length).toBeGreaterThanOrEqual(8);
      expect(new Set(topic.terms.map((t) => t.id)).size).toBe(
        topic.terms.length,
      );
      expect(
        topic.terms.filter((t) => /^[A-Z]{2,10}$/.test(puzzleWord(t.term)))
          .length,
      ).toBeGreaterThanOrEqual(6);
      for (const kind of ["match", "words", "cards"] as const) {
        const p = begin(kind, topic.id);
        expect(validActivities(p, actor.id)).toBe(true);
        expect(p.rounds[kind]!.items).toHaveLength(kind === "cards" ? 8 : 6);
      }
    }
  });
  it("requires correct pairs, completes once, awards actual badges and rejects stale or foreign actions", () => {
    let p = begin("match");
    const r = p.rounds.match!;
    p = act(p, {
      type: "Match",
      round: r.id,
      term: r.items[0],
      definition: r.items[1],
    }).patch;
    expect(p.rounds.match!.solved).toEqual([]);
    expect(p.rounds.match!.mistakes).toBe(1);
    expect(p.badges).toEqual({});
    p = act(p, { type: "Hint", round: r.id, target: r.items[0] }).patch;
    p = act(p, { type: "Hint", round: r.id, target: r.items[0] }).patch;
    expect(p.rounds.match!.hints).toBe(1);
    for (const id of r.items)
      p = act(p, {
        type: "Match",
        round: r.id,
        term: id,
        definition: id,
      }).patch;
    expect(p.completedRounds).toBe(1);
    expect(p.formats).toEqual(["match"]);
    expect(Object.keys(p.badges).sort()).toEqual(["first", "match"]);
    expect(() =>
      act(p, {
        type: "Match",
        round: r.id,
        term: r.items[0],
        definition: r.items[0],
      }),
    ).toThrow(/changed/);
    expect(() =>
      applyActivity(
        p,
        { ...actor, id: "another-account" },
        { type: "Sound", enabled: true },
        10,
      ),
    ).toThrow(/own/);
    p = act(p, {
      type: "Begin",
      id: "test-round-0002",
      kind: "match",
      topic: "life",
      seed: 33,
    }).patch;
    expect(() =>
      act(p, { type: "Hint", round: r.id, target: r.items[0] }),
    ).toThrow(/changed/);
  });
  it("places every word deterministically, in bounds, across many shuffles and all branches", () => {
    for (const topic of activityTopics)
      for (let seed = 0; seed < 50; seed++) {
        const round = begin("words", topic.id, seed).rounds.words!;
        const board = wordBoard(round);
        expect(board.cells).toHaveLength(100);
        expect(board).toEqual(wordBoard(round));
        expect(Object.keys(board.placements)).toHaveLength(6);
        for (const id of round.items) {
          const path = board.placements[id];
          expect(path.every((i) => i >= 0 && i < 100)).toBe(true);
          expect(wordPath(path[0], path.at(-1)!)).toEqual(path);
          expect(path.map((i) => board.cells[i]).join("")).toBe(
            puzzleWord(activityTerm(id)!.term),
          );
        }
      }
  });
  it("accepts forward and reverse words, rejects bends, and preserves found paths", () => {
    let p = begin("words");
    const round = p.rounds.words!,
      board = wordBoard(round);
    expect(wordPath(0, 23)).toEqual([]);
    expect(wordPath(-1, 9)).toEqual([]);
    expect(wordPath(0, 100)).toEqual([]);
    p = act(p, { type: "FindWord", round: round.id, start: 0, end: 23 }).patch;
    expect(p.rounds.words!.mistakes).toBe(1);
    for (const [i, id] of round.items.entries()) {
      const path = board.placements[id];
      p = act(p, {
        type: "FindWord",
        round: round.id,
        start: i % 2 ? path.at(-1)! : path[0],
        end: i % 2 ? path[0] : path.at(-1)!,
      }).patch;
    }
    expect(p.rounds.words!.completed).toBe(true);
    expect(p.rounds.words!.solved).toHaveLength(6);
    expect(Object.keys(p.rounds.words!.paths)).toHaveLength(6);
    expect(validActivities(p, actor.id)).toBe(true);
  });
  it("requires revealing a flashcard, retries it at the back and finishes only after all are known", () => {
    let p = begin("cards");
    const id = p.rounds.cards!.id,
      first = p.rounds.cards!.queue[0];
    expect(() => act(p, { type: "RateCard", round: id, known: true })).toThrow(
      /Reveal/,
    );
    p = act(p, { type: "Flip", round: id }).patch;
    p = act(p, { type: "RateCard", round: id, known: false }).patch;
    expect(p.rounds.cards!.queue.at(-1)).toBe(first);
    expect(p.rounds.cards!.known).toEqual([]);
    for (let i = 0; i < 8; i++) {
      p = act(p, { type: "Flip", round: id }).patch;
      p = act(p, { type: "RateCard", round: id, known: true }).patch;
    }
    expect(p.rounds.cards!.queue).toEqual([]);
    expect(p.badges.cards).toBe(100000);
    expect(validActivities(p, actor.id)).toBe(true);
  });
  it("earns the planet passport only through eight correct checks and never duplicates a stamp", () => {
    let p = initialActivities(actor.id);
    expect(explorerPlanets).toHaveLength(8);
    expect(explorerPlanets.map((p) => p.id)).not.toContain("pluto");
    expect(() =>
      act(p, { type: "AnswerPlanet", planet: "earth", answer: 2 }),
    ).toThrow(/Read/);
    for (const planet of explorerPlanets) {
      p = act(p, { type: "ReadPlanet", planet: planet.id }).patch;
      p = act(p, { type: "HintPlanet", planet: planet.id }).patch;
      p = act(p, {
        type: "AnswerPlanet",
        planet: planet.id,
        answer: (planet.answer + 1) % 3,
      }).patch;
      expect(p.stamped).not.toContain(planet.id);
      p = act(p, {
        type: "AnswerPlanet",
        planet: planet.id,
        answer: planet.answer,
      }).patch;
      p = act(p, {
        type: "AnswerPlanet",
        planet: planet.id,
        answer: planet.answer,
      }).patch;
    }
    expect(p.stamped).toHaveLength(8);
    expect(p.formats).toEqual(["planets"]);
    expect(Object.keys(p.badges).sort()).toEqual(["first", "planets"]);
    expect(validActivities(p, actor.id)).toBe(true);
    expect(
      explorerPlanets.find((p) => p.id === "venus")!.facts.join(" "),
    ).toContain("hottest");
    expect(
      explorerPlanets.find((p) => p.id === "earth")!.explanation,
    ).toContain("axial tilt");
  });
  it("detects corrupt, cross-account and incomplete activity records without touching classroom balances", () => {
    const p = begin("cards");
    expect(validActivities(p, "someone-else")).toBe(false);
    expect(validActivities({ ...p, version: 99 }, actor.id)).toBe(false);
    const corrupted = structuredClone(p);
    corrupted.rounds.cards!.queue.pop();
    expect(validActivities(corrupted, actor.id)).toBe(false);
    expect(validActivities({ ...p, badges: { invented: 10 } }, actor.id)).toBe(
      false,
    );
    expect(p).not.toHaveProperty("credits");
    expect(p).not.toHaveProperty("xp");
  });
});
