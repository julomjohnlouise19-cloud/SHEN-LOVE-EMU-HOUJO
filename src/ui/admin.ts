import type { Item, Question, Rules } from "../core/types";
import {
  currentUser,
  getState,
  dispatch,
  loadDeck,
  exportBackup,
  importBackup,
} from "../store";
import { isQuestion } from "../store/schema";
import { validateQuestions } from "../core/validate";
import { misconceptionCounts } from "../core/analytics";
import misconceptions from "../data/misconceptions.json";
import { decks } from "../data/catalog";
import { h, button, field, input, modal, toast, download } from "./dom";
import { icon, supply } from "./svg";
import { act, refresh, go } from "./actions";
import { pageHeading, empty } from "./shell";
import { authModal } from "./auth";
let tab = "Overview";
let selectedDeck = "life.cells";
let heatmapSection = "";
const tabs = [
  "Overview",
  "Scientists",
  "Supplies",
  "Claims",
  "Lab rules",
  "Questions",
  "Audit & backup",
];
const ruleLabels: Record<keyof Rules, string> = {
  starterMerits: "Starter merits for a new scientist",
  comboBonus: "Merits per earned combo step",
  timezone: "Calendar timezone",
  meritEasy: "Easy · merits per correct answer",
  meritMedium: "Medium · merits per correct answer",
  meritHard: "Hard · merits per correct answer",
  dailyCap: "Daily play & review merit cap",
  correctXP: "XP for a correct answer",
  attemptXP: "XP for a thoughtful attempt",
  xpPerLevel: "XP needed per level",
  comboEvery: "Correct answers per combo bonus",
  reviewReward: "Merits per correct review",
  dailyReward: "Daily challenge completion bonus",
  questReward: "Merits per daily quest",
  spinMax: "Maximum daily spin merits",
  skillsLevel: "Skills Lab unlock level",
};
export async function adminPage() {
  if (currentUser()?.role !== "admin")
    return empty(
      "cat",
      "A space for our SSC teachers.",
      "Sign in as an admin to look after your little learning community.",
      button("Admin sign in", () => authModal(), "button primary"),
    );
  const content = h("div", { class: "admin-content" });
  if (tab === "Overview") content.append(overview());
  else if (tab === "Scientists") content.append(scientists());
  else if (tab === "Supplies") content.append(inventory());
  else if (tab === "Claims") content.append(claims());
  else if (tab === "Lab rules") content.append(rulesForm());
  else if (tab === "Questions") content.append(await questionEditor());
  else content.append(auditPage());
  return h(
    "div",
    { class: "page-enter admin-page" },
    pageHeading(
      "SSC MISSION CONTROL",
      "A little care makes a lab grow.",
      "Look after your scientists, the science, and the supply shelf.",
      h("span", { class: "pill" }, icon("lock", 14), "DEMO ADMIN"),
    ),
    h(
      "p",
      { class: "notice" },
      "Local browser demo · Roles and records are not server-enforced. Verify all real supplies and claims at school. Export backups before major changes.",
    ),
    h(
      "div",
      { class: "admin-tabs", role: "group", "aria-label": "Admin sections" },
      ...tabs.map((t) =>
        button(
          t,
          () => {
            tab = t;
            refresh();
          },
          `filter-tab ${tab === t ? "selected" : ""}`,
          { "aria-pressed": tab === t },
        ),
      ),
    ),
    content,
  );
}
function metric(value: number | string, label: string, ico: string) {
  return h(
    "div",
    { class: "metric paper" },
    icon(ico, 24),
    h("strong", null, value),
    h("span", null, label),
  );
}
function overview() {
  const s = getState(),
    online = s.users.filter(
      (u) =>
        Date.now() - u.lastSeen < 120000 &&
        s.sessions.some((t) => t.userId === u.id && t.expires > Date.now()),
    );
  const sections = [
    ...new Set(
      s.users
        .filter((u) => u.role === "student")
        .map((u) => u.section || "No section yet"),
    ),
  ];
  const mixups = misconceptionCounts(s.events, s.users, heatmapSection);
  const sectionFilter = h(
    "select",
    { "aria-label": "Misconception section filter", class: "heatmap-filter" },
    h("option", { value: "", selected: !heatmapSection }, "All sections"),
    ...sections.map((section) =>
      h(
        "option",
        { value: section, selected: heatmapSection === section },
        section,
      ),
    ),
  );
  sectionFilter.addEventListener("change", () => {
    heatmapSection = sectionFilter.value;
    refresh();
  });
  return h(
    "div",
    null,
    h(
      "div",
      { class: "metric-grid" },
      metric(
        s.users.filter((u) => u.role === "student" && u.id !== "guest").length,
        "Registered scientists",
        "sprout",
      ),
      metric(online.length, "Active in the last 2 minutes", "heart"),
      metric(
        s.events.filter((e) => e.type === "AnswerSubmitted").length,
        "Little discoveries tried",
        "flask",
      ),
      metric(
        s.purchases.filter((p) => p.status === "redeemed").length,
        "Claims to look after",
        "shop",
      ),
    ),
    h(
      "div",
      { class: "admin-two-columns" },
      h(
        "section",
        { class: "paper admin-panel" },
        h("h2", null, "Where a little support can help"),
        h(
          "p",
          { class: "muted" },
          "Answer accuracy by section, from saved learning attempts.",
        ),
        ...sections.map((section) => {
          const users = s.users.filter(
              (u) => (u.section || "No section yet") === section,
            ),
            ms = users.flatMap((u) => Object.values(u.mastery)),
            correct = ms.reduce((n, m) => n + m.correct, 0),
            attempts = ms.reduce((n, m) => n + m.attempts, 0);
          return h(
            "div",
            { class: "analytics-row" },
            h("strong", null, section),
            h(
              "span",
              null,
              attempts
                ? `${Math.round((correct / attempts) * 100)}% · ${attempts} attempts`
                : "No attempts yet",
            ),
          );
        }),
      ),
      h(
        "section",
        { class: "paper admin-panel" },
        h("h2", null, "Mix-ups to untangle together"),
        sectionFilter,
        Object.entries(mixups).length
          ? h(
              "div",
              null,
              ...Object.entries(mixups)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([id, count]) =>
                  h(
                    "div",
                    { class: "heatmap-row" },
                    h(
                      "p",
                      null,
                      misconceptions.find((m) => m.id === id)?.wrong ?? id,
                    ),
                    h("span", { class: "count-pill" }, count),
                  ),
                ),
            )
          : h(
              "p",
              { class: "muted" },
              "Tagged mix-ups will appear here after students explore.",
            ),
      ),
    ),
    h(
      "section",
      { class: "paper admin-panel" },
      h("h2", null, "A little life in the lab"),
      s.events.length
        ? h(
            "div",
            { class: "activity-list" },
            ...s.events
              .slice(-12)
              .reverse()
              .map((e) =>
                h(
                  "div",
                  null,
                  icon("sprout", 16),
                  h("span", null, e.text),
                  h(
                    "small",
                    { class: "muted" },
                    new Date(e.time).toLocaleTimeString("en-PH", {
                      timeZone: s.rules.timezone,
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  ),
                ),
              ),
          )
        : h(
            "p",
            { class: "muted" },
            "Quiet for now. New discoveries will appear here.",
          ),
    ),
  );
}
function scientists() {
  const s = getState();
  return h(
    "div",
    { class: "paper table-wrap" },
    h(
      "table",
      null,
      h("caption", null, "Scientist profiles and merit adjustments"),
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          ...[
            "Scientist",
            "Grade / section",
            "Merits",
            "XP",
            "Seen",
            "Care",
          ].map((v) => h("th", { scope: "col" }, v)),
        ),
      ),
      h(
        "tbody",
        null,
        ...s.users.map((u) =>
          h(
            "tr",
            null,
            h(
              "td",
              null,
              h("strong", null, u.name),
              h(
                "small",
                { class: "block muted" },
                `@${u.username} · ${u.role}`,
              ),
            ),
            h("td", null, `${u.grade} / ${u.section || "—"}`),
            h("td", null, u.merits),
            h("td", null, u.xp),
            h(
              "td",
              null,
              Date.now() - u.lastSeen < 120000 &&
                s.sessions.some(
                  (t) => t.userId === u.id && t.expires > Date.now(),
                )
                ? h("span", { class: "status-tag claimed" }, "Here recently")
                : "Away",
            ),
            h(
              "td",
              null,
              button(
                "Adjust merits",
                () => {
                  const amount = input(
                      "amount",
                      "e.g. 10 or −10",
                      "",
                      "number",
                    ),
                    reason = input("reason", "Why are you adjusting merits?");
                  const { close } = modal(`A little adjustment for ${u.name}`, [
                    h(
                      "p",
                      { class: "muted" },
                      `Current balance: ${u.merits} merits. Changes are audited and may be undone if no newer transaction has occurred.`,
                    ),
                    h(
                      "form",
                      {
                        onSubmit: async (e: SubmitEvent) => {
                          e.preventDefault();
                          await act(async () => {
                            await dispatch({
                              type: "AdminGivePoints",
                              userId: u.id,
                              amount: Number(amount.value),
                              reason: reason.value,
                            });
                            close();
                            toast(
                              "Merits adjusted and recorded in the audit log.",
                            );
                          })();
                        },
                      },
                      field("Whole merits to add or subtract", amount),
                      field("Reason", reason),
                      button(
                        "Save adjustment",
                        () => undefined,
                        "button primary full",
                        { type: "submit" },
                      ),
                    ),
                  ]);
                },
                "text-button",
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
function inventory() {
  return h(
    "div",
    { class: "shop-grid" },
    ...getState().items.map((item) =>
      h(
        "article",
        { class: "paper shop-item" },
        h("div", { class: `shop-item-art ${item.color}` }, supply(item.icon)),
        h(
          "div",
          { class: "shop-item-body" },
          h("h2", null, item.name),
          h(
            "p",
            { class: "muted" },
            `${item.price} merits · ${item.stock} on shelf`,
          ),
          button(
            "Look after this supply",
            () => itemModal(item),
            "button outline full",
          ),
        ),
      ),
    ),
  );
}
function itemModal(item: Item) {
  const name = input("name", "", item.name),
    price = input("price", "", String(item.price), "number"),
    stock = input("stock", "", String(item.stock), "number");
  price.min = "0";
  stock.min = "0";
  const { close } = modal("Look after a little supply", [
    h(
      "form",
      {
        onSubmit: async (e: SubmitEvent) => {
          e.preventDefault();
          await act(async () => {
            await dispatch({
              type: "AdminItem",
              item: {
                ...item,
                name: name.value,
                price: Number(price.value),
                stock: Number(stock.value),
              },
            });
            close();
            toast("The supply shelf is updated.");
          })();
        },
      },
      field("Supply name", name),
      h(
        "div",
        { class: "form-row" },
        field("Merit price", price),
        field("Stock", stock),
      ),
      button("Save supply", () => undefined, "button primary full", {
        type: "submit",
      }),
    ),
  ]);
}
function claims() {
  const s = getState();
  return s.purchases.length
    ? h(
        "div",
        { class: "paper table-wrap" },
        h(
          "table",
          null,
          h(
            "caption",
            null,
            "Supply purchases, redemption and school collection",
          ),
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              ...[
                "Scientist",
                "Supply",
                "Unique code",
                "Status",
                "School collection",
              ].map((t) => h("th", { scope: "col" }, t)),
            ),
          ),
          h(
            "tbody",
            null,
            ...s.purchases
              .slice()
              .reverse()
              .map((p) =>
                h(
                  "tr",
                  null,
                  h(
                    "td",
                    null,
                    s.users.find((u) => u.id === p.userId)?.name ??
                      "Unknown scientist",
                  ),
                  h("td", null, p.itemName),
                  h("td", null, h("code", null, p.code)),
                  h(
                    "td",
                    null,
                    h("span", { class: `status-tag ${p.status}` }, p.status),
                  ),
                  h(
                    "td",
                    null,
                    p.status === "redeemed"
                      ? button(
                          "Confirm collected",
                          () => {
                            const { close } = modal(
                              "Confirm school collection",
                              [
                                h(
                                  "p",
                                  { class: "muted" },
                                  `Verify ${p.code} and hand over ${p.itemName} at the Grade 10 SSC room before marking it collected.`,
                                ),
                                button(
                                  "Verified & handed over",
                                  act(async () => {
                                    await dispatch({
                                      type: "ClaimPurchase",
                                      purchaseId: p.id,
                                    });
                                    close();
                                    toast("Collection recorded.");
                                  }),
                                  "button primary full",
                                ),
                              ],
                            );
                          },
                          "button subtle",
                        )
                      : p.status === "claimed"
                        ? "Collected with teacher"
                        : "Awaiting student redemption",
                  ),
                ),
              ),
          ),
        ),
      )
    : empty(
        "pudding",
        "A quiet little supply shelf.",
        "Purchases and redeemed codes will appear here for school verification.",
      );
}
function rulesForm() {
  const rules = getState().rules,
    inputs = new Map<keyof Rules, HTMLInputElement>();
  const error = h("p", { class: "form-error", role: "alert" });
  return h(
    "form",
    {
      class: "paper admin-panel",
      onSubmit: async (e: SubmitEvent) => {
        e.preventDefault();
        const next = { ...rules };
        for (const [k, v] of inputs)
          Object.assign(next, {
            [k]: k === "timezone" ? v.value.trim() : Number(v.value),
          });
        await act(async () => {
          await dispatch({ type: "AdminRules", rules: next });
          toast("Lab rules updated. All new actions use these values.");
        })();
      },
    },
    h("h2", null, "One source for every little number"),
    h(
      "p",
      { class: "muted" },
      "Existing purchases keep their original price. New actions use the saved rules.",
    ),
    h(
      "div",
      { class: "rule-grid" },
      ...Object.entries(rules).map(([key, value]) => {
        const k = key as keyof Rules,
          el = input(
            k,
            "",
            String(value),
            typeof value === "number" ? "number" : "text",
          );
        if (typeof value === "number") {
          el.min = ["xpPerLevel", "comboEvery", "skillsLevel"].includes(k)
            ? "1"
            : "0";
          el.max = "10000";
        }
        inputs.set(k, el);
        return field(ruleLabels[k], el);
      }),
    ),
    error,
    button("Save our lab rules", () => undefined, "button primary", {
      type: "submit",
    }),
  );
}
async function questionEditor() {
  const bank = await loadDeck(selectedDeck),
    select = h(
      "select",
      { "aria-label": "Question deck" },
      ...decks.map((d) =>
        h("option", { value: d.id, selected: d.id === selectedDeck }, d.name),
      ),
    );
  select.addEventListener("change", () => {
    selectedDeck = select.value;
    refresh();
  });
  const file = h("input", {
    type: "file",
    accept: ".json,.csv",
    "aria-label": "Import question JSON or CSV",
  });
  file.addEventListener(
    "change",
    () =>
      void act(async () => {
        const selected = file.files?.[0];
        if (!selected) return;
        if (selected.size > 2_000_000)
          throw new Error("Use a question file smaller than 2 MB.");
        const text = await selected.text();
        const parsed: unknown = selected.name.endsWith(".csv")
          ? parseQuestionCSV(text)
          : JSON.parse(text);
        if (
          !Array.isArray(parsed) ||
          !parsed.length ||
          !parsed.every(isQuestion)
        )
          throw new Error(
            "Import a nonempty array of complete schema-v2 questions. No data was changed.",
          );
        const errors = validateQuestions(parsed, misconceptions, false);
        if (errors.length) throw new Error(errors.slice(0, 3).join(" · "));
        await dispatch({
          type: "AdminQuestions",
          overlays: (parsed as Question[]).map((q) => ({
            op: bank.some((b) => b.id === q.id) ? "patch" : "add",
            question: q,
          })),
        });
        toast(`Imported ${parsed.length} validated question overlays.`);
        refresh();
      })(),
  );
  return h(
    "section",
    { class: "paper admin-panel" },
    h("h2", null, "Care for the science, one card at a time."),
    h(
      "p",
      { class: "muted" },
      "Edits are overlays; the reviewed static bank stays intact. Imports must pass the question schema and science validator.",
    ),
    h(
      "div",
      { class: "question-editor-toolbar" },
      select,
      button(
        "Export this deck",
        () => download(`${selectedDeck}.json`, JSON.stringify(bank, null, 2)),
        "button outline",
      ),
      button(
        "Add a science card",
        () => editQuestion(bank[0], true),
        "button primary",
      ),
    ),
    field(
      "Import complete question objects (JSON or CSV)",
      file,
      "CSV uses schema field names; options, answer, accept and data use JSON inside quoted cells.",
    ),
    h(
      "div",
      { class: "question-admin-list" },
      ...bank.map((q) =>
        h(
          "div",
          null,
          h("span", { class: "pill" }, q.level),
          h("p", null, q.prompt),
          button("Edit", () => editQuestion(q), "text-button"),
          button(
            "Remove",
            () => {
              const { close } = modal("Remove this question from play?", [
                h("p", { class: "muted" }, q.prompt),
                button(
                  "Save deletion overlay",
                  act(async () => {
                    await dispatch({
                      type: "AdminQuestion",
                      overlay: { op: "delete", question: q },
                    });
                    close();
                    toast("Question hidden by an overlay.");
                  }),
                  "button outline full",
                ),
              ]);
            },
            "text-button",
          ),
        ),
      ),
    ),
  );
}
function editQuestion(q: Question | undefined, adding = false) {
  const initial = q
    ? {
        ...q,
        ...(adding ? { id: `${selectedDeck}.custom.${Date.now()}` } : {}),
      }
    : {
        id: `${selectedDeck}.custom.${Date.now()}`,
        deckId: selectedDeck,
        level: "medium",
        type: "input",
        prompt: "",
        answer: "",
        explanation: "",
        scienceFact: "",
        topic: selectedDeck,
        gradeBand: 7,
        bloom: "apply",
        curriculumArea: deckByName(selectedDeck),
        reviewed: true,
      };
  const editor = h(
    "textarea",
    { rows: 18, class: "code-editor", "aria-label": "Question schema v2 JSON" },
    JSON.stringify(initial, null, 2),
  );
  const { close } = modal(
    adding ? "Author a science card" : "Edit a little science card",
    [
      h(
        "p",
        { class: "muted" },
        "Keep one clear correct answer. Use SI units and a short explanation. Carefully review before saving reviewed: true.",
      ),
      editor,
      button(
        "Validate & save overlay",
        act(async () => {
          const parsed: unknown = JSON.parse(editor.value);
          if (!isQuestion(parsed))
            throw new Error("This card does not match schema v2.");
          const errors = validateQuestions([parsed], misconceptions);
          if (errors.length) throw new Error(errors.join(" · "));
          await dispatch({
            type: "AdminQuestion",
            overlay: { op: adding ? "add" : "patch", question: parsed },
          });
          close();
          toast("Reviewed question overlay saved.");
        }),
        "button primary full",
      ),
    ],
    true,
  );
}
function deckByName(id: string) {
  return decks.find((d) => d.id === id)?.name ?? "Science";
}
function parseQuestionCSV(csv: string): unknown[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV has an unclosed quoted cell.");
  row.push(cell);
  if (row.some((v) => v)) rows.push(row);
  const headers = rows.shift();
  if (!headers) throw new Error("CSV needs a header row.");
  const allowed = new Set([
    "id",
    "deckId",
    "level",
    "type",
    "prompt",
    "options",
    "answer",
    "accept",
    "unit",
    "tolerance",
    "explanation",
    "scienceFact",
    "topic",
    "gradeBand",
    "bloom",
    "curriculumArea",
    "ph",
    "diagram",
    "generator",
    "reviewed",
    "data",
  ]);
  if (
    headers.some((h) => !allowed.has(h)) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("CSV contains unknown or duplicate fields.");
  return rows.map((r) => {
    if (r.length !== headers.length)
      throw new Error("CSV row length does not match its header.");
    return Object.fromEntries(
      headers.flatMap((key, i) => {
        const value = r[i];
        if (!value) return [];
        let parsed: unknown = value;
        if (["options", "answer", "accept", "data"].includes(key)) {
          try {
            parsed = JSON.parse(value);
          } catch {
            if (key !== "answer") throw new Error(`Invalid JSON in ${key}.`);
          }
        } else if (["tolerance", "gradeBand"].includes(key))
          parsed = Number(value);
        else if (["ph", "reviewed"].includes(key)) {
          if (!["true", "false"].includes(value))
            throw new Error(`Use true or false for ${key}.`);
          parsed = value === "true";
        }
        return [[key, parsed]];
      }),
    );
  });
}
function auditPage() {
  const s = getState(),
    file = h("input", {
      type: "file",
      accept: ".json",
      "aria-label": "Backup JSON file",
    });
  file.addEventListener(
    "change",
    () =>
      void act(async () => {
        const selected = file.files?.[0];
        if (!selected) return;
        if (selected.size > 15_000_000)
          throw new Error("Use a backup smaller than 15 MB.");
        const text = await selected.text();
        const { close } = modal("Restore this lab backup?", [
          h(
            "p",
            { class: "muted" },
            "This replaces the local demo data for every tab and signs everyone out. Export the current lab first if you want to keep it.",
          ),
          button(
            "Export current backup",
            () => download("cozy-science-before-restore.json", exportBackup()),
            "button outline full",
          ),
          button(
            "Validate & restore backup",
            act(async () => {
              await importBackup(text);
              close();
              toast("Backup restored. Sign in again to continue.");
              go("/");
              authModal();
            }),
            "button primary full",
          ),
        ]);
      })(),
  );
  return h(
    "div",
    null,
    h(
      "section",
      { class: "paper admin-panel" },
      h("h2", null, "Keep a little safety net."),
      h(
        "p",
        { class: "muted" },
        "Backups contain local demo account hashes and learning records. Keep them private. Sessions are not exported.",
      ),
      button(
        h("span", null, icon("download", 17), "Export the whole lab"),
        () => download("cozy-science-backup.json", exportBackup()),
        "button primary",
      ),
      field("Restore a validated lab backup", file),
    ),
    h(
      "section",
      { class: "paper admin-panel" },
      h("h2", null, "A clear trail of little changes"),
      h(
        "p",
        { class: "muted" },
        "Only the latest transaction can be undone. This prevents newer work being overwritten.",
      ),
      s.audit.length
        ? h(
            "div",
            { class: "audit-list" },
            ...s.audit
              .slice()
              .reverse()
              .map((a) =>
                h(
                  "div",
                  null,
                  h(
                    "div",
                    null,
                    h("strong", null, a.command),
                    h("p", null, a.text || "Lab housekeeping"),
                    h(
                      "small",
                      { class: "muted" },
                      `${s.users.find((u) => u.id === a.actor)?.name ?? a.actor} · ${new Date(a.time).toLocaleString("en-PH", { timeZone: s.rules.timezone })}`,
                    ),
                  ),
                  a.inverse && a.afterRev === s.rev && !a.undone
                    ? button(
                        "Undo change",
                        act(async () => {
                          await dispatch({ type: "Undo", auditId: a.id });
                          toast("Latest change safely undone.");
                        }),
                        "button outline",
                      )
                    : h(
                        "span",
                        { class: "pill" },
                        a.undone ? "undone" : "recorded",
                      ),
                ),
              ),
          )
        : h("p", { class: "muted" }, "Changes will leave a trail here."),
    ),
  );
}
