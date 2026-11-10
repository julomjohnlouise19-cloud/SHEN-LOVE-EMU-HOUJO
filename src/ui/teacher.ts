import { currentUser } from "../store";
import {
  teacherCommand,
  teacherData,
  studioCommand,
  hasStudio,
} from "../store/platform";
import { csvCell } from "../core/cloud-records";
import { validArcadeRules, type ArcadeRules } from "../core/arcade";
import { validRules } from "../core/rules";
import { isQuestion } from "../core/schema";
import { validateQuestions, type Misconception } from "../core/validate";
import misconceptions from "../data/misconceptions.json";
import { decks } from "../data/catalog";
import type { Question, Rules } from "../core/types";
import type { TeacherData } from "../core/platform";
import {
  button,
  download,
  field,
  h,
  input,
  modal,
  toast,
  setButtonDisabled,
} from "./dom";
import { empty, pageHeading } from "./shell";
import { go } from "./actions";
import { icon } from "./svg";

const names: Record<string, string> = {
  overview: "Teacher studio",
  students: "Your class, growing together",
  reports: "Class discoveries",
  games: "Arcade discoveries",
  health: "A clear, cared-for classroom",
  shop: "The supply shelf",
  claims: "The collection desk",
  content: "The question studio",
  settings: "Make the lab yours",
  activity: "Every change, accounted for",
};
const subtitles: Record<string, string> = {
  overview:
    "A clear view of learning, class activity and the little rewards that keep curiosity growing.",
  students: "Look after scientist profiles, class credits and account access.",
  reports:
    "Filter completed discoveries, review answers and leave a thoughtful teacher note.",
  games:
    "Compare completed rounds, review scores and keep the class leaderboard organized.",
  health:
    "Review record integrity, class balances and your archived learning history.",
  shop: "Keep prices, available stock and reward details up to date for your whole class.",
  claims:
    "Check a student’s code before collection. Cancellations return credits and stock together.",
  content:
    "Review the science, refine a card and choose what your class can practise.",
  settings:
    "Set learning rewards and tune the arcade challenge for your classroom.",
  activity:
    "An account of teacher edits, with the details needed to review a change.",
};
const ruleLabels: Record<keyof Rules, string> = {
  starterMerits: "New account starter credits",
  comboBonus: "Practice combo bonus",
  timezone: "Classroom timezone",
  meritEasy: "Easy · credits per correct answer",
  meritMedium: "Medium · credits per correct answer",
  meritHard: "Hard · credits per correct answer",
  dailyCap: "Daily learning credit limit",
  correctXP: "Correct-answer XP on this device",
  attemptXP: "Attempt XP on this device",
  xpPerLevel: "XP per learning level",
  comboEvery: "Correct answers per practice combo",
  reviewReward: "Review practice reward",
  dailyReward: "Daily practice reward",
  questReward: "Quest practice reward",
  spinMax: "Practice spin maximum",
  skillsLevel: "Skills Lab unlock level",
};
let mountedTeacher:
  { userId: string; section: string; node: HTMLElement } | undefined;
window.addEventListener("csl:platform", () => {
  if (!currentUser()) {
    mountedTeacher = undefined;
    memory.clear();
  }
});
const memory = new Map<
  string,
  { filters: Record<string, string>; offset: number }
>();
const str = (row: Record<string, unknown>, key: string) =>
  String(row[key] ?? "");
const number = (row: Record<string, unknown>, key: string) =>
  Number(row[key] ?? 0);
const when = (value: unknown) =>
  new Date(String(value)).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
