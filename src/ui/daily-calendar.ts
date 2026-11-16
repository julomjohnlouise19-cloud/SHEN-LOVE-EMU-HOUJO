import { currentUser, getState, clock } from "../store";
import { cloudEnabled } from "../store/cloud";
import {
  calendarReady,
  loadCalendar,
  claimCalendar,
  loadCalendarSettings,
  saveCalendarSettings,
} from "../store/daily-calendar";
import { calendarCells, calendarPreview } from "../core/daily-calendar";
import { dayKey } from "../core/time";
import { classCredits } from "../store/platform";
import { h, button, modal, field, input, toast } from "./dom";
import { icon } from "./svg";
import { pageHeading } from "./shell";

const setupLink =
  "https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/blob/main/docs/DAILY_REWARDS_SETUP.md";
const dateLabel = (day: string) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
let mounted:
  | { owner: string; node: HTMLElement; refresh: () => Promise<void> }
  | undefined;
window.addEventListener("csl:daily-calendar", (event) => {
  if (
    mounted?.node.isConnected &&
    mounted.owner === (event as CustomEvent).detail
  )
    void mounted.refresh();
});
window.addEventListener("focus", () => {
  if (mounted?.node.isConnected) void mounted.refresh();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && mounted?.node.isConnected) void mounted.refresh();
});
setInterval(() => {
  if (!document.hidden && mounted?.node.isConnected) void mounted.refresh();
}, 60000);

