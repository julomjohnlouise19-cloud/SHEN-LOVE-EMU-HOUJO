import { currentUser } from ".";
import { LocalStorageAdapter } from "./adapter";
import { cloudEnabled, cloudUserId, platformVersion } from "./cloud";
import { platformRequest } from "./platform";
import {
  defaultAppearance,
  isAppearance,
  type Appearance,
} from "../core/appearance";
const adapter = new LocalStorageAdapter();
const cache = new Map<string, Appearance>();
const pending = new Map<string, Promise<Appearance>>();
const key = (id: string) => `csl:appearance:${id}`;
export function getAppearance(id: string) {
  return cache.get(id) ?? { ...defaultAppearance };
}
export async function loadAppearance(id: string): Promise<Appearance> {
  if (cache.has(id)) return cache.get(id)!;
  if (pending.has(id)) return pending.get(id)!;
  const task = (async () => {
    let value = await adapter.get<unknown>(key(id));
    if (cloudEnabled && cloudUserId() === id && platformVersion() >= 3)
      value = await platformRequest("csl_preferences").catch(() => value);
    const valid = isAppearance(value) ? value : { ...defaultAppearance };
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
export async function saveAppearance(id: string, value: Appearance) {
  if (currentUser()?.id !== id)
    throw new Error("Sign in to personalize your own lab.");
  const valid = { ...value, bio: value.bio.trim() };
  if (!isAppearance(valid))
    throw new Error(
      "Choose a lab color and an introduction of up to 160 characters.",
    );
  if (cloudEnabled && id !== "guest" && platformVersion() >= 3)
    await platformRequest("csl_preferences", {
      p_theme: valid.theme,
      p_bio: valid.bio,
    });
  if (currentUser()?.id !== id)
    throw new Error("Your account changed. Please sign in again.");
  await adapter.set(key(id), valid);
  cache.set(id, valid);
  window.dispatchEvent(
    new CustomEvent("csl:appearance", { detail: { id, ...valid } }),
  );
}
window.addEventListener("csl:platform", () => {
  if (!cloudUserId()) {
    cache.clear();
    pending.clear();
  }
});
