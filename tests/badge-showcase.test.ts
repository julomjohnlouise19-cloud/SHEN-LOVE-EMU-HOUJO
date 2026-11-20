import { describe, expect, it } from "vitest";
import {
  chooseShowcaseBadges,
  emptyBadgeShowcase,
  readBadgeShowcase,
  updateBadgeShowcase,
} from "../src/core/badge-showcase";

const earned = [
  "first-deck",
  "ten-right",
  "perfect-easy",
  "topic:life.cells",
].map((id) => ({ id, earned: true }));
const available = [...earned, { id: "week-streak", earned: false }];
describe("earned profile badge shelf", () => {
  it("preserves chosen order, permits clearing and never mutates progress or caller data", () => {
    const selected = ["topic:life.cells", "first-deck", "ten-right"];
    const before = structuredClone(available);
    const next = updateBadgeShowcase(
      emptyBadgeShowcase(),
      0,
      selected,
      available,
    );
    expect(next).toEqual({ version: 1, revision: 1, badges: selected });
    selected.pop();
    expect(next.badges).toHaveLength(3);
    expect(updateBadgeShowcase(next, 1, [], available).badges).toEqual([]);
    expect(available).toEqual(before);
  });
  it("rejects locked, unknown, duplicated and excessive badges", () => {
    for (const selected of [
      ["week-streak"],
      ["invented"],
      ["first-deck", "first-deck"],
      earned.map((badge) => badge.id),
    ])
      expect(() => chooseShowcaseBadges(selected, available)).toThrow();
  });
  it("rejects stale cross-tab saves and corrupt saved envelopes", () => {
    const saved = updateBadgeShowcase(
      emptyBadgeShowcase(),
      0,
      ["first-deck"],
      available,
    );
    expect(() => updateBadgeShowcase(saved, 0, [], available)).toThrow(
      "another tab",
    );
    expect(readBadgeShowcase(saved)).toEqual(saved);
    for (const input of [
      null,
      {},
      { ...saved, version: 2 },
      { ...saved, revision: -1 },
      { ...saved, revision: NaN },
      { ...saved, badges: [2] },
      { ...saved, badges: ["x", "x"] },
      { ...saved, badges: ["a", "b", "c", "d"] },
    ])
      expect(readBadgeShowcase(input)).toBeUndefined();
  });
});
