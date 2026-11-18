import { currentUser, getState, clock } from ".";
import { dayKey } from "../core/time";
import { cloudEnabled } from "./cloud";
import {
  cachedClassWheel,
  classWheelReady,
  loadClassWheel,
} from "./daily-wheel";

export function wheelReminderAvailable() {
  const user = currentUser();
  if (cloudEnabled)
    return (
      !!user &&
      user.id !== "guest" &&
      user.role !== "admin" &&
      !!cachedClassWheel()?.eligible
    );
  return !!user && !user.daily[dayKey(clock, getState().rules.timezone)]?.spin;
}
export async function refreshWheelReminder() {
  if (currentUser()?.role === "student" && classWheelReady())
    await loadClassWheel().catch(() => undefined);
}
