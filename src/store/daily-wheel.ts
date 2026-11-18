import { currentUser } from ".";
import { cloudUserId, dailyWheelVersion } from "./cloud";
import { platformRequest, refreshLab } from "./platform";
import { LocalStorageAdapter } from "./adapter";
import {
  validClassWheel,
  validWheelResult,
  type ClassWheel,
  type WheelResult,
} from "../core/daily-wheel";
import { validCalendarDate } from "../core/daily-calendar";

const adapter = new LocalStorageAdapter();
const pendingKey = (owner: string) => "csl:daily-wheel-request:" + owner;
const markerKey = (owner: string) => "csl:daily-wheel-updated:" + owner;
const watching = new Set<string>();
let cache: { owner: string; wheel: ClassWheel; loaded: number } | undefined;
let epoch = 0;
let loading: { owner: string; promise: Promise<ClassWheel> } | undefined;
export const classWheelReady = () =>
  !!cloudUserId() && dailyWheelVersion() >= 1;
export const cachedClassWheel = () =>
  cache?.owner === cloudUserId() ? cache?.wheel : undefined;
function updated(owner: string) {
  window.dispatchEvent(new CustomEvent("csl:daily-wheel", { detail: owner }));
}
export async function loadClassWheel(force = false): Promise<ClassWheel> {
  const owner = cloudUserId();
  if (!owner || !classWheelReady())
    throw new Error("Your class-credit wheel is being prepared.");
  if (!force && cache?.owner === owner && Date.now() - cache.loaded < 60000)
    return cache.wheel;
  if (loading?.owner === owner) return loading.promise;
  if (!watching.has(owner)) {
    watching.add(owner);
    adapter.subscribe(markerKey(owner), () => {
      if (cache?.owner === owner) cache.loaded = 0;
      if (owner === cloudUserId())
        void loadClassWheel(true).catch(() => undefined);
    });
  }
  const started = epoch;
  const promise = (async () => {
    const result = await platformRequest<unknown>("csl_daily_wheel");
    if (owner !== cloudUserId() || !validClassWheel(result))
      throw new Error(
        "Your daily wheel could not be verified. Refresh and try again.",
      );
    if (started !== epoch) {
      if (cache?.owner === owner) return cache.wheel;
      throw new Error("Reopen the wheel to see the latest reward.");
    }
    cache = { owner, wheel: result, loaded: Date.now() };
    updated(owner);
    return result;
  })();
  loading = { owner, promise };
  try {
    return await promise;
  } finally {
    if (loading?.promise === promise) loading = undefined;
  }
}
interface Pending {
  owner: string;
  date: string;
  request: string;
}
function validPending(value: unknown, owner: string): value is Pending {
  const p = value as Pending | null;
  return (
    !!p &&
    p.owner === owner &&
    validCalendarDate(p.date) &&
    typeof p.request === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(p.request)
  );
}
export async function claimClassWheel(wheel: ClassWheel): Promise<WheelResult> {
  const owner = cloudUserId();
  if (!owner || owner !== currentUser()?.id || !classWheelReady())
    throw new Error("Sign in to spin your own class-credit wheel.");
  const pending = await adapter.transaction([pendingKey(owner)], (tx) => {
    const previous = tx.get<unknown>(pendingKey(owner));
    const value = validPending(previous, owner)
      ? previous
      : { owner, date: wheel.server_day, request: crypto.randomUUID() };
    tx.set(pendingKey(owner), value);
    return value;
  });
  if (owner !== cloudUserId())
    throw new Error("Your account changed. Open your own wheel again.");
  const clear = () =>
    adapter.transaction([pendingKey(owner)], (tx) => {
      const value = tx.get<unknown>(pendingKey(owner));
      if (validPending(value, owner) && value.request === pending.request)
        tx.set(pendingKey(owner), null);
    });
  epoch++;
  let result: unknown;
  try {
    result = await platformRequest<unknown>("csl_spin_daily_wheel", {
      p_user_id: owner,
      p_expected_date: pending.date,
      p_request_id: pending.request,
    });
  } catch (error) {
    if (
      /new classroom day|student accounts|spin ID was already used/.test(
        error instanceof Error ? error.message : "",
      )
    )
      await clear();
    throw error;
  }
  if (owner !== cloudUserId() || !validWheelResult(result))
    throw new Error("Reopen the wheel to check whether your reward was saved.");
  epoch++;
  cache = { owner, wheel: result.wheel, loaded: Date.now() };
  await clear().catch(() => undefined);
  await adapter
    .set(markerKey(owner), crypto.randomUUID())
    .catch(() => undefined);
  void refreshLab(true).catch(() => undefined);
  updated(owner);
  return result;
}
