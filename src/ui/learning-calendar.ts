import {
  learningMonth,
  shiftLearningMonth,
  LEARNING_DAY_GOAL,
} from "../core/learning-calendar";
import { validCalendarDate } from "../core/daily-calendar";
import { addDays } from "../core/time";
import { currentUser, getState, subscribe } from "../store";
import { h, button, modal } from "./dom";
import { icon } from "./svg";
import { diarySticker } from "./diary-art";
import { learningToday, watchLearningDay } from "./learning-day";
import { go } from "./actions";

const dateLabel = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PH", { ...options, timeZone: "UTC" }).format(
    new Date(day + "T12:00:00Z"),
  );

const mountedCalendars = new Set<{
  root: HTMLElement;
  owner: string;
  daily: NonNullable<ReturnType<typeof currentUser>>["daily"];
  refresh: () => void;
}>();
subscribe(() => {
  const user = currentUser();
  for (const calendar of mountedCalendars) {
    if (!calendar.root.isConnected) mountedCalendars.delete(calendar);
    else if (user?.id !== calendar.owner) {
      calendar.root.replaceChildren();
      mountedCalendars.delete(calendar);
    } else if (calendar.daily !== user.daily) {
      calendar.daily = user.daily;
      calendar.refresh();
    }
  }
});

