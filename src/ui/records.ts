import { currentUser, getState } from "../store";
import { hasStudio, studioData } from "../store/platform";
import { cloudUserId } from "../store/cloud";
import { icon } from "./svg";
import { cloudRecords, type CloudRecord } from "../store/cloud";
import { csvCell } from "../core/cloud-records";
import { decks } from "../data/catalog";
import {
  h,
  button,
  download,
  modal,
  field,
  input,
  responsiveTable,
} from "./dom";
import { pageHeading, empty } from "./shell";
import { go, refresh } from "./actions";

interface HistoryRow {
  id: string;
  user_id: string;
  display_name: string;
  grade: number;
  section: string;
  deck_id?: string;
  level?: string;
  mode?: string;
  correct: number;
  total: number;
  received_at: string;
  archived: boolean;
  teacher_note?: string;
  responses?: CloudRecord["responses"];
}
let mountedRecords: { id: string; node: HTMLElement } | undefined;
window.addEventListener("csl:platform", () => {
  if (!cloudUserId()) mountedRecords = undefined;
});
export async function recordsPage(teacherOnly = false) {
  const viewer = currentUser();
  if (!hasStudio() || !viewer || viewer.id === "guest")
    return legacyRecordsPage(teacherOnly);
  if (teacherOnly && viewer.role !== "admin")
    return empty(
      "lock",
      "Teacher access needed",
      "Open your personal history to review your discoveries.",
    );
  if (mountedRecords?.id === viewer.id) return mountedRecords.node;
  let offset = 0,
    total = 0,
    sequence = 0,
    rows: HistoryRow[] = [],
    stats: Record<string, number> = {};
  let filters: Record<string, string> = {
    self: teacherOnly ? "false" : "true",
    state: "active",
    sort: "newest",
  };
  const page = h("div", { class: "records-page page-enter" }),
    content = h("div");
  const search = input(
    "record-search",
    "A science deck or discovery",
    "",
    "search",
  );
  search.required = false;
  const from = input("record-from", "", "", "date"),
    to = input("record-to", "", "", "date");
  from.required = false;
  to.required = false;
  const deck = h(
    "select",
    null,
    h("option", { value: "" }, "All science decks"),
    ...decks.map((d) => h("option", { value: d.id }, d.name)),
  );
  const state = h(
    "select",
    null,
    ...[
      ["active", "Active records"],
      ["archived", "Archived records"],
      ["all", "All records"],
    ].map(([value, label]) => h("option", { value }, label)),
  );
  const sort = h(
    "select",
    null,
    ...[
      ["newest", "Newest first"],
      ["oldest", "Oldest first"],
      ["best", "Highest score first"],
    ].map(([value, label]) => h("option", { value }, label)),
  );
  const science = field("Science deck", deck);
  const filterForm = h(
    "form",
    {
      class: "record-filters",
      onSubmit: (event: SubmitEvent) => {
        event.preventDefault();
        filters = {
          ...filters,
          search: search.value,
          deck: deck.value,
          from: from.value,
          to: to.value,
          state: state.value,
          sort: sort.value,
        };
        offset = 0;
        void load();
      },
    },
    field("Search my records", search),
    science,
    field("Record state", state),
    field("From date", from),
    field("Through date", to),
    field("Order", sort),
    h(
      "div",
      { class: "record-filter-actions" },
      button("Apply record filters", () => undefined, "button primary", {
        type: "submit",
      }),
      button(
        "Clear filters",
        () => {
          search.value = "";
          deck.value = "";
          from.value = "";
          to.value = "";
          state.value = "active";
          sort.value = "newest";
          filters = { self: filters.self, state: "active", sort: "newest" };
          offset = 0;
          void load();
        },
        "button outline",
      ),
    ),
  );
  page.append(
    pageHeading(
      "YOUR DISCOVERY JOURNAL",
      "Your saved discoveries",
      "A clear history of your quizzes and the science you’re growing into.",
    ),
    h(
      "p",
      { class: "record-privacy" },
      icon("lock", 15),
      "Your signed-in discoveries are private to you and your teachers. Notebook pages and unfinished practice stay on this device.",
    ),
    filterForm,
    content,
  );
  function details(row: HistoryRow) {
    if (currentUser()?.id !== viewer!.id) return;
    modal(
      `${row.display_name} · ${row.correct}/${row.total}`,
      [
        h(
          "p",
          { class: "muted" },
          `${deckName(row.deck_id ?? "")} · ${date(row.received_at)}`,
        ),
        row.teacher_note
          ? h(
              "div",
              { class: "record-feedback-note" },
              h("strong", null, "A note from your teacher"),
              h("p", null, row.teacher_note),
            )
          : null,
        ...(row.responses ?? []).map((response, index) =>
          h(
            "article",
            { class: "record-answer" },
            h("h3", null, `${index + 1}. ${response.prompt}`),
            h(
              "p",
              null,
              "Answer: ",
              typeof response.value === "string"
                ? response.value
                : JSON.stringify(response.value),
            ),
            h("p", null, response.correct ? "Correct" : "Keep exploring"),
          ),
        ),
      ],
      true,
    );
  }
  function csv(data: HistoryRow[]) {
    const values = [
      [
        "Scientist",
        "Grade",
        "Section",
        "Discovery",
        "Level",
        "Correct",
        "Total",
        "Saved at (UTC)",
        "Archived",
        "Teacher note",
      ],
      ...data.map((r) => [
        r.display_name,
        r.grade,
        r.section,
        deckName(r.deck_id ?? ""),
        r.level ?? "",
        r.correct,
        r.total,
        r.received_at,
        r.archived ? "Yes" : "No",
        r.teacher_note ?? "",
      ]),
    ];
    download(
      "cozy-science-quiz-records.csv",
      "\uFEFF" + values.map((row) => row.map(csvCell).join(",")).join("\r\n"),
      "text/csv;charset=utf-8",
    );
  }
  async function exportAll() {
    const sourceFilters = { ...filters };
    const first = await studioData("quizzes", sourceFilters, 0);
    if (first.total > 20000)
      throw new Error("Narrow your filters to export up to 20,000 records.");
    const all = [...first.rows];
    for (let start = 50; start < first.total; start += 50)
      all.push(...(await studioData("quizzes", sourceFilters, start)).rows);
    if (new Set(all.map((row) => row.id)).size !== first.total)
      throw new Error(
        "Your history changed during export. Refresh and export again.",
      );
    if (currentUser()?.id === viewer!.id) csv(all as unknown as HistoryRow[]);
  }
  function recordTable(data: HistoryRow[]) {
    const body = data.map((row) =>
      h(
        "tr",
        null,
        h("td", null, row.display_name),
        h("td", null, `${row.grade} / ${row.section || "—"}`),
        h(
          "td",
          null,
          deckName(row.deck_id ?? ""),
          h("small", { class: "record-meta" }, row.level ?? "Three levels"),
          row.archived
            ? h("span", { class: "record-state" }, "Archived")
            : null,
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
    );
    const wrapper = h(
      "div",
      { class: "table-wrap" },
      h(
        "table",
        null,
        h(
          "caption",
          null,
          `${offset + 1}–${offset + data.length} of ${total} matching discoveries`,
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
              "Review",
            ].map((text) => h("th", { scope: "col" }, text)),
          ),
        ),
        h("tbody", null, ...body),
      ),
    );
    return responsiveTable(wrapper);
  }
  function draw() {
    const accuracy = stats.answers
      ? Math.round(((stats.correct ?? 0) / stats.answers) * 100)
      : 0;
    content.replaceChildren(
      h(
        "div",
        { class: "record-summary" },
        ...[
          [total, "Saved discoveries"],
          [`${accuracy}%`, "Answer accuracy"],
          [stats.correct ?? 0, "Correct answers"],
        ].map(([value, label]) =>
          h("div", null, h("strong", null, value), h("small", null, label)),
        ),
      ),
      h(
        "div",
        { class: "records-actions" },
        button("Refresh records", () => load(), "button outline"),
        button("Download this page as CSV", () => csv(rows), "button outline", {
          disabled: !rows.length,
        }),
        button("Export filtered records", exportAll, "button outline", {
          disabled: !total,
        }),
      ),
      rows.length
        ? recordTable(rows)
        : empty(
            "notebook",
            state.value === "archived"
              ? "Your archive is clear"
              : "Your first discovery is waiting",
            "Finish a signed-in discovery or adjust your filters to find an earlier result.",
            button(
              "Explore Science Island",
              () => go("/island"),
              "button primary",
            ),
          ),
      h(
        "nav",
        { class: "teacher-pagination", "aria-label": "Quiz record pages" },
        button(
          "Previous page",
          () => {
            offset = Math.max(0, offset - 50);
            void load();
          },
          "button outline",
          { disabled: offset === 0 },
        ),
        h("span", null, `Page ${Math.floor(offset / 50) + 1}`),
        button(
          "Next page",
          () => {
            offset += 50;
            void load();
          },
          "button outline",
          { disabled: offset + 50 >= total },
        ),
      ),
      h(
        "p",
        { class: "fine-print" },
        "Date filters follow your classroom timezone. Original answer evidence and scores are preserved.",
      ),
    );
  }
  async function load() {
    const ownSequence = ++sequence;
    content.replaceChildren(
      h(
        "p",
        { class: "record-loading", role: "status" },
        "Opening your discovery journal…",
      ),
    );
    try {
      const result = await studioData("quizzes", filters, offset);
      if (ownSequence !== sequence || currentUser()?.id !== viewer!.id) return;
      rows = result.rows as unknown as HistoryRow[];
      total = result.total;
      stats = result.stats ?? {};
      draw();
    } catch (error) {
      if (ownSequence !== sequence || currentUser()?.id !== viewer!.id) return;
      content.replaceChildren(
        empty(
          "notebook",
          "Your journal needs a moment",
          error instanceof Error ? error.message : "Please try again.",
          button("Retry records", () => load(), "button primary"),
        ),
      );
    }
  }
  mountedRecords = { id: viewer.id, node: page };
  void load();
  return page;
}
async function legacyRecordsPage(teacherOnly = false) {
  const viewer = currentUser();
  if (!viewer || viewer.id === "guest")
    return empty(
      "notebook",
      "Your discoveries, together",
      "Sign in to save completed discoveries. Guest practice stays on this device.",
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
      "The database owner assigns teacher access. Your own records are available in Saved records.",
      button("My quiz records", () => go("/records"), "button primary"),
    );
  const title = teacher ? "Your class discoveries" : "Your saved discoveries";
  const page = h(
    "div",
    { class: "records-page" },
    pageHeading(
      teacher ? "TEACHER REPORTS" : "SAVED DISCOVERIES",
      title,
      "Completed quizzes, scored against your teacher’s published science cards.",
    ),
    h(
      "p",
      { class: "notice" },
      "These records include names, grades, sections and submitted answers. They record practice, rather than supervised exam results. Your notebook and unfinished practice stay on this device.",
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
  page.querySelectorAll<HTMLDivElement>(".table-wrap").forEach(responsiveTable);
  return page;
}
function deckName(id: string) {
  return decks.find((d) => d.id === id)?.name ?? id;
}
function date(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeZone: getState().rules.timezone,
    timeStyle: "short",
  });
}
