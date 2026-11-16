import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  incorrectChoiceRationale,
  sessionQuestions,
  cellsReasoning,
  questionDiagram,
} from "../src/core/learning-support";
import { seededRng } from "../src/core/random";
import type { Question } from "../src/core/types";

const cells = JSON.parse(
  readFileSync("src/data/questions/life/cells.json", "utf8"),
) as Question[];
describe("Learning feedback and reasoning", () => {
  it("explains the selected mitochondrion as well as the photosynthesis distinction", () => {
    const q = cells.find(
      (q) =>
        /photosynthesis/i.test(q.prompt) &&
        q.options?.some((o) => /mitochondri/i.test(o.text)),
    )!;
    const selected = q.options!.find((o) => /mitochondri/i.test(o.text))!.id;
    expect(incorrectChoiceRationale(q, selected)).toMatch(
      /Mitochondria release usable energy through cellular respiration/,
    );
    expect(incorrectChoiceRationale(q, selected)).toMatch(
      /Chloroplasts capture light/,
    );
    expect(incorrectChoiceRationale(q, q.answer)).toBeUndefined();
    expect(
      incorrectChoiceRationale({ ...q, deckId: "chemistry.atoms" }, selected),
    ).toBeUndefined();
  });
  it("prioritizes available diagram, data and applied formats without changing answers or repeating cards", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const pool = cells.filter((q) => q.level === level);
      const before = JSON.stringify(pool);
      const chosen = sessionQuestions(pool, level, seededRng(38));
      expect(chosen).toEqual(sessionQuestions(pool, level, seededRng(38)));
      expect(chosen).toHaveLength(8);
      expect(new Set(chosen.map((q) => q.id)).size).toBe(8);
      const rich = (q: Question) =>
        q.data ||
        ["data", "diagram", "calc", "order", "match"].includes(q.type);
      const quota = level === "hard" ? 4 : level === "medium" ? 2 : 0;
      expect(chosen.filter(rich).length).toBeGreaterThanOrEqual(
        Math.min(quota, pool.filter(rich).length),
      );
      expect(JSON.stringify(pool)).toBe(before);
    }
  });
  it("offers medium and hard Cells evidence checks with well-formed answers and useful diagrams", () => {
    for (const q of cells) {
      const check = cellsReasoning(q);
      if (q.level === "easy") expect(check).toBeUndefined();
      else {
        expect(check).toBeDefined();
        expect(check!.answer).toBeGreaterThanOrEqual(0);
        expect(check!.answer).toBeLessThan(check!.options.length);
        expect(new Set(check!.options).size).toBe(check!.options.length);
        expect(check!.explanation.length).toBeGreaterThan(80);
        if (check!.data)
          for (const row of check!.data.rows)
            expect(row.length).toBe(check!.data.headers.length);
      }
    }
    const energy = cells.find((q) => q.id === "life.cells.h.003")!;
    const check = cellsReasoning(energy)!;
    expect(check.options[check.answer]).toBe("8 mL per minute");
    const specialized = cells.find(
      (q) => q.type === "diagram" && /red blood/i.test(q.prompt),
    )!;
    expect(questionDiagram(specialized)).toBe("specializedCells");
    expect(
      cellsReasoning({ ...specialized, deckId: "earth.rocks" }),
    ).toBeUndefined();
  });
});
