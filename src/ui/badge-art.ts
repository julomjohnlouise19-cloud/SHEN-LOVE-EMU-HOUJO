import type { LearningBadge } from "../core/growth";
import { h } from "./dom";
import { icon } from "./svg";

// One transparent, shared asset keeps the supplied science buddies together.
// Cropping is a CSS viewport: the original edited artwork stays intact.
const crops = [
  [19, 117, 425, 485],
  [461, 106, 373, 516],
  [847, 130, 441, 468],
  [1288, 122, 448, 460],
  [1738, 122, 424, 473],
] as const;

export function scienceBuddy(index: number) {
  const [x, y, width, height] = crops[index] ?? crops[0];
  const maximum = Math.max(width, height);
  const w = (width / maximum) * 100,
    hgt = (height / maximum) * 100;
  return h(
    "span",
    { class: "growth-buddy", "aria-hidden": true },
    h(
      "span",
      {
        class: "growth-buddy-crop",
        style: {
          width: `${w}%`,
          height: `${hgt}%`,
          left: `${(100 - w) / 2}%`,
          top: `${(100 - hgt) / 2}%`,
        },
      },
      h("img", {
        src: `${import.meta.env.BASE_URL}badge-buddies/science-buddies.webp`,
        alt: "",
        width: 2172,
        height: 724,
        loading: "lazy",
        decoding: "async",
        style: {
          width: `${(2172 / width) * 100}%`,
          left: `${(-x / width) * 100}%`,
          top: `${(-y / height) * 100}%`,
        },
      }),
    ),
  );
}

export function titleBuddy(level: number) {
  return scienceBuddy(level >= 20 ? 4 : level >= 10 ? 2 : level >= 5 ? 1 : 3);
}

export function badgeArtwork(
  badge: Pick<LearningBadge, "id" | "icon" | "earned" | "topicId" | "branch">,
  size = "",
) {
  const milestones: Record<string, number> = {
    "first-deck": 0,
    "ten-right": 1,
    "perfect-easy": 2,
    "week-streak": 3,
    "perfect-deck": 4,
    "activity:first": 0,
    "activity:match": 2,
    "activity:words": 1,
    "activity:cards": 1,
    "activity:planets": 0,
    "activity:branches": 3,
    "activity:all": 4,
  };
  const topics: Record<string, number> = {
    life: 3,
    chemistry: 1,
    physics: 2,
    earth: 0,
    skills: 4,
  };
  const index = badge.topicId
    ? topics[badge.branch ?? "life"]
    : milestones[badge.id];
  return h(
    "span",
    {
      class: `growth-badge-medal buddy-medal ${size} ${badge.earned ? "is-earned" : "is-growing"}`,
      "aria-hidden": true,
    },
    scienceBuddy(index ?? 0),
    h(
      "span",
      { class: "growth-badge-emblem" },
      icon(badge.icon, size === "large" ? 23 : 16),
    ),
  );
}
