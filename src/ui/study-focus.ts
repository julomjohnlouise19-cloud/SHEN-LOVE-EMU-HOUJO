import {
  createFocusTimer,
  focusRemaining,
  updateFocusTimer,
  toggleFocusTimer,
  finishFocusStudy,
  startFocusBreak,
} from "../core/focus-timer";
import { deckById } from "../data/catalog";
import { currentUser } from "../store";
import { soundEnabled } from "../store/experience";
import { activitySound } from "./activity-audio";
import { diarySticker } from "./diary-art";
import { h, button, field } from "./dom";
import { modal } from "./dom";
import { icon } from "./svg";

export function studyFocusButton(
  content: HTMLElement,
  title: string,
  deckId: string,
  leaveStudy?: () => void,
) {
  const launch = button(
    h("span", null, icon("clock", 18), "Focus & practise"),
    open,
    "button outline study-focus-launch",
    { "aria-label": "Focus & practise: " + title },
  );
  function open() {
    const owner = currentUser()?.id;
    const deck = deckById(deckId);
    if (!owner || !deck || !content.isConnected) return;
    const marker = document.createComment("study position");
    content.before(marker);
    let timer = createFocusTimer(),
      disposed = false;
    const duration = h(
      "select",
      { "aria-label": "Focus study duration" },
      ...[5, 15, 25, 50].map((minutes) =>
        h(
          "option",
          { value: minutes, selected: minutes === 25 },
          minutes + " min study · " + (minutes === 50 ? 10 : 5) + " min break",
        ),
      ),
    );
    const digits = h("strong", {
      class: "focus-time",
      role: "timer",
      "aria-live": "off",
    });
    const status = h("p", { class: "focus-status", role: "status" });
    const phase = h("p", { class: "eyebrow focus-phase" });
    const meter = h("progress", {
      class: "focus-progress",
      max: 100,
      value: 0,
      "aria-label": "Focus session progress",
    });
    const clockLabel = h(
      "span",
      { class: "focus-clock-label" },
      "a little focus time",
    );
    const ring = h(
      "div",
      { class: "focus-clock" },
      h("span", { class: "focus-clock-decoration", "aria-hidden": true }),
      clockLabel,
      digits,
      meter,
    );
    const studyLabel = h("strong");
    const breakLabel = h("strong");
    const studyStep = h(
      "li",
      null,
      h("span", { class: "focus-step-dot", "aria-hidden": true }, "1"),
      h("div", null, studyLabel, h("small", null, "Explore & understand")),
    );
    const breakStep = h(
      "li",
      null,
      h("span", { class: "focus-step-dot", "aria-hidden": true }, "2"),
      h("div", null, breakLabel, h("small", null, "Optional little breather")),
    );
    const quizStep = h(
      "li",
      null,
      h("span", { class: "focus-step-dot", "aria-hidden": true }, "3"),
      h(
        "div",
        null,
        h("strong", null, "Your topic quiz"),
        h("small", null, deck.name),
      ),
    );
    const rhythm = h(
      "aside",
      { class: "focus-rhythm", "aria-label": "Your study session plan" },
      h("h4", null, "Your little rhythm"),
      h("ol", null, studyStep, breakStep, quizStep),
    );
    const start = button(
      "Start focus",
      () => {
        timer = toggleFocusTimer(timer, performance.now());
        draw();
      },
      "button primary",
    );
    const finish = button(
      "Finish studying",
      () => {
        timer = finishFocusStudy(timer);
        draw();
      },
      "button outline",
    );
    const rest = button(
      "Take a 5-minute break",
      () => {
        timer = startFocusBreak(
          timer,
          performance.now(),
          Number(duration.value) === 50 ? 10 : 5,
        );
        draw();
      },
      "button outline",
    );
    const quiz = button(
      "Quiz: " + deck.name,
      async () => {
        if (!timer.studyDone || currentUser()?.id !== owner) return;
        const route = location.hash;
        const dismissed = new Promise<void>((resolve) => {
          dialog.addEventListener(
            "close",
            () => requestAnimationFrame(() => resolve()),
            { once: true },
          );
        });
        close();
        restore();
        leaveStudy?.();
        await dismissed;
        const { openDeck } = await import("./learn");
        if (
          currentUser()?.id === owner &&
          location.hash === route &&
          !document.querySelector("dialog[open]")
        )
          openDeck(deckId);
      },
      "button primary focus-quiz",
    );
    const panel = h(
      "section",
      { class: "study-focus-panel", "aria-label": "Study focus timer" },
      h(
        "div",
        { class: "focus-welcome" },
        diarySticker(2),
        h(
          "div",
          null,
          phase,
          h("h3", null, "A little time. A bright idea."),
          h(
            "p",
            null,
            "Explore the model, recall what you learned, then try " +
              deck.name +
              ".",
          ),
        ),
      ),
      h(
        "div",
        { class: "focus-board" },
        h(
          "div",
          { class: "focus-doodles", "aria-hidden": true },
          ...Array.from({ length: 18 }, () => h("span")),
        ),
        h("div", { class: "focus-timer-row" }, ring, rhythm),
      ),
      h(
        "div",
        { class: "focus-controls" },
        field("Study for", duration),
        status,
        h("div", { class: "focus-actions" }, start, finish, rest, quiz),
      ),
      h(
        "small",
        null,
        "Study → optional breather → topic quiz. Closing the focus room ends the timer. Learning progress comes from quiz answers.",
      ),
    );
    const { dialog, close } = modal(
      "Focus room · " + title,
      [panel, content],
      true,
      launch,
    );
    dialog.classList.add("study-focus-dialog");
    function draw() {
      if (disposed) return;
      if (currentUser()?.id !== owner || !dialog.open) {
        close();
        restore();
        return;
      }
      const previous = timer;
      timer = updateFocusTimer(timer, performance.now());
      if (previous !== timer && !document.hidden && soundEnabled(owner!))
        void activitySound("complete");
      const seconds = Math.ceil(
        focusRemaining(timer, performance.now()) / 1000,
      );
      digits.textContent =
        Math.floor(seconds / 60)
          .toString()
          .padStart(2, "0") +
        ":" +
        (seconds % 60).toString().padStart(2, "0");
      ring.setAttribute(
        "aria-label",
        `${timer.phase === "study" ? "Study" : "Break"}: ${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`,
      );
      const complete = seconds === 0;
      const studyMinutes = Number(duration.value);
      const breakMinutes = studyMinutes === 50 ? 10 : 5;
      studyLabel.textContent = studyMinutes + " min focus";
      breakLabel.textContent = breakMinutes + " min break";
      rest.textContent = "Take a " + breakMinutes + "-minute break";
      clockLabel.textContent =
        timer.phase === "study"
          ? "a little focus time"
          : "a little time to recharge";
      meter.value = Math.max(
        0,
        100 -
          (seconds /
            ((timer.phase === "study" ? studyMinutes : breakMinutes) * 60)) *
            100,
      );
      const currentStep =
        timer.phase === "break" && !complete
          ? breakStep
          : timer.studyDone
            ? quizStep
            : studyStep;
      for (const step of [studyStep, breakStep, quizStep]) {
        if (step === currentStep) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      }
      phase.textContent =
        timer.phase === "break"
          ? "A LITTLE BREATHER"
          : "YOUR QUIET SCIENCE CORNER";
      const message = complete
        ? timer.phase === "break"
          ? "Break finished. Ready for your topic quiz?"
          : "Study finished. Take a breath, then try your topic quiz."
        : timer.startedAt !== null
          ? timer.phase === "study"
            ? "Focus time. Follow your curiosity."
            : "Rest your eyes and stretch a little."
          : seconds === Number(duration.value) * 60
            ? "Choose your study time, then press Start focus."
            : "Paused. Your study page stays here.";
      if (status.textContent !== message) status.textContent = message;
      start.textContent =
        timer.startedAt !== null
          ? "Pause timer"
          : seconds !== Number(duration.value) * 60 && !complete
            ? "Resume timer"
            : "Start focus";
      start.disabled = complete;
      duration.disabled =
        timer.studyDone ||
        timer.startedAt !== null ||
        seconds !== Number(duration.value) * 60;
      finish.hidden = timer.studyDone;
      rest.hidden = !timer.studyDone || timer.phase === "break";
      quiz.hidden = !timer.studyDone;
    }
    function restore() {
      if (disposed) return;
      disposed = true;
      clearInterval(ticking);
      document.removeEventListener("visibilitychange", draw);
      window.removeEventListener("hashchange", leave);
      if (marker.parentNode && currentUser()?.id === owner)
        marker.replaceWith(content);
      else marker.remove();
      requestAnimationFrame(() => {
        const top = [
          ...document.querySelectorAll<HTMLDialogElement>("dialog[open]"),
        ].at(-1);
        if (
          currentUser()?.id === owner &&
          launch.isConnected &&
          (!top || top.contains(launch))
        )
          launch.focus({ preventScroll: true });
      });
    }
    function leave() {
      close();
      restore();
      leaveStudy?.();
    }
    duration.addEventListener("change", () => {
      timer = createFocusTimer(Number(duration.value));
      draw();
    });
    const ticking = window.setInterval(draw, 250);
    dialog.addEventListener("close", restore, { once: true });
    window.addEventListener("hashchange", leave);
    document.addEventListener("visibilitychange", draw);
    draw();
  }
  return launch;
}
