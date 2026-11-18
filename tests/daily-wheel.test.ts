import { expect, it } from "vitest";
import {
  validClassWheel,
  validWheelResult,
  type ClassWheel,
} from "../src/core/daily-wheel";

const ready = (): ClassWheel => ({
  version: 1,
  basis: "class_credits",
  student: true,
  timezone: "Asia/Manila",
  server_day: "2026-11-18",
  maximum: 12,
  eligible: true,
  balance: 100,
  receipt: null,
});
const saved = () => ({
  ...ready(),
  eligible: false,
  balance: 112,
  receipt: { claim_date: "2026-11-18", credits: 12, maximum: 12, slot: 5 },
});
it("validates real class-credit wheel states and coherent eligibility, dates and balances", () => {
  expect(validClassWheel(ready())).toBe(true);
  expect(validClassWheel(saved())).toBe(true);
  expect(validClassWheel({ ...ready(), student: false, eligible: false })).toBe(
    true,
  );
  for (const value of [
    { ...ready(), basis: "practice_merits" },
    { ...ready(), balance: -1 },
    { ...ready(), balance: 10000001 },
    { ...ready(), eligible: false },
    { ...ready(), student: false },
    { ...ready(), timezone: "not/a/zone" },
    { ...saved(), receipt: { ...saved().receipt, slot: 6 } },
    { ...saved(), receipt: { ...saved().receipt, credits: 13 } },
    { ...saved(), receipt: { ...saved().receipt, claim_date: "2026-11-19" } },
  ])
    expect(validClassWheel(value)).toBe(false);
});
it("accepts durable duplicate receipts including zero-credit spins and rejects fabricated awards", () => {
  const first = {
    wheel: saved(),
    awarded: 12,
    already_claimed: false,
    receipt: saved().receipt,
  };
  expect(validWheelResult(first)).toBe(true);
  expect(
    validWheelResult({ ...first, awarded: 0, already_claimed: true }),
  ).toBe(true);
  const zero = { claim_date: "2026-11-18", credits: 0, maximum: 12, slot: 0 };
  expect(
    validWheelResult({
      wheel: { ...saved(), balance: 100, receipt: zero },
      awarded: 0,
      already_claimed: false,
      receipt: zero,
    }),
  ).toBe(true);
  for (const value of [
    { ...first, awarded: 13 },
    { ...first, already_claimed: true },
    { ...first, receipt: { ...first.receipt, slot: 4 } },
    { ...first, wheel: { ...first.wheel, receipt: null } },
    { ...first, wheel: { ...first.wheel, balance: 1 } },
  ])
    expect(validWheelResult(value)).toBe(false);
});
it("accepts an old-day retry only as an already-saved zero-award receipt", () => {
  const next = { ...ready(), server_day: "2026-11-19" };
  const retry = {
    wheel: next,
    awarded: 0,
    already_claimed: true,
    receipt: saved().receipt,
  };
  expect(validWheelResult(retry)).toBe(true);
  expect(
    validWheelResult({ ...retry, awarded: 12, already_claimed: false }),
  ).toBe(false);
  expect(
    validWheelResult({
      ...retry,
      receipt: { ...retry.receipt, claim_date: "2026-11-20" },
    }),
  ).toBe(false);
});
