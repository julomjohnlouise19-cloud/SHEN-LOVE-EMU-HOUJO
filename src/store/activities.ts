import { currentUser } from ".";
import { LocalStorageAdapter } from "./adapter";
import type { ActivityKind } from "../core/activities";
import type { BranchId } from "../core/types";
import {
  applyActivity,
  initialActivities,
  validActivities,
  type ActivityCommand,
  type ActivityProgress,
} from "../core/activities";

const adapter = new LocalStorageAdapter();
const key = (id: string) => `csl:activities:${id}`;
const subscribed = new Set<string>();
export async function loadActivities(id: string): Promise<ActivityProgress> {
  if (currentUser()?.id !== id)
    throw new Error("Open your own discovery passport after signing in.");
  if (!subscribed.has(id)) {
    subscribed.add(id);
    adapter.subscribe(key(id), () =>
      window.dispatchEvent(new CustomEvent("csl:activities", { detail: id })),
    );
  }
  const stored = await adapter.get<unknown>(key(id));
  if (validActivities(stored, id)) return stored;
  if (stored !== undefined) {
    adapter.quarantine(stored);
    await adapter.transaction([key(id)], (tx) => {
      if (!validActivities(tx.get(key(id)), id))
        tx.set(key(id), initialActivities(id));
    });
    window.dispatchEvent(
      new CustomEvent("csl:recovery", {
        detail:
          "Your discovery passport needed repair. A recovery copy was kept; your classroom account and quiz records are safe.",
      }),
    );
  }
  return initialActivities(id);
}
export async function activityAction(command: ActivityCommand) {
  const actor = currentUser();
  if (!actor) throw new Error("Sign in to continue your discovery.");
  return adapter.transaction([key(actor.id)], (tx) => {
    if (currentUser()?.id !== actor.id)
      throw new Error("Your account changed. Open your own passport again.");
    const raw = tx.get<unknown>(key(actor.id));
    if (raw !== undefined && !validActivities(raw, actor.id))
      throw new Error("Reopen this activity to recover your saved passport.");
    const previous = validActivities(raw, actor.id)
      ? raw
      : initialActivities(actor.id);
    const result = applyActivity(previous, actor, command, Date.now());
    tx.set(key(actor.id), result.patch);
    return result;
  });
}
export function newActivity(kind: ActivityKind, topic: BranchId) {
  return activityAction({
    type: "Begin",
    kind,
    topic,
    id: crypto.randomUUID(),
    seed: crypto.getRandomValues(new Uint32Array(1))[0],
  });
}
