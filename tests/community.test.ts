import { describe, expect, it } from "vitest";
import {
  publicUsername,
  discoveryTotals,
  validateCommunitySettings,
  blankCommunitySettings,
  type ScoredDiscovery,
} from "../src/core/community";
describe("classroom connections", () => {
  it("normalizes exact usernames without allowing login emails or staff impersonation", () => {
    expect(publicUsername(" @Curious_Mina ")).toBe("curious_mina");
    for (const name of [
      "ab",
      "3mina",
      "two words",
      "test@example.test",
      "admin",
      "teacher",
      "system",
      "a".repeat(21),
    ])
      expect(() => publicUsername(name)).toThrow();
  });
  it("starts sharing off and requires deliberate boolean choices and a known version", () => {
    expect(blankCommunitySettings()).toMatchObject({
      listed: false,
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
