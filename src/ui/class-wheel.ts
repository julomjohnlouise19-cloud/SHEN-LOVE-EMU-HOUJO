import { currentUser, getState } from "../store";
import {
  cachedClassWheel,
  classWheelReady,
  loadClassWheel,
  claimClassWheel,
} from "../store/daily-wheel";
import { dayKey, addDays } from "../core/time";
import { hashSeed } from "../core/random";
import type { ClassWheel } from "../core/daily-wheel";
import { h, button } from "./dom";
import { dailyWheel } from "./daily-wheel";
import { pageHeading } from "./shell";
import { mascot, icon } from "./svg";
import { authModal } from "./auth";
import { go } from "./actions";

const facts = [
  "Plants use light to make sugars.",
  "Gravity helps keep planets in orbit.",
  "Sound is a vibration traveling through matter.",
  "Atoms are rearranged in a chemical reaction.",
  "Biodiversity makes ecosystems rich in connections.",
  "The water cycle is driven by energy from the Sun.",
];
let mounted:
  { owner: string; node: HTMLElement; reload: () => Promise<void> } | undefined;
window.addEventListener("csl:daily-wheel", (event) => {
  if (
    mounted?.node.isConnected &&
    mounted.owner === (event as CustomEvent).detail
  )
    void mounted.reload();
});
window.addEventListener("focus", () => {
  if (mounted?.node.isConnected) void mounted.reload();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && mounted?.node.isConnected) void mounted.reload();
});
setInterval(() => {
  if (!document.hidden && mounted?.node.isConnected) void mounted.reload();
}, 60000);