export function learningCalendar() {
  for (const calendar of mountedCalendars)
    if (!calendar.root.isConnected) mountedCalendars.delete(calendar);
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
  const detail = h("section", {
    class: "learning-day-detail",
    "aria-label": "Selected learning day",
  });
  const previous = button("‹", () => move(-1), "icon-button", {
    "aria-label": "Previous learning month",
  });
  const next = button("›", () => move(1), "icon-button", {
    "aria-label": "Next learning month",
  });
  const previousPractice = button(
    h("span", null, icon("chevron", 15), "Earlier practice"),
    () => jumpPractice(-1),
    "button outline calendar-earlier-practice",
    { "aria-label": "Previous practice day" },
  );
  const nextPractice = button(
    h("span", null, "Later practice", icon("chevron", 15)),
    () => jumpPractice(1),
    "button outline",
    { "aria-label": "Next practice day" },
  );
  const monthInput = h("input", {
    type: "month",
    "aria-label": "Month and year",
    onChange: chooseMonth,
  });
  const monthError = h("p", { class: "calendar-month-error", role: "alert" });
  const monthPicker = h(
    "div",
    { class: "learning-month-picker", hidden: true },
    h("label", null, "Month and year", monthInput),
    monthError,
  );
  const choose = button(
    h("span", null, icon("calendar", 16), "Choose month"),
    () => {
      monthPicker.hidden = !monthPicker.hidden;
      choose.setAttribute("aria-expanded", String(!monthPicker.hidden));
      monthError.textContent = "";
      monthInput.removeAttribute("aria-invalid");
      monthInput.value = month;
      if (!monthPicker.hidden) monthInput.focus();
    },
    "button outline",
    { "aria-expanded": false },
  );
  const root = h(
    "section",
    { class: "learning-calendar", "aria-label": "Learning progress calendar" },
    h(
      "div",
      { class: "learning-calendar-hero" },
      h(
        "div",
        { class: "learning-calendar-heading" },
        h("p", { class: "eyebrow" }, "YOUR LITTLE DISCOVERY DIARY"),
        h("h2", null, "Learning calendar"),
        h(
          "p",
          null,
          "Tiny steps, lovely discoveries. Tap a day to open its story.",
        ),
        h(
          "span",
          { class: "calendar-story-motifs", "aria-hidden": true },
          icon("sprout", 18),
          icon("sparkles", 18),
          icon("heart", 18),
        ),
      ),
      h(
        "div",
        { class: "calendar-buddy-seal", "aria-hidden": true },
        diarySticker(1, "diary-art-meadow"),
        diarySticker(4, "diary-art-aurora"),
        diarySticker(2, "diary-art-sunset"),
        h("span", { class: "calendar-buddy-spark" }, icon("sparkles", 19)),
      ),
    ),
    h("div", { class: "learning-calendar-navigation" }, previous, title, next),
    h(
      "div",
      { class: "learning-calendar-tools" },
      choose,
      button(
        h("span", null, icon("clock", 16), "Show today"),
        () => selectDay(learningToday()),
        "button outline",
      ),
    ),
    monthPicker,
    summary,
    h(
      "div",
      { class: "learning-calendar-weekdays", "aria-hidden": true },
      ...["M", "T", "W", "T", "F", "S", "S"].map((day) => h("span", null, day)),
    ),
    grid,
    h(
      "div",
      { class: "learning-calendar-legend" },
      h("span", null, icon("sprout", 15), "A little practice"),
      h("span", null, icon("sparkles", 15), "8+ answers · a daily stamp"),
    ),
    h(
      "div",
      {
        class: "learning-practice-navigation",
        role: "group",
        "aria-label": "Browse practice days",
      },
      previousPractice,
      nextPractice,
    ),
    detail,
    h(
      "small",
      { class: "learning-calendar-scope" },
      "Quiz practice saved for this account on this device · " +
        getState().rules.timezone +
        ". Daily reward claims have their own calendar.",
    ),
  );

  function ownedUser() {
    const user = currentUser();
    return user?.id === owner ? user : undefined;
  }
  function savedDates(onlyPractice = false) {
    const user = ownedUser();
    return user
      ? Object.keys(user.daily)
          .filter(validCalendarDate)
          .filter(
            (day) =>
              day <= today && (!onlyPractice || user.daily[day].answers > 0),
          )
          .sort()
      : [];
  }
  function firstMonth() {
    return (savedDates()[0] ?? today).slice(0, 7);
  }
  function focusSelected() {
    grid
      .querySelector<HTMLButtonElement>(
        '[data-learning-date="' + selected + '"]',
      )
      ?.focus();
  }
  function selectDay(date: string) {
    if (!ownedUser()) return;
    const previousToday = today;
    today = learningToday();
    if (
      !validCalendarDate(date) ||
      date > today ||
      date.slice(0, 7) < firstMonth()
    )
      return;
    const changedMonth = month !== date.slice(0, 7);
    month = date.slice(0, 7);
    selected = date;
    monthPicker.hidden = true;
    choose.setAttribute("aria-expanded", "false");
    if (changedMonth || previousToday !== today) render();
    else describe();
    focusSelected();
  }
  function chooseMonth() {
    if (!ownedUser()) return;
    today = learningToday();
    const value = monthInput.value;
    if (
      !validCalendarDate(value + "-01") ||
      value < firstMonth() ||
      value > today.slice(0, 7)
    ) {
      monthInput.setAttribute("aria-invalid", "true");
      monthError.textContent =
        "Choose a month within your saved learning history, up to this month.";
      return;
    }
    monthInput.removeAttribute("aria-invalid");
    monthError.textContent = "";
    selectDay(value === today.slice(0, 7) ? today : value + "-01");
  }
  function jumpPractice(direction: number) {
    const dates = savedDates(true);
    const target =
      direction < 0
        ? dates.filter((date) => date < selected).at(-1)
        : dates.find((date) => date > selected);
    if (target) selectDay(target);
  }
  function openLearning(route: string) {
    if (!ownedUser()) return;
    root.closest("dialog")?.close();
    go(route);
  }
  function describe() {
    const user = ownedUser();
    if (!user) return;
    const day = learningMonth(user, month, today).days.find(
      (value) => value.date === selected,
    );
    if (!day) return;
    const dates = savedDates(true);
    previousPractice.disabled = !dates.some((date) => date < selected);
    nextPractice.disabled = !dates.some((date) => date > selected);
    const remaining = Math.max(0, LEARNING_DAY_GOAL - day.answers);
    detail.replaceChildren(
      h(
        "div",
        {
          class: "learning-day-story",
          role: "status",
          "aria-live": "polite",
          "aria-atomic": true,
        },
        h(
          "div",
          { class: "calendar-day-buddy", "aria-hidden": true },
          diarySticker(day.goalMet ? 11 : day.answers ? 8 : 2),
        ),
        h(
          "div",
          null,
          h(
            "p",
            { class: "eyebrow" },
            day.today ? "TODAY'S LITTLE PAGE" : "A PAGE FROM YOUR DIARY",
          ),
          h(
            "h4",
            null,
            dateLabel(day.date, {
              weekday: "short",
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
          ),
          h(
            "p",
            { class: "learning-day-count" },
            day.answers
              ? day.answers + " answers · " + day.correct + " correct"
              : day.today
                ? "Your next little discovery can start today."
                : "No quiz answers saved on this day.",
          ),
        ),
      ),
      h(
        "div",
        { class: "learning-day-goal" },
        h(
          "span",
          null,
          icon(day.goalMet ? "sparkles" : "sprout", 16),
          day.goalMet
            ? "Your daily stamp bloomed"
            : "A little practice, a little growth",
        ),
        h(
          "span",
          null,
          Math.min(day.answers, LEARNING_DAY_GOAL) + " / " + LEARNING_DAY_GOAL,
        ),
      ),
      h("progress", {
        class: "learning-day-progress",
        max: LEARNING_DAY_GOAL,
        value: Math.min(day.answers, LEARNING_DAY_GOAL),
        "aria-label": "Daily practice goal",
      }),
      h(
        "p",
        { class: "learning-day-encouragement" },
        day.goalMet
          ? "Eight-answer goal met. Lovely work, scientist!"
          : day.today
            ? remaining +
              " more " +
              (remaining === 1 ? "answer" : "answers") +
              " to the eight-answer goal. Every try counts."
            : "Every try counts. Your next discovery has a little space today.",
      ),
      h(
        "div",
        { class: "learning-day-actions" },
        button(
          h("span", null, "Find a science discovery", icon("arrow", 16)),
          () => openLearning("/island"),
          "button primary",
        ),
        button(
          h("span", null, icon("notebook", 16), "Study Room"),
          () => openLearning("/sources"),
          "button outline",
        ),
      ),
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
    const target = shiftLearningMonth(month, amount);
    selectDay(target === today.slice(0, 7) ? today : target + "-01");
  }
  function render() {
    const user = ownedUser();
    if (!user) return;
    const restoreDayFocus = grid.contains(document.activeElement);
    today = learningToday();
    const data = learningMonth(user, month, today);
    previous.disabled = month <= firstMonth();
    next.disabled = month >= today.slice(0, 7);
    monthInput.min = firstMonth();
    monthInput.max = today.slice(0, 7);
    if (document.activeElement !== monthInput) monthInput.value = month;
    title.textContent = dateLabel(month + "-01", {
      month: "long",
      year: "numeric",
    });
    grid.setAttribute("aria-label", title.textContent + " learning days");
    summary.replaceChildren(
      h(
        "span",
        null,
        icon("calendar", 17),
        h("strong", null, data.activeDays),
        data.activeDays === 1 ? " active day" : " active days",
      ),
      h("span", { class: "calendar-summary-separator" }, " · "),
      h(
        "span",
        null,
        icon("cards", 17),
        h("strong", null, data.answers),
        " answers",
      ),
      h("span", { class: "calendar-summary-separator" }, " · "),
      h(
        "span",
        null,
        icon("sparkles", 17),
        h("strong", null, data.goalDays),
        data.goalDays === 1 ? " goal met" : " goals met",
      ),
    );
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
              day.goalMet
                ? diarySticker((day.day + Number(month.slice(5))) % 12)
                : day.answers
                  ? icon("sprout", 17)
                  : h("i", { class: "calendar-quiet-day" }),
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
            "aria-current": day.today ? "date" : undefined,
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
          if (
            !amount &&
            !["Home", "End", "PageUp", "PageDown"].includes(event.key)
          )
            return;
          event.preventDefault();
          if (event.key === "PageUp" || event.key === "PageDown") {
            const targetMonth = shiftLearningMonth(
              month,
              event.key === "PageUp" ? -1 : 1,
            );
            if (targetMonth < firstMonth() || targetMonth > today.slice(0, 7))
              return;
            const available = learningMonth(
              user,
              targetMonth,
              today,
            ).days.filter((value) => !value.future);
            selectDay(available[Math.min(day.day, available.length) - 1].date);
          } else {
            const target =
              event.key === "Home"
                ? data.days[0].date
                : event.key === "End"
                  ? data.days.filter((value) => !value.future).at(-1)!.date
                  : addDays(day.date, amount);
            selectDay(target);
          }
        });
        return cell;
      }),
    );
    if (!data.days.some((day) => day.date === selected && !day.future))
      selected = data.days.find((day) => !day.future)!.date;
    describe();
    if (restoreDayFocus) focusSelected();
  }
  render();
  requestAnimationFrame(() => {
    const user = ownedUser();
    if (root.isConnected && user)
      mountedCalendars.add({ root, owner, daily: user.daily, refresh: render });
  });
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
      const { dialog } = modal(
        "Your learning calendar",
        [learningCalendar()],
        true,
      );
      dialog.classList.add("learning-calendar-dialog");
    },
    "button outline",
  );
}
