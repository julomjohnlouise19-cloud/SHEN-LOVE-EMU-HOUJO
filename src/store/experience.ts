import { currentUser } from ".";
import { LocalStorageAdapter } from "./adapter";
import { activityAction, loadActivities } from "./activities";

export type MotionStyle = "system" | "reduce";
const adapter = new LocalStorageAdapter();
const key = (id: string) => `csl:motion:${id}`;
const motion = new Map<string, MotionStyle>();
const sounds = new Map<string, boolean>();
const watched = new Set<string>();
const media = matchMedia("(prefers-reduced-motion: reduce)");
export const getMotionStyle = (id: string): MotionStyle =>
  motion.get(id) ?? "system";
export const soundEnabled = (id: string) => sounds.get(id) ?? false;
export const reducedMotion = () =>
  media.matches || getMotionStyle(currentUser()?.id ?? "") === "reduce";
export function applyExperience() {
  document.documentElement.dataset.motion = reducedMotion() ? "reduce" : "full";
  window.dispatchEvent(
    new CustomEvent("csl:experience", { detail: currentUser()?.id }),
  );
}
media.addEventListener("change", applyExperience);

export async function loadExperience(id: string) {
  if (currentUser()?.id !== id) return;
  if (!watched.has(id)) {
    watched.add(id);
    adapter.subscribe(key(id), (raw) => {
      motion.set(id, raw === "reduce" ? "reduce" : "system");
      if (currentUser()?.id === id) applyExperience();
    });
  }
  const [raw, progress] = await Promise.all([
    adapter.get<unknown>(key(id)),
    loadActivities(id),
  ]);
  if (currentUser()?.id !== id) return;
  if (raw !== undefined && raw !== "reduce" && raw !== "system")
    adapter.quarantine(raw);
  motion.set(id, raw === "reduce" ? "reduce" : "system");
  sounds.set(id, progress.sound);
  applyExperience();
}
window.addEventListener("csl:activities", (event) => {
  const id = (event as CustomEvent<string>).detail;
  if (currentUser()?.id !== id) return;
  void loadActivities(id)
    .then((progress) => {
      if (currentUser()?.id !== id) return;
      sounds.set(id, progress.sound);
      applyExperience();
    })
    .catch(() => undefined);
});
export async function saveSound(id: string, enabled: boolean) {
  if (currentUser()?.id !== id)
    throw new Error("Open your own sound settings again.");
  await activityAction({ type: "Sound", enabled });
  if (currentUser()?.id !== id) return;
  sounds.set(id, enabled);
  applyExperience();
}
export async function saveMotion(id: string, style: MotionStyle) {
  if (currentUser()?.id !== id || !["system", "reduce"].includes(style))
    throw new Error("Open your own animation settings again.");
  await adapter.transaction([key(id)], (tx) => {
    if (currentUser()?.id !== id)
      throw new Error("Your account changed. Open your own settings again.");
    tx.set(key(id), style);
  });
  motion.set(id, style);
  if (currentUser()?.id === id) applyExperience();
}
