import { LocalStorageAdapter } from "./adapter";
import { currentUser } from ".";
const adapter = new LocalStorageAdapter();
const key = (id: string, role: string) => `csl:guide:${id}:${role}:1`;
export const hasSeenGuide = (id: string, role: string) =>
  adapter.get<boolean>(key(id, role));
export async function finishGuide(id: string, role: string) {
  if (currentUser()?.id !== id)
    throw new Error("Your account changed. Open the guide again.");
  await adapter.set(key(id, role), true);
}
