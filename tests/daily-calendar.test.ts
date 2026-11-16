import { describe, expect, it } from "vitest";
import {
  calendarCells,
  calendarPreview,
  calendarReward,
  validCalendar,
  validCalendarDate,
  type DailyCalendar,
} from "../src/core/daily-calendar";

const enrolled = (): DailyCalendar => ({
  ...calendarPreview("2026-11-16", "Asia/Manila", true),
  enabled: true,
  eligible: true,
  started_on: "2026-11-10",
  day_index: 7,
  balance: 20,
  claims: [{ day_number: 1, claim_date: "2026-11-10", credits: 5 }],
});
describe("Seven-week calendar presentation", () => {
  it("shows exactly 49 dated days, seven weekly bonuses, and no future or backfilled rewards", () => {
    const c = enrolled(),
      days = calendarCells(c);
    expect(validCalendar(c)).toBe(true);
    expect(days).toHaveLength(49);
    expect(days[0]).toMatchObject({
      date: "2026-11-10",
      status: "claimed",
      credits: 5,
    });
    expect(days[1].status).toBe("missed");
    expect(days[6]).toMatchObject({
      date: "2026-11-16",
      status: "today",
      credits: 10,
    });
    expect(days[7].status).toBe("locked");
    expect(days[48]).toMatchObject({
      week: 7,
      date: "2026-12-28",
      credits: 10,
    });
    expect(days.filter((d) => d.day % 7 === 0)).toHaveLength(7);
    expect(calendarReward(0)).toBe(0);
    expect(calendarReward(50)).toBe(0);
  });
  it("keeps preview claims disabled and snapshots custom reward amounts", () => {
    const p = calendarPreview("2026-12-31", "Asia/Manila", true);
    expect(validCalendar(p)).toBe(true);
    expect(p.eligible).toBe(false);
    expect(calendarCells(p)[1].date).toBe("2027-01-01");
    expect(calendarReward(7, 7, 15)).toBe(15);
    expect(calendarReward(8, 7, 15)).toBe(7);
    expect(validCalendar({ ...p, eligible: true })).toBe(false);
  });
  it("rejects contradictory receipts, invented dates, duplicate days and invalid credit values", () => {
    const c = enrolled();
    for (const value of [
      { ...c, day_index: 8 },
      { ...c, balance: -1 },
      { ...c, daily_credits: 21 },
      { ...c, weekly_credits: 4 },
      { ...c, claims: [...c.claims, ...c.claims] },
      {
        ...c,
        claims: [{ day_number: 1, claim_date: "2026-11-11", credits: 5 }],
      },
      {
        ...c,
        claims: [{ day_number: 8, claim_date: "2026-11-17", credits: 5 }],
      },
      {
        ...c,
        claims: [{ day_number: 1, claim_date: "2026-11-10", credits: 40 }],
      },
      {
        ...c,
        eligible: true,
        claims: [{ day_number: 7, claim_date: "2026-11-16", credits: 10 }],
      },
    ])
      expect(validCalendar(value)).toBe(false);
    expect(validCalendarDate("2026-02-29")).toBe(false);
    expect(validCalendarDate("2028-02-29")).toBe(true);
    expect(validCalendarDate("2026-11-16T00:00:00Z")).toBe(false);
  });
  it("preserves receipts after the 49-day trail ends without another today slot", () => {
    const c = {
      ...enrolled(),
      server_day: "2026-12-29",
      day_index: 50,
      eligible: false,
    };
    expect(validCalendar(c)).toBe(true);
    expect(calendarCells(c).some((d) => d.status === "today")).toBe(false);
    expect(calendarCells(c)[0].status).toBe("claimed");
  });
});