const deckName = (id: string) => decks.find((d) => d.id === id)?.name ?? id;
export function teacherPage(section = "overview") {
  const viewer = currentUser();
  if (!viewer || viewer.role !== "admin")
    return empty(
      "cat",
      "Teacher access needed",
      "This workspace is available to your class teachers.",
      button("My lab", () => go("/"), "button primary"),
    );
  if (!names[section]) section = "overview";
  if (
    mountedTeacher?.userId === viewer.id &&
    mountedTeacher.section === section
  )
    return mountedTeacher.node;
  const key = `${viewer.id}/${section}`,
    saved = memory.get(key) ?? {
      filters: Object.fromEntries(
        new URLSearchParams(location.hash.split("?")[1]),
      ),
      offset: 0,
    };
  memory.set(key, saved);
  const page = h("div", { class: "teacher-page page-enter" });
  const content = h("div", { class: "teacher-content" });
  let data: TeacherData = { rows: [], total: 0 },
    sequence = 0;
  const recordSection = ["reports", "games"].includes(section) && hasStudio();
  const selected = new Map<string, Record<string, unknown>>();
  const selectionText = h("strong", null, "0 selected");
  const archiveButton = button(
    "Archive selected",
    () => organize([...selected.values()], true),
    "button outline",
    { disabled: true },
  );
  const restoreButton = button(
    "Restore selected",
    () => organize([...selected.values()], false),
    "button outline",
    { disabled: true },
  );
  function syncSelection() {
    selectionText.textContent = `${selected.size} selected on this page`;
    setButtonDisabled(
      archiveButton,
      ![...selected.values()].some((row) => !row.archived),
    );
    setButtonDisabled(
      restoreButton,
      ![...selected.values()].some((row) => !!row.archived),
    );
  }
  const from = input("record-from", "", saved.filters.from ?? "", "date"),
    until = input("record-to", "", saved.filters.to ?? "", "date");
  from.required = false;
  until.required = false;
  const recordState = h(
    "select",
    { "aria-label": "Filter by record state" },
    ...[
      ["active", "Active records"],
      ["archived", "Archived records"],
      ["all", "All records"],
    ].map(([value, text]) =>
      h(
        "option",
        { value, selected: (saved.filters.state ?? "active") === value },
        text,
      ),
    ),
  );
  const sort = h(
    "select",
    { "aria-label": "Sort records" },
    ...[
      ["newest", "Newest first"],
      ["oldest", "Oldest first"],
      ["best", "Highest score first"],
    ].map(([value, text]) =>
      h(
        "option",
        { value, selected: (saved.filters.sort ?? "newest") === value },
        text,
      ),
    ),
  );
  const category = h(
    "select",
    { "aria-label": "Filter by science category" },
    ...[
      ["", "All sciences"],
      ["life", "Biology"],
      ["chemistry", "Chemistry"],
      ["physics", "Physics"],
      ["earth", "Earth & space"],
    ].map(([value, text]) =>
      h("option", { value, selected: saved.filters.category === value }, text),
    ),
  );
  const search = input(
    "search",
    section === "claims" ? "Name or claim code" : "Search this workspace",
    saved.filters.search ?? "",
  );
  search.required = false;
  const grade = h(
    "select",
    { "aria-label": "Filter by grade" },
    h("option", { value: "" }, "All grades"),
    ...[7, 8, 9, 10].map((n) =>
      h(
        "option",
        { value: n, selected: saved.filters.grade === String(n) },
        `Grade ${n}`,
      ),
    ),
  );
  const classroom = input("section", "Section", saved.filters.section ?? "");
  classroom.required = false;
  const deck = h(
    "select",
    { "aria-label": "Filter by science deck" },
    h("option", { value: "" }, "All science decks"),
    ...decks.map((d) =>
      h(
        "option",
        { value: d.id, selected: saved.filters.deck === d.id },
        d.name,
      ),
    ),
  );
  const status = h(
    "select",
    { "aria-label": "Filter by reservation status" },
    ...[
      ["", "All reservations"],
      ["reserved", "Awaiting collection"],
      ["collected", "Collected"],
      ["cancelled", "Cancelled"],
    ].map(([value, label]) =>
      h("option", { value, selected: saved.filters.status === value }, label),
    ),
  );
  const filters = h(
    "form",
    {
      class: "teacher-filters",
      onSubmit: (event: SubmitEvent) => {
        event.preventDefault();
        saved.filters = {
          search: search.value,
          grade: grade.value,
          section: classroom.value,
          deck: deck.value,
          status: status.value,
          from: from.value,
          to: until.value,
          state: recordState.value,
          sort: sort.value,
          category: category.value,
        };
        saved.offset = 0;
        void load();
      },
    },
    field("Find a record", search),
    ["students", "reports", "games", "claims"].includes(section)
      ? field("Grade", grade)
      : null,
    ["students", "reports", "games", "claims"].includes(section)
      ? field("Section", classroom)
      : null,
    ["reports", "content"].includes(section) ? field("Science", deck) : null,
    section === "claims" ? field("Status", status) : null,
    section === "games" ? field("Science category", category) : null,
    ...(recordSection
      ? [
          field("From date", from),
          field("Through date", until),
          field("Record state", recordState),
          field("Order", sort),
        ]
      : []),
    button("Apply filters", () => undefined, "button outline", {
      type: "submit",
    }),
    button(
      "Clear",
      () => {
        saved.filters = {};
        saved.offset = 0;
        search.value = "";
        classroom.value = "";
        grade.value = "";
        deck.value = "";
        status.value = "";
        from.value = "";
        until.value = "";
        category.value = "";
        recordState.value = "active";
        sort.value = "newest";
        void load();
      },
      "text-button",
    ),
  );
  page.append(
    pageHeading(
      "THE COZY SCIENCE LAB · TEACHER WORKSPACE",
      names[section],
      subtitles[section],
      h("span", { class: "teacher-badge" }, icon("lock", 15), "Teacher access"),
    ),
  );
  if (section === "overview")
    page.append(
      h(
        "section",
        { class: "teacher-welcome" },
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "A LITTLE CARE MAKES A CLASS GROW"),
          h("h2", null, `Good to see you, ${viewer.name.split(" ")[0]}.`),
          h(
            "p",
            null,
            "Your scientists, their discoveries, and your supply shelf—all in one calm place.",
          ),
        ),
        button(
          "Review class discoveries",
          () => go("/teacher/reports"),
          "button primary",
        ),
      ),
    );
  if (!["overview", "settings", "health"].includes(section))
    page.append(filters);
  page.append(
    h(
      "div",
      { class: "teacher-toolbar" },
      button("Refresh workspace", () => load(), "button outline"),
      section === "shop"
        ? button("Add a supply", () => editItem(), "button primary")
        : null,
      !["overview", "settings", "health"].includes(section)
        ? button("Export filtered data", exportData, "button outline")
        : null,
      h(
        "span",
        { class: "teacher-save-note" },
        icon("check", 15),
        "Changes are saved for your class",
      ),
    ),
    content,
  );
  async function load() {
    const id = ++sequence;
    selected.clear();
    syncSelection();
    content.replaceChildren(
      h(
        "p",
        { class: "teacher-loading", role: "status" },
        "Bringing your classroom together…",
      ),
    );
    try {
      const result = await teacherData(section, saved.filters, saved.offset);
      if (id !== sequence || currentUser()?.id !== viewer!.id) return;
      data = result;
      draw();
    } catch (error) {
      if (id !== sequence) return;
      content.replaceChildren(
        empty(
          "cat",
          "Your workspace needs a moment",
          error instanceof Error
            ? error.message
            : "Please check your connection and try again.",
          button("Try again", () => load(), "button primary"),
        ),
      );
    }
  }
  function draw() {
    if (section === "overview") {
      overview(data);
      return;
    }
    if (section === "settings") {
      settings(data.rows[0] ?? {});
      return;
    }
    if (section === "health") {
      health(data);
      return;
    }
    const children: HTMLElement[] = [];
    if (["reports", "games"].includes(section) && data.stats)
      children.push(metrics(data.stats));
    if (recordSection)
      children.push(
        h(
          "div",
          { class: "record-bulk" },
          selectionText,
          archiveButton,
          restoreButton,
          h("small", null, "Archive keeps original evidence and balances."),
        ),
      );
    if (!data.rows.length)
      children.push(
        empty(
          "notebook",
          "A little space, ready for discoveries",
          section === "content"
            ? "Try a different deck or search."
            : "There are no matching records. Adjust your filters or return after your class has made a discovery.",
        ),
      );
    else children.push(table(data.rows));
    children.push(
      h(
        "nav",
        { class: "teacher-pagination", "aria-label": "Workspace pages" },
        button(
          "Previous",
          () => {
            saved.offset = Math.max(0, saved.offset - 50);
            void load();
          },
          "button outline",
          { disabled: saved.offset === 0 },
        ),
        h(
          "span",
          null,
          `${data.total ? saved.offset + 1 : 0}–${Math.min(saved.offset + data.rows.length, data.total)} of ${data.total}`,
        ),
        button(
          "Next",
          () => {
            saved.offset += 50;
            void load();
          },
          "button outline",
          { disabled: saved.offset + 50 >= data.total },
        ),
      ),
    );
    content.replaceChildren(...children);
  }
  function metrics(stats: Record<string, number>) {
    const values = ["reports", "games"].includes(section)
      ? [
          [stats.attempts ?? data.total, "Discoveries", "notebook"],
          [
            `${stats.answers ? Math.round(((stats.correct ?? 0) / stats.answers) * 100) : 0}%`,
            section === "games" ? "Shot accuracy" : "Class accuracy",
            "sprout",
          ],
          [stats.correct ?? 0, "Correct answers", "check"],
        ]
      : [
          [stats.students ?? 0, "Scientists", "sprout"],
          [stats.attempts ?? 0, "Saved discoveries", "notebook"],
          [
            `${stats.answers ? Math.round(((stats.correct ?? 0) / stats.answers) * 100) : 0}%`,
            "Class accuracy",
            "trophy",
          ],
          [stats.pending ?? 0, "Awaiting collection", "box"],
        ];
    return h(
      "div",
      { class: "teacher-metrics" },
      ...values.map(([value, label, ico]) =>
        h(
          "article",
          { class: "teacher-metric" },
          icon(String(ico), 22),
          h("strong", null, value),
          h("span", null, label),
        ),
      ),
    );
  }
  function overview(result: TeacherData) {
    const stats = result.stats ?? {};
    const charts = h(
      "section",
      { class: "teacher-panel" },
      h(
        "div",
        { class: "teacher-panel-heading" },
        h("h2", null, "Where curiosity is growing"),
        h("span", { class: "muted" }, "Accuracy by science deck"),
      ),
      result.charts?.length
        ? h(
            "div",
            { class: "teacher-chart" },
            ...result.charts.map((r) =>
              h(
                "div",
                { class: "teacher-chart-row" },
                h("span", null, deckName(r.deck_id)),
                h(
                  "span",
                  {
                    class: "teacher-chart-track",
                    "aria-label": `${deckName(r.deck_id)}: ${r.total ? Math.round((r.correct / r.total) * 100) : 0}% correct`,
                  },
                  h("i", {
                    style: {
                      width: `${r.total ? (r.correct / r.total) * 100 : 0}%`,
                    },
                  }),
                ),
                h(
                  "strong",
                  null,
                  `${r.total ? Math.round((r.correct / r.total) * 100) : 0}%`,
                ),
                h("small", null, `${r.attempts} quizzes`),
              ),
            ),
          )
        : h(
            "p",
            { class: "muted" },
            "The chart will grow as your class completes quizzes.",
          ),
    );
    const quick = h(
      "section",
      { class: "teacher-panel" },
      h("h2", null, "A little attention goes a long way"),
      ...[
        [
          "/teacher/claims",
          `${stats.pending ?? 0} reservations to check`,
          "Verify claim codes and record collection.",
          "box",
        ],
        [
          "/teacher/shop",
          `${stats.low_stock ?? 0} supplies running low`,
          "Update stock and review class prices.",
          "shop",
        ],
        [
          "/teacher/students",
          `${stats.active ?? 0} active scientists`,
          "Review profiles and adjust class credits.",
          "sprout",
        ],
        [
          "/teacher/settings",
          "Tune your discovery fair",
          "Adjust timers, target speed and rewards.",
          "settings",
        ],
      ].map(([path, title, text, ico]) =>
        h(
          "a",
          { href: `#${path}`, class: "teacher-quick-link" },
          icon(ico, 22),
          h("span", null, h("strong", null, title), h("small", null, text)),
          icon("chevron", 15),
        ),
      ),
    );
    content.replaceChildren(
      metrics(stats),
      ...(result.timeline ? [pulse(result.timeline)] : []),
      h("div", { class: "teacher-overview-grid" }, charts, quick),
      ...(hasStudio()
        ? [
            h(
              "div",
              { class: "records-actions" },
              button(
                "Review arcade reports",
                () => go("/teacher/games"),
                "button outline",
              ),
              button(
                "Check record health",
                () => go("/teacher/health"),
                "button outline",
              ),
            ),
          ]
        : []),
      h(
        "p",
        { class: "fine-print" },
        "Class credits and shop reservations are shared across your classroom. Notebook pages and practice XP stay on each device.",
      ),
    );
  }
  function pulse(timeline: NonNullable<TeacherData["timeline"]>) {
    const max = Math.max(
      1,
      ...timeline.flatMap((day) => [day.quizzes, day.games]),
    );
    return h(
      "section",
      { class: "teacher-pulse" },
      h(
        "div",
        { class: "teacher-pulse-heading" },
        h("h2", null, "Your classroom pulse"),
        h("p", null, "Seven days of saved discoveries · classroom timezone"),
      ),
      h(
        "div",
        {
          class: "pulse-chart",
          role: "img",
          "aria-label": timeline
            .map(
              (day) =>
                `${day.day_key}: ${day.quizzes} quizzes, ${day.games} arcade rounds`,
            )
            .join("; "),
        },
        ...timeline.map((day) =>
          h(
            "div",
            { class: "pulse-day" },
            h(
              "div",
              { class: "pulse-bars", "aria-hidden": true },
              h("i", { style: { height: `${(day.quizzes / max) * 100}%` } }),
              h("i", { style: { height: `${(day.games / max) * 100}%` } }),
            ),
            h(
              "small",
              null,
              new Date(`${day.day_key}T12:00:00Z`).toLocaleDateString(
                undefined,
                { weekday: "short" },
              ),
            ),
          ),
        ),
      ),
      h(
        "div",
        { class: "pulse-legend" },
        h("span", null, "Quizzes"),
        h("span", null, "Arcade rounds"),
      ),
    );
  }
  function health(result: TeacherData) {
    const stats = result.stats ?? {};
    content.replaceChildren(
      h(
        "div",
        { class: "teacher-metrics" },
        ...[
          [stats.quizzes ?? 0, "Quiz records"],
          [stats.games ?? 0, "Completed rounds"],
          [stats.archived ?? 0, "Archived records"],
          [stats.teachers ?? 0, "Active teachers"],
        ].map(([value, label]) =>
          h(
            "article",
            { class: "teacher-metric" },
            h("strong", null, value),
            h("span", null, label),
          ),
        ),
      ),
      h(
        "div",
        { class: "health-grid" },
        ...result.rows.map((row) =>
          h(
            "article",
            {
              class: `health-card ${number(row, "issues") ? "needs-attention" : ""}`,
            },
            h(
              "div",
              { class: "health-symbol" },
              icon(number(row, "issues") ? "search" : "check", 23),
            ),
            h(
              "div",
              null,
              h("h3", null, str(row, "label")),
              h(
                "strong",
                null,
                number(row, "issues")
                  ? `${number(row, "issues")} records to review`
                  : "All checked records agree",
              ),
              h("p", null, str(row, "detail")),
            ),
          ),
        ),
      ),
      h(
        "section",
        { class: "teacher-panel" },
        h("h2", null, "Keep the history useful"),
        h(
          "p",
          { class: "muted" },
          "Archive reviewed records to organize active reports. Restore them whenever you need the evidence again. Original scores and class balances are preserved.",
        ),
        h(
          "div",
          { class: "records-actions" },
          button(
            "Review active quizzes",
            () => go("/teacher/reports?state=active"),
            "button primary",
          ),
          button(
            "Open archived quizzes",
            () => go("/teacher/reports?state=archived"),
            "button outline",
          ),
          button(
            "Review arcade rounds",
            () => go("/teacher/games"),
            "button outline",
          ),
        ),
      ),
    );
  }
  function table(rows: Record<string, unknown>[]) {
    const headers: Record<string, string[]> = {
      students: [
        "Scientist",
        "Class",
        "Access",
        "Credits",
        "Discoveries",
        "Manage",
      ],
      reports: ["Scientist", "Class", "Discovery", "Score", "Saved", "Review"],
      games: [
        "Scientist",
        "Class",
        "Science",
        "Score",
        "Accuracy",
        "Saved",
        "Manage",
      ],
      shop: ["Supply", "Category", "Price", "Stock", "Availability", "Manage"],
      claims: [
        "Scientist",
        "Supply",
        "Claim code",
        "Status",
        "Reserved",
        "Manage",
      ],
      content: ["Science card", "Level", "Availability", "Manage"],
      activity: ["When", "Teacher", "Change", "Reason", "Review"],
    };
    return h(
      "div",
      { class: "table-wrap teacher-table" },
      h(
        "table",
        null,
        h("caption", null, `${names[section]} · matching records`),
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            ...(recordSection
              ? [
                  h(
                    "th",
                    { scope: "col" },
                    h("input", {
                      type: "checkbox",
                      class: "record-select",
                      "aria-label": "Select all records on this page",
                      onChange: (event: Event) => {
                        const checked = (event.target as HTMLInputElement)
                          .checked;
                        selected.clear();
                        if (checked)
                          rows.forEach((row) =>
                            selected.set(str(row, "id"), row),
                          );
                        content
                          .querySelectorAll<HTMLInputElement>(
                            "[data-record-check]",
                          )
                          .forEach((input) => {
                            input.checked = checked;
                          });
                        syncSelection();
                      },
                    }),
                  ),
                ]
              : []),
            ...(headers[section] ?? []).map((label) =>
              h("th", { scope: "col" }, label),
            ),
          ),
        ),
        h(
          "tbody",
          null,
          ...rows.map((row) =>
            h(
              "tr",
              null,
              ...(recordSection
                ? [
                    h(
                      "td",
                      null,
                      h("input", {
                        type: "checkbox",
                        class: "record-select",
                        "data-record-check": row.id,
                        "aria-label": `Select record for ${str(row, "display_name")}, ${when(row.received_at)}`,
                        onChange: (event: Event) => {
                          if ((event.target as HTMLInputElement).checked)
                            selected.set(str(row, "id"), row);
                          else selected.delete(str(row, "id"));
                          syncSelection();
                        },
                      }),
                    ),
                  ]
                : []),
              ...cells(row).map((cell) => h("td", null, cell)),
            ),
          ),
        ),
      ),
    );
  }
  function cells(
    row: Record<string, unknown>,
  ): (HTMLElement | string | number)[] {
    if (section === "students")
      return [
        h(
          "div",
          null,
          h("strong", null, str(row, "display_name")),
          row.is_teacher
            ? h("small", { class: "record-meta" }, "Teacher")
            : null,
        ),
        `${str(row, "grade")} · ${str(row, "section") || "No section"}`,
        tag(row.active ? "Active" : "Paused", row.active ? "green" : "peach"),
        number(row, "credits"),
        number(row, "attempts"),
        h(
          "div",
          { class: "teacher-row-actions" },
          button("Edit profile", () => editStudent(row), "text-button"),
          button("Adjust credits", () => editCredits(row), "text-button"),
          hasStudio()
            ? button("Teaching access", () => editRole(row), "text-button", {
                disabled: row.user_id === viewer!.id || !row.active,
              })
            : null,
        ),
      ];
    if (section === "shop")
      return [
        h(
          "div",
          null,
          h("strong", null, str(row, "name")),
          h("small", { class: "record-meta" }, str(row, "description")),
        ),
        str(row, "category"),
        `${number(row, "price")} credits`,
        tag(
          String(number(row, "stock")),
          number(row, "stock") <= 5 ? "peach" : "green",
        ),
        tag(
          row.active ? "On the shelf" : "Archived",
          row.active ? "green" : "lilac",
        ),
        button("Edit supply", () => editItem(row), "text-button"),
      ];
    if (section === "claims")
      return [
        h(
          "div",
          null,
          h("strong", null, str(row, "display_name")),
          h(
            "small",
            { class: "record-meta" },
            `${str(row, "grade")} · ${str(row, "section")}`,
          ),
        ),
        str(row, "item_name"),
        h("code", { class: "teacher-claim-code" }, str(row, "code")),
        tag(str(row, "status"), row.status === "reserved" ? "yellow" : "green"),
        when(row.created_at),
        row.status === "reserved"
          ? h(
              "div",
              { class: "teacher-row-actions" },
              button(
                "Verify collection",
                () => claim(row, false),
                "text-button",
              ),
              button("Cancel & refund", () => claim(row, true), "text-button"),
            )
          : h("span", { class: "muted" }, "Recorded"),
      ];
    if (section === "reports")
      return [
        str(row, "display_name"),
        `${str(row, "grade")} · ${str(row, "section")}`,
        h(
          "div",
          null,
          deckName(str(row, "deck_id")),
          h(
            "small",
            { class: "record-meta" },
            `${str(row, "level")} · ${str(row, "mode")}`,
          ),
        ),
        `${number(row, "correct")}/${number(row, "total")}`,
        when(row.received_at),
        h(
          "div",
          { class: "teacher-row-actions" },
          button("Answers & feedback", () => review(row), "text-button"),
          recordSection
            ? button(
                row.archived ? "Restore record" : "Archive record",
                () => organize([row], !row.archived),
                "text-button",
              )
            : null,
        ),
      ];
    if (section === "games")
      return [
        str(row, "display_name"),
        `${str(row, "grade")} · ${str(row, "section")}`,
        str(row, "category") === "life"
          ? "Biology"
          : str(row, "category") === "earth"
            ? "Earth & space"
            : str(row, "category"),
        number(row, "score").toLocaleString(),
        `${number(row, "correct")}/9`,
        when(row.received_at),
        h(
          "div",
          { class: "teacher-row-actions" },
          tag(
            row.archived ? "Archived" : "Active",
            row.archived ? "lilac" : "green",
          ),
          button(
            row.archived ? "Restore record" : "Archive record",
            () => organize([row], !row.archived),
            "text-button",
          ),
        ),
      ];
    if (section === "content") {
      const q = row.question as Question;
      return [
        h(
          "div",
          null,
          h("strong", null, q.prompt),
          h(
            "small",
            { class: "record-meta" },
            `${deckName(q.deckId)} · ${q.type}`,
          ),
        ),
        q.level,
        tag(
          row.active ? "Available" : "Archived",
          row.active ? "green" : "lilac",
        ),
        button("Edit card", () => editQuestion(row), "text-button"),
      ];
    }
    return [
      when(row.created_at),
      str(row, "actor_name") || "Teacher",
      str(row, "action"),
      str(row, "note") || "—",
      button("View change", () => activity(row), "text-button"),
    ];
  }
  const tag = (text: string, color: string) =>
    h("span", { class: `teacher-tag ${color}` }, text);
  function organize(rows: Record<string, unknown>[], archived: boolean) {
    const targets = rows.filter((row) => Boolean(row.archived) !== archived);
    if (!targets.length) return;
    const reason = h("textarea", {
      rows: 3,
      required: true,
      minlength: 3,
      maxlength: 300,
      placeholder: "Why are these records being organized?",
    });
    const request = crypto.randomUUID();
    editor(
      `${archived ? "Archive" : "Restore"} ${targets.length} record${targets.length === 1 ? "" : "s"}?`,
      [
        h(
          "p",
          { class: "notice" },
          archived
            ? "These records move out of active views. Original answers, scores and credits stay in place. Archived arcade rounds leave active rankings."
            : "These records return to active views and eligible arcade rankings. This does not award credits again.",
        ),
        field("Reason for this record change", reason),
      ],
      () =>
        studioCommand(
          "records",
          {
            kind: section === "games" ? "games" : "quizzes",
            ids: targets.map((row) => row.id),
            versions: Object.fromEntries(
              targets.map((row) => [
                str(row, "id"),
                number(row, "metadata_version"),
              ]),
            ),
            archived,
            reason: reason.value,
          },
          request,
        ),
    );
  }
  function editRole(row: Record<string, unknown>) {
    const role = h(
      "select",
      null,
      h(
        "option",
        { value: "student", selected: !row.is_teacher },
        "Student scientist",
      ),
      h(
        "option",
        { value: "teacher", selected: !!row.is_teacher },
        "Class teacher",
      ),
    );
    const reason = input("role-reason", "Why is teaching access changing?");
    reason.minLength = 3;
    reason.maxLength = 300;
    const request = crypto.randomUUID();
    editor(
      `Teaching access · ${str(row, "display_name")}`,
      [
        h(
          "p",
          { class: "notice" },
          "Teachers can manage class accounts, records, questions, credits, supplies and other teaching roles. Review this access carefully before saving.",
        ),
        field("Account role", role),
        field("Reason for access change", reason),
      ],
      () =>
        studioCommand(
          "role",
          {
            user_id: row.user_id,
            was_teacher: !!row.is_teacher,
            is_teacher: role.value === "teacher",
            reason: reason.value,
          },
          request,
        ),
    );
  }
  function editor(
    title: string,
    children: HTMLElement[],
    save: () => Promise<unknown>,
  ) {
    const error = h("p", { class: "form-error", role: "alert" }),
      submit = button("Save changes", () => undefined, "button primary", {
        type: "submit",
      });
    const { close } = modal(
      title,
      [
        h(
          "form",
          {
            class: "teacher-edit-form",
            onSubmit: async (event: SubmitEvent) => {
              event.preventDefault();
              if (submit.disabled) return;
              submit.disabled = true;
              error.textContent = "";
              try {
                await save();
                close();
                toast("Your class changes are saved.");
                await load();
              } catch (value) {
                error.textContent =
                  value instanceof Error ? value.message : "Please try again.";
              } finally {
                submit.disabled = false;
              }
            },
          },
          ...children,
          error,
          h("div", { class: "teacher-edit-actions" }, submit),
        ),
      ],
      true,
    );
  }
  function editStudent(row: Record<string, unknown>) {
    const name = input(
        "display_name",
        "Scientist name",
        str(row, "display_name"),
      ),
      classroom = input("section", "Section", str(row, "section"));
    name.maxLength = 40;
    classroom.maxLength = 40;
    classroom.required = false;
    const grade = h(
      "select",
      { name: "grade" },
      ...[7, 8, 9, 10].map((n) =>
        h(
          "option",
          { value: n, selected: number(row, "grade") === n },
          `Grade ${n}`,
        ),
      ),
    );
    const active = h("input", {
        type: "checkbox",
        checked: Boolean(row.active),
        disabled: Boolean(row.is_teacher),
      }),
      id = crypto.randomUUID();
    editor(
      "A scientist’s place in your class",
      [
        h(
          "p",
          { class: "muted" },
          "Pause a student’s access without deleting discoveries. Teacher roles remain managed by the site owner.",
        ),
        field("Name", name),
        h(
          "div",
          { class: "form-row" },
          field("Grade", grade),
          field("Section", classroom),
        ),
        h("label", { class: "teacher-check" }, active, "Account is active"),
      ],
      () =>
        teacherCommand(
          "student",
          {
            user_id: row.user_id,
            display_name: name.value,
            grade: Number(grade.value),
            section: classroom.value,
            active: active.checked,
            expected_updated: row.expected_updated,
          },
          id,
        ),
    );
  }
  function editCredits(row: Record<string, unknown>) {
    const delta = input("delta", "For example: 10 or -5", "", "number"),
      reason = input("reason", "Why are these credits changing?");
    delta.min = "-10000";
    delta.max = "10000";
    delta.step = "1";
    reason.minLength = 3;
    reason.maxLength = 300;
    const id = crypto.randomUUID();
    editor(
      `Class credits · ${str(row, "display_name")}`,
      [
        h(
          "p",
          { class: "notice" },
          `Current balance: ${number(row, "credits")} credits. Enter a positive amount to add or a negative amount to subtract.`,
        ),
        field("Credit adjustment", delta),
        field("Reason", reason),
      ],
      () =>
        teacherCommand(
          "credits",
          {
            user_id: row.user_id,
            delta: Number(delta.value),
            reason: reason.value,
          },
          id,
        ),
    );
  }
  function editItem(row: Record<string, unknown> = {}) {
    const name = input("name", "Supply name", str(row, "name")),
      description = h("textarea", {
        rows: 3,
        maxlength: 500,
        required: true,
        value: str(row, "description"),
      }),
      price = input("price", "Credits", String(row.price ?? 35), "number"),
      stock = input(
        "stock",
        "Available quantity",
        String(row.stock ?? 0),
        "number",
      ),
      category = input(
        "category",
        "Category",
        String(row.category ?? "School essentials"),
      );
    name.maxLength = 80;
    category.maxLength = 40;
    price.min = "1";
    price.max = "10000";
    stock.min = "0";
    stock.max = "100000";
    price.step = "1";
    stock.step = "1";
    const illustration = h(
        "select",
        { name: "icon" },
        ...["pencils", "notebook", "ruler", "markers", "goggles", "sticky"].map(
          (v) =>
            h(
              "option",
              { value: v, selected: v === (row.icon ?? "notebook") },
              v,
            ),
        ),
      ),
      color = h(
        "select",
        { name: "color" },
        ...["green", "yellow", "blue", "peach", "lilac"].map((v) =>
          h("option", { value: v, selected: v === (row.color ?? "green") }, v),
        ),
      ),
      active = h("input", { type: "checkbox", checked: row.active ?? true });
    const request = crypto.randomUUID(),
      itemId = row.id ?? `supply-${crypto.randomUUID()}`;
    editor(
      row.id ? "A little care for the supply shelf" : "A new little reward",
      [
        field("Supply name", name),
        field("Description", description),
        h(
          "div",
          { class: "form-row" },
          field("Price in class credits", price),
          field("Stock available", stock),
        ),
        field("Category", category),
        h(
          "div",
          { class: "form-row" },
          field("Illustration", illustration),
          field("Color", color),
        ),
        h(
          "label",
          { class: "teacher-check" },
          active,
          "Available on the class shelf",
        ),
        h(
          "p",
          { class: "fine-print" },
          "Archiving hides an item while preserving its reservations and history.",
        ),
      ],
      () =>
        teacherCommand(
          "item",
          {
            id: itemId,
            name: name.value,
            description: description.value,
            price: Number(price.value),
            stock: Number(stock.value),
            category: category.value,
            icon: illustration.value,
            color: color.value,
            active: active.checked,
            version: Number(row.version ?? 0),
          },
          request,
        ),
    );
  }
  function claim(row: Record<string, unknown>, cancel: boolean) {
    const value = input(
      cancel ? "reason" : "code",
      cancel
        ? "Why is this reservation being cancelled?"
        : "Enter the code the student shows you",
    );
    if (cancel) value.minLength = 3;
    value.maxLength = cancel ? 300 : 20;
    const request = crypto.randomUUID();
    editor(
      cancel ? "Cancel this reservation?" : "Verify a little reward",
      [
        h(
          "p",
          { class: "notice" },
          cancel
            ? `${str(row, "display_name")} · ${str(row, "item_name")}. Cancellation returns ${number(row, "price")} class credits and one item to stock.`
            : `${str(row, "display_name")} · ${str(row, "item_name")}. Verify the code and hand over the item before recording collection.`,
        ),
        field(cancel ? "Cancellation reason" : "Student’s claim code", value),
      ],
      () =>
        teacherCommand(
          "claim",
          {
            id: row.id,
            status: cancel ? "cancelled" : "collected",
            ...(cancel ? { reason: value.value } : { code: value.value }),
          },
          request,
        ),
    );
  }
  function review(row: Record<string, unknown>) {
    const responses = (row.responses ?? []) as {
        prompt: string;
        value: unknown;
        correct: boolean;
        misconception?: string;
      }[],
      note = h("textarea", {
        rows: 3,
        maxlength: 500,
        value: str(row, "teacher_note"),
        placeholder: "A thoughtful note for this discovery",
      });
    const request = crypto.randomUUID();
    editor(
      `${str(row, "display_name")} · ${number(row, "correct")}/${number(row, "total")}`,
      [
        h(
          "p",
          { class: "muted" },
          `${deckName(str(row, "deck_id"))} · ${when(row.received_at)}`,
        ),
        ...responses.map((r, i) =>
          h(
            "article",
            { class: "record-answer" },
            h("h3", null, `${i + 1}. ${r.prompt}`),
            h(
              "p",
              null,
              `Answer: ${typeof r.value === "string" ? r.value : JSON.stringify(r.value)}`,
            ),
            tag(
              r.correct ? "Correct" : "Keep exploring",
              r.correct ? "green" : "peach",
            ),
          ),
        ),
        field("Teacher note", note),
        h(
          "p",
          { class: "fine-print" },
          "Notes add context in teacher reports. Original quiz answers and scores remain unchanged.",
        ),
      ],
      () =>
        teacherCommand(
          "feedback",
          { attempt_id: row.id, note: note.value },
          request,
        ),
    );
  }
  function editQuestion(row: Record<string, unknown>) {
    const q = structuredClone(row.question) as Question;
    const prompt = h("textarea", {
        rows: 3,
        required: true,
        maxlength: 500,
        value: q.prompt,
      }),
      explanation = h("textarea", {
        rows: 3,
        required: true,
        minlength: 20,
        maxlength: 220,
        value: q.explanation,
      }),
      fact = h("textarea", {
        rows: 2,
        required: true,
        maxlength: 500,
        value: q.scienceFact,
      });
    const available = h("input", {
        type: "checkbox",
        checked: Boolean(row.active),
      }),
      reviewed = h("input", {
        type: "checkbox",
        checked: false,
        required: true,
      });
    const grade = h(
      "select",
      { name: "gradeBand" },
      ...[7, 8, 9, 10].map((g) =>
        h("option", { value: g, selected: q.gradeBand === g }, `Grade ${g}`),
      ),
    );
    const optionFields = (q.options ?? []).map((o, i) => ({
      option: o,
      text: input(`option-${i}`, "Choice text", o.text),
      tag: h(
        "select",
        { "aria-label": `Mix-up for choice ${i + 1}` },
        h("option", { value: "" }, "No mix-up tag"),
        ...(misconceptions as Misconception[])
          .filter((m) => m.branch === q.deckId.split(".")[0])
          .map((m) =>
            h(
              "option",
              { value: m.id, selected: o.misconception === m.id },
              m.wrong.slice(0, 110),
            ),
          ),
      ),
    }));
    let readAnswer: () => Question["answer"];
    let answerFields: HTMLElement[] = [];
    if (Array.isArray(q.answer)) {
      const positions = q.answer.map((id, i) =>
        h(
          "select",
          { "aria-label": `Correct step ${i + 1}` },
          ...(q.options ?? []).map((o) =>
            h("option", { value: o.id, selected: o.id === id }, o.text),
          ),
        ),
      );
      answerFields = positions.map((select, i) =>
        field(`Correct step ${i + 1}`, select),
      );
      readAnswer = () => positions.map((select) => select.value);
    } else if (typeof q.answer === "object") {
      const pairs = Object.entries(q.answer).map(([key, value]) => ({
        key: input("pair-prompt", "Prompt", key),
        answer: input("pair-answer", "Correct partner", value),
      }));
      answerFields = pairs.map((p) =>
        h(
          "div",
          { class: "form-row" },
          field("Match prompt", p.key),
          field("Correct partner", p.answer),
        ),
      );
      readAnswer = () =>
        Object.fromEntries(pairs.map((p) => [p.key.value, p.answer.value]));
    } else if (q.options) {
      const correct = h(
        "select",
        { name: "correct" },
        ...q.options.map((o) =>
          h("option", { value: o.id, selected: o.id === q.answer }, o.text),
        ),
      );
      optionFields.forEach((f, i) =>
        f.text.addEventListener("input", () => {
          correct.options[i].textContent = f.text.value;
        }),
      );
      answerFields = [field("Correct answer", correct)];
      readAnswer = () => correct.value;
    } else {
      const answer = input(
        "answer",
        "Correct answer",
        String(q.answer),
        q.type === "calc" ? "number" : "text",
      );
      if (q.type === "calc") answer.step = "any";
      answerFields = [field("Correct answer", answer)];
      readAnswer = () => answer.value;
    }
    const request = crypto.randomUUID();
    editor(
      "Make a science card shine",
      [
        h(
          "p",
          { class: "notice" },
          `${deckName(q.deckId)} · ${q.level} · ${q.type}. Card identity and history are preserved.`,
        ),
        field("Science question", prompt),
        ...optionFields.map((f, i) =>
          h(
            "div",
            { class: "teacher-choice-editor" },
            field(`Choice ${i + 1}`, f.text),
            field("Common mix-up", f.tag),
          ),
        ),
        ...answerFields,
        field("Explanation", explanation),
        field("A little science fact", fact),
        field("Recommended grade", grade),
        h(
          "label",
          { class: "teacher-check" },
          available,
          "Available for practice",
        ),
        h(
          "label",
          { class: "teacher-check" },
          reviewed,
          "I checked the science and the correct answer",
        ),
      ],
      async () => {
        const changed = {
          ...q,
          prompt: prompt.value,
          explanation: explanation.value,
          scienceFact: fact.value,
          gradeBand: Number(grade.value),
          answer: readAnswer(),
          reviewed: reviewed.checked,
          ...(q.options
            ? {
                options: optionFields.map((f) => ({
                  ...f.option,
                  text: f.text.value,
                  misconception: f.tag.value || undefined,
                })),
              }
            : {}),
        };
        if (!isQuestion(changed))
          throw new Error("Please check every question field.");
        const errors = validateQuestions(
          [changed],
          misconceptions as Misconception[],
        );
        if (errors.length)
          throw new Error(
            errors.map((error) => error.replace(`${q.id}: `, "")).join(" · "),
          );
        return teacherCommand(
          "question",
          {
            question: changed,
            active: available.checked,
            version: row.version,
          },
          request,
        );
      },
    );
  }
  function settings(row: Record<string, unknown>) {
    const rules = row.rules as Rules,
      game = row.game as ArcadeRules;
    if (!rules || !game) {
      content.replaceChildren(
        empty(
          "cat",
          "Settings are getting ready",
          "Refresh your workspace in a moment.",
        ),
      );
      return;
    }
    const inputs = new Map<keyof Rules, HTMLInputElement>();
    const ruleFields = (Object.keys(ruleLabels) as (keyof Rules)[]).map(
      (key) => {
        const control = input(
          key,
          ruleLabels[key],
          String(rules[key]),
          key === "timezone" ? "text" : "number",
        );
        if (key !== "timezone") {
          control.min = ["xpPerLevel", "comboEvery", "skillsLevel"].includes(
            key,
          )
            ? "1"
            : "0";
          control.step = "1";
          control.max =
            key === "xpPerLevel"
              ? "10000"
              : key === "dailyCap"
                ? "1000"
                : key === "starterMerits"
                  ? "200"
                  : "500";
        }
        inputs.set(key, control);
        return field(ruleLabels[key], control);
      },
    );
    const ruleError = h("p", { class: "form-error", role: "alert" }),
      rulesRequest = crypto.randomUUID();
    const ruleForm = h(
      "form",
      {
        class: "teacher-panel",
        onSubmit: async (event: SubmitEvent) => {
          event.preventDefault();
          ruleError.textContent = "";
          const next = Object.fromEntries(
            [...inputs].map(([key, value]) => [
              key,
              key === "timezone" ? value.value : Number(value.value),
            ]),
          );
          try {
            if (!validRules(next as unknown as Rules))
              throw new Error("Please check the learning limits and timezone.");
            await teacherCommand(
              "rules",
              { rules: next, version: row.version },
              rulesRequest,
            );
            toast("Learning settings saved.");
            await load();
          } catch (error) {
            ruleError.textContent =
              error instanceof Error ? error.message : "Please try again.";
          }
        },
      },
      h("h2", null, "Learning & class credits"),
      h(
        "p",
        { class: "muted" },
        "Class credit limits are checked when completed discoveries are saved. XP, review, quests and spins remain practice on each device.",
      ),
      h("div", { class: "teacher-settings-grid" }, ...ruleFields),
      ruleError,
      button("Save learning settings", () => undefined, "button primary", {
        type: "submit",
      }),
    );
    const seconds = game.seconds.map((value, i) => {
        const control = input(
          `seconds-${i}`,
          "Seconds",
          String(value),
          "number",
        );
        control.min = "8";
        control.max = "60";
        control.step = "1";
        return control;
      }),
      motion = game.motion.map((value, i) => {
        const control = input(
          `motion-${i}`,
          "Motion seconds",
          String(value),
          "number",
        );
        control.min = "1.25";
        control.max = "8";
        control.step = "0.25";
        return control;
      });
    const gameLabels = {
      points: "Points per correct shot",
      penalty: "Wrong-shot point penalty",
      coins: "Round coins per correct shot",
      timeCost: "Extra-time coin cost",
      dartCost: "Extra-dart coin cost",
    };
    const gameFields = (
      Object.keys(gameLabels) as (keyof typeof gameLabels)[]
    ).map((key) => {
      const control = input(key, gameLabels[key], String(game[key]), "number");
      control.min = "1";
      control.max =
        key === "coins"
          ? "10"
          : ["timeCost", "dartCost"].includes(key)
            ? "20"
            : "500";
      control.step = "1";
      return { key, control };
    });
    const gameError = h("p", { class: "form-error", role: "alert" }),
      gameRequest = crypto.randomUUID();
    const gameForm = h(
      "form",
      {
        class: "teacher-panel",
        onSubmit: async (event: SubmitEvent) => {
          event.preventDefault();
          gameError.textContent = "";
          const next = {
            ...game,
            seconds: seconds.map((c) => Number(c.value)),
            motion: motion.map((c) => Number(c.value)),
            ...Object.fromEntries(
              gameFields.map((f) => [f.key, Number(f.control.value)]),
            ),
          };
          try {
            if (!validArcadeRules(next))
              throw new Error(
                "Timers and movement durations must decrease by level. Check score and power-up limits too.",
              );
            await teacherCommand(
              "game",
              { game: next, version: row.version },
              gameRequest,
            );
            toast("Arcade settings saved for new rounds.");
            await load();
          } catch (error) {
            gameError.textContent =
              error instanceof Error ? error.message : "Please try again.";
          }
        },
      },
      h("h2", null, "Science Arcade"),
      h(
        "p",
        { class: "muted" },
        "New rounds use these settings. Active rounds keep their original settings. Reload stays at one second.",
      ),
      ...seconds.map((control, i) =>
        h(
          "div",
          { class: "form-row" },
          field(`Level ${i + 1} · seconds per card`, control),
          field(`Level ${i + 1} · movement duration`, motion[i]),
        ),
      ),
      h(
        "div",
        { class: "teacher-settings-grid" },
        ...gameFields.map((f) => field(gameLabels[f.key], f.control)),
      ),
      gameError,
      button("Save arcade settings", () => undefined, "button primary", {
        type: "submit",
      }),
    );
    content.replaceChildren(
      h("div", { class: "teacher-settings-panels" }, ruleForm, gameForm),
    );
  }
  function activity(row: Record<string, unknown>) {
    const before = row.before_value,
      after = row.after_value;
    modal(
      "A change in your classroom",
      [
        h(
          "p",
          { class: "muted" },
          `${str(row, "actor_name") || "Teacher"} · ${when(row.created_at)}`,
        ),
        h("p", null, `${str(row, "action")} · ${str(row, "note")}`),
        h(
          "div",
          { class: "teacher-history-grid" },
          h(
            "div",
            null,
            h("h3", null, "Before"),
            h(
              "pre",
              { class: "teacher-history" },
              JSON.stringify(before, null, 2),
            ),
          ),
          h(
            "div",
            null,
            h("h3", null, "After"),
            h(
              "pre",
              { class: "teacher-history" },
              JSON.stringify(after, null, 2),
            ),
          ),
        ),
      ],
      true,
    );
  }
  async function exportData() {
    const first = await teacherData(section, saved.filters, 0);
    if (first.total > 20000)
      throw new Error(
        "Please narrow your filters to export up to 20,000 records at once.",
      );
    const rows = [...first.rows];
    for (let offset = 50; offset < first.total; offset += 50) {
      const next = await teacherData(section, saved.filters, offset);
      rows.push(...next.rows);
    }
    if (!rows.length) {
      toast("There are no matching records to export.");
      return;
    }
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const csv = [
      keys,
      ...rows.map((row) =>
        keys.map((key) =>
          typeof row[key] === "object" && row[key] !== null
            ? JSON.stringify(row[key])
            : (row[key] ?? ""),
        ),
      ),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    download(
      `cozy-class-${section}.csv`,
      "\uFEFF" + csv,
      "text/csv;charset=utf-8",
    );
  }
  mountedTeacher = { userId: viewer.id, section, node: page };
  void load();
  return page;
}
