import { describe, expect, it } from "vitest";
import {
  friendLookup,
  weeklyCountdown,
  discoveryTotals,
  validateCommunitySettings,
  blankCommunitySettings,
  type ScoredDiscovery,
} from "../src/core/community";
describe("classroom connections", () => {
  it("accepts existing account names and sign-ins without requiring a new username", () => {
    expect(friendLookup("  Jo Rivera  ")).toBe("Jo Rivera");
    expect(friendLookup("student@example.test")).toBe("student@example.test");
    expect(friendLookup("student1")).toBe("student1");
    for (const value of ["a", "", "name\nother", "x".repeat(255)])
      expect(() => friendLookup(value)).toThrow();
  });
  it("lists existing account names while extra profile details remain optional", () => {
    expect(blankCommunitySettings()).toMatchObject({
      listed: true,
      share_photo: false,
      share_bio: false,
      share_grade: false,
    });
    const value = { ...blankCommunitySettings(), username: "mina", version: 1 };
    expect(() => validateCommunitySettings(value)).not.toThrow();
    expect(() =>
      validateCommunitySettings({ ...value, version: -1 }),
    ).toThrow();
    expect(() =>
      validateCommunitySettings({
        ...value,
        listed: "yes" as unknown as boolean,
      }),
    ).toThrow();
  });
  it("counts down to a new week without erasing old achievements", () => {
    const next = "2026-11-15T16:00:00Z";
    expect(weeklyCountdown(Date.parse("2026-11-15T15:59:30Z"), next)).toBe(
      "New week in 1m",
    );
    expect(weeklyCountdown(Date.parse("2026-11-15T16:00:00Z"), next)).toBe(
      "A fresh week is starting…",
    );
    expect(weeklyCountdown(Date.parse("2026-11-14T14:00:00Z"), next)).toBe(
      "New week in 1d 2h 0m",
    );
  });
  const quiz = (
    correct: number,
    other: Partial<ScoredDiscovery> = {},
  ): ScoredDiscovery => ({
    user_id: "mina",
    deck_id: "life.cells",
    level: "medium",
    day: "2026-11-12",
    correct,
    total: 8,
    ...other,
  });
  it("counts only the best result per deck, difficulty and classroom day", () => {
    const records = [
      quiz(4),
      quiz(8),
      quiz(6),
      quiz(3, { level: "hard" }),
      quiz(8, { deck_id: "earth.plates", archived: true }),
    ];
    expect(discoveryTotals(records).get("mina")).toEqual({
      points: 110,
      correct: 11,
      answers: 16,
      discoveries: 2,
      level: 2,
    });
    expect(discoveryTotals([...records, ...records]).get("mina")).toEqual(
      discoveryTotals(records).get("mina"),
    );
  });
  it("keeps students and weeks separate and allows new days to add discoveries", () => {
    const records = [
      quiz(8, { day: "2026-11-04" }),
      quiz(1),
      quiz(8, { user_id: "leo" }),
    ];
    expect(discoveryTotals(records).get("mina")?.points).toBe(90);
    expect(discoveryTotals(records, "2026-11-09").get("mina")?.points).toBe(10);
    expect(discoveryTotals(records).get("leo")?.points).toBe(80);
  });
});