export function classWheelPage() {
  const user = currentUser()!;
  const root = h("div", { class: "page-enter spin-page class-wheel-page" });
  let wheel: ClassWheel | undefined = cachedClassWheel();
  let busy = false,
    animating = false,
    fetching = false,
    error = "",
    notice = "";
  const isOwner = () => currentUser()?.id === user.id;
  async function reload() {
    if (!isOwner() || fetching || busy || !classWheelReady()) return;
    fetching = true;
    let changed = false;
    try {
      const fresh = await loadClassWheel(true);
      changed = JSON.stringify(wheel) !== JSON.stringify(fresh) || !!error;
      wheel = fresh;
      error = "";
    } catch (failure) {
      const message =
        failure instanceof Error
          ? failure.message
          : "Your daily wheel could not be loaded.";
      changed = error !== message;
      error = message;
    } finally {
      fetching = false;
      if (changed && isOwner() && root.isConnected) render();
    }
  }
  function render() {
    if (!isOwner()) return;
    const guest = user.id === "guest";
    const ready = classWheelReady();
    const receipt = wheel?.receipt;
    const today =
      wheel?.server_day ??
      dayKey({ now: () => Date.now() }, getState().rules.timezone);
    const tz = wheel?.timezone ?? getState().rules.timezone;
    const slot = receipt?.slot ?? hashSeed(today) % 6;
    const eligible = !!wheel?.eligible && ready;
    const nextDay = addDays(today, 1);
    const nextDate = new Intl.DateTimeFormat("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(nextDay + "T12:00:00Z"));
    root.classList.toggle("has-daily-receipt", !!receipt && !busy);
    const action = button(
      busy
        ? animating
          ? "Finding your daily discovery…"
          : "Saving your class reward…"
        : "Spin for class credits",
      async () => {
        if (busy || !wheel || !wheel.eligible) return;
        busy = true;
        error = "";
        notice = "";
        render();
        try {
          const result = await claimClassWheel(wheel);
          if (!isOwner()) return;
          wheel = result.wheel;
          notice =
            result.receipt.claim_date !== wheel.server_day
              ? "Your earlier spin is saved. Today’s spin is ready."
              : "";
          animating = result.receipt.claim_date === wheel.server_day;
          render();
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1600,
            ),
          );
        } catch (failure) {
          if (isOwner())
            error =
              failure instanceof Error
                ? failure.message
                : "Your reward could not be saved. Please try again.";
        } finally {
          busy = false;
          animating = false;
          if (isOwner() && root.isConnected) {
            render();
            root
              .querySelector<HTMLElement>(".wheel-reward-title")
              ?.focus({ preventScroll: true });
          }
        }
      },
      "button primary full",
      { disabled: busy || !eligible, "aria-busy": busy },
    );
    root.replaceChildren(
      pageHeading(
        "A DAILY DOSE OF HAPPY SCIENCE",
        "A little spin. A little wonder.",
        "One free class-credit reward each classroom day · " + tz,
      ),
      h(
        "div",
        { class: "spin-layout paper" },
        h(
          "div",
          { class: "wheel-side" },
          dailyWheel(animating, !!receipt, slot),
          h(
            "p",
            { class: "fine-print" },
            "Up to " +
              (wheel?.maximum ?? getState().rules.spinMax) +
              " class credits · Free daily spin",
          ),
        ),
        h(
          "div",
          { class: "spin-copy" },
          mascot("pudding"),
          h(
            "span",
            { class: "eyebrow" },
            "PUDDING’S CLASSROOM DISCOVERY WHEEL",
          ),
          h(
            "span",
            {
              class: "spin-availability " + (receipt ? "collected" : ""),
              role: "status",
            },
            icon(receipt ? "check" : "sparkles", 15),
            busy
              ? "Finding your daily discovery…"
              : receipt
                ? "Today’s spin is complete"
                : guest
                  ? "Sign in for your daily class reward"
                  : ready
                    ? wheel
                      ? wheel.student
                        ? "Your daily class reward is ready"
                        : "Student reward preview"
                      : error
                        ? "Your daily spin needs a connection"
                        : "Loading your class reward…"
                    : "Your teacher is preparing class rewards",
          ),
          !receipt || busy
            ? h("h2", null, "A little science. A shared reward.")
            : null,
          !receipt ? h("p", { class: "muted" }, facts[slot]) : null,
          guest
            ? button(
                "Sign in to spin",
                () => authModal(),
                "button primary full",
              )
            : !receipt || busy
              ? action
              : null,
          notice
            ? h("p", { class: "wheel-saved-notice", role: "status" }, notice)
            : null,
          error ? h("p", { class: "form-error", role: "alert" }, error) : null,
          error && !guest && ready
            ? button(
                "Try again",
                () => reload(),
                "button outline wheel-retry",
                {
                  disabled: busy || fetching,
                },
              )
            : null,
          !ready && !guest && user.role === "admin"
            ? h(
                "a",
                {
                  class: "button outline",
                  href: "https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/blob/main/docs/DAILY_WHEEL_SETUP.md",
                  target: "_blank",
                  rel: "noopener noreferrer",
                },
                "Activate class-credit wheel",
              )
            : null,
          !receipt
            ? h(
                "p",
                { class: "fine-print" },
                guest
                  ? "Use your verified classroom account to collect a reward in your shared wallet."
                  : ready
                    ? "One spin per classroom day. Your result is saved automatically to your account."
                    : "The class-credit wheel opens after your teacher activates shared daily rewards.",
              )
            : null,
          receipt && !busy
            ? h(
                "section",
                {
                  class: "spin-discovery-card paper",
                  "aria-label": "Your daily discovery",
                },
                h(
                  "div",
                  { class: "wheel-discovery-heading" },
                  icon(receipt.credits > 0 ? "gift" : "bulb", 20),
                  h("span", { class: "eyebrow" }, "TODAY’S LITTLE DISCOVERY"),
                ),
                h(
                  "h2",
                  { class: "wheel-reward-title", tabindex: -1 },
                  receipt.credits > 0
                    ? receipt.credits + " class credits saved"
                    : "Today’s discovery is saved",
                ),
                receipt.credits === 0
                  ? h(
                      "p",
                      { class: "wheel-zero-result" },
                      "No class credits this spin. Your balance stays the same.",
                    )
                  : null,
                h("p", { class: "wheel-science-fact" }, facts[receipt.slot]),
                h(
                  "div",
                  { class: "wheel-next-spin" },
                  icon("clock", 20),
                  h(
                    "div",
                    null,
                    h("strong", null, "Next spin"),
                    h("time", { datetime: nextDay }, nextDate),
                    h("small", null, "At midnight · " + tz),
                  ),
                ),
                h(
                  "div",
                  { class: "spin-next-actions" },
                  button(
                    receipt.credits > 0
                      ? "Visit the supply shop"
                      : "Explore Science Island",
                    () => go(receipt.credits > 0 ? "/shop" : "/island"),
                    "button outline",
                  ),
                  button(
                    "Open my notebook",
                    () => go("/notebook"),
                    "button outline",
                  ),
                ),
                h(
                  "small",
                  null,
                  receipt.credits > 0
                    ? "Your credits are in your classroom wallet."
                    : "Your discovery is saved on this account.",
                ),
              )
            : null,
        ),
      ),
    );
  }
  mounted = { owner: user.id, node: root, reload };
  render();
  if (classWheelReady()) void reload();
  return root;
}
