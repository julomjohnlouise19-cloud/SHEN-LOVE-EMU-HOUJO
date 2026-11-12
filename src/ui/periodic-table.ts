import {
  elements,
  elementFamilies,
  elementExamples,
  type ChemicalElement,
} from "../data/elements";
import { periodicReference } from "../data/references";
import { h, button, input, field, modal } from "./dom";
import { icon } from "./svg";

export function periodicTableShelf() {
  let selected = elements[5],
    mode: "table" | "cards" = matchMedia("(max-width: 650px)").matches
      ? "cards"
      : "table";
  const search = input("element-search", "Carbon, C, 6…", "", "search");
  search.required = false;
  const family = h(
    "select",
    null,
    h("option", { value: "" }, "Every element family"),
    ...Object.entries(elementFamilies).map(([id, value]) =>
      h("option", { value: id }, value.name),
    ),
  );
  const count = h("p", { class: "element-count", role: "status" });
  const diagram = h("div", { class: "periodic-view" });
  const detail = h("section", {
    class: "element-detail",
    "aria-label": "Selected element",
    "aria-live": "polite",
  });
  const tableMode = button(
    "Table view",
    () => {
      mode = "table";
      update();
    },
    "button outline",
  );
  const cardsMode = button(
    "Card view",
    () => {
      mode = "cards";
      update();
    },
    "button outline",
  );
  const select = (element: ChemicalElement) => {
    selected = element;
    diagram
      .querySelectorAll<HTMLElement>("[data-element-number]")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String(Number(node.dataset.elementNumber) === selected.number),
        ),
      );
    showDetail();
    const { dialog } = modal(`${selected.name} · element guide`, [detail]);
    dialog.classList.add("element-guide-dialog");
  };
  const tile = (element: ChemicalElement) =>
    button(
      h(
        "span",
        null,
        h("small", null, element.number),
        h("strong", null, element.symbol),
        h("span", null, element.name),
      ),
      () => select(element),
      "element-tile",
      {
        "aria-label": `${element.number} ${element.name} (${element.symbol})`,
        "aria-pressed": element.number === selected.number,
        "data-element-number": element.number,
        style: {
          "--element-color": elementFamilies[element.family].color,
          gridColumn: element.column + 1,
          gridRow: element.row + 1,
        },
      },
    );
  function showDetail() {
    const f = elementFamilies[selected.family];
    detail.replaceChildren(
      h(
        "div",
        { class: "element-identity", style: { "--element-color": f.color } },
        h("span", { class: "element-big-symbol" }, selected.symbol),
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "EXPLORE AN ELEMENT"),
          h("h3", null, selected.name),
          h("p", null, f.name),
        ),
      ),
      h(
        "dl",
        { class: "element-facts" },
        ...[
          ["Atomic number", String(selected.number)],
          ["Protons", String(selected.number)],
          ["Electrons if neutral", String(selected.number)],
          ["Period", String(selected.period)],
          [
            "Group",
            selected.group === null
              ? "f-series; see placement note"
              : String(selected.group),
          ],
        ].map(([label, value]) =>
          h("div", null, h("dt", null, label), h("dd", null, value)),
        ),
      ),
      h(
        "p",
        null,
        elementExamples[selected.symbol] ??
          (selected.number >= 104
            ? "This short-lived synthetic element has been produced in tiny quantities. Many physical and chemical properties remain uncertain; its table position does not establish everyday uses or a measured room-temperature state."
            : `An atom with ${selected.number} protons is ${selected.name.toLowerCase()}. A neutral atom has ${selected.number} electrons; ions can have a different electron count. Isotopes keep the proton count and vary in neutron count.`),
      ),
      h("p", { class: "element-family-note" }, f.note),
      h(
        "a",
        {
          href: periodicReference.url,
          rel: "external noreferrer",
          class: "text-button",
        },
        "IUPAC · Periodic Table of the Elements →",
      ),
    );
  }
  function update() {
    const query = search.value.trim().toLowerCase();
    const symbolMatch = query
      ? elements.find((e) => e.symbol.toLowerCase() === query)
      : undefined;
    const matching = elements.filter(
      (e) =>
        (!family.value || e.family === family.value) &&
        (!query ||
          (symbolMatch
            ? e.number === symbolMatch.number
            : /^\d+$/.test(query)
              ? e.number === Number(query)
              : `${e.name} ${e.symbol === "Al" ? "aluminum" : ""} ${e.symbol === "Cs" ? "cesium" : ""}`
                  .toLowerCase()
                  .includes(query))),
    );
    count.textContent = `${matching.length} of 118 elements`;
    tableMode.setAttribute("aria-pressed", String(mode === "table"));
    cardsMode.setAttribute("aria-pressed", String(mode === "cards"));
    if (!matching.length) {
      diagram.replaceChildren(
        h(
          "div",
          { class: "reading-empty" },
          h("h3", null, "No elements match yet"),
          h(
            "p",
            null,
            "Try a name, symbol or atomic number, or clear the filters.",
          ),
        ),
      );
      return;
    }
    if (mode === "cards")
      diagram.replaceChildren(
        h(
          "div",
          { class: "element-cards", "aria-label": "Element cards" },
          ...matching.map(tile),
        ),
      );
    else {
      const grid = h(
        "div",
        {
          class: "periodic-grid",
          "aria-label": "Periodic table arranged by groups and periods",
        },
        h(
          "span",
          { class: "periodic-corner", style: { gridColumn: 1, gridRow: 1 } },
          "Period",
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          h(
            "span",
            {
              class: "periodic-group",
              style: { gridColumn: i + 2, gridRow: 1 },
            },
            String(i + 1),
          ),
        ),
        ...Array.from({ length: 7 }, (_, i) =>
          h(
            "span",
            {
              class: "periodic-period",
              style: { gridColumn: 1, gridRow: i + 2 },
            },
            String(i + 1),
          ),
        ),
        h(
          "span",
          {
            class: "periodic-series-label",
            style: { gridColumn: "1 / 4", gridRow: 10 },
          },
          "Lanthanides · period 6",
        ),
        h(
          "span",
          {
            class: "periodic-series-label",
            style: { gridColumn: "1 / 4", gridRow: 11 },
          },
          "Actinides · period 7",
        ),
        button(
          "57–71",
          () => {
            select(elements[56]);
          },
          "periodic-series-jump",
          {
            style: { gridColumn: 4, gridRow: 7 },
            "aria-label": "Explore the lanthanide series",
          },
        ),
        button(
          "89–103",
          () => {
            select(elements[88]);
          },
          "periodic-series-jump",
          {
            style: { gridColumn: 4, gridRow: 8 },
            "aria-label": "Explore the actinide series",
          },
        ),
        ...matching.map(tile),
      );
      diagram.replaceChildren(
        h(
          "p",
          { class: "figure-pan-hint" },
          icon("arrow", 16),
          "Groups run down columns; periods run across rows. Scroll the table sideways on smaller screens, or use Card view.",
        ),
        h(
          "div",
          {
            class: "periodic-scroll",
            role: "region",
            tabindex: 0,
            "aria-label": "Scrollable periodic table",
          },
          grid,
        ),
      );
    }
  }
  const clear = button(
    "Clear element filters",
    () => {
      search.value = "";
      family.value = "";
      update();
      search.focus();
    },
    "button outline",
  );
  search.addEventListener("input", update);
  family.addEventListener("change", update);
  update();
  showDetail();
  return h(
    "section",
    { class: "periodic-shelf", "aria-label": "Interactive periodic table" },
    h("h2", null, "118 little building blocks"),
    h(
      "p",
      null,
      "Explore every named element. Select a tile to learn its atomic number, proton count, family and position. Atomic number identifies an element; it is not the same as atomic weight.",
    ),
    h(
      "div",
      { class: "element-filters" },
      field("Find an element", search),
      field("Filter by element family", family),
      clear,
    ),
    h(
      "div",
      { class: "element-view-controls", "aria-label": "Element layout" },
      tableMode,
      cardsMode,
    ),
    count,
    h(
      "div",
      { class: "element-legend", "aria-label": "Element family colours" },
      ...Object.entries(elementFamilies).map(([id, value]) =>
        button(
          h(
            "span",
            null,
            h("i", { "aria-hidden": true, style: { background: value.color } }),
            value.name,
          ),
          () => {
            family.value = family.value === id ? "" : id;
            update();
          },
          "element-legend-button",
          { "aria-label": `Filter ${value.name}` },
        ),
      ),
    ),
    h(
      "p",
      { class: "element-detail-hint" },
      "Choose a tile to open its element guide. Close the guide to return to your place in the table.",
    ),
    diagram,
    h(
      "aside",
      { class: "periodic-notes" },
      h("h3", null, "Read the model carefully"),
      h(
        "p",
        null,
        "The 57–71 and 89–103 series belong to periods 6 and 7. Their group-3 connections are displayed differently in some conventions. Family boundaries such as metalloids can also vary. This chart leaves f-series group numbers unspecified.",
      ),
      h(
        "p",
        null,
        "A specified isotope's mass number is protons plus neutrons. Official standard atomic weights account for isotopic composition and may be intervals. See IUPAC for its published values.",
      ),
      h(
        "a",
        {
          href: periodicReference.url,
          rel: "external noreferrer",
          class: "text-button",
        },
        "Open the IUPAC periodic-table reference →",
      ),
    ),
  );
}
