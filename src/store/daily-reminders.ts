import { currentUser, getState, clock } from ".";
import { dayKey } from "../core/time";

export function wheelReminderAvailable() {
  const user = currentUser();
  return !!user && !user.daily[dayKey(clock, getState().rules.timezone)]?.spin;
}
