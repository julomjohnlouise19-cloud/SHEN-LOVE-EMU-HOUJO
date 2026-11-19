import { learningGrowth, learningBadges } from "../core/growth";
import { dayKey } from "../core/time";
import { currentUser, getState, clock } from "../store";
import { h, progress } from "./dom";
import { icon } from "./svg";

export function growthShortcut() {
  const user = currentUser()!,
    state = getState();
  const growth = learningGrowth(user, state.rules);
  const badges = learningBadges(
    user,
    state.runs,
    dayKey(clock, state.rules.timezone),
  );
  return h(
    "section",
    { class: "growth-shortcut paper", "aria-label": "Your scientist growth" },
    h("span", { class: "growth-shortcut-icon" }, icon(growth.title.icon, 28)),
    h(
      "div",
      { class: "growth-shortcut-copy" },
      h("p", { class: "eyebrow" }, "YOUR SCIENTIST JOURNEY"),
      h("h2", null, growth.title.name),
      h(
        "p",
        null,
        `Level ${growth.level} · ${growth.remainingXP} XP to your next level · ${badges.filter((badge) => badge.earned).length} badges earned`,
      ),
      progress(growth.percent, "Your learning level"),
    ),
    h(
      "a",
      { href: "#/growth", class: "button outline" },
      "Visit my growth garden",
      icon("arrow", 16),
    ),
  );
}

export function growthCelebration(runId: string, questionId?: string) {
  const user = currentUser()!,
    state = getState();
  const events = state.events.filter(
    (event) =>
      event.actor === user.id &&
      event.data?.runId === runId &&
      (!questionId || event.data?.questionId === questionId),
  );
  const ids = new Set(
    events
      .filter((event) => event.type === "BadgeEarned")
      .map((event) => event.data?.badgeId),
  );
  const badges = learningBadges(
    user,
    state.runs,
    dayKey(clock, state.rules.timezone),
  ).filter((badge) => ids.has(badge.id));
  const levels = events.filter((event) => event.type === "LevelUp");
  if (!badges.length && !levels.length) return null;
  const growth = learningGrowth(user, state.rules);
  return h(
    "section",
    { class: "growth-celebration", "aria-label": "Your learning milestones" },
    h("p", { class: "eyebrow" }, icon("sparkles", 18), "YOUR GARDEN GREW"),
    levels.length
      ? h("strong", null, `Level ${growth.level} · ${growth.title.name}`)
      : null,
    ...badges.map((badge) =>
      h(
        "p",
        { class: "growth-unlock" },
        icon(badge.icon, 18),
        h("span", null, "Badge earned: ", h("strong", null, badge.name)),
      ),
    ),
    h(
      "a",
      { href: "#/growth", class: "growth-text-link" },
      "See my growth garden",
      icon("arrow", 16),
    ),
  );
}
