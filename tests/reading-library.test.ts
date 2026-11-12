import { describe, it, expect } from "vitest";
import { elements } from "../src/data/elements";
import { decks, branches } from "../src/data/catalog";
import { studyGuides } from "../src/data/study-guides";
import { scienceFigures } from "../src/data/science-figures";
import {
  diagramMarkup,
  handbookHtml,
  escapeDocumentText,
} from "../src/core/reading-documents";

describe("reading library scientific data", () => {
  it("places all 118 elements once, preserving periods and the separate f-series", () => {
    expect(elements.map((e) => e.number)).toEqual(
      Array.from({ length: 118 }, (_, i) => i + 1),
    );
    expect(new Set(elements.map((e) => e.symbol)).size).toBe(118);
    expect(new Set(elements.map((e) => `${e.row}/${e.column}`)).size).toBe(118);
    const counts = Array.from(
      { length: 7 },
      (_, i) => elements.filter((e) => e.period === i + 1).length,
    );
    expect(counts).toEqual([2, 8, 8, 18, 18, 32, 32]);
    expect(elements[1]).toMatchObject({
      symbol: "He",
      group: 18,
      period: 1,
      family: "noble",
    });
    expect(elements[0]).toMatchObject({
      symbol: "H",
      group: 1,
      family: "nonmetal",
    });
    expect(elements[25]).toMatchObject({ symbol: "Fe", group: 8, period: 4 });
    expect(elements[117]).toMatchObject({ symbol: "Og", group: 18, period: 7 });
    expect(
      elements.filter((e) => e.family === "lanthanide").map((e) => e.number),
    ).toEqual(Array.from({ length: 15 }, (_, i) => i + 57));
    expect(
      elements
        .filter((e) => e.family === "actinide")
        .every((e) => e.period === 7 && e.group === null),
    ).toBe(true);
  });
  it("provides a complete original guide for every existing deck with valid figure connections", () => {
    expect(studyGuides.map((g) => g.deckId).sort()).toEqual(
      decks.map((d) => d.id).sort(),
    );
    for (const g of studyGuides) {
      expect(g.ideas.length).toBeGreaterThanOrEqual(3);
      expect(g.check[1].length).toBeGreaterThan(40);
      for (const id of g.figures)
        expect(scienceFigures.some((f) => f.id === id)).toBe(true);
    }
    for (const branch of branches) {
      const html = handbookHtml(branch.id);
      for (const deck of decks.filter((d) => d.branch === branch.id))
        expect(html).toContain(escapeDocumentText(deck.name));
      expect(html).toContain("Supporting references");
      expect(html).toContain("not quotations");
      expect(html).not.toMatch(/<script\b/i);
    }
  });
  it("exports labelled vector models without external images or executable markup", () => {
    for (const f of scienceFigures) {
      const svg = diagramMarkup(f.id);
      expect(svg).toContain('role="img"');
      expect(svg).toContain(escapeDocumentText(f.limit));
      expect(svg).not.toMatch(/<script|<image|onload=|foreignObject/i);
    }
    expect(diagramMarkup("atom-cloud")).toContain("not to scale");
    expect(diagramMarkup("solar-system")).toContain("Pluto is a dwarf planet");
    expect(diagramMarkup("circuit", "", false)).not.toBe(
      diagramMarkup("circuit", "", true),
    );
  });
});
