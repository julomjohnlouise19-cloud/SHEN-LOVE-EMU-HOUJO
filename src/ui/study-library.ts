import { branches, deckById } from "../data/catalog";
import { guideByDeck } from "../data/study-guides";
import { referencesFor } from "../data/references";
import { handbookFile, handbookTopics } from "../core/reading-documents";
import { h, button, modal } from "./dom";
import { illustrationPreview, illustrationExplorer } from "./science-figures";
import { figureById } from "../data/science-figures";
import { icon } from "./svg";
import { HANDBOOK_EDITION } from "../data/handbook-edition";

function handbookLinks(branchId: string) {
  const name = branches.find((b) => b.id === branchId)!.name;
  const href = `${import.meta.env.BASE_URL}${handbookFile(branchId)}?v=${HANDBOOK_EDITION}`;
  return h(
    "div",
    { class: "handbook-actions" },
    h(
      "a",
      {
        href,
        class: "button outline",
        type: "application/pdf",
        "aria-label": `Open ${name} study handbook PDF`,
      },
      icon("notebook", 16),
      "Open handbook (PDF)",
    ),
    h(
      "a",
      {
        href,
        class: "button primary",
        download: `cozy-${branchId}-study-handbook.pdf`,
        type: "application/pdf",
        "aria-label": `Download ${name} study handbook PDF`,
      },
      icon("download", 16),
      "Download PDF",
    ),
  );
}
export function studyGuideModal(deckId: string) {
  const guide = guideByDeck(deckId),
    deck = deckById(deckId);
  if (!guide || !deck) return;
  const check = h(
    "details",
    { class: "study-check" },
    h("summary", null, "Reveal the explanation"),
    h("p", null, guide.check[1]),
  );
  const content = h(
    "article",
    { class: "study-document" },
    h(
      "p",
      { class: "eyebrow" },
      `LAB-AUTHORED STUDY GUIDE · GRADES ${deck.grades.join(" / ")}`,
    ),
    h("p", { class: "study-introduction" }, guide.introduction),
    h(
      "nav",
      { class: "study-section-links", "aria-label": "In this guide" },
      ...guide.ideas.map(([title], i) =>
        button(
          title,
          () => {
            const target = content.querySelector<HTMLElement>(
              `[data-study-section="${i}"]`,
            );
            target?.scrollIntoView({ behavior: "auto", block: "start" });
            target?.focus({ preventScroll: true });
          },
          "text-button",
        ),
      ),
    ),
    ...guide.ideas.map(([title, body], i) =>
      h(
        "section",
        null,
        h("h3", { tabindex: -1, "data-study-section": i }, title),
        h("p", null, body),
      ),
    ),
    h(
      "section",
      { class: "study-terms" },
      h("h3", null, "Words to keep"),
      h(
        "dl",
        null,
        ...guide.terms.map(([term, meaning]) =>
          h("div", null, h("dt", null, term), h("dd", null, meaning)),
        ),
      ),
    ),
    h(
      "section",
      { class: "study-example" },
      h("p", { class: "eyebrow" }, "TRY THE IDEA"),
      h("h3", null, guide.example[0]),
      h("p", null, guide.example[1]),
    ),
    h(
      "aside",
      { class: "study-remember" },
      icon("sparkles", 20),
      h("p", null, h("strong", null, "Remember: "), guide.remember),
    ),
    ...guide.figures.slice(0, 1).map((id) =>
      h(
        "section",
        { class: "study-figure" },
        h("h3", null, "Picture the idea"),
        illustrationPreview(id),
        h("p", null, figureById(id)!.limit),
        button(
          "Explore the labels",
          () => illustrationExplorer(id),
          "button outline",
        ),
      ),
    ),
    h(
      "section",
      { class: "study-self-check" },
      h("h3", null, "Check your thinking"),
      h("p", null, guide.check[0]),
      check,
    ),
    h(
      "section",
      { class: "study-citations" },
      h("h3", null, "Supporting sources"),
      h(
        "p",
        null,
        "These notes were written for the lab. The publications below support the concepts; this is not a quotation or an official curriculum page.",
      ),
      ...referencesFor(deckId).map((ref) =>
        h(
          "p",
          null,
          h(
            "a",
            { href: ref.url, rel: "external noreferrer" },
            `${ref.publisher} · ${ref.title}`,
          ),
          h("small", null, ref.url),
        ),
      ),
    ),
    h(
      "section",
      { class: "study-guide-tools" },
      h("h3", null, "Keep learning"),
      h(
        "p",
        null,
        "The branch handbook includes this topic and its companion notes. Download it to read or print without a connection.",
      ),
      handbookLinks(deck.branch),
      button("Print this topic", () => window.print(), "button outline"),
    ),
  );
  const { dialog } = modal(`${deck.name} · study notes`, [content], true);
  dialog.classList.add("study-guide-dialog");
}
export function studyGuideButton(deckId: string) {
  return button(
    "Read study guide",
    () => studyGuideModal(deckId),
    "button primary",
    { "aria-label": `Read ${deckById(deckId)?.name ?? "science"} study guide` },
  );
}
export function documentsShelf(onBranch: (id: string) => void) {
  return h(
    "section",
    { class: "documents-shelf", "aria-label": "Study documents" },
    h("h2", null, "Your science notebooks, ready to keep"),
    h(
      "p",
      null,
      "Five complete PDF handbooks cover all 27 topics, with original notes, examples, self-check explanations, illustrations and supporting references. Open one here or download it for offline reading.",
    ),
    h(
      "div",
      { class: "handbook-grid" },
      ...branches.map((branch) =>
        h(
          "article",
          { class: `handbook-card handbook-${branch.id}` },
          h(
            "div",
            { class: "handbook-cover" },
            icon(branch.icon, 33),
            h("small", null, "THE COZY SCIENCE LAB"),
            h("h3", null, branch.name),
            h("span", null, "STUDY HANDBOOK · EDITION 1"),
          ),
          h(
            "p",
            null,
            `${handbookTopics(branch.id).length} topics · Grade 7–10 learning support · PDF`,
          ),
          h(
            "ul",
            null,
            ...handbookTopics(branch.id).map((deck) =>
              h("li", null, deck.name),
            ),
          ),
          handbookLinks(branch.id),
          button(
            "Read these notes in the lab",
            () => onBranch(branch.id),
            "text-button",
          ),
        ),
      ),
    ),
    h(
      "p",
      { class: "document-note" },
      "These are self-contained lab-authored handbooks. Publisher links inside need internet access, but the notes and illustrations remain readable without it.",
    ),
  );
}
