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
import { h, button, toast } from "./dom";
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
    error = "";
  const isOwner = () => currentUser()?.id === user.id;
  async function reload() {
    if (!isOwner() || fetching || busy || !classWheelReady()) return;
    fetching = true;
    try {
      wheel = await loadClassWheel(true);
      error = "";
    } catch (failure) {
      error =
        failure instanceof Error
          ? failure.message
          : "Your daily wheel could not be loaded.";
    } finally {
      fetching = false;
      if (isOwner() && root.isConnected) render();
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
    const action = button(
      busy
        ? animating
          ? "Finding your daily discovery…"
          : "Saving your class reward…"
        : receipt
          ? "Today’s reward is saved"
          : "Spin for class credits",
      async () => {
        if (busy || !wheel || !wheel.eligible) return;
        busy = true;
        error = "";
        render();
        try {
          const result = await claimClassWheel(wheel);
          if (!isOwner()) return;
          wheel = result.wheel;
          animating = result.receipt.claim_date === wheel.server_day;
          render();
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1600,
            ),
          );
          if (isOwner())
            toast(
              result.already_claimed
                ? "Your daily wheel reward is already saved."
                : result.awarded + " class credits saved to your wallet.",
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
          if (isOwner() && root.isConnected) render();
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
            receipt
              ? "Today’s class reward is saved"
              : guest
                ? "Sign in for your daily class reward"
                : ready
                  ? wheel
                    ? wheel.student
                      ? "Your daily class reward is ready"
                      : "Student reward preview"
                    : "Loading your class reward…"
                  : "Your teacher is preparing class rewards",
          ),
          h(
            "h2",
            null,
            receipt
              ? receipt.credits + " class credits saved"
              : "A little science. A shared reward.",
          ),
          h("p", { class: "muted" }, facts[slot]),
          guest
            ? button(
                "Sign in to spin",
                () => authModal(),
                "button primary full",
              )
            : action,
          error ? h("p", { class: "form-error", role: "alert" }, error) : null,
          !guest && ready
            ? button("Refresh wheel", () => reload(), "button outline", {
                disabled: busy || fetching,
              })
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
          h(
            "p",
            { class: "fine-print" },
            receipt
              ? "Next spin: " + addDays(today, 1) + " at midnight · " + tz
              : guest
                ? "Use your verified classroom account to collect a reward in your shared wallet."
                : ready
                  ? "Class credits are saved to your account and can be used in the supply shop. Refreshing keeps the same saved reward."
                  : "The class-credit wheel opens after your teacher activates shared daily rewards.",
          ),
          receipt && !busy
            ? h(
                "section",
                {
                  class: "spin-discovery-card paper",
                  "aria-label": "Your daily discovery",
                },
                h(
                  "span",
                  { class: "eyebrow" },
                  "A LITTLE WONDER TO TAKE WITH YOU",
                ),
                h("strong", null, receipt.credits + " class credits saved"),
                h("p", null, facts[receipt.slot]),
                h(
                  "div",
                  { class: "spin-next-actions" },
                  button(
                    "Visit the supply shop",
                    () => go("/shop"),
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
                  "Saved to your classroom wallet. Your daily receipt stays here after a refresh.",
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
