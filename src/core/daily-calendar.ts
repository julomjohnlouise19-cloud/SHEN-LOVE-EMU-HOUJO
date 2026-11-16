import { addDays } from "./time";

export const CALENDAR_DAYS = 49;
export interface CalendarClaim {
  day_number: number;
  claim_date: string;
  credits: number;
}
export interface DailyCalendar {
  version: 1;
  student: boolean;
  enabled: boolean;
  timezone: string;
  server_day: string;
  started_on: string | null;
  day_index: number;
  daily_credits: number;
  weekly_credits: number;
  eligible: boolean;
  balance: number;
  claims: CalendarClaim[];
}
export interface CalendarResult {
  calendar: DailyCalendar;
  awarded: number;
  already_claimed: boolean;
  receipt: CalendarClaim;
}
export interface CalendarSettings {
  enabled: boolean;
  daily_credits: number;
  weekly_credits: number;
  version: number;
  enrolled: number;
  claims_today: number;
  credits_awarded: number;
}
export const calendarReward = (day: number, daily = 5, weekly = 10) =>
  day >= 1 && day <= CALENDAR_DAYS ? (day % 7 === 0 ? weekly : daily) : 0;
export function calendarCells(calendar: DailyCalendar) {
  return Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const day = i + 1,
      claim = calendar.claims.find((c) => c.day_number === day);
    return {
      day,
      week: Math.floor(i / 7) + 1,
      date: addDays(calendar.started_on ?? calendar.server_day, i),
      credits: calendarReward(
        day,
        calendar.daily_credits,
        calendar.weekly_credits,
      ),
      status: claim
        ? "claimed"
        : day === calendar.day_index
          ? "today"
          : day < calendar.day_index
            ? "missed"
            : "locked",
      claim,
    };
  });
}
export function calendarPreview(
  serverDay: string,
  timezone: string,
  student = false,
): DailyCalendar {
  return {
    version: 1,
    student,
    enabled: false,
    timezone,
    server_day: serverDay,
    started_on: null,
    day_index: 1,
    daily_credits: 5,
    weekly_credits: 10,
    eligible: false,
    balance: 0,
    claims: [],
  };
}
export function validCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
export function validCalendar(value: unknown): value is DailyCalendar {
  if (!value || typeof value !== "object") return false;
  const c = value as DailyCalendar;
  if (
    c.version !== 1 ||
    typeof c.student !== "boolean" ||
    typeof c.enabled !== "boolean" ||
    typeof c.eligible !== "boolean" ||
    typeof c.timezone !== "string" ||
    c.timezone.length > 80 ||
    !validCalendarDate(c.server_day) ||
    (c.started_on !== null && !validCalendarDate(c.started_on)) ||
    !Number.isInteger(c.day_index) ||
    c.day_index < 1 ||
    !Number.isSafeInteger(c.balance) ||
    c.balance < 0 ||
    c.balance > 10000000 ||
    !Number.isInteger(c.daily_credits) ||
    c.daily_credits < 1 ||
    c.daily_credits > 20 ||
    !Number.isInteger(c.weekly_credits) ||
    c.weekly_credits < 1 ||
    c.weekly_credits > 40 ||
    !Array.isArray(c.claims) ||
    c.claims.length > 49
  )
    return false;
  if (c.weekly_credits < c.daily_credits) return false;
  const days = new Set<number>();
  for (const claim of c.claims) {
    if (
      !claim ||
      !Number.isInteger(claim.day_number) ||
      claim.day_number < 1 ||
      claim.day_number > 49 ||
      days.has(claim.day_number) ||
      !validCalendarDate(claim.claim_date) ||
      !c.started_on ||
      claim.claim_date !== addDays(c.started_on, claim.day_number - 1) ||
      claim.claim_date > c.server_day ||
      claim.credits !==
        calendarReward(claim.day_number, c.daily_credits, c.weekly_credits)
    )
      return false;
    days.add(claim.day_number);
  }
  const expectedDay = c.started_on
    ? Math.floor(
        (Date.parse(`${c.server_day}T12:00:00Z`) -
          Date.parse(`${c.started_on}T12:00:00Z`)) /
          86400000,
      ) + 1
    : 1;
  return (
    c.day_index === expectedDay &&
    (!c.eligible ||
      (c.enabled && c.student && c.day_index <= 49 && !days.has(c.day_index)))
  );
}
