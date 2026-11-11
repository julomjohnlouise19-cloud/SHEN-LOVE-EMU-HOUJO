import type { Answer } from "../core/types";
import { currentUser, dispatch, getState, loadDeck } from "../store";
import { answerLabel, levelOf } from "../core/rules";
import { seededRng, shuffle, hashSeed } from "../core/random";
import { deckById, branchById } from "../data/catalog";
import { h, button, field, input, progress, toast, modal } from "./dom";
import { icon, diagram, mascot } from "./svg";
import { act, go, refresh } from "./actions";
import { empty } from "./shell";
import { startDeck } from "./learn";
let feedbackRun = "",
  feedbackIndex = -1;
import { sourceButton } from "./sources";
const hints = new Set<string>();
const selectedAnswers = new Map<string, Answer>();
export async function playPage(runId: string) {
  const run = getState().runs.find(
    (r) => r.id === runId && r.userId === currentUser()?.id,
  );
  if (!run)
    return empty(
      "cat",
      "Let’s open a fresh deck.",
      "That session is no longer here. A new discovery is waiting.",
      button("Explore science", () => go("/island"), "button primary"),
    );
  const bank = await loadDeck(run.deckId),
    deck = deckById(run.deckId)!;
  const revealing =
    feedbackRun === runId && feedbackIndex === run.answers.length - 1;
  if (run.completed && !revealing) return resultPage(runId);
  const index = revealing ? run.answers.length - 1 : run.answers.length,
    q = bank.find((q) => q.id === run.ids[index]);
  if (!q)
    return empty(
      "cat",
      "This card was changed.",
      "An admin updated the question bank. Your earlier answers are safe; start a fresh deck.",
      button(
        "Open another deck",
        () => go(`/branch/${deck.branch}`),
        "button primary",
      ),
    );
  const result = revealing ? run.answers[index] : undefined;
  let value: Answer = selectedAnswers.get(`${runId}:${q.id}`) ?? "";
  const answerArea = h("div", { class: "answer-area" });
  const submit = button("Check my answer", () => undefined, "button primary", {
    type: "submit",
    disabled: !value || revealing,
  });
  const update = (answer: Answer) => {
    value = answer;
    selectedAnswers.set(`${runId}:${q.id}`, answer);
    submit.disabled =
      revealing || !answer || (Array.isArray(answer) && answer.length === 0);
  };
  if (q.type === "order") {
    const order =
      Array.isArray(value) && value.length
        ? value
        : shuffle(
            q.options!.map((o) => o.id),
            seededRng(hashSeed(q.id)),
          );
    update(order);
    const renderOrder = () =>
      answerArea.replaceChildren(
        h(
          "p",
          { class: "answer-instruction" },
          icon("island", 16),
          "Move the steps into the right order.",
        ),
        ...order.map((id, i) =>
          h(
            "div",
            { class: "order-row" },
            h("span", { class: "option-letter" }, i + 1),
            h("span", null, q.options!.find((o) => o.id === id)!.text),
            button(
              "↑",
              () => {
                [order[i - 1], order[i]] = [order[i], order[i - 1]];
                update(order);
                renderOrder();
              },
              "icon-button",
              {
                disabled: revealing || i === 0,
                "aria-label": `Move step ${i + 1} up`,
              },
            ),
            button(
              "↓",
              () => {
                [order[i + 1], order[i]] = [order[i], order[i + 1]];
                update(order);
                renderOrder();
              },
              "icon-button",
              {
                disabled: revealing || i === order.length - 1,
                "aria-label": `Move step ${i + 1} down`,
              },
            ),
          ),
        ),
      );
    renderOrder();
  } else if (
    q.type === "match" &&
    typeof q.answer === "object" &&
    !Array.isArray(q.answer)
  ) {
    const pairs = Object.entries(q.answer),
      values = shuffle(
        pairs.map(([, v]) => v),
        seededRng(hashSeed(q.id)),
      );
    const answers: Record<string, string> =
      typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
    for (const [key] of pairs) {
      const select = h(
        "select",
        { "aria-label": `Match ${key}`, disabled: revealing },
        h("option", { value: "" }, "Choose its partner…"),
        ...values.map((v) =>
          h("option", { value: v, selected: answers[key] === v }, v),
        ),
      );
      select.addEventListener("change", () => {
        answers[key] = select.value;
        update(answers);
        submit.disabled = pairs.some(([k]) => !answers[k]);
      });
      answerArea.append(
        h(
          "div",
          { class: "match-row" },
          h("strong", null, key),
          icon("arrow", 17),
          select,
        ),
      );
    }
  } else if (q.options) {
    const renderOptions = () =>
      answerArea.replaceChildren(
        ...q
          .options!.filter(
            (o) =>
              !hints.has(q.id) ||
              o.id !== q.options!.find((x) => x.id !== q.answer)?.id ||
              revealing,
          )
          .map((o) =>
            button(
              h(
                "span",
                null,
                h(
                  "span",
                  { class: "option-letter" },
                  String.fromCharCode(65 + q.options!.indexOf(o)),
                ),
                h("span", null, o.text),
                revealing && o.id === q.answer ? icon("check", 18) : null,
              ),
              () => {
                update(o.id);
                renderOptions();
              },
              `answer-option ${value === o.id ? "selected" : ""} ${revealing && o.id === q.answer ? "correct" : ""} ${revealing && value === o.id && !result?.correct ? "incorrect" : ""}`,
              { disabled: revealing, "aria-pressed": value === o.id },
            ),
          ),
      );
    if (revealing && result) value = result.value;
    renderOptions();
  } else {
    const answer = input(
      "answer",
      q.type === "calc" ? "Your number goes here…" : "Your idea goes here…",
      String(revealing ? (result?.value ?? "") : value),
      q.type === "calc" ? "number" : "text",
    );
    answer.disabled = revealing;
    if (q.type === "calc") answer.step = "any";
    answer.addEventListener("input", () => update(answer.value));
    answerArea.append(
      field(q.unit ? `Answer in ${q.unit}` : "Your answer", answer),
    );
  }
  const form = h(
    "form",
    {
      onSubmit: async (e: SubmitEvent) => {
        e.preventDefault();
        if (revealing || submit.disabled) return;
        submit.disabled = true;
        feedbackRun = runId;
        feedbackIndex = index;
        try {
          await dispatch({ type: "SubmitAnswer", runId, question: q, value });
          refresh();
        } catch (e) {
          feedbackRun = "";
          feedbackIndex = -1;
          toast(e instanceof Error ? e.message : "Please try again.");
          submit.disabled = false;
        }
      },
    },
    answerArea,
    !revealing
      ? h(
          "div",
          { class: "answer-controls" },
          button(
            h(
              "span",
              null,
              icon("sparkles", 15),
              hints.has(q.id) ? "You’ve got this" : "A little hint?",
            ),
            () => {
              hints.add(q.id);
              if (q.type === "order" && Array.isArray(q.answer))
                toast(
                  `Start with: ${q.options?.find((o) => o.id === (q.answer as string[])[0])?.text}.`,
                );
              else if (
                q.type === "match" &&
                typeof q.answer === "object" &&
                !Array.isArray(q.answer)
              ) {
                const [key, partner] = Object.entries(q.answer)[0];
                toast(`One little connection: ${key} → ${partner}.`);
              } else if (q.type === "calc")
                toast(
                  `A little formula clue: ${q.explanation.split(" = ").slice(0, 2).join(" = ").split(". ")[0]}.`,
                );
              else if (!q.options)
                toast(
                  `Think about ${q.curriculumArea.toLowerCase()}. Try the science term or a short answer.`,
                );
              else {
                if (value === q.options.find((o) => o.id !== q.answer)?.id)
                  selectedAnswers.delete(`${runId}:${q.id}`);
                toast("One unlikely choice is tucked away. Take another look.");
              }
              refresh();
            },
            "text-button",
            { disabled: hints.has(q.id) },
          ),
          submit,
        )
      : null,
  );
  return h(
    "div",
    { class: "play-page page-enter" },
    h(
      "div",
      { class: "play-topline" },
      button(
        h("span", null, "← ", "Save & leave this quiz"),
        () => {
          modal("Take a little break?", [
            h(
              "p",
              { class: "muted" },
              "Your answers are saved. You can resume this deck from your lab.",
            ),
            button(
              "Keep discovering",
              () => document.querySelector("dialog")?.close(),
              "button primary full",
            ),
            button(
              "Save & take a break",
              () => {
                document.querySelector("dialog")?.close();
                go(`/branch/${deck.branch}`);
              },
              "text-button full",
            ),
          ]);
        },
        "text-button",
      ),
      h(
        "span",
        { class: "pill" },
        run.mode === "review"
          ? "REVIEW BOX"
          : run.mode === "boss"
            ? "MISCONCEPTION BOSS"
            : run.mode === "daily"
              ? "DAILY CHALLENGE"
              : `${run.level.toUpperCase()} · ${run.ids.length} CARDS`,
      ),
    ),
    h(
      "div",
      { class: "play-header" },
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, branchById(deck.branch)?.name),
        h("h1", null, deck.name),
      ),
      h(
        "span",
        { class: "play-counter" },
        "Little discovery ",
        h("strong", null, index + 1),
        ` / ${run.ids.length}`,
      ),
    ),
    progress(
      ((index + (revealing ? 1 : 0)) / run.ids.length) * 100,
      "Deck progress",
    ),
    h(
      "div",
      { class: "play-columns" },
      h(
        "section",
        { class: "question-card paper", "aria-label": "Science question" },
        h(
          "div",
          { class: "question-type" },
          icon(q.type === "calc" ? "flask" : "sparkles", 16),
          (
            {
              order: "PUT IT IN ORDER",
              match: "MAKE THE CONNECTION",
              input: "A LITTLE RECALL",
              calc: "LET’S WORK IT OUT",
              data: "FOLLOW THE EVIDENCE",
              diagram: "LOOK A LITTLE CLOSER",
            } as Record<string, string>
          )[q.type] ?? "A MOMENT OF CURIOSITY",
          q.ph ? h("span", { class: "ph-tag" }, "IN OUR ISLANDS") : null,
        ),
        h("h2", null, q.prompt),
        q.diagram
          ? h(
              "div",
              { class: "question-diagram" },
              diagram(q.diagram),
              h(
                "p",
                { class: "fine-print" },
                "A simplified model to explore; not drawn to scale.",
              ),
            )
          : null,
        q.data
          ? h(
              "div",
              { class: "table-wrap" },
              h(
                "table",
                null,
                h("caption", null, "Evidence for this question"),
                h(
                  "thead",
                  null,
                  h(
                    "tr",
                    null,
                    ...q.data.headers.map((v) => h("th", { scope: "col" }, v)),
                  ),
                ),
                h(
                  "tbody",
                  null,
                  ...q.data.rows.map((row) =>
                    h("tr", null, ...row.map((v) => h("td", null, v))),
                  ),
                ),
              ),
            )
          : null,
        form,
        revealing && result
          ? h(
              "div",
              {
                class: `answer-feedback ${result.correct ? "success" : "gentle"}`,
                role: "status",
                "aria-live": "polite",
              },
              h(
                "h3",
                null,
                icon(result.correct ? "check" : "sprout", 21),
                result.correct
                  ? "A little a-ha! You’ve got it."
                  : "A mix-up is a chance to grow.",
              ),
              result.misconception
                ? h(
                    "p",
                    null,
                    `A lot of people think “${q.options?.find((o) => o.id === result.value)?.text}” fits here. Here’s why that’s a mix-up.`,
                  )
                : null,
              !result.correct
                ? h(
                    "p",
                    null,
                    h("strong", null, "Let’s untangle it: "),
                    answerLabel(q),
                  )
                : null,
              h("p", null, q.explanation),
              sourceButton(q.deckId, q),
              button(
                "Suggest a card improvement",
                () =>
                  go(
                    `/suggestions?deck=${encodeURIComponent(q.deckId)}&question=${encodeURIComponent(q.id)}`,
                  ),
                "text-button",
              ),
              !result.correct
                ? h(
                    "small",
                    null,
                    icon("box", 14),
                    "Tucked into your Review Box for a little practice later.",
                  )
                : h(
                    "small",
                    null,
                    icon("coin", 15),
                    `+${result.merits} merits · +${result.xp} XP`,
                  ),
              button(
                h(
                  "span",
                  null,
                  run.completed
                    ? "See my discoveries"
                    : "On to the next little wonder",
                  icon("arrow", 17),
                ),
                () => {
                  feedbackRun = "";
                  feedbackIndex = -1;
                  refresh();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                },
                "button primary",
              ),
            )
          : null,
      ),
      h(
        "aside",
        { class: "play-companion" },
        h(
          "div",
          { class: "companion-note" },
          mascot(branchById(deck.branch)?.icon ?? "cat"),
          h(
            "p",
            null,
            revealing
              ? result?.correct
                ? "See? Your curiosity is paying off!"
                : "Even scientists change their minds. That’s how we grow."
              : "Take your time. Big ideas start with little questions.",
          ),
          h("small", null, `— ${branchById(deck.branch)?.mascot}`),
        ),
        h(
          "div",
          { class: "run-stats paper" },
          h(
            "span",
            null,
            icon("coin", 17),
            "Merits grown",
            h(
              "strong",
              null,
              run.answers.reduce((n, a) => n + a.merits, 0),
            ),
          ),
          h(
            "span",
            null,
            icon("star", 17),
            "XP collected",
            h(
              "strong",
              null,
              run.answers.reduce((n, a) => n + a.xp, 0),
            ),
          ),
          h(
            "small",
            { class: "muted" },
            "Steady effort beats grinding. Play merit rewards have a daily cap.",
          ),
        ),
      ),
    ),
  );
}
function resultPage(runId: string) {
  const s = getState(),
    run = s.runs.find((r) => r.id === runId)!,
    u = currentUser()!,
    d = deckById(run.deckId)!;
  const correct = run.answers.filter((a) => a.correct).length,
    merits = run.answers.reduce((n, a) => n + a.merits, 0),
    xp = run.answers.reduce((n, a) => n + a.xp, 0);
  return h(
    "div",
    { class: "results-page page-enter" },
    h(
      "div",
      { class: "result-stars" },
      "✧",
      mascot(correct >= 6 ? "sprout" : "cat"),
      "✧",
    ),
    h("p", { class: "eyebrow" }, "ONE LITTLE DECK. A LITTLE MORE GROWTH."),
    h(
      "h1",
      null,
      correct === run.ids.length
        ? "A perfect little discovery!"
        : "Look how much you’ve discovered.",
    ),
    h(
      "p",
      { class: "page-subtitle" },
      `${d.name} · ${run.level} · Every question made a connection.`,
    ),
    h(
      "div",
      { class: "result-stats paper" },
      h(
        "div",
        null,
        icon("check", 25),
        h("strong", null, `${correct}/${run.ids.length}`),
        h("span", null, "Ideas that clicked"),
      ),
      h(
        "div",
        null,
        icon("coin", 25),
        h("strong", null, `+${merits}`),
        h("span", null, "Merits grown"),
      ),
      h(
        "div",
        null,
        icon("star", 25),
        h("strong", null, `+${xp}`),
        h("span", null, "XP collected"),
      ),
    ),
    h(
      "div",
      { class: "result-mastery paper" },
      h("span", null, `Your ${d.name.toLowerCase()} understanding`),
      h(
        "strong",
        null,
        `${Math.round((u.mastery[d.id].correct / u.mastery[d.id].attempts) * 100)}%`,
      ),
      progress(
        (u.mastery[d.id].correct / u.mastery[d.id].attempts) * 100,
        "Mastery",
      ),
      h(
        "small",
        { class: "muted" },
        `Level ${levelOf(u, s.rules)} · Your understanding grows every time you try.`,
      ),
    ),
    correct < run.ids.length
      ? h(
          "div",
          { class: "notice" },
          icon("box", 20),
          `${run.ids.length - correct} useful mix-ups are safe in your Review Box. A little spaced practice helps them stick.`,
        )
      : null,
    h(
      "div",
      { class: "result-actions" },
      button("Visit my Review Box", () => go("/review"), "button primary"),
      button(
        "Another little discovery",
        act(() => startDeck(run.deckId, run.level)),
        "button outline",
      ),
      button("Back to my lab", () => go("/"), "text-button"),
    ),
    h(
      "p",
      { class: "fine-print" },
      `Play merits today are capped at ${s.rules.dailyCap}. Your learning can keep growing.`,
    ),
  );
}