export async function dailyCalendarPage() {
  const user = currentUser()!;
  if (mounted?.owner === user.id) {
    void mounted.refresh();
    return mounted.node;
  }
  let calendar = calendarPreview(
    dayKey(clock, getState().rules.timezone),
    getState().rules.timezone,
    user.role !== "admin",
  );
  let ready = false,
    busy = false,
    refreshing = false;
  const page = h("div", { class: "daily-calendar-page page-enter" });
  const live = h("p", {
    class: "calendar-live",
    role: "status",
    tabindex: -1,
    hidden: true,
  });
  const body = h("div");
  page.append(
    pageHeading(
      "SEVEN WEEKS OF SHOWING UP",
      "Little habits. Growing rewards.",
      "A 49-day trail of daily class credits. Claim one reward each classroom day and give your curiosity a little boost.",
    ),
    live,
    body,
  );
  function feedback(message: string, error = false) {
    live.hidden = false;
    live.className = `calendar-live ${error ? "is-error" : ""}`;
    live.textContent = message;
  }
  async function refresh() {
    if (busy || refreshing || currentUser()?.id !== user.id || !calendarReady())
      return;
    refreshing = true;
    try {
      const next = await loadCalendar();
      if (currentUser()?.id !== user.id) return;
      const changed =
        JSON.stringify(next) !== JSON.stringify(calendar) || !ready;
      calendar = next;
      ready = true;
      if (changed) draw();
    } catch (error) {
      if (page.isConnected)
        feedback(
          error instanceof Error
            ? error.message
            : "Connect to refresh your calendar.",
          true,
        );
    } finally {
      refreshing = false;
    }
  }
  async function claim() {
    if (busy || !ready || !calendar.eligible || currentUser()?.id !== user.id)
      return;
    busy = true;
    draw();
    try {
      const result = await claimCalendar(calendar);
      if (currentUser()?.id !== user.id || !page.isConnected) return;
      calendar = result.calendar;
      feedback(
        result.awarded
          ? `${result.awarded} class credits claimed! Day ${result.receipt.day_number} is stamped for ${dateLabel(result.receipt.claim_date)}.`
          : `Your reward for ${dateLabel(result.receipt.claim_date)} was already saved. Your credits are safe.`,
      );
    } catch (error) {
      if (currentUser()?.id !== user.id || !page.isConnected) return;
      feedback(
        error instanceof Error
          ? error.message
          : "Reopen the calendar to check your claim, then try again.",
        true,
      );
      await loadCalendar()
        .then((value) => {
          calendar = value;
        })
        .catch(() => undefined);
    } finally {
      busy = false;
      if (page.isConnected && currentUser()?.id === user.id) {
        draw();
        live.focus({ preventScroll: true });
      }
    }
  }
  function openDay(day: ReturnType<typeof calendarCells>[number]) {
    if (day.status === "today" && ready && calendar.eligible) {
      void claim();
      return;
    }
    modal(
      `Day ${day.day} · ${dateLabel(day.date)}`,
      [
        h("p", { class: "eyebrow" }, `WEEK ${day.week} OF 7`),
        h(
          "h3",
          null,
          day.claim
            ? `${day.claim.credits} class credits saved`
            : `${day.credits} class credits`,
        ),
        h(
          "p",
          null,
          !ready
            ? "This is a preview. Your 49-day trail starts with your first successful account claim after the classroom calendar is activated."
            : day.claim
              ? `Your reward was claimed on ${dateLabel(day.claim.claim_date)}. Each day can be claimed once.`
              : day.status === "missed"
                ? "This classroom day has passed. Missed days cannot be claimed later, but the next available day is a fresh chance."
                : day.status === "locked"
                  ? "This reward opens on its classroom date. Future days cannot be claimed early."
                  : !calendar.enabled
                    ? "Your teacher has paused daily claims. Calendar dates continue to move forward."
                    : calendar.student
                      ? "Your reward for this day is already recorded."
                      : "Teachers can preview the calendar. Rewards are for student accounts.",
        ),
      ],
      true,
    );
  }
  function draw() {
    const cells = calendarCells(calendar),
      today = cells.find((c) => c.status === "today"),
      claimedToday = calendar.claims.some(
        (c) => c.claim_date === calendar.server_day,
      );
    const balance = ready ? calendar.balance : classCredits();
    const canClaim = ready && calendar.eligible && !busy;
    const note = !ready
      ? "PREVIEW · YOUR TRAIL IS WAITING"
      : !calendar.student
        ? "TEACHER PREVIEW"
        : !calendar.enabled
          ? "CLAIMS PAUSED"
          : calendar.day_index > 49
            ? "SEVEN WEEKS, WELL EXPLORED"
            : claimedToday
              ? "TODAY'S REWARD IS SAFELY SAVED"
              : `DAY ${calendar.day_index} IS READY`;
    const message = !ready
      ? !cloudEnabled
        ? "Daily class credits are available on the online classroom website. This device-only practice calendar is a preview."
        : user.id === "guest"
          ? "Sign in with a classroom account to begin your daily class-credit trail."
          : calendarReady()
            ? "Connect to refresh your reward calendar. Your saved rewards remain in your account."
            : user.role === "admin"
              ? "Activate the classroom calendar using the setup guide below, then manage daily rewards in Teacher Studio."
              : "Your teacher needs to activate the daily reward calendar. Your existing credits and saved work are safe."
      : !calendar.student
        ? "Explore the seven-week trail your students can follow. Manage rewards in Teacher Studio → Lab settings."
        : !calendar.enabled
          ? "Your teacher has paused new claims. Your saved rewards remain in your class wallet; calendar dates keep moving."
          : calendar.day_index > 49
            ? "Your 49-day trail has ended. Your claimed credits and calendar receipts stay saved."
            : claimedToday
              ? "Come back on the next classroom day for your next little reward."
              : calendar.started_on
                ? "A small daily habit, a little more science. Today's reward is ready for you."
                : "Your first successful claim starts your 49-day calendar. You can claim once on each classroom day.";
    const mainClaim = button(
      busy
        ? "Saving your daily reward…"
        : !ready
          ? "Calendar preview"
          : !calendar.student
            ? "Student rewards preview"
            : !calendar.enabled
              ? "Claims are paused"
              : calendar.day_index > 49
                ? "Calendar complete"
                : claimedToday
                  ? "Claimed today"
                  : `Claim ${today?.credits ?? calendar.daily_credits} class credits`,
      claim,
      "button primary calendar-claim-button",
      { disabled: !canClaim, "aria-busy": busy },
    );
    const grid = h("div", {
      class: "daily-reward-grid",
      role: "grid",
      "aria-label": "Seven-week daily claim calendar",
    });
    const buttons: HTMLButtonElement[] = [];
    for (let week = 1; week <= 7; week++) {
      const row = h("div", {
        class: "calendar-week",
        role: "row",
        "aria-label": `Week ${week}`,
      });
      row.append(
        h(
          "div",
          { class: "calendar-week-number", role: "rowheader" },
          h("small", null, "WEEK"),
          h("strong", null, week),
        ),
      );
      for (const day of cells.filter((c) => c.week === week)) {
        const label =
          day.status === "claimed"
            ? "Claimed"
            : !ready
              ? "Preview"
              : day.status === "today"
                ? "Today"
                : day.status === "missed"
                  ? "Missed"
                  : "Opens later";
        const tile = button(
          h(
            "span",
            { class: "calendar-day-inner" },
            h("small", null, `DAY ${day.day}`),
            h(
              "span",
              { class: "calendar-day-seal", "aria-hidden": true },
              icon(
                day.status === "claimed"
                  ? "check"
                  : day.day % 7 === 0
                    ? "trophy"
                    : "coin",
                22,
              ),
            ),
            h("strong", null, `+${day.credits}`),
            h("span", { class: "calendar-day-date" }, dateLabel(day.date)),
            h("span", { class: "calendar-day-state" }, label),
          ),
          () => openDay(day),
          `calendar-day state-${day.status} ${day.day % 7 === 0 ? "is-weekly" : ""} ${!ready ? "is-preview" : ""}`,
          {
            role: "gridcell",
            tabindex: day.day === Math.min(calendar.day_index, 49) ? 0 : -1,
            "aria-label": `Day ${day.day}, ${dateLabel(day.date)}, ${day.credits} class credits, ${label}`,
            "aria-selected": day.status === "today",
            "data-calendar-day": day.day,
          },
        );
        tile.addEventListener("focus", () =>
          buttons.forEach((node) => {
            node.tabIndex = node === tile ? 0 : -1;
          }),
        );
        buttons.push(tile);
        row.append(tile);
      }
      grid.append(row);
    }
    grid.addEventListener("keydown", (event) => {
      const cell = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-calendar-day]",
      );
      if (!cell) return;
      const index = Number(cell.dataset.calendarDay) - 1;
      const next =
        event.key === "ArrowRight"
          ? Math.min(48, index + 1)
          : event.key === "ArrowLeft"
            ? Math.max(0, index - 1)
            : event.key === "ArrowDown"
              ? Math.min(48, index + 7)
              : event.key === "ArrowUp"
                ? Math.max(0, index - 7)
                : event.key === "Home"
                  ? Math.floor(index / 7) * 7
                  : event.key === "End"
                    ? Math.floor(index / 7) * 7 + 6
                    : undefined;
      if (next === undefined) return;
      event.preventDefault();
      buttons[next]?.focus();
    });
    body.replaceChildren(
      h(
        "section",
        { class: "calendar-hero" },
        h(
          "div",
          { class: "calendar-hero-copy" },
          h(
            "span",
            { class: "calendar-kicker" },
            icon("sprout", 16),
            "A LITTLE DAILY MOMENT",
          ),
          h("h2", null, "Come for the curiosity. Stay for the little wins."),
          h("p", null, message),
          h(
            "div",
            { class: "calendar-summary" },
            h(
              "span",
              null,
              h("strong", null, `${calendar.claims.length}/49`),
              "days claimed",
            ),
            h(
              "span",
              null,
              h(
                "strong",
                { "data-calendar-balance": true },
                balance.toLocaleString(),
              ),
              "class credits",
            ),
            h("span", null, h("strong", null, "7"), "weeks to explore"),
          ),
        ),
        h(
          "div",
          { class: "calendar-today-card" },
          h("p", { class: "eyebrow" }, note),
          h(
            "span",
            { class: "calendar-today-art", "aria-hidden": true },
            icon(claimedToday ? "check" : "calendar", 40),
          ),
          h(
            "h3",
            null,
            ready && calendar.day_index <= 49
              ? `Day ${calendar.day_index} of 49`
              : "One day at a time",
          ),
          h(
            "p",
            null,
            `${calendar.daily_credits} credits each ordinary day · ${calendar.weekly_credits} on every seventh day.`,
          ),
          mainClaim,
          !ready && !cloudEnabled
            ? h(
                "a",
                {
                  href: "https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/#/daily-rewards",
                  class: "button outline",
                  rel: "external noreferrer",
                },
                "Open online classroom",
              )
            : !ready && user.id === "guest"
              ? button(
                  "Sign in to start my calendar",
                  async () => (await import("./auth")).authModal(),
                  "button outline",
                )
              : !ready && user.role === "admin"
                ? h(
                    "a",
                    {
                      href: setupLink,
                      class: "button outline",
                      rel: "external noreferrer",
                    },
                    "Open reward-calendar setup",
                  )
                : null,
        ),
      ),
      h(
        "div",
        { class: "calendar-grid-heading" },
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "YOUR SEVEN-WEEK TRAIL"),
          h("h2", null, "49 small chances to show up"),
        ),
        h("p", null, `${calendar.timezone} · One claim per classroom day`),
      ),
      h(
        "div",
        { class: "calendar-grid-tools" },
        h(
          "p",
          { class: "calendar-pan-hint" },
          "On a phone, swipe sideways to see the whole week. Arrow keys move between days.",
        ),
        button(
          "Show today in the calendar",
          () => {
            const target = buttons[Math.min(calendar.day_index, 49) - 1];
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({
              block: "center",
              inline: "center",
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            });
          },
          "text-button",
        ),
      ),
      h(
        "section",
        {
          class: "calendar-board",
          "aria-label":
            "Daily credit rewards; scroll sideways to see every day",
          tabindex: 0,
        },
        grid,
      ),
      h(
        "div",
        { class: "calendar-legend" },
        ...[
          ["claimed", "Claimed"],
          ["today", "Today"],
          ["locked", "Upcoming"],
          ["missed", "Missed"],
        ].map(([state, label]) =>
          h(
            "span",
            null,
            h("i", { class: `legend-${state}`, "aria-hidden": true }),
            label,
          ),
        ),
      ),
      h(
        "section",
        { class: "calendar-how" },
        h("h2", null, "A few little things to know"),
        h(
          "ol",
          null,
          h(
            "li",
            null,
            "Your first claim starts 49 calendar days. There is no automatic restart when the seven weeks end.",
          ),
          h(
            "li",
            null,
            "Claim today's reward only. Missed days cannot be claimed later, and future days stay locked.",
          ),
          h(
            "li",
            null,
            "Rewards are saved as class credits in your account and can be used in the supply shop. Refreshing or opening another tab does not duplicate a reward.",
          ),
        ),
        h(
          "div",
          null,
          h(
            "a",
            { href: "#/shop", class: "button outline" },
            "Visit the supply shop",
          ),
          h(
            "a",
            { href: "#/spin", class: "button outline" },
            "Visit the daily wheel",
          ),
        ),
      ),
    );
  }
  if (calendarReady()) {
    try {
      calendar = await loadCalendar();
      ready = true;
    } catch (error) {
      feedback(
        error instanceof Error
          ? error.message
          : "Connect to refresh your calendar.",
        true,
      );
    }
  }
  mounted = { owner: user.id, node: page, refresh };
  draw();
  return page;
}

