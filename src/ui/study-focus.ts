import {
  createFocusTimer,
  focusRemaining,
  updateFocusTimer,
  toggleFocusTimer,
  finishFocusStudy,
  startFocusBreak,
  type FocusTimer,
} from "../core/focus-timer";
import { deckById } from "../data/catalog";
import { currentUser, subscribe } from "../store";
import { soundEnabled } from "../store/experience";
import { activitySound } from "./activity-audio";
import { diarySticker } from "./diary-art";
import { h, button, field } from "./dom";
import { icon } from "./svg";
import { go } from "./actions";

interface FocusSession {
  owner: string;
  title: string;
  deckId?: string;
  minutes: number;
  timer: FocusTimer;
  collapsed: boolean;
}
let session: FocusSession | undefined;
let dock: HTMLElement | undefined;
let interval: number | undefined;
let paint: (() => void) | undefined;
let launcher: HTMLElement | undefined;

function hideDockPopover() {
  if (
    dock &&
    typeof dock.hidePopover === "function" &&
    dock.matches(":popover-open")
  )
    dock.hidePopover();
}
function endFocus() {
  session = undefined;
  document.documentElement.classList.remove("has-study-focus");
  if (interval !== undefined) clearInterval(interval);
  interval = undefined;
  hideDockPopover();
  dock?.remove();
  dock = undefined;
  paint = undefined;
}
function syncDockHost() {
  if (!session || !dock) return;
  if (currentUser()?.id !== session.owner) {
    endFocus();
    return;
  }
  const host =
    [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].at(-1) ??
    document.body;
  if (dock.parentElement !== host) {
    hideDockPopover();
    host.append(dock);
  }
  if (typeof dock.showPopover === "function") {
    if (!dock.matches(":popover-open")) dock.showPopover();
  } else dock.dataset.fallback = "true";
}
function isStudyDialog(dialog: HTMLDialogElement) {
  return (
    !!dialog.querySelector(".study-focus-launch") ||
    dialog.matches(
      ".study-guide-dialog, .illustration-dialog, .study-video-dialog, .element-guide-dialog, .study-pdf-dialog",
    )
  );
}
export function studyFocusButton(title: string, deckId?: string) {
  const launch = button(
    h("span", null, icon("clock", 17), "Focus & practise"),
    () => {
      launcher = launch;
      if (session?.owner !== currentUser()?.id) endFocus();
      if (session) {
        session.title = title;
        session.deckId = deckId;
        session.collapsed = session.timer.startedAt !== null;
      } else {
        const owner = currentUser()?.id;
        if (!owner) return;
        session = {
          owner,
          title,
          deckId,
          minutes: 25,
          timer: createFocusTimer(),
          collapsed: false,
        };
        createDock();
      }
      syncDockHost();
      paint?.();
    },
    "button outline study-focus-launch",
    { "aria-label": "Focus & practise: " + title },
  );
  return launch;
}
function createDock() {
  document.documentElement.classList.add("has-study-focus");
  const title = h("strong", { class: "focus-dock-title" });
  const phase = h("span", { class: "focus-phase" });
  const digits = h("strong", {
    class: "focus-time",
    role: "timer",
    "aria-live": "off",
  });
  const status = h("p", { class: "focus-status", role: "status" });
  const meter = h("progress", {
    class: "focus-progress",
    max: 100,
    value: 0,
    "aria-label": "Focus session progress",
  });
  const duration = h(
    "select",
    { "aria-label": "Study duration" },
    ...[5, 15, 25, 50].map((minutes) =>
      h(
        "option",
        { value: minutes, selected: minutes === 25 },
        minutes + " min focus · " + (minutes === 50 ? 10 : 5) + " min break",
      ),
    ),
  );
  const start = button(
    "Start focus",
    () => {
      if (!session) return;
      session.timer = toggleFocusTimer(session.timer, performance.now());
      if (session.timer.startedAt !== null) session.collapsed = true;
      paint?.();
    },
    "button primary focus-start",
  );
  const finish = button(
    "Finish studying",
    () => {
      if (!session) return;
      session.timer = finishFocusStudy(session.timer);
      session.collapsed = false;
      paint?.();
    },
    "button outline focus-finish",
  );
  const rest = button(
    "Take a 5-minute break",
    () => {
      if (!session) return;
      session.timer = startFocusBreak(
        session.timer,
        performance.now(),
        session.minutes === 50 ? 10 : 5,
      );
      session.collapsed = true;
      paint?.();
    },
    "button outline focus-break",
  );
  const quiz = button(
    "Choose a quiz",
    async () => {
      const current = session;
      if (!current?.timer.studyDone || currentUser()?.id !== current.owner)
        return;
      const dialogs = [
        ...document.querySelectorAll<HTMLDialogElement>("dialog[open]"),
      ];
      if (dialogs.some((dialog) => !isStudyDialog(dialog))) {
        status.textContent = "Close this panel to open your quiz.";
        return;
      }
      const route = location.hash;
      endFocus();
      const closed = dialogs.map(
        (dialog) =>
          new Promise<void>((resolve) => {
            dialog.addEventListener("close", () => resolve(), { once: true });
            dialog.close();
          }),
      );
      await Promise.all(closed);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      if (currentUser()?.id !== current.owner || location.hash !== route)
        return;
      if (current.deckId) (await import("./learn")).openDeck(current.deckId);
      else go("/island");
    },
    "button primary focus-quiz",
  );
  const minimize = button(
    "⌄",
    () => {
      if (session) session.collapsed = true;
      paint?.();
    },
    "icon-button",
    { "aria-label": "Minimize focus timer" },
  );
  const stop = () => {
    endFocus();
    if (launcher?.isConnected && !launcher.closest("[inert]"))
      launcher.focus({ preventScroll: true });
  };
  const expanded = h(
    "div",
    { class: "focus-dock-panel" },
    h(
      "header",
      { class: "focus-dock-header" },
      diarySticker(2),
      h("div", null, phase, title),
      minimize,
      button("×", stop, "icon-button", { "aria-label": "End focus session" }),
    ),
    h(
      "div",
      { class: "focus-clock" },
      h("span", { class: "focus-clock-decoration", "aria-hidden": true }),
      digits,
      meter,
    ),
    field("Study duration", duration),
    status,
    h("div", { class: "focus-actions" }, start, finish, rest, quiz),
    h(
      "small",
      null,
      "Keep studying while your timer runs. Only quiz answers earn progress.",
    ),
  );
  const miniText = h("span");
  const expand = button(
    h("span", null, icon("clock", 16), miniText),
    () => {
      if (session) session.collapsed = false;
      paint?.();
    },
    "focus-expand",
    { "aria-label": "Expand focus timer" },
  );
  const miniPause = button(
    "Ⅱ",
    () => {
      if (session)
        session.timer = toggleFocusTimer(session.timer, performance.now());
      paint?.();
    },
    "icon-button",
    { "aria-label": "Pause timer" },
  );
  const chip = h(
    "div",
    { class: "focus-chip" },
    expand,
    miniPause,
    button("×", stop, "icon-button", { "aria-label": "End focus session" }),
  );
  dock = h(
    "section",
    {
      class: "focus-dock",
      popover: "manual",
      "aria-label": "Study focus timer",
    },
    expanded,
    chip,
  );
  dock.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (session) session.collapsed = true;
      paint?.();
      expand.focus();
    }
  });
  duration.addEventListener("change", () => {
    if (!session) return;
    session.minutes = Number(duration.value);
    session.timer = createFocusTimer(session.minutes);
    paint?.();
  });
  paint = () => {
    const current = session;
    if (!current || currentUser()?.id !== current.owner) {
      endFocus();
      return;
    }
    const previous = current.timer;
    current.timer = updateFocusTimer(current.timer, performance.now());
    if (previous !== current.timer) {
      current.collapsed = false;
      if (!document.hidden && soundEnabled(current.owner))
        void activitySound("complete");
    }
    const seconds = Math.ceil(
      focusRemaining(current.timer, performance.now()) / 1000,
    );
    const text =
      Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0") +
      ":" +
      (seconds % 60).toString().padStart(2, "0");
    if (digits.textContent !== text) digits.textContent = text;
    miniText.textContent =
      text + (current.timer.phase === "break" ? " · break" : " · focus");
    title.textContent = current.title;
    phase.textContent =
      current.timer.phase === "break"
        ? "A LITTLE BREATHER"
        : "YOUR FOCUS CORNER";
    duration.value = String(current.minutes);
    const complete = seconds === 0;
    const running = current.timer.startedAt !== null;
    expand.setAttribute(
      "aria-label",
      "Expand focus timer: " +
        current.title +
        ", " +
        text +
        (current.timer.phase === "break" ? " break" : " focus") +
        (running ? " remaining" : " paused"),
    );
    const initial =
      !running && !current.timer.studyDone && seconds === current.minutes * 60;
    duration.disabled = !initial;
    start.textContent = running
      ? "Pause timer"
      : initial
        ? "Start focus"
        : "Resume timer";
    start.disabled = complete;
    start.hidden = complete;
    finish.hidden = current.timer.studyDone;
    rest.hidden = !current.timer.studyDone || current.timer.phase === "break";
    rest.textContent =
      "Take a " + (current.minutes === 50 ? 10 : 5) + "-minute break";
    quiz.hidden = !current.timer.studyDone;
    quiz.textContent = current.deckId
      ? "Quiz: " + deckById(current.deckId)!.name
      : "Choose a topic quiz";
    miniPause.disabled = complete;
    miniPause.textContent = running ? "Ⅱ" : "▷";
    miniPause.setAttribute(
      "aria-label",
      running ? "Pause timer" : "Resume timer",
    );
    const message = complete
      ? current.timer.phase === "study"
        ? "Study finished. Ready for a little quiz?"
        : "Break finished. Ready for your quiz?"
      : running
        ? "Your timer keeps running across study resources."
        : initial
          ? "Choose your time, then start."
          : "Paused. Your remaining time is saved here.";
    if (status.textContent !== message) status.textContent = message;
    meter.value = Math.max(
      0,
      100 -
        (seconds /
          ((current.timer.phase === "study"
            ? current.minutes
            : current.minutes === 50
              ? 10
              : 5) *
            60)) *
          100,
    );
    const active = document.activeElement;
    const moveToChip = current.collapsed && expanded.contains(active);
    const moveToPanel = !current.collapsed && chip.contains(active);
    expanded.hidden = current.collapsed;
    chip.hidden = !current.collapsed;
    dock!.dataset.collapsed = String(current.collapsed);
    if (moveToChip) expand.focus({ preventScroll: true });
    if (moveToPanel)
      (start.hidden ? quiz : start).focus({ preventScroll: true });
  };
  interval = window.setInterval(() => {
    syncDockHost();
    paint?.();
  }, 1000);
  syncDockHost();
  paint();
}
window.addEventListener("csl:dialogs-changed", syncDockHost);
window.addEventListener("hashchange", syncDockHost);
window.addEventListener("pagehide", endFocus);
document.addEventListener("visibilitychange", () => {
  syncDockHost();
  paint?.();
});
subscribe(() => {
  if (session && currentUser()?.id !== session.owner) endFocus();
});
