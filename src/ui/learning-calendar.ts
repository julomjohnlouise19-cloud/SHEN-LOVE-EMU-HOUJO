import {
  learningMonth,
  shiftLearningMonth,
  LEARNING_DAY_GOAL,
} from "../core/learning-calendar";
import { validCalendarDate } from "../core/daily-calendar";
import { currentUser, getState } from "../store";
import { h, button, modal } from "./dom";
import { icon } from "./svg";
import { learningToday, watchLearningDay } from "./learning-day";
import { go } from "./actions";

const dateLabel = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PH", { ...options, timeZone: "UTC" }).format(
    new Date(day + "T12:00:00Z"),
  );
export function learningCalendar() {
  const owner = currentUser()!.id;
  let today = learningToday(),
    month = today.slice(0, 7),
    selected = today;
  const title = h("h3", { tabindex: -1 });
  const grid = h("div", { class: "learning-calendar-grid", role: "group" });
  const summary = h("p", {
    class: "learning-calendar-summary",
    role: "status",
  });
  const detail = h("div", { class: "learning-day-detail", role: "status" });
  const previous = button("‹", () => move(-1), "icon-button", {
    "aria-label": "Previous learning month",
  });
  const next = button("›", () => move(1), "icon-button", {
    "aria-label": "Next learning month",
  });
  const root = h(
    "section",
    { class: "learning-calendar", "aria-label": "Learning progress calendar" },
    h(
      "div",
      { class: "learning-calendar-heading" },
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "YOUR LITTLE LEARNING FOOTPRINTS"),
        h("h2", null, "Learning calendar"),
      ),
    ),
    h(
      "p",
      null,
      "Every answered quiz card leaves a little footprint. Tap a day to see your discoveries.",
    ),
    h("div", { class: "learning-calendar-navigation" }, previous, title, next),
    summary,
    h(
      "div",
      { class: "learning-calendar-weekdays", "aria-hidden": true },
      ...["M", "T", "W", "T", "F", "S", "S"].map((day) => h("span", null, day)),
    ),
    grid,
    detail,
    h(
      "div",
      { class: "learning-calendar-legend" },
      h(
        "span",
        null,
        h("i", { class: "calendar-growing-dot" }),
        "Some practice",
      ),
      h("span", null, h("i", { class: "calendar-goal-dot" }), "8+ answers"),
    ),
    button(
      "Show today",
      () => {
        today = learningToday();
        month = today.slice(0, 7);
        selected = today;
        render();
        focusSelected();
      },
      "button outline",
    ),
    h(
      "small",
      { class: "learning-calendar-scope" },
      "Quiz practice saved for this account on this device · " +
        getState().rules.timezone +
        ". Daily reward claims have their own calendar.",
    ),
  );
  function focusSelected() {
    grid
      .querySelector<HTMLButtonElement>(
        '[data-learning-date="' + selected + '"]',
      )
      ?.focus();
  }
  function describe() {
    const day = learningMonth(currentUser()!, month, today).days.find(
      (value) => value.date === selected,
    )!;
    detail.replaceChildren(
      h(
        "strong",
        null,
        dateLabel(day.date, { month: "long", day: "numeric", year: "numeric" }),
      ),
      h(
        "p",
        null,
        day.answers
          ? day.answers + " answers · " + day.correct + " correct"
          : day.today
            ? "Your next little discovery can start today."
            : "No quiz answers saved on this day.",
      ),
      ...(day.answers
        ? [
            h(
              "p",
              null,
              day.goalMet
                ? "Eight-answer goal met. Lovely work, scientist!"
                : Math.max(0, LEARNING_DAY_GOAL - day.answers) +
                    " more answers to the eight-answer goal.",
            ),
          ]
        : []),
    );
    grid
      .querySelectorAll<HTMLElement>("[data-learning-date]")
      .forEach((node) => {
        const active = node.dataset.learningDate === selected;
        node.setAttribute("aria-pressed", String(active));
        node.tabIndex = active ? 0 : -1;
      });
  }
  function move(amount: number) {
    month = shiftLearningMonth(month, amount);
    selected = month === today.slice(0, 7) ? today : month + "-01";
    render();
    focusSelected();
  }
  function render() {
    const user = currentUser();
    if (!user || user.id !== owner) return;
    today = learningToday();
    const data = learningMonth(user, month, today);
    const earliest =
      Object.keys(user.daily)
        .filter(validCalendarDate)
        .filter((day) => day <= today)
        .sort()[0] ?? today;
    previous.disabled = month <= earliest.slice(0, 7);
    next.disabled = month >= today.slice(0, 7);
    title.textContent = dateLabel(month + "-01", {
      month: "long",
      year: "numeric",
    });
    grid.setAttribute("aria-label", title.textContent + " learning days");
    summary.textContent =
      data.activeDays +
      (data.activeDays === 1 ? " active day · " : " active days · ") +
      data.answers +
      " answers · " +
      data.goalDays +
      (data.goalDays === 1 ? " goal met" : " goals met");
    grid.replaceChildren(
      ...Array.from({ length: data.offset }, () =>
        h("span", { "aria-hidden": true }),
      ),
      ...data.days.map((day) => {
        const cell = button(
          h(
            "span",
            null,
            h("strong", null, day.day),
            h(
              "span",
              { class: "learning-day-mark", "aria-hidden": true },
              day.goalMet ? "✦" : day.answers ? "•" : "·",
            ),
          ),
          () => {
            selected = day.date;
            describe();
          },
          "learning-calendar-day" +
            (day.goalMet ? " goal-met" : day.answers ? " has-practice" : "") +
            (day.today ? " is-today" : ""),
          {
            "data-learning-date": day.date,
            disabled: day.future,
            "aria-label":
              dateLabel(day.date, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }) +
              (day.today ? " · Today" : "") +
              (day.future
                ? " · Future day"
                : " · " +
                  day.answers +
                  " answers, " +
                  day.correct +
                  " correct") +
              (day.goalMet ? " · Daily goal met" : ""),
            "aria-pressed": day.date === selected,
            tabindex: day.date === selected ? 0 : -1,
          },
        );
        cell.addEventListener("keydown", (event) => {
          const amount = (
            {
              ArrowLeft: -1,
              ArrowRight: 1,
              ArrowUp: -7,
              ArrowDown: 7,
            } as Record<string, number>
          )[event.key];
          if (!amount && event.key !== "Home" && event.key !== "End") return;
          event.preventDefault();
          const index = data.days.indexOf(day);
          const target =
            event.key === "Home"
              ? data.days[0]
              : event.key === "End"
                ? data.days.filter((value) => !value.future).at(-1)
                : data.days[index + amount];
          if (target && !target.future) {
            selected = target.date;
            describe();
            focusSelected();
          }
        });
        return cell;
      }),
    );
    if (!data.days.some((day) => day.date === selected && !day.future))
      selected = data.days.find((day) => !day.future)!.date;
    describe();
  }
  render();
  watchLearningDay(root, () => {
    const previousDay = today;
    today = learningToday();
    if (selected === previousDay) {
      month = today.slice(0, 7);
      selected = today;
    }
    render();
  });
  return root;
}
export function learningCalendarButton() {
  return button(
    h("span", null, icon("clock", 16), "My learning calendar"),
    () => {
      const { dialog } = modal("Your learning calendar", [
        learningCalendar(),
        button(
          "Find a science discovery",
          () => {
            dialog.close();
            go("/island");
          },
          "button primary full",
        ),
      ]);
      dialog.classList.add("learning-calendar-dialog");
    },
    "button outline",
  );
}
