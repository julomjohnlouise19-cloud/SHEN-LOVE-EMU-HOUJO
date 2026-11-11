import { decks, deckById } from "../data/catalog";
import { referencesFor } from "../data/references";
import type { Question } from "../core/types";
import { h, button, modal, input, field } from "./dom";
export function sourceDetails(deckId: string, question?: Question) {
  const deck = deckById(deckId);
  return h(
    "section",
    { class: "science-sources" },
    h("p", { class: "eyebrow" }, "FOLLOW THE SCIENCE"),
    h("h3", null, `${deck?.name ?? "Science"} · sources & reading`),
    h(
      "p",
      null,
      "These practice questions were written for The Cozy Science Lab. The references below explain the supporting science; the questions are not presented as quotations from those publishers.",
    ),
    question
      ? h(
          "p",
          { class: "source-identity" },
          `Card ${question.id} · revision ${question.revision ?? 0}${question.revision ? " · teacher-reviewed classroom revision" : " · original lab edition"}`,
        )
      : null,
    question && ["calc", "data"].includes(question.type)
      ? h(
          "p",
          { class: "notice" },
          "The numbers or table in this card are a constructed teaching example. The references explain the concepts; they are not the origin of these measurements.",
        )
      : null,
    h(
      "p",
      { class: "source-note" },
      deck?.sourceNote ?? "Grade 7–10 science practice.",
    ),
    ...referencesFor(deckId).map((ref) =>
      h(
        "article",
        { class: "reference-card" },
        h("small", null, ref.publisher),
        h("h4", null, ref.title),
        h("p", null, ref.focus),
        h(
          "a",
          { href: ref.url, target: "_blank", rel: "noopener noreferrer" },
          "Open supporting reference ↗",
        ),
      ),
    ),
    h(
      "small",
      null,
      "Reading links open an external publisher or agency in a new tab. Citation notes stay available with cached decks; external pages need an internet connection.",
    ),
  );
}
export function sourceButton(deckId: string, question?: Question) {
  return button(
    "Sources & further reading",
    () =>
      modal(
        "A little evidence behind the idea",
        [sourceDetails(deckId, question)],
        true,
      ),
    "text-button source-button",
    {
      "aria-label": `Sources for ${question ? `card ${question.id}` : (deckById(deckId)?.name ?? "science")}`,
    },
  );
}
export function sourcesPage() {
  const list = h("div", { class: "reading-grid" });
  const search = input("source-search", "Find a science topic…", "", "search");
  search.required = false;
  const update = () =>
    list.replaceChildren(
      ...decks
        .filter((d) =>
          `${d.name} ${d.description}`
            .toLowerCase()
            .includes(search.value.toLowerCase().trim()),
        )
        .map((d) =>
          h(
            "article",
            { class: "reference-card" },
            h("h2", null, d.name),
            h("p", null, d.description),
            sourceButton(d.id),
          ),
        ),
    );
  search.addEventListener("input", update);
  update();
  return h(
    "div",
    { class: "reading-room page-enter" },
    h("p", { class: "eyebrow" }, "CURIOUS MINDS CHECK THE EVIDENCE"),
    h("h1", null, "The science reading room"),
    h(
      "p",
      null,
      "Discover the concepts behind every deck, meet the publishers and keep exploring after the answer.",
    ),
    field("Search science references", search),
    list,
  );
}
