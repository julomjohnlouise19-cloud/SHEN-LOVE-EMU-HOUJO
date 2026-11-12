import { branches, decks, deckById } from "../data/catalog";
import {
  referencesFor,
  referenceCitation,
  type ScienceReference,
} from "../data/references";
import { loadDeck, currentUser } from "../store";
import type { Question } from "../core/types";
import { h, button, modal, input, field, toast } from "./dom";
function referenceCard(ref: ScienceReference) {
  const citation = referenceCitation(ref);
  return h(
    "article",
    { class: "reference-card publisher-reference" },
    h(
      "div",
      { class: "reference-heading" },
      h("small", null, ref.publisher),
      ref.format ? h("span", { class: "reference-format" }, ref.format) : null,
    ),
    h("h4", null, ref.title),
    h("p", null, ref.focus),
    h("p", { class: "reference-domain" }, new URL(ref.url).hostname),
    h(
      "div",
      { class: "reference-actions" },
      h(
        "a",
        {
          href: ref.url,
          class: "button outline",
          rel: "external noreferrer",
          "aria-label": `Open ${ref.title} from ${ref.publisher}`,
        },
        ref.format ? "Open official PDF →" : "Open publisher page →",
      ),
      button(
        "Copy citation",
        async () => {
          try {
            if (!navigator.clipboard?.writeText)
              throw new Error("Clipboard unavailable");
            await navigator.clipboard.writeText(citation);
            toast("Source citation copied.");
          } catch {
            const text = h("textarea", { rows: 6, readonly: true }, citation);
            const select = () => {
              text.focus();
              text.select();
            };
            modal("Keep this source", [
              h(
                "p",
                null,
                "Select the citation, then use your device’s Copy command. The address at the end can also be pasted into your browser.",
              ),
              field("Source citation and address", text),
              button("Select citation", select, "button primary"),
            ]);
            select();
          }
        },
        "button outline",
        { "aria-label": `Copy citation for ${ref.title}` },
      ),
    ),
  );
}
function localReading(deckId: string) {
  const deck = deckById(deckId);
  const owner = currentUser()?.id;
  const body = h("div", { class: "local-reading-body" });
  const details = h(
    "details",
    { class: "local-reading" },
    h("summary", null, `Read ${deck?.name ?? "science"} notes in the lab`),
    h(
      "p",
      null,
      "These are lab-authored learning notes from this deck’s reviewed explanations. They are not an official curriculum document or copied textbook pages.",
    ),
    body,
  );
  let loaded = false,
    loading = false;
  const load = async () => {
    if (loading || loaded) return;
    loading = true;
    body.replaceChildren(
      h("p", { role: "status" }, "Opening your topic notes…"),
    );
    try {
      const bank = await loadDeck(deckId);
      if (!details.isConnected || currentUser()?.id !== owner) return;
      const facts = [
        ...new Set(
          bank
            .filter((q) => q.reviewed && q.level === "easy")
            .map((q) => q.scienceFact.trim())
            .filter(Boolean),
        ),
      ];
      if (!facts.length)
        throw new Error("No reviewed notes are available for this deck yet.");
      body.replaceChildren(
        h(
          "ul",
          { class: "topic-reading-notes" },
          ...facts.map((fact) => h("li", null, fact)),
        ),
        h(
          "small",
          null,
          "Notes use the deck available on this device. Practice calculations and tables use constructed teaching examples. After the lab finishes caching, these notes can be read offline.",
        ),
      );
      loaded = true;
    } catch {
      body.replaceChildren(
        h(
          "p",
          { role: "status" },
          "These notes could not load. Reconnect once to save the deck on this device, then try again.",
        ),
        button("Try loading notes again", load, "button outline"),
      );
    } finally {
      loading = false;
    }
  };
  details.addEventListener("toggle", () => {
    if (details.open) void load();
  });
  return details;
}
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
    localReading(deckId),
    button(
      `Read the complete ${deck?.name ?? "science"} study guide`,
      async () => {
        (await import("./study-library")).studyGuideModal(deckId);
      },
      "button outline",
    ),
    h("h3", { class: "publisher-heading" }, "Supporting publications"),
    ...referencesFor(deckId).map(referenceCard),
    h(
      "small",
      null,
      "Publisher links open in this tab. Use your browser’s Back button to return. If a publisher is unavailable, read the lab notes above or copy its citation and address. External pages need an internet connection.",
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
type ReadingShelf = "notes" | "periodic" | "illustrations" | "documents";
const shelfNames: Record<ReadingShelf, string> = {
  notes: "Study notes & sources",
  periodic: "Periodic table",
  illustrations: "Illustrations",
  documents: "PDF documents",
};
let mountedRoom:
  | {
      owner: string | undefined;
      node: HTMLElement;
      choose: (shelf: ReadingShelf, persist?: boolean) => void;
    }
  | undefined;
export async function sourcesPage() {
  const requested =
    new URLSearchParams(location.hash.split("?")[1]).get("view") ?? "notes";
  const initial: ReadingShelf = Object.hasOwn(shelfNames, requested)
    ? (requested as ReadingShelf)
    : "notes";
  const owner = currentUser()?.id;
  if (mountedRoom && mountedRoom.owner === owner) {
    mountedRoom.choose(initial, false);
    return mountedRoom.node;
  }
  const [
    { studyGuideButton, documentsShelf },
    { periodicTableShelf },
    { illustrationsShelf, illustrationCount },
    { guideByDeck },
  ] = await Promise.all([
    import("./study-library"),
    import("./periodic-table"),
    import("./science-figures"),
    import("../data/study-guides"),
  ]);
  const list = h("div", { class: "reading-grid" });
  const search = input("source-search", "Find a science topic…", "", "search");
  search.required = false;
  const branch = h(
    "select",
    null,
    h("option", { value: "" }, "All science branches"),
    ...branches.map((b) => h("option", { value: b.id }, b.name)),
  );
  const count = h("p", { role: "status", class: "reading-count" });
  const clear = button(
    "Clear filters",
    () => {
      search.value = "";
      branch.value = "";
      update();
      search.focus();
    },
    "button outline",
  );
  const update = () => {
    const matching = decks.filter(
      (d) =>
        (!branch.value || d.branch === branch.value) &&
        `${d.name} ${d.description} ${d.sourceNote} ${guideByDeck(d.id)?.introduction ?? ""}`
          .toLowerCase()
          .includes(search.value.toLowerCase().trim()),
    );
    count.textContent = `${matching.length} of ${decks.length} science decks`;
    clear.disabled = !search.value && !branch.value;
    list.replaceChildren(
      ...matching.map((d) =>
        h(
          "article",
          { class: "reference-card" },
          h("h2", null, d.name),
          h("p", null, d.description),
          h(
            "p",
            { class: "study-card-meta" },
            "Concept notes · worked example · self-check",
          ),
          studyGuideButton(d.id),
          sourceButton(d.id),
        ),
      ),
    );
    if (!matching.length)
      list.append(
        h(
          "div",
          { class: "reading-empty" },
          h("h2", null, "Let’s try another science idea"),
          h(
            "p",
            null,
            "No decks match these filters. Try cells, energy or weather, or clear the filters to see every deck.",
          ),
        ),
      );
  };
  search.addEventListener("input", update);
  branch.addEventListener("change", update);
  update();
  const notes = h(
    "section",
    { "aria-label": "Study notes and sources" },
    h("h2", { tabindex: -1 }, "Choose your next discovery"),
    h(
      "p",
      null,
      "Each topic has a full study guide and its original supporting sources. Use the examples to practise, then reveal the self-check explanation.",
    ),
    h(
      "div",
      { class: "reading-filters" },
      field("Search science references", search),
      field("Filter sources by science branch", branch),
      clear,
    ),
    count,
    list,
  );
  const host = h("div", { class: "reading-shelf-content" });
  const nav = h("nav", {
    class: "reading-shelves",
    "aria-label": "Reading room shelves",
  });
  let active: ReadingShelf | undefined;
  const nodes = new Map<ReadingShelf, HTMLElement>([["notes", notes]]);
  const choose = (shelf: ReadingShelf, persist = true) => {
    if (persist) {
      const params = new URLSearchParams(location.hash.split("?")[1]);
      if (shelf === "notes") params.delete("view");
      else params.set("view", shelf);
      history.replaceState(
        null,
        "",
        `#/sources${params.size ? `?${params}` : ""}`,
      );
    }
    if (active === shelf) return;
    active = shelf;
    if (!nodes.has(shelf))
      nodes.set(
        shelf,
        shelf === "periodic"
          ? periodicTableShelf()
          : shelf === "illustrations"
            ? illustrationsShelf()
            : documentsShelf((id) => {
                branch.value = id;
                search.value = "";
                update();
                choose("notes");
                notes
                  .querySelector<HTMLElement>("h2")
                  ?.focus({ preventScroll: true });
              }),
      );
    host.replaceChildren(nodes.get(shelf)!);
    nav
      .querySelectorAll<HTMLElement>("[data-reading-shelf]")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String(node.dataset.readingShelf === shelf),
        ),
      );
  };
  nav.append(
    ...(Object.keys(shelfNames) as ReadingShelf[]).map((id) =>
      button(shelfNames[id], () => choose(id), "button outline", {
        "data-reading-shelf": id,
        "aria-pressed": id === initial,
      }),
    ),
  );
  const room = h(
    "div",
    { class: "reading-room page-enter" },
    h("p", { class: "eyebrow" }, "CURIOUS MINDS CHECK THE EVIDENCE"),
    h("h1", null, "The science reading room"),
    h(
      "p",
      null,
      "Open a notebook, explore an element, or look closer at a science model. Your sources are here too, with original learning materials you can read and keep.",
    ),
    h(
      "div",
      { class: "reading-library-intro" },
      h("span", null, h("strong", null, "27"), " topic guides"),
      h("span", null, h("strong", null, "118"), " elements"),
      h("span", null, h("strong", null, illustrationCount), " science models"),
      h("span", null, h("strong", null, "5"), " PDF handbooks"),
    ),
    nav,
    host,
  );
  search.addEventListener("search", update);
  choose(initial, false);
  mountedRoom = { owner, node: room, choose };
  return room;
}
