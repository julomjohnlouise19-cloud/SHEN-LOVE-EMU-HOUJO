import { decks, deckById } from "../data/catalog";
import { currentUser, getState, clock } from "../store";
import { dayKey } from "../core/time";
import { learningGrowth, activeLearningStreak } from "../core/growth";
import { button, h, progress } from "./dom";
import { icon } from "./svg";
import { go } from "./actions";
import { pageHeading } from "./shell";
import { openDeck } from "./learn";
import { APP_NAME } from "./branding";
import { diarySticker } from "./diary-art";
import { learningWeekCard } from "./learning-calendar";
import { vocabularyCard } from "./daily-vocabulary";

export function dashboard() {
  const user = currentUser()!,
    state = getState();
  const today = dayKey(clock, state.rules.timezone);
  const growth = learningGrowth(user, state.rules);
  const unfinished = [...state.runs]
    .reverse()
    .find((run) => run.userId === user.id && !run.completed);
  const unfinishedDeck = unfinished ? deckById(unfinished.deckId) : undefined;
  const gradeDecks = decks.filter(
    (deck) => deck.branch !== "skills" && deck.grades.includes(user.grade),
  );
  const recommended =
    gradeDecks.find((deck) => !user.mastery[deck.id]?.completed) ??
    [...gradeDecks].sort(
      (a, b) =>
        (user.mastery[a.id]?.attempts ?? 0) -
        (user.mastery[b.id]?.attempts ?? 0),
    )[0] ??
    decks[0];
  const resume = unfinished && unfinishedDeck ? unfinished : undefined;
  const answers = Math.min(user.daily[today]?.answers ?? 0, 8);
  const streak = activeLearningStreak(user, today);
  return h(
    "div",
    { class: "dashboard my-lab page-enter" },
    pageHeading(
      "YOUR LITTLE LEARNING SPACE",
      user.id === "guest"
        ? "Hey, curious mind!"
        : "Hey, " + user.name.split(" ")[0] + "!",
      "Make yourself comfortable. There is a little wonder waiting.",
    ),
    h(
      "section",
      { class: "my-lab-welcome", "aria-label": "Welcome to " + APP_NAME },
      h(
        "div",
        { class: "my-lab-welcome-top" },
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "A HAPPY PLACE TO GET CURIOUS"),
          h("h2", null, "Little steps.", h("br"), "Lovely discoveries."),
        ),
        h("div", { class: "my-lab-art", "aria-hidden": true }, diarySticker(0)),
      ),
      h(
        "p",
        { class: "my-lab-introduction" },
        "Welcome to " +
          APP_NAME +
          ". Explore science at your own pace, one little discovery at a time.",
      ),
      h(
        "section",
        {
          class: "my-lab-next-step",
          "aria-label": resume
            ? "Continue your science session"
            : "Your next discovery",
        },
        h(
          "div",
          null,
          h(
            "p",
            { class: "eyebrow" },
            resume ? "YOUR SAVED DISCOVERY" : "A LITTLE PLACE TO START",
          ),
          h("h3", null, resume ? unfinishedDeck!.name : recommended.name),
          h(
            "p",
            null,
            resume
              ? resume.answers.length +
                  " of " +
                  resume.ids.length +
                  " cards answered"
              : "8 cards · About 5 minutes · Grade " + user.grade,
          ),
        ),
        button(
          h(
            "span",
            null,
            resume ? "Continue learning" : "Start today’s discovery",
            icon("arrow", 17),
          ),
          () => (resume ? go("/play/" + resume.id) : openDeck(recommended.id)),
          "button primary",
        ),
      ),
    ),
    h(
      "dl",
      { class: "my-lab-details", "aria-label": "Your learning at a glance" },
      h(
        "div",
        null,
        h("dt", null, icon("sprout", 16), "Your scientist"),
        h(
          "dd",
          null,
          growth.title.name,
          h("small", null, "Level " + growth.level),
        ),
      ),
      h(
        "div",
        null,
        h("dt", null, icon("cards", 16), "Today’s little goal"),
        h(
          "dd",
          null,
          answers + " / 8 answers",
          progress((answers / 8) * 100, "Today’s eight-answer learning goal"),
        ),
      ),
      h(
        "div",
        null,
        h("dt", null, icon("flame", 16), "Your learning rhythm"),
        h(
          "dd",
          null,
          streak + (streak === 1 ? " day" : " days"),
          h(
            "small",
            null,
            streak ? "A little curiosity, day by day." : "A fresh start.",
          ),
        ),
      ),
    ),
    vocabularyCard(),
    learningWeekCard(),
  );
}
