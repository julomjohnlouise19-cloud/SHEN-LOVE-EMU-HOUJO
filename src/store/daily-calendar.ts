import { currentUser } from ".";
import { cloudEnabled, cloudUserId, dailyCalendarVersion } from "./cloud";
import { platformRequest, refreshLab } from "./platform";
import { LocalStorageAdapter } from "./adapter";
import {
  validCalendar,
  validCalendarDate,
  type DailyCalendar,
  type CalendarResult,
  type CalendarSettings,
} from "../core/daily-calendar";

const adapter = new LocalStorageAdapter();
const pendingKey = (id: string) => `csl:daily-calendar-request:${id}`;
const markerKey = (id: string) => `csl:daily-calendar-updated:${id}`;
const watching = new Set<string>();
export const calendarReady = () =>
  cloudEnabled && !!cloudUserId() && dailyCalendarVersion() >= 1;
let cache:
  { owner: string; calendar: DailyCalendar; loaded: number } | undefined;
let cacheEpoch = 0;
let loading: { owner: string; promise: Promise<DailyCalendar> } | undefined;
export const cachedCalendar = () =>
  cache && cache.owner === cloudUserId() ? cache.calendar : undefined;
export async function loadCalendar() {
  const owner = cloudUserId();
  if (!calendarReady() || !owner)
    throw new Error("Your class-credit calendar is being prepared.");
  if (loading?.owner === owner) return loading.promise;
  if (!watching.has(owner)) {
    watching.add(owner);
    adapter.subscribe(markerKey(owner), () => {
      if (cache?.owner === owner) cache.loaded = 0;
      window.dispatchEvent(
        new CustomEvent("csl:daily-calendar", { detail: owner }),
      );
    });
  }
  const epoch = cacheEpoch;
  const promise = (async () => {
    const result = await platformRequest<unknown>("csl_daily_calendar");
    if (!validCalendar(result) || owner !== cloudUserId())
      throw new Error(
        "The reward calendar could not be verified. Refresh and try again.",
      );
    if (epoch !== cacheEpoch) {
      if (cache?.owner === owner) return cache.calendar;
      throw new Error("Refresh your calendar to see the latest rewards.");
    }
    cache = { owner, calendar: result, loaded: Date.now() };
    window.dispatchEvent(new Event("csl:daily-calendar-status"));
    return result;
  })();
  loading = { owner, promise };
  try {
    return await promise;
  } finally {
    if (loading?.promise === promise) loading = undefined;
  }
}
interface PendingClaim {
  owner: string;
  date: string;
  request: string;
}
function isPending(value: unknown, owner: string): value is PendingClaim {
  const p = value as PendingClaim | null;
  return (
    !!p &&
    p.owner === owner &&
    validCalendarDate(p.date) &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(p.request)
  );
}
export async function claimCalendar(calendar: DailyCalendar) {
  const owner = cloudUserId();
  if (!owner || currentUser()?.id !== owner || !calendarReady())
    throw new Error("Sign in to claim your own daily class credits.");
  const pending = await adapter.transaction([pendingKey(owner)], (tx) => {
    const stored = tx.get<unknown>(pendingKey(owner));
    const request = isPending(stored, owner)
      ? stored
      : { owner, date: calendar.server_day, request: crypto.randomUUID() };
    tx.set(pendingKey(owner), request);
    return request;
  });
  if (owner !== cloudUserId())
    throw new Error("Your account changed. Open your own calendar again.");
  const clear = () =>
    adapter.transaction([pendingKey(owner)], (tx) => {
      const current = tx.get<unknown>(pendingKey(owner));
      if (isPending(current, owner) && current.request === pending.request)
        tx.set(pendingKey(owner), null);
    });
  let result: CalendarResult;
  try {
    result = await platformRequest<CalendarResult>("csl_claim_daily_calendar", {
      p_user_id: owner,
      p_expected_date: pending.date,
      p_request_id: pending.request,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      /new classroom day|calendar has ended|claims are paused|student accounts|claim ID was already used/.test(
        message,
      )
    )
      await clear();
    throw error;
  }
  if (
    owner !== cloudUserId() ||
    !validCalendar(result.calendar) ||
    !Number.isSafeInteger(result.awarded) ||
    result.awarded < 0 ||
    result.awarded > 40 ||
    !result.receipt ||
    !validCalendarDate(result.receipt.claim_date) ||
    !result.calendar.claims.some(
      (claim) =>
        claim.day_number === result.receipt.day_number &&
        claim.claim_date === result.receipt.claim_date &&
        claim.credits === result.receipt.credits,
    )
  )
    throw new Error(
      "Reopen your calendar to check whether the claim was saved.",
    );
  cacheEpoch++;
  cache = { owner, calendar: result.calendar, loaded: Date.now() };
  window.dispatchEvent(new Event("csl:daily-calendar-status"));
  await clear().catch(() => undefined);
  await adapter
    .set(markerKey(owner), crypto.randomUUID())
    .catch(() => undefined);
  void refreshLab(true).catch(() => undefined);
  window.dispatchEvent(
    new CustomEvent("csl:daily-calendar", { detail: owner }),
  );
  return result;
}
export const loadCalendarSettings = () =>
  platformRequest<CalendarSettings>("csl_calendar_settings");
export async function saveCalendarSettings(
  value: { enabled: boolean; daily: number; weekly: number; version: number },
  request: string,
) {
  if (currentUser()?.role !== "admin")
    throw new Error("Teacher access is required.");
  const result = await platformRequest<CalendarSettings>(
    "csl_calendar_settings",
    {
      p_enabled: value.enabled,
      p_daily: value.daily,
      p_weekly: value.weekly,
      p_version: value.version,
      p_request_id: request,
    },
  );
  cache = undefined;
  cacheEpoch++;
  window.dispatchEvent(new Event("csl:daily-calendar-status"));
  return result;
}
export async function refreshCalendarIfNeeded() {
  if (
    !calendarReady() ||
    !currentUser() ||
    currentUser()?.id === "guest" ||
    (cache &&
      cache.owner === cloudUserId() &&
      Date.now() - cache.loaded < 60000)
  )
    return;
  await loadCalendar();
}
window.addEventListener("csl:platform", () => {
  if (!cloudUserId()) {
    cache = undefined;
    cacheEpoch++;
  }
});
