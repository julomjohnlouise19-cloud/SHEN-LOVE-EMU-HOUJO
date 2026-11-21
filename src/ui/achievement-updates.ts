import type { DomainEvent, Notification } from "../core/types";
import { learningBadges } from "../core/growth";
import { currentUser, getState } from "../store";
import { learningToday } from "./learning-day";
import { h, button, toast } from "./dom";
import { icon } from "./svg";
import { badgeArtwork } from "./badge-art";
import { go } from "./actions";

export function announceAchievements(
  events: readonly DomainEvent[],
  owner: string,
) {
  if (currentUser()?.id !== owner || document.hidden) return;
  const earned = events.filter(
    (event) => event.type === "BadgeEarned" && event.actor === owner,
  );
  if (!earned.length) return;
  const state = getState();
  const badges = learningBadges(
    currentUser()!,
    state.runs,
    learningToday(),
  ).filter((badge) => earned.some((event) => event.data?.badgeId === badge.id));
  if (!badges.length) return;
  document
    .querySelectorAll("#toasts .achievement-toast-copy")
    .forEach((node) => node.closest(".toast")?.remove());
  toast(
    h(
      "span",
      { class: "achievement-toast-copy" },
      badgeArtwork(badges[0]),
      h(
        "span",
        null,
        h(
          "strong",
          null,
          badges.length === 1
            ? "A new badge bloomed!"
            : badges.length + " new badges bloomed!",
        ),
        h("span", null, badges.map((badge) => badge.name).join(" · ")),
      ),
    ),
    { text: "My badges", run: () => go("/growth") },
  );
}
export function savedNotificationList(
  notices: readonly Notification[],
  close: () => void,
) {
  const state = getState(),
    owner = currentUser()!.id;
  const badges = learningBadges(currentUser()!, state.runs, learningToday());
  const list = h("div", { class: "notice-list", role: "list" });
  const count = h("p", { class: "saved-update-count", role: "status" });
  let achievementsOnly = false;
  const all = button(
    "All updates",
    () => {
      achievementsOnly = false;
      render();
    },
    "button outline",
    { "aria-pressed": true },
  );
  const achievements = button(
    "Achievements",
    () => {
      achievementsOnly = true;
      render();
    },
    "button outline",
    { "aria-pressed": false },
  );
  function eventFor(notice: Notification) {
    return state.events.find(
      (event) =>
        event.id === notice.id &&
        event.actor === owner &&
        ["BadgeEarned", "LevelUp"].includes(event.type),
    );
  }
  function render() {
    if (currentUser()?.id !== owner) return;
    all.setAttribute("aria-pressed", String(!achievementsOnly));
    achievements.setAttribute("aria-pressed", String(achievementsOnly));
    const shown = notices.filter(
      (notice) => !achievementsOnly || eventFor(notice),
    );
    list.setAttribute("role", shown.length ? "list" : "group");
    count.textContent =
      shown.length +
      (achievementsOnly ? " saved achievements" : " saved updates");
    list.replaceChildren(
      ...shown.map((notice) => {
        const event = eventFor(notice);
        const badge = badges.find((value) => value.id === event?.data?.badgeId);
        return h(
          "article",
          {
            class:
              "notification saved-notification " +
              (notice.read ? "" : "unread ") +
              (event ? "achievement-notification" : ""),
            role: "listitem",
          },
          badge
            ? badgeArtwork(badge)
            : h(
                "span",
                { class: "saved-notice-icon" },
                icon(event ? "star" : "bell", 24),
              ),
          h(
            "div",
            { class: "saved-notice-copy" },
            h(
              "p",
              { class: "saved-notice-kind" },
              event?.type === "BadgeEarned"
                ? "BADGE EARNED"
                : event?.type === "LevelUp"
                  ? "YOUR NEXT LEVEL"
                  : "LAB UPDATE",
              !notice.read
                ? h("span", { class: "saved-notice-new" }, "New")
                : null,
            ),
            h("p", null, notice.text),
            h(
              "time",
              { datetime: new Date(notice.time).toISOString() },
              new Date(notice.time).toLocaleString("en-PH", {
                timeZone: state.rules.timezone,
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
            ),
            event
              ? button(
                  "Visit my growth garden",
                  () => {
                    close();
                    go("/growth");
                  },
                  "text-button",
                  {
                    "aria-label":
                      "View " +
                      (badge?.name ?? "my level") +
                      " in my growth garden",
                  },
                )
              : null,
          ),
        );
      }),
    );
    if (!shown.length)
      list.append(
        h(
          "div",
          { class: "saved-updates-empty" },
          icon("sprout", 28),
          h("p", null, "A little room for your next discovery."),
          h(
            "p",
            null,
            "New badges and levels appear here as you learn. Your saved updates stay with this account on this device.",
          ),
        ),
      );
  }
  render();
  return h(
    "section",
    { class: "saved-lab-updates", "aria-label": "Saved lab updates" },
    h("h3", null, "Your little milestones & updates"),
    h("div", { class: "saved-update-filters" }, all, achievements),
    count,
    list,
  );
}
