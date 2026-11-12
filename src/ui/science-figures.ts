import { scienceFigures, figureById } from "../data/science-figures";
import { diagramMarkup } from "../core/reading-documents";
import { h, button, modal } from "./dom";
import { readingSvg, icon } from "./svg";
export const illustrationCount = scienceFigures.length;

export function illustrationPreview(id: string) {
  const figure = figureById(id)!;
  const image = readingSvg(diagramMarkup(id), figure.title);
  image.setAttribute("aria-hidden", "true");
  return h("div", { class: "illustration-preview" }, image);
}
export function illustrationExplorer(id: string) {
  const figure = figureById(id);
  if (!figure) return;
  let focused = "",
    closed = false;
  const art = h("div", {
    class: "illustration-scroll",
    tabindex: 0,
    role: "region",
    "aria-label": `${figure.title} diagram; scroll sideways on a small screen`,
  });
  const explanation = h("div", {
    class: "illustration-explanation",
    "aria-live": "polite",
  });
  const state = h("p", { class: "circuit-state", role: "status" });
  const controls = h("div", {
    class: "illustration-parts",
    "aria-label": "Choose a diagram label",
  });
  const render = () => {
    art.replaceChildren(
      readingSvg(diagramMarkup(id, focused, closed), figure.title),
    );
    const part = figure.parts.find((p) => p.id === focused);
    explanation.replaceChildren(
      h("h3", null, part?.name ?? "Start with a label"),
      h(
        "p",
        null,
        part?.explanation ??
          "Choose any label below to highlight it in the model and read what it means.",
      ),
    );
    controls
      .querySelectorAll<HTMLElement>("[data-figure-part]")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String(node.dataset.figurePart === focused),
        ),
      );
    state.textContent = closed
      ? "Switch closed: the path is complete and the lamp is lit."
      : "Switch open: the path is broken and the lamp is off.";
  };
  controls.append(
    button(
      "Show all labels",
      () => {
        focused = "";
        render();
      },
      "button outline",
      { "data-figure-part": "", "aria-pressed": true },
    ),
    ...figure.parts.map((p) =>
      button(
        p.name,
        () => {
          focused = p.id;
          render();
        },
        "button outline",
        { "data-figure-part": p.id, "aria-pressed": false },
      ),
    ),
  );
  const toggle = button(
    "Close the switch",
    () => {
      closed = !closed;
      focused = "";
      toggle.textContent = closed ? "Open the switch" : "Close the switch";
      toggle.setAttribute("aria-pressed", String(closed));
      render();
    },
    "button primary",
    { "aria-pressed": false },
  );
  render();
  const { dialog } = modal(
    figure.title,
    [
      h("p", { class: "eyebrow" }, "LOOK CLOSER · ORIGINAL SCIENCE MODEL"),
      h("p", null, figure.description),
      h(
        "p",
        { class: "figure-pan-hint" },
        icon("arrow", 16),
        "On a phone, swipe the diagram sideways to see every label.",
      ),
      art,
      h("p", { class: "figure-model-note" }, figure.limit),
      id === "circuit"
        ? h("div", { class: "circuit-controls" }, toggle, state)
        : null,
      controls,
      explanation,
    ],
    true,
  );
  dialog.classList.add("illustration-dialog");
}
export function illustrationsShelf() {
  return h(
    "section",
    { class: "illustration-shelf", "aria-label": "Science illustrations" },
    h("h2", null, "See the science"),
    h(
      "p",
      null,
      `${scienceFigures.length} labelled models to explore. Select a label, compare structures, and try opening or closing the circuit.`,
    ),
    h(
      "div",
      { class: "illustration-grid" },
      ...scienceFigures.map((figure) =>
        h(
          "article",
          { class: "illustration-card" },
          illustrationPreview(figure.id),
          h("h3", null, figure.title),
          h("p", null, figure.description),
          button(
            "Explore illustration",
            () => illustrationExplorer(figure.id),
            "button outline",
            { "aria-label": `Explore ${figure.title}` },
          ),
        ),
      ),
    ),
  );
}
