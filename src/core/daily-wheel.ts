import { validCalendarDate } from "./daily-calendar";

export interface WheelReceipt {
  claim_date: string;
  credits: number;
  slot: number;
  maximum: number;
}
export interface ClassWheel {
  version: 1;
  basis: "class_credits";
  student: boolean;
  timezone: string;
  server_day: string;
  maximum: number;
  eligible: boolean;
  balance: number;
  receipt: WheelReceipt | null;
}
export interface WheelResult {
  wheel: ClassWheel;
  awarded: number;
  already_claimed: boolean;
  receipt: WheelReceipt;
}
const whole = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
export function validWheelReceipt(value: unknown): value is WheelReceipt {
  const r = value as WheelReceipt | null;
  return (
    !!r &&
    validCalendarDate(r.claim_date) &&
    whole(r.maximum, 500) &&
    whole(r.credits, r.maximum) &&
    whole(r.slot, 5)
  );
}
export function validClassWheel(value: unknown): value is ClassWheel {
  const w = value as ClassWheel | null;
  if (
    !w ||
    w.version !== 1 ||
    w.basis !== "class_credits" ||
    typeof w.student !== "boolean" ||
    typeof w.eligible !== "boolean" ||
    !validCalendarDate(w.server_day) ||
    !whole(w.maximum, 500) ||
    !whole(w.balance, 10000000) ||
    typeof w.timezone !== "string"
  )
    return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: w.timezone });
  } catch {
    return false;
  }
  if (
    w.receipt !== null &&
    (!validWheelReceipt(w.receipt) || w.receipt.claim_date !== w.server_day)
  )
    return false;
  return w.eligible === (w.student && w.receipt === null);
}
export function validWheelResult(value: unknown): value is WheelResult {
  const r = value as WheelResult | null;
  if (
    !r ||
    !validClassWheel(r.wheel) ||
    !validWheelReceipt(r.receipt) ||
    typeof r.already_claimed !== "boolean" ||
    !whole(r.awarded, 500)
  )
    return false;
  if (r.awarded !== (r.already_claimed ? 0 : r.receipt.credits)) return false;
  if (!r.wheel.student || r.wheel.balance < r.awarded) return false;
  if (r.receipt.claim_date !== r.wheel.server_day)
    return r.already_claimed && r.receipt.claim_date < r.wheel.server_day;
  return (
    r.wheel.receipt !== null &&
    r.wheel.receipt.credits === r.receipt.credits &&
    r.wheel.receipt.slot === r.receipt.slot &&
    r.wheel.receipt.maximum === r.receipt.maximum
  );
}
