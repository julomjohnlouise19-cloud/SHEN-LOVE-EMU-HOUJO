import { currentUser, getState, clock } from ".";
import { dayKey } from "../core/time";
import { learningBadges } from "../core/growth";
import {
  emptyBadgeShowcase,
  readBadgeShowcase,
  updateBadgeShowcase,
  type BadgeShowcase,
} from "../core/badge-showcase";
import { cloudEnabled, cloudUserId } from "./cloud";
import { LocalStorageAdapter } from "./adapter";

const adapter = new LocalStorageAdapter();
const key = (id: string) => `csl:badge-showcase:${id}`;
function assertOwner(id: string) {
  if (
    currentUser()?.id !== id ||
    (cloudEnabled && id !== "guest" && cloudUserId() !== id)
  )
    throw new Error("Your account changed. Open your own profile again.");
}
function read(raw: unknown) {
  const value = readBadgeShowcase(raw);
  if (raw !== undefined && !value) adapter.quarantine(raw);
  return value ?? emptyBadgeShowcase();
}
export async function loadBadgeShowcase(id: string) {
  assertOwner(id);
  const value = read(await adapter.get<unknown>(key(id)));
  assertOwner(id);
  return value;
}
export function watchBadgeShowcase(
  id: string,
  reflect: (value: BadgeShowcase) => void,
) {
  return adapter.subscribe(key(id), (raw) => {
    if (currentUser()?.id === id) reflect(read(raw));
  });
}
export async function saveBadgeShowcase(
  id: string,
  revision: number,
  badges: string[],
) {
  assertOwner(id);
  return adapter.transaction([key(id)], (tx) => {
    assertOwner(id);
    const state = getState();
    const available = learningBadges(
      currentUser()!,
      state.runs,
      dayKey(clock, state.rules.timezone),
    );
    const next = updateBadgeShowcase(
      read(tx.get(key(id))),
      revision,
      badges,
      available,
    );
    tx.set(key(id), next);
    return next;
  });
}
