import { currentUser } from ".";
import { LocalStorageAdapter } from "./adapter";
import { cloudEnabled, cloudUserId, platformVersion } from "./cloud";
import { platformRequest } from "./platform";
import {
  defaultAppearance,
  isAppearance,
  type Appearance,
  type ThemeId,
} from "../core/appearance";
const adapter = new LocalStorageAdapter();
const cache = new Map<string, Appearance>();
const pending = new Map<string, Promise<Appearance>>();
const writes = new Map<string, Promise<void>>();
const watched = new Set<string>();
const revisions = new Map<string, number>();
const key = (id: string) => `csl:appearance:${id}`;
function announce(id: string, value: Appearance) {
  revisions.set(id, (revisions.get(id) ?? 0) + 1);
  cache.set(id, value);
  window.dispatchEvent(
    new CustomEvent("csl:appearance", { detail: { id, ...value } }),
  );
}
function assertOwner(id: string) {
  if (
    currentUser()?.id !== id ||
    (cloudEnabled && id !== "guest" && cloudUserId() !== id)
  )
    throw new Error("Sign in to personalize your own lab.");
}
export function getAppearance(id: string) {
  return cache.get(id) ?? { ...defaultAppearance };
}
export async function loadAppearance(id: string): Promise<Appearance> {
  if (!watched.has(id)) {
    watched.add(id);
    adapter.subscribe(key(id), (value) => {
      if (isAppearance(value) && currentUser()?.id === id) announce(id, value);
    });
  }
  if (cache.has(id)) return cache.get(id)!;
  if (pending.has(id)) return pending.get(id)!;
  const revision = revisions.get(id) ?? 0;
  const task = (async () => {
    let value = await adapter.get<unknown>(key(id));
    if (cloudEnabled && cloudUserId() === id && platformVersion() >= 3)
      value = await platformRequest("csl_preferences").catch(() => value);
    const valid = isAppearance(value) ? value : { ...defaultAppearance };
    if ((revisions.get(id) ?? 0) !== revision)
      return cache.get(id) ?? { ...defaultAppearance };
    if (currentUser()?.id === id) cache.set(id, valid);
    return valid;
  })();
  pending.set(id, task);
  try {
    return await task;
  } finally {
    pending.delete(id);
  }
}
async function persist(id: string, valid: Appearance) {
  assertOwner(id);
  if (!isAppearance(valid))
    throw new Error(
      "Choose a lab color and an introduction of up to 160 characters.",
    );
  if (cloudEnabled && id !== "guest" && platformVersion() >= 3)
    await platformRequest("csl_preferences", {
      p_theme: valid.theme,
      p_bio: valid.bio,
    });
  assertOwner(id);
  await adapter.transaction([key(id)], (tx) => {
    assertOwner(id);
    tx.set(key(id), valid);
  });
  assertOwner(id);
  announce(id, valid);
}
function queue(id: string, change: (saved: Appearance) => Appearance) {
  assertOwner(id);
  const task = (writes.get(id) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      assertOwner(id);
      const saved = await loadAppearance(id);
      assertOwner(id);
      await persist(id, change(saved));
    });
  writes.set(id, task);
  void task
    .finally(() => {
      if (writes.get(id) === task) writes.delete(id);
    })
    .catch(() => undefined);
  return task;
}
export function saveAppearance(id: string, value: Appearance) {
  const snapshot = { ...value, bio: value.bio.trim() };
  return queue(id, () => snapshot);
}
export function saveTheme(id: string, theme: ThemeId) {
  return queue(id, (saved) => ({ ...saved, theme }));
}
window.addEventListener("csl:platform", () => {
  if (!cloudUserId()) {
    for (const id of new Set([...cache.keys(), ...pending.keys()]))
      revisions.set(id, (revisions.get(id) ?? 0) + 1);
    cache.clear();
    pending.clear();
  }
});
