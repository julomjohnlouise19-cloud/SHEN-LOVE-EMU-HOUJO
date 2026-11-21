import {
  vocabularyCollection,
  vocabularyForDay,
} from "../core/learning-calendar";
import { studyGuides } from "../data/study-guides";
import { deckById } from "../data/catalog";
import { currentUser } from "../store";
import { soundEnabled } from "../store/experience";
import { learningToday, watchLearningDay } from "./learning-day";
import { h, button } from "./dom";
import { icon } from "./svg";
import { studyGuideModal } from "./study-library";
import { activitySound } from "./activity-audio";
import { openDeck } from "./learn";

const words = vocabularyCollection(studyGuides);
export function vocabularyCard() {
  const root = h("section", {
    class: "daily-vocabulary",
    "aria-label": "Vocabulary of the day",
  });
  const owner = currentUser()!.id;
  function render() {
    const word = vocabularyForDay(words, learningToday())!;
    const deck = deckById(word.deckId)!;
    const meaning = h(
      "p",
      { class: "vocabulary-meaning", id: "daily-word-meaning", hidden: true },
      word.meaning,
    );
    const reveal = button(
      "Reveal the meaning",
      () => {
        meaning.hidden = !meaning.hidden;
        reveal.textContent = meaning.hidden
          ? "Reveal the meaning"
          : "Hide the meaning";
        reveal.setAttribute("aria-expanded", String(!meaning.hidden));
        if (
          !meaning.hidden &&
          currentUser()?.id === owner &&
          soundEnabled(owner)
        )
          void activitySound("flip");
      },
      "button outline",
      { "aria-expanded": false, "aria-controls": "daily-word-meaning" },
    );
    root.replaceChildren(
      h(
        "div",
        { class: "vocabulary-heading" },
        h(
          "span",
          { class: "vocabulary-icon", "aria-hidden": true },
          icon("sprout", 27),
        ),
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "ONE LITTLE WORD. A NEW CONNECTION."),
          h("h2", null, "Vocabulary of the day"),
        ),
      ),
      h("p", { class: "vocabulary-topic" }, deck.name),
      h("h3", { class: "vocabulary-word" }, word.term),
      h(
        "p",
        { class: "vocabulary-prompt" },
        "What do you think it means? Say it in your own words, then take a peek.",
      ),
      reveal,
      meaning,
      h(
        "div",
        { class: "vocabulary-actions" },
        button(
          "Read its notes & sources",
          () => studyGuideModal(word.deckId),
          "button outline",
        ),
        button("Try this topic", () => openDeck(word.deckId), "button outline"),
      ),
      h(
        "small",
        { class: "vocabulary-date" },
        "A new word each classroom day · " + learningToday(),
      ),
    );
  }
  render();
  watchLearningDay(root, render);
  return root;
}
