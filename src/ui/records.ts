import { currentUser } from "../store";
import { cloudRecords, type CloudRecord } from "../store/cloud";
import { csvCell } from "../core/cloud-records";
import { decks } from "../data/catalog";
import { h, button, download, modal } from "./dom";
import { pageHeading, empty } from "./shell";
import { go, refresh } from "./actions";

export async function recordsPage(teacherOnly = false) {
  const viewer = currentUser();
  if (!viewer || viewer.id === "guest")
    return empty(
      "notebook",
      "Your discoveries, together",
      "Sign in with a cloud account to save completed quiz records. Guest practice stays on this device.",
    );
  const params = new URLSearchParams(location.hash.split("?")[1]);
  const offset = Math.max(
    0,
    Math.min(1_000_000, Math.floor(Number(params.get("offset")) || 0)),
  );
  const { rows, teacher } = await cloudRecords(offset);
  if (teacherOnly && !teacher)
    return empty(
      "cat",
      "Teacher access needed",
      "The database owner assigns teacher access. Your own records are available in Cloud quiz records.",
      button("My quiz records", () => go("/records"), "button primary"),
    );
  const title = teacher ? "Your class discoveries" : "Your cloud quiz records";
  const page = h(
    "div",
    { class: "records-page" },
    pageHeading(
      teacher ? "TEACHER REPORTS" : "SAVED DISCOVERIES",
      title,
      "Completed quizzes saved in Supabase, graded against the published science bank.",
    ),
    h(
      "p",
      { class: "notice" },
      "These records include names, grades, sections and submitted answers. They record practice, rather than supervised exam results. Merits, supplies, notebook and unfinished runs remain local demos.",
    ),
  );
  function details(row: CloudRecord) {
    if (currentUser()?.id !== viewer!.id) return;
    modal(
      `${row.display_name} · ${row.correct}/${row.total}`,
      [
        h(
          "p",
          { class: "muted" },
          `${deckName(row.deck_id)} · ${row.level} · ${date(row.received_at)}`,
        ),
        ...row.responses.map((response, i) =>
          h(
            "article",
            { class: "record-answer" },
            h("h3", null, `${i + 1}. ${response.prompt}`),
            h(
              "p",
              null,
              "Answer: ",
              typeof response.value === "string"
                ? response.value
                : JSON.stringify(response.value),
            ),
            h(
              "p",
              null,
              response.correct ? "Correct" : "Keep exploring",
              response.misconception ? ` · ${response.misconception}` : "",
            ),
          ),
        ),
      ],
      true,
    );
  }
  page.append(
    h(
      "div",
      { class: "records-actions" },
      button("Refresh records", refresh, "button outline"),
      button(
        "Download this page as CSV",
        () => {
          if (currentUser()?.id !== viewer.id) return;
          const data = [
            [
              "Name",
              "Grade",
              "Section",
              "Deck",
              "Level",
              "Mode",
              "Correct",
              "Total",
              "Saved at (UTC)",
            ],
            ...rows.map((r) => [
              r.display_name,
              r.grade,
              r.section,
              deckName(r.deck_id),
              r.level,
              r.mode,
              r.correct,
              r.total,
              r.received_at,
            ]),
          ];
          download(
            "cozy-science-quiz-records.csv",
            "\uFEFF" +
              data.map((row) => row.map(csvCell).join(",")).join("\r\n"),
            "text/csv;charset=utf-8",
          );
        },
        "button outline",
        { disabled: rows.length === 0 },
      ),
    ),
  );
  if (!rows.length)
    page.append(
      empty(
        "notebook",
        offset
          ? "No more records on this page"
          : "Your first discovery is waiting",
        offset
          ? "Return to the previous page to see earlier results."
          : "Finish a quiz while signed in. Its record appears here after upload.",
        button(
          offset ? "Previous page" : "Explore Science Island",
          () =>
            go(
              offset
                ? `/records?offset=${Math.max(0, offset - 100)}`
                : "/island",
            ),
          "button primary",
        ),
      ),
    );
  else
    page.append(
      h(
        "div",
        { class: "table-wrap" },
        h(
          "table",
          null,
          h(
            "caption",
            null,
            `Records ${offset + 1}–${offset + rows.length}. CSV contains this page only.`,
          ),
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              ...[
                "Scientist",
                "Grade / section",
                "Discovery",
                "Score",
                "Saved",
                "Answers",
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
                h("td", null, row.display_name),
                h("td", null, `${row.grade} / ${row.section || "—"}`),
                h(
                  "td",
                  null,
                  deckName(row.deck_id),
                  h(
                    "small",
                    { class: "record-meta" },
                    `${row.level} · ${row.mode}`,
                  ),
                ),
                h("td", null, `${row.correct}/${row.total}`),
                h("td", null, date(row.received_at)),
                h(
                  "td",
                  null,
                  button("View answers", () => details(row), "text-button", {
                    "aria-label": `View answers for ${row.display_name}, ${date(row.received_at)}`,
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  page.append(
    h(
      "nav",
      { class: "records-actions", "aria-label": "Quiz record pages" },
      button(
        "Previous 100",
        () => go(`/records?offset=${Math.max(0, offset - 100)}`),
        "button outline",
        { disabled: offset === 0 },
      ),
      button(
        "Next 100",
        () => go(`/records?offset=${offset + 100}`),
        "button outline",
        { disabled: rows.length < 100 || offset >= 1_000_000 },
      ),
    ),
  );
  return page;
}
function deckName(id: string) {
  return decks.find((d) => d.id === id)?.name ?? id;
}
function date(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