export async function teacherCalendarPanel() {
  const owner = currentUser();
  if (!owner || owner.role !== "admin") return h("div");
  const panel = h("section", {
    class: "teacher-calendar-panel paper",
    "aria-label": "Daily calendar controls",
  });
  if (!calendarReady()) {
    panel.append(
      h("h2", null, "Daily class-credit calendar"),
      h(
        "p",
        null,
        "Activate the seven-week calendar to set rewards and review daily claims.",
      ),
      h(
        "a",
        {
          class: "button outline",
          href: setupLink,
          rel: "external noreferrer",
        },
        "Open reward-calendar setup",
      ),
    );
    return panel;
  }
  let settings = await loadCalendarSettings();
  if (currentUser()?.id !== owner.id) return h("div");
  const enabled = h("input", {
    type: "checkbox",
    checked: settings.enabled,
    "aria-label": "Enable daily claim calendar",
  });
  const daily = input(
    "calendar-daily",
    "",
    String(settings.daily_credits),
    "number",
  );
  daily.min = "1";
  daily.max = "20";
  daily.step = "1";
  const weekly = input(
    "calendar-weekly",
    "",
    String(settings.weekly_credits),
    "number",
  );
  weekly.min = "1";
  weekly.max = "40";
  weekly.step = "1";
  const error = h("p", { class: "form-error", role: "alert" });
  const success = h("p", { class: "calendar-settings-status", role: "status" });
  const totals = h("p", { class: "calendar-teacher-totals" });
  const summary = () => {
    totals.textContent = `${settings.enrolled} calendars started · ${settings.claims_today} claims today · ${settings.credits_awarded} class credits awarded`;
  };
  let fingerprint = "",
    requestId = crypto.randomUUID();
  const save = button(
    "Save calendar settings",
    () => {
      error.textContent = "";
      success.textContent = "";
      const value = {
        enabled: enabled.checked,
        daily: Number(daily.value),
        weekly: Number(weekly.value),
        version: settings.version,
      };
      if (
        !Number.isInteger(value.daily) ||
        value.daily < 1 ||
        value.daily > 20 ||
        !Number.isInteger(value.weekly) ||
        value.weekly < value.daily ||
        value.weekly > 40
      ) {
        error.textContent =
          "Use daily credits from 1–20 and seventh-day credits from 1–40, at least as much as a normal day.";
        return;
      }
      const current = JSON.stringify(value);
      if (fingerprint !== current) {
        fingerprint = current;
        requestId = crypto.randomUUID();
      }
      const confirmError = h("p", { class: "form-error", role: "alert" });
      const { close } = modal("Save daily reward settings?", [
        h(
          "p",
          null,
          `${value.enabled ? "Enable" : "Pause"} daily claims. New calendars will award ${value.daily} credits on ordinary days and ${value.weekly} on every seventh day.`,
        ),
        h(
          "p",
          null,
          "Existing calendars keep their initial rewards and timezone. Pausing stops new claims; calendar dates keep moving.",
        ),
        confirmError,
        button("Keep editing", () => close(), "button outline"),
        button(
          "Confirm calendar settings",
          async () => {
            confirmError.textContent = "";
            try {
              const result = await saveCalendarSettings(value, requestId);
              if (currentUser()?.id !== owner.id || !panel.isConnected) {
                close();
                return;
              }
              settings = result;
              fingerprint = "";
              summary();
              close();
              success.textContent = "Calendar settings saved.";
              toast("Daily calendar settings saved.");
            } catch (failure) {
              confirmError.textContent =
                failure instanceof Error
                  ? failure.message
                  : "Please try again.";
            }
          },
          "button primary",
        ),
      ]);
    },
    "button primary",
  );
  panel.append(
    h("h2", null, "Seven-week daily rewards"),
    h(
      "p",
      null,
      "Students claim real class credits on 49 dated days. Changes to the reward amounts apply to newly started calendars. Existing calendars keep their original amounts and timezone.",
    ),
    totals,
    h(
      "label",
      { class: "calendar-enable-choice" },
      enabled,
      "Enable daily claim calendar",
    ),
    h(
      "div",
      { class: "teacher-settings-grid" },
      field("Daily class credits", daily),
      field("Seventh-day class credits", weekly),
    ),
    h(
      "p",
      { class: "calendar-settings-note" },
      "Pausing prevents new claims; it does not extend existing calendar dates.",
    ),
    error,
    success,
    save,
  );
  summary();
  return panel;
}
