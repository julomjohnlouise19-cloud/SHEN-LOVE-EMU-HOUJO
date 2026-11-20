import type { LearningBadge } from "./growth";

export const badgeShowcaseLimit = 3;
export interface BadgeShowcase {
  version: 1;
  revision: number;
  badges: string[];
}
export const emptyBadgeShowcase = (): BadgeShowcase => ({
  version: 1,
  revision: 0,
  badges: [],
});
export function readBadgeShowcase(input: unknown): BadgeShowcase | undefined {
  if (!input || typeof input !== "object") return undefined;
  const value = input as Partial<BadgeShowcase>;
  if (
    value.version !== 1 ||
    !Number.isSafeInteger(value.revision) ||
    value.revision! < 0 ||
    !Array.isArray(value.badges) ||
    value.badges.length > badgeShowcaseLimit ||
    value.badges.some((id) => typeof id !== "string" || id.length > 100) ||
    new Set(value.badges).size !== value.badges.length
  )
    return undefined;
  return { version: 1, revision: value.revision!, badges: [...value.badges] };
}
export function chooseShowcaseBadges(
  chosen: readonly string[],
  available: readonly Pick<LearningBadge, "id" | "earned">[],
): string[] {
  if (chosen.length > badgeShowcaseLimit)
    throw new Error("Choose up to three badges for your shelf.");
  if (new Set(chosen).size !== chosen.length)
    throw new Error("Each badge needs its own little spot.");
  if (
    chosen.some(
      (id) => !available.some((badge) => badge.id === id && badge.earned),
    )
  )
    throw new Error("Choose badges you have earned in your growth garden.");
  return [...chosen];
}
export function updateBadgeShowcase(
  previous: BadgeShowcase,
  revision: number,
  chosen: readonly string[],
  available: readonly Pick<LearningBadge, "id" | "earned">[],
): BadgeShowcase {
  if (previous.revision !== revision)
    throw new Error(
      "Your badges changed in another tab. Use Undo changes to load your saved shelf.",
    );
  if (previous.revision >= Number.MAX_SAFE_INTEGER)
    throw new Error(
      "Your badge shelf could not be saved. Preserve your browser data and reopen your profile.",
    );
  return {
    version: 1,
    revision: previous.revision + 1,
    badges: chooseShowcaseBadges(chosen, available),
  };
}
