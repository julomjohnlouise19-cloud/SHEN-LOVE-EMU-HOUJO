import { subscribe } from "../store";
import {
  cachedCalendar,
  refreshCalendarIfNeeded,
} from "../store/daily-calendar";
import { button, h, toast } from "./dom";
import { icon } from "./svg";

function paintRewards() {
  const controls = document.querySelectorAll<HTMLButtonElement>(
    "[data-daily-rewards-button]",
  );
  if (!controls.length) return;
  const calendar = cachedCalendar();
  const ready = !!(calendar && calendar.student && calendar.eligible);
  const claimed = !!(
    calendar &&
    calendar.claims.some((c) => c.claim_date === calendar.server_day)
  );
  const state = ready ? "ready" : claimed ? "claimed" : "idle";
  const label = `Daily rewards${ready ? ", reward ready" : claimed ? ", claimed today" : ""}`;
  for (const control of controls) {
    control.dataset.rewardState = state;
    control.setAttribute("aria-label", label);
    control.title = label;
    const badge = control.querySelector<HTMLElement>(".reward-button-badge");
    if (badge) {
      badge.hidden = !ready && !claimed;
      badge.replaceChildren(ready ? icon("star", 10) : icon("check", 10));
    }
  }
}
async function refreshRewards() {
  if (!document.querySelector("[data-daily-rewards-button]") || document.hidden)
    return;
  await refreshCalendarIfNeeded().catch(() => undefined);
  paintRewards();
}
window.addEventListener("csl:daily-calendar-status", paintRewards);
window.addEventListener("csl:daily-calendar", () => void refreshRewards());
window.addEventListener("csl:platform", () => {
  paintRewards();
  void refreshRewards();
});
window.addEventListener("csl:daily-tick", () => void refreshRewards());
window.addEventListener("focus", () => void refreshRewards());
document.addEventListener("visibilitychange", () => void refreshRewards());
subscribe(() => {
  paintRewards();
  void refreshRewards();
});

export function dailyRewardsButton() {
  const control = button(
    h(
      "span",
      { class: "reward-button-inner" },
      h(
        "span",
        { class: "reward-button-art" },
        icon("gift", 20),
        h("span", {
          class: "reward-button-badge",
          "aria-hidden": true,
          hidden: true,
        }),
      ),
      h("span", { class: "reward-button-label" }, "Daily rewards"),
    ),
    async () => {
      const module = await import("./daily-calendar");
      void module
        .dailyRewardsModal(control)
        .catch((error) =>
          toast(
            error instanceof Error
              ? error.message
              : "Close and reopen your daily rewards.",
          ),
        );
    },
    "icon-button rewards-button",
    {
      "aria-label": "Daily rewards",
      "aria-haspopup": "dialog",
      "data-daily-rewards-button": true,
    },
  );
  queueMicrotask(() => {
    paintRewards();
    void refreshRewards();
  });
  return control;
}
