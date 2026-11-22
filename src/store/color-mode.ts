import { currentUser } from ".";
import { LocalStorageAdapter } from "./adapter";

export type ColorMode = "light" | "dark";
const adapter = new LocalStorageAdapter();
const key = (id: string) => `csl:color-mode:${id}`;
const deviceKey = "csl:color-mode:device";
const modes = new Map<string, ColorMode>();
const watched = new Set<string>();
export const getColorMode = (id: string): ColorMode => modes.get(id) ?? "light";
function applyMode(id: string, mode: ColorMode) {
  modes.set(id, mode);
  if (currentUser()?.id !== id) return;
  if (document.documentElement.dataset.colorMode !== mode)
    document.documentElement.dataset.colorMode = mode;
  void adapter
    .transaction([deviceKey], (tx) => {
      if (currentUser()?.id === id && tx.get(deviceKey) !== mode)
        tx.set(deviceKey, mode);
    })
    .catch(() => undefined);
  window.dispatchEvent(
    new CustomEvent("csl:color-mode", { detail: { id, mode } }),
  );
}
export async function loadDeviceColorMode(): Promise<ColorMode> {
  const raw = await adapter.get<unknown>(deviceKey);
  return raw === "dark" ? "dark" : "light";
}
export async function loadColorMode(id: string) {
  if (currentUser()?.id !== id) return "light" as const;
  if (!watched.has(id)) {
    watched.add(id);
    adapter.subscribe(key(id), (value) =>
      applyMode(id, value === "dark" ? "dark" : "light"),
    );
  }
  if (modes.has(id)) {
    const mode = getColorMode(id);
    applyMode(id, mode);
    return mode;
  }
  const raw = await adapter.get<unknown>(key(id));
  if (raw !== undefined && raw !== "light" && raw !== "dark")
    adapter.quarantine(raw);
  const mode =
    modes.get(id) ??
    (raw === "dark" || raw === "light" ? raw : await loadDeviceColorMode());
  applyMode(id, mode);
  return mode;
}
export async function saveColorMode(id: string, mode: ColorMode) {
  if (currentUser()?.id !== id || !["light", "dark"].includes(mode))
    throw new Error("Open your own profile to change the display mode.");
  await adapter.transaction([key(id), deviceKey], (tx) => {
    if (currentUser()?.id !== id)
      throw new Error("Your account changed. Open your own profile again.");
    tx.set(key(id), mode);
    tx.set(deviceKey, mode);
  });
  if (currentUser()?.id === id) applyMode(id, mode);
}
