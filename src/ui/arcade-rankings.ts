import { currentUser } from "../store";
import { cloudEnabled } from "../store/cloud";
import { arcadeRankings } from "../store/arcade";
import type { ArcadeCategory } from "../core/arcade";
import { button, h } from "./dom";
import { empty, pageHeading } from "./shell";
import { go } from "./actions";
const categories: [ArcadeCategory | "all", string][] = [
  ["all", "All sciences"],
  ["life", "Biology"],
  ["chemistry", "Chemistry"],
  ["physics", "Physics"],
  ["earth", "Earth & space"],
];
export function arcadeLeaderboardPage() {
  const viewer = currentUser()!,
    content = h("div");
  let selected: ArcadeCategory | "all" = "all",
    sequence = 0;
  const controls = h(
    "div",
    {
      class: "filter-tabs",
      role: "group",
      "aria-label": "Arcade ranking categories",
    },
    ...categories.map(([value, label]) =>
      button(
        label,
        () => {
          selected = value;
          void load();
        },
        "filter-tab",
        { "data-ranking-category": value },
      ),
    ),
  );
  const page = h(
    "div",
    { class: "page-enter arcade-rankings" },
    pageHeading(
      "THE DISCOVERY FAIR",
      "A little friendly competition",
      "Your best discoveries, celebrated together.",
      button("Play Science Arcade", () => go("/arcade"), "button primary"),
    ),
    h(
      "section",
      { class: "arcade-hero" },
      h("span", { class: "pill" }, "AIM · LEARN · GROW"),
      h("h2", null, "Bright minds. Brilliant little shots."),
      h(
        "p",
        null,
        "One best completed round per scientist. Keep practising, build a combo and see how far your curiosity can take you.",
      ),
    ),
    controls,
    content,
    h(
      "p",
      { class: "fine-print" },
      cloudEnabled && viewer.id !== "guest"
        ? "Scores come from completed class rounds. Your display name and best score are visible to signed-in classmates."
        : "These best scores are saved on this device.",
    ),
  );
  async function load() {
    const id = ++sequence;
    controls
      .querySelectorAll<HTMLElement>("[data-ranking-category]")
      .forEach((node) => {
        node.classList.toggle(
          "selected",
          node.dataset.rankingCategory === selected,
        );
        node.setAttribute(
          "aria-pressed",
          String(node.dataset.rankingCategory === selected),
        );
      });
    content.replaceChildren(
      h("p", { role: "status" }, "Finding our brightest shots…"),
    );
    try {
      const rows = await arcadeRankings(selected);
      if (id !== sequence || currentUser()?.id !== viewer.id) return;
      content.replaceChildren(
        rows.length
          ? h(
              "div",
              { class: "table-wrap teacher-table" },
              h(
                "table",
                null,
                h("caption", null, "Best completed Science Arcade rounds"),
                h(
                  "thead",
                  null,
                  h(
                    "tr",
                    null,
                    ...[
                      "Rank",
                      "Scientist",
                      "Science",
                      "Best score",
                      "Discoveries",
                    ].map((label) => h("th", { scope: "col" }, label)),
                  ),
                ),
                h(
                  "tbody",
                  null,
                  ...rows.map((row) =>
                    h(
                      "tr",
                      null,
                      h(
                        "td",
                        null,
                        row.rank <= 3
                          ? `${["🥇", "🥈", "🥉"][row.rank - 1]} ${row.rank}`
                          : row.rank,
                      ),
                      h(
                        "td",
                        null,
                        row.display_name,
                        row.user_id === viewer.id
                          ? h(
                              "small",
                              { class: "record-meta" },
                              "Your best round",
                            )
                          : null,
                      ),
                      h(
                        "td",
                        null,
                        categories.find(([id]) => id === row.category)?.[1] ??
                          row.category,
                      ),
                      h(
                        "td",
                        null,
                        h("strong", null, row.score.toLocaleString()),
                      ),
                      h("td", null, `${row.correct}/9`),
                    ),
                  ),
                ),
              ),
            )
          : empty(
              "cat",
              "Your first bullseye is waiting",
              "Complete a Science Arcade round to save your best score.",
              button(
                "Find my first discovery",
                () => go("/arcade"),
                "button primary",
              ),
            ),
      );
    } catch (error) {
      content.replaceChildren(
        empty(
          "cat",
          "The board needs a moment",
          error instanceof Error ? error.message : "Please try again.",
          button("Refresh leaderboard", load, "button primary"),
        ),
      );
    }
  }
  void load();
  return page;
}
