import { branches, decks, deckById, branchById } from "../data/catalog";
import { currentUser, getState, dispatch, loadDeck, clock } from "../store";
import { dayKey } from "../core/time";
import { hashSeed, seededRng, shuffle } from "../core/random";
import { levelOf, recommendDifficulty } from "../core/rules";
import type { Difficulty, Run } from "../core/types";
import { h, button, modal, progress, toast, input, field } from "./dom";
import { icon, mascot, diagram } from "./svg";
import { act, go } from "./actions";
import { pageHeading } from "./shell";
export function islandPage() {
  const u = currentUser()!,
    r = getState().rules;
  return h(
    "div",
    { class: "page-enter" },
    pageHeading(
      "FOLLOW YOUR CURIOSITY",
      "A whole island of a-ha moments.",
      "Five little worlds. One big adventure in science.",
    ),
    h(
      "section",
      { class: "island-map paper", "aria-label": "Science Island branch map" },
      h("div", { class: "map-cloud cloud-one" }),
      h("div", { class: "map-cloud cloud-two" }),
      h(
        "span",
        { class: "map-compass" },
        icon("island", 25),
        "YOUR CURIOSITY GOES HERE",
      ),
      ...branches.map((b, i) => {
        const locked = b.id === "skills" && levelOf(u, r) < r.skillsLevel;
        return button(
          h(
            "span",
            { class: "island-inner" },
            mascot(b.icon),
            h("strong", null, b.name),
            h(
              "span",
              null,
              locked
                ? `Opens at Level ${r.skillsLevel}`
                : `${b.id === "skills" ? 3 : 6} decks to discover`,
            ),
            h(
              "span",
              { class: "island-go" },
              icon(locked ? "lock" : "arrow", 18),
            ),
          ),
          () =>
            locked
              ? toast(
                  `Keep growing! The Science Skills Lab opens at Level ${r.skillsLevel}. You’re Level ${levelOf(u, r)}.`,
                )
              : go(`/branch/${b.id}`),
          `map-island island-${i} ${b.color} ${locked ? "island-locked" : ""}`,
        );
      }),
      h(
        "span",
        { class: "map-caption" },
        "one little question can take you anywhere.",
      ),
    ),
    h(
      "div",
      { class: "island-footnote" },
      icon("sprout", 17),
      "Your grade helps us recommend a starting point. Explore any branch, at your own pace.",
    ),
  );
}
export function branchPage(id: string) {
  const b = branchById(id);
  if (!b)
    return h(
      "div",
      null,
      "This branch hasn’t grown here.",
      button("Back to the island", () => go("/island")),
    );
  const u = currentUser()!,
    r = getState().rules;
  if (id === "skills" && levelOf(u, r) < r.skillsLevel)
    return h(
      "div",
      { class: "empty-state paper" },
      mascot("cat"),
      h("h1", null, "A little more growing to do"),
      h(
        "p",
        null,
        `The Science Skills Lab opens at Level ${r.skillsLevel}. You’re Level ${levelOf(u, r)}.`,
      ),
      button("Explore the island", () => go("/island"), "button primary"),
    );
  const search = input("search", "Find a little discovery…");
  search.required = false;
  search.setAttribute("aria-label", "Search decks");
  const list = h("div", { class: "deck-grid" });
  const render = () => {
    const filtered = decks.filter(
      (d) =>
        d.branch === id &&
        `${d.name} ${d.description}`
          .toLowerCase()
          .includes(search.value.toLowerCase()),
    );
    list.replaceChildren(
      ...filtered.map((d) => {
        const m = u.mastery[d.id],
          mastery = m ? (m.correct / Math.max(1, m.attempts)) * 100 : 0;
        return h(
          "article",
          { class: "deck-card paper" },
          button(
            h(
              "span",
              { class: `deck-art ${b.color}` },
              diagram(d.diagram),
              d.grades.includes(u.grade)
                ? h(
                    "span",
                    { class: "recommended-tag" },
                    icon("sparkles", 12),
                    "FOR YOUR GRADE",
                  )
                : null,
            ),
            () => openDeck(d.id),
            "deck-art-button",
            { "aria-label": `Open ${d.name}` },
          ),
          h(
            "div",
            { class: "deck-card-body" },
            h("h2", null, d.name),
            h("p", { class: "muted" }, d.description),
            h(
              "div",
              { class: "deck-meta" },
              h("span", null, icon("box", 14), "36 cards"),
              h("span", null, icon("clock", 14), "5 min / run"),
            ),
            h(
              "div",
              { class: "mastery-label" },
              h("span", null, "Your understanding"),
              h("strong", null, `${Math.round(mastery)}%`),
            ),
            progress(mastery, `${d.name} mastery`),
            button(
              h(
                "span",
                null,
                m?.completed ? "Discover a little more" : "Open this deck",
                icon("arrow", 16),
              ),
              () => openDeck(d.id),
              "button subtle full",
            ),
          ),
        );
      }),
    );
    if (!filtered.length)
      list.append(
        h(
          "p",
          { class: "muted" },
          "No decks with that name. Try a different little clue.",
        ),
      );
  };
  search.addEventListener("input", render);
  render();
  return h(
    "div",
    { class: "page-enter" },
    h("a", { class: "back-link", href: "#/island" }, "← Back to the island"),
    pageHeading(
      `MEET ${b.mascot.toUpperCase()}`,
      b.name,
      b.description,
      h("div", { class: `branch-avatar ${b.color}` }, mascot(b.icon)),
    ),
    h(
      "div",
      { class: "branch-toolbar" },
      h(
        "span",
        null,
        `${decks.filter((d) => d.branch === id).length} decks · Little steps, lasting knowledge`,
      ),
      h("div", { class: "search-field" }, icon("search", 18), search),
    ),
    list,
  );
}
export function openDeck(id: string, defaultLevel?: Difficulty) {
  const d = deckById(id);
  if (!d) return;
  const b = branchById(d.branch)!,
    m = currentUser()?.mastery[id];
  let level: Difficulty = defaultLevel ?? recommendDifficulty(m);
  const levels = h("div", { class: "difficulty-options" });
  const { close } = modal(d.name, [
    h("div", { class: `deck-sheet-art ${b.color}` }, diagram(d.diagram)),
    h("p", { class: "muted" }, d.description),
    h("p", { class: "eyebrow" }, "MAKE YOURSELF COMFORTABLE"),
    levels,
    h(
      "div",
      { class: "deck-meta centered" },
      h("span", null, icon("box", 15), "8 cards"),
      h("span", null, icon("clock", 15), "About 5 minutes"),
      h("span", null, icon("coin", 15), "Merits + XP"),
    ),
    button(
      h("span", null, "Let’s make a discovery", icon("arrow", 17)),
      act(async () => {
        await startDeck(id, level);
        close();
      }),
      "button primary full",
    ),
    button(
      "Share a little challenge",
      () => {
        const seed = crypto.getRandomValues(new Uint32Array(1))[0],
          url = `${location.origin}${location.pathname}#/challenge/${id}?level=${level}&seed=${seed}`;
        const link = input("challenge", "", url);
        link.readOnly = true;
        link.addEventListener("focus", () => link.select());
        close();
        modal("A discovery is better shared.", [
          h(
            "p",
            { class: "muted" },
            `Your friend can play the same ${level} cards in the same order. Their progress and merit cap stay their own.`,
          ),
          field("Your seeded challenge link", link),
          button(
            "Copy my little challenge",
            act(async () => {
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
                toast("Challenge link copied.");
              } else {
                link.select();
                toast("Select and copy the challenge link above.");
              }
            }),
            "button primary full",
          ),
        ]);
      },
      "text-button full share-challenge",
    ),
    h("p", { class: "source-note" }, d.sourceNote),
    h(
      "p",
      { class: "fine-print" },
      "Hints are welcome. Mix-ups help you learn. Your daily play merits are capped so steady effort beats grinding.",
    ),
  ]);
  const renderLevels = () =>
    levels.replaceChildren(
      ...(["easy", "medium", "hard"] as Difficulty[]).map((l, i) =>
        button(
          h(
            "span",
            null,
            h(
              "strong",
              null,
              ["Easy peasy", "A little stretch", "Big brain time"][i],
            ),
            h(
              "small",
              null,
              ["Recall & recognize", "Apply & explain", "Analyze & reason"][i],
            ),
          ),
          () => {
            level = l;
            renderLevels();
          },
          `difficulty-option ${level === l ? "selected" : ""}`,
          { "aria-pressed": level === l },
        ),
      ),
    );
  renderLevels();
}
export async function startDeck(
  id: string,
  level: Difficulty = "medium",
  mode: Run["mode"] = "practice",
  seed?: number,
  selectedIds?: string[],
) {
  const bank = await loadDeck(id),
    u = currentUser();
  if (!u) throw new Error("Please sign in or explore as a guest.");
  const rng = seededRng(seed ?? crypto.getRandomValues(new Uint32Array(1))[0]);
  const pool = selectedIds
    ? bank.filter((q) => selectedIds.includes(q.id))
    : bank.filter((q) => q.level === level);
  if (!pool.length)
    throw new Error("This deck has no available cards at that level.");
  const ids = shuffle(pool, rng)
      .slice(0, 8)
      .map((q) => q.id),
    runId = crypto.randomUUID();
  await dispatch({
    type: "StartRun",
    run: { id: runId, deckId: id, level, ids, mode },
  });
  go(`/play/${runId}`);
}
export const dailyDeck = () => {
  const s = getState(),
    today = dayKey(clock, s.rules.timezone);
  return decks.filter((d) => d.branch !== "skills")[hashSeed(today) % 24];
};
