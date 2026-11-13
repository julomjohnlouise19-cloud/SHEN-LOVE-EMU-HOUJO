import { currentUser, getState, clock, dispatch, loadDeck } from "../store";
import { dayKey, addDays } from "../core/time";
import { questDefinitions, levelOf, rankScientists } from "../core/rules";
import { hashSeed } from "../core/random";
import { seededRng } from "../core/random";
import { generators, evaluateGenerated } from "../core/generators";
import { deckById } from "../data/catalog";
import {
  button,
  h,
  modal,
  field,
  input,
  progress,
  toast,
  download,
} from "./dom";
import { icon, mascot } from "./svg";
import { act, go, refresh } from "./actions";
import { empty, levelCard, pageHeading } from "./shell";
import { startDeck, dailyDeck } from "./learn";
import { dailyWheel } from "./daily-wheel";

export async function reviewPage() {
  const u = currentUser()!,
    today = dayKey(clock, getState().rules.timezone),
    due = u.review.filter((c) => c.due <= today && c.lastReviewed !== today);
  const groups = [...new Set(u.review.map((c) => c.deckId))];
  return h(
    "div",
    { class: "page-enter" },
    pageHeading(
      "LITTLE REMINDERS. LASTING CONNECTIONS.",
      "Your Review Box",
      "A mix-up today can be an a-ha tomorrow.",
    ),
    h(
      "div",
      { class: "review-intro green" },
      mascot("sprout"),
      h(
        "div",
        null,
        h(
          "h2",
          null,
          due.length
            ? `${due.length} little ${due.length === 1 ? "idea is" : "ideas are"} ready to grow.`
            : "Your ideas are settling in.",
        ),
        h(
          "p",
          null,
          "A little spaced practice helps science stick. Correct answers move to a later box; tricky ideas come back sooner.",
        ),
        h(
          "div",
          { class: "leitner-boxes" },
          ...Array.from({ length: 6 }, (_, i) =>
            h(
              "span",
              null,
              icon("box", 18),
              h("strong", null, u.review.filter((c) => c.box === i).length),
              h("small", null, `Box ${i + 1}`),
            ),
          ),
        ),
      ),
    ),
    !groups.length
      ? empty(
          "cat",
          "Room for a little growth.",
          "Play a deck. Any mix-ups will find a home here, with explanations and a gentle review schedule.",
          button("Discover a deck", () => go("/island"), "button primary"),
        )
      : h(
          "div",
          { class: "review-grid" },
          ...groups.map((id) => {
            const cards = u.review.filter((c) => c.deckId === id),
              ready = due.filter((c) => c.deckId === id);
            return h(
              "article",
              { class: "paper review-deck" },
              icon("box", 27),
              h("h2", null, deckById(id)?.name ?? id),
              h(
                "p",
                { class: "muted" },
                `${cards.length} saved ideas · ${ready.length} ready today`,
              ),
              button(
                ready.length
                  ? `Review ${Math.min(8, ready.length)} little ideas`
                  : "All tucked in for now",
                act(() =>
                  startDeck(
                    id,
                    "medium",
                    "review",
                    undefined,
                    ready.map((c) => c.questionId),
                  ),
                ),
                "button primary full",
                { disabled: !ready.length },
              ),
              h(
                "small",
                { class: "muted" },
                ready.length
                  ? "A small reward for thoughtful review."
                  : `Next visit: ${cards.map((c) => c.due).sort()[0]}`,
              ),
            );
          }),
        ),
    u.review.length
      ? h(
          "section",
          { class: "boss-card lilac" },
          mascot("cat"),
          h(
            "div",
            null,
            h("p", { class: "eyebrow" }, "MISCONCEPTION BOSS BATTLE"),
            h("h2", null, "Make friends with the tricky ideas."),
            h(
              "p",
              null,
              "Face eight saved mix-ups with Tabby. Each explanation helps untangle a science myth.",
            ),
          ),
          button(
            "Meet my mix-up monster",
            act(() => {
              const id = groups[hashSeed(today) % groups.length];
              return startDeck(
                id,
                "hard",
                "boss",
                undefined,
                u.review
                  .filter((c) => c.deckId === id)
                  .map((c) => c.questionId),
              );
            }),
            "button outline",
          ),
        )
      : null,
  );
}
export async function notebookPage() {
  const u = currentUser()!,
    suggestions = (
      await Promise.all(
        [
          ...new Set(
            u.review.filter((c) => c.misconception).map((c) => c.deckId),
          ),
        ]
          .slice(0, 4)
          .map((id) => loadDeck(id)),
      )
    )
      .flat()
      .filter((q) =>
        u.review.some((c) => c.questionId === q.id && c.misconception),
      )
      .slice(0, 3);
  return h(
    "div",
    { class: "page-enter" },
    pageHeading(
      "YOUR A-HA MOMENTS LIVE HERE",
      "A notebook full of little wonders.",
      "Keep the ideas you want to come back to.",
      button(
        h("span", null, icon("edit", 17), "A fresh little page"),
        () => noteModal(),
        "button primary",
      ),
    ),
    suggestions.length
      ? h(
          "section",
          { class: "note-suggestions yellow" },
          h(
            "div",
            null,
            icon("sparkles", 22),
            h("h2", null, "A thought worth keeping"),
          ),
          h(
            "p",
            { class: "muted" },
            "From your Review Box. Turn a mix-up into a clear little note.",
          ),
          ...suggestions.map((q) =>
            h(
              "div",
              { class: "suggestion" },
              h("p", null, q.explanation),
              button(
                "Keep this thought",
                act(async () => {
                  await dispatch({
                    type: "SaveNote",
                    title: `A-ha: ${deckById(q.deckId)?.name}`,
                    text: q.explanation,
                    topic: q.deckId,
                  });
                  toast("A little understanding, saved.");
                }),
                "text-button",
              ),
            ),
          ),
        )
      : null,
    u.notes.length
      ? h(
          "div",
          { class: "notes-grid" },
          ...u.notes.map((n) =>
            h(
              "article",
              { class: "notebook-page paper" },
              h("span", { class: "tape" }),
              h(
                "p",
                { class: "eyebrow" },
                (deckById(n.topic)?.name ?? n.topic) ||
                  "A LITTLE SCIENCE THOUGHT",
              ),
              h("h2", null, n.title),
              h("p", { class: "note-text" }, n.text),
              h(
                "div",
                { class: "note-footer" },
                h(
                  "small",
                  { class: "muted" },
                  new Date(n.created).toLocaleDateString("en-PH", {
                    timeZone: getState().rules.timezone,
                  }),
                ),
                button("Edit", () => noteModal(n.id), "text-button"),
                button(
                  "Remove",
                  () => {
                    const { close } = modal("Let this little page go?", [
                      h(
                        "p",
                        { class: "muted" },
                        "You can always make a fresh note later.",
                      ),
                      button(
                        "Remove page",
                        act(async () => {
                          await dispatch({ type: "DeleteNote", id: n.id });
                          close();
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
        )
      : empty(
          "cat",
          "Your next bright idea goes here.",
          "Write a science note, save an explanation, or collect an idea from your Review Box.",
          button("Start my first page", () => noteModal(), "button primary"),
        ),
    u.notes.length
      ? button(
          h("span", null, icon("download", 16), "Export my science notes"),
          () =>
            download("my-science-notes.json", JSON.stringify(u.notes, null, 2)),
          "text-button",
        )
      : null,
  );
}
function noteModal(id?: string) {
  const note = currentUser()!.notes.find((n) => n.id === id),
    title = input("title", "A little thing I learned…", note?.title ?? ""),
    body = h(
      "textarea",
      {
        name: "note",
        rows: 6,
        maxlength: 4000,
        placeholder: "Put the science into your own words.",
        required: true,
      },
      note?.text ?? "",
    );
  const topic = input("topic", "e.g. Life Science", note?.topic ?? "");
  topic.required = false;
  const { close } = modal(
    id ? "A little edit to your idea" : "A fresh notebook page",
    [
      h(
        "form",
        {
          onSubmit: async (e: SubmitEvent) => {
            e.preventDefault();
            await act(async () => {
              await dispatch({
                type: "SaveNote",
                title: title.value,
                text: body.value,
                topic: topic.value,
                id,
              });
              close();
              toast("Your little idea is safe here.");
            })();
          },
        },
        field("Give your thought a title", title),
        field("Your science note", body),
        field("Topic (optional)", topic),
        button("Keep this thought", () => undefined, "button primary full", {
          type: "submit",
        }),
      ),
    ],
  );
}
let spinningFor: string | undefined;
export function spinPage() {
  const s = getState(),
    u = currentUser()!,
    today = dayKey(clock, s.rules.timezone),
    spun = u.daily[today]?.spin;
  const spinning = spinningFor === u.id;
  const factIndex = hashSeed(today) % 6;
  const discoveries = [
    "Plants use light to make sugars.",
    "Gravity helps keep planets in orbit.",
    "Sound is a vibration traveling through matter.",
    "Atoms are rearranged in a chemical reaction.",
    "Biodiversity makes ecosystems rich in connections.",
    "The water cycle is driven by energy from the Sun.",
  ];
  const latest = [...s.events]
    .reverse()
    .find(
      (e) =>
        e.type === "WheelSpun" &&
        e.actor === u.id &&
        dayKey({ now: () => e.time }, s.rules.timezone) === today,
    );
  return h(
    "div",
    { class: "page-enter spin-page" },
    pageHeading(
      "A DAILY DOSE OF HAPPY SCIENCE",
      "A little spin. A little wonder.",
      `One free discovery each calendar day · ${s.rules.timezone}. What will you find?`,
    ),
    h(
      "div",
      { class: "spin-layout paper" },
      h(
        "div",
        { class: "wheel-side" },
        dailyWheel(spinning, !!spun, factIndex),
        h(
          "p",
          { class: "fine-print" },
          `0–${s.rules.spinMax} merits · One gentle, random daily reward`,
        ),
      ),
      h(
        "div",
        { class: "spin-copy" },
        mascot("pudding"),
        h("span", { class: "eyebrow" }, "PUDDING’S LITTLE DISCOVERY WHEEL"),
        h(
          "span",
          {
            class: `spin-availability ${spun ? "collected" : ""}`,
            role: "status",
          },
          icon(spun ? "check" : "sparkles", 15),
          spinning
            ? "Finding your daily discovery…"
            : spun
              ? "Today’s reward is safely saved"
              : "Your free daily discovery is ready",
        ),
        h(
          "h2",
          null,
          spinning
            ? "A bright idea is on its way…"
            : spun
              ? `A little ${latest?.data?.prize ?? 0}-merit surprise!`
              : "Curiosity is always a good idea.",
        ),
        h("p", { class: "muted" }, discoveries[factIndex]),
        button(
          spinning
            ? "A little wonder is on its way…"
            : spun
              ? "Today’s discovery is yours"
              : "Let’s give it a spin",
          act(async () => {
            if (spinningFor === u.id) return;
            spinningFor = u.id;
            refresh();
            try {
              const events = await dispatch({ type: "SpinWheel" });
              await new Promise((resolve) =>
                setTimeout(
                  resolve,
                  matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? 0
                    : 1600,
                ),
              );
              if (currentUser()?.id === u.id) toast(events[0].text);
            } finally {
              if (spinningFor === u.id) spinningFor = undefined;
              refresh();
            }
          }),
          "button primary full",
          { disabled: spun || spinning, "aria-busy": spinning },
        ),
        h(
          "p",
          { class: "fine-print" },
          spun
            ? `Next discovery: ${addDays(today, 1)} at midnight · ${s.rules.timezone}. Your saved reward will still be here after a refresh.`
            : "No merits to spend. No chance of losing. Just a little science treat.",
        ),
        spun && !spinning
          ? h(
              "section",
              {
                class: "spin-discovery-card",
                "aria-label": "Your daily discovery",
              },
              h(
                "span",
                { class: "eyebrow" },
                "A LITTLE WONDER TO TAKE WITH YOU",
              ),
              h(
                "strong",
                null,
                `${latest?.data?.prize ?? 0} practice merits saved`,
              ),
              h("p", null, discoveries[factIndex]),
              h(
                "div",
                { class: "spin-next-actions" },
                button(
                  "Explore today’s science",
                  () =>
                    go(
                      `/branch/${["life", "physics", "physics", "chemistry", "life", "earth"][factIndex]}`,
                    ),
                  "button outline",
                ),
                button(
                  "Open my notebook",
                  () => go("/notebook"),
                  "text-button",
                ),
              ),
              h(
                "small",
                null,
                "The wheel is free. Practice merits stay on this device; classroom shop credits have their own balance.",
              ),
            )
          : null,
      ),
    ),
  );
}
export function questsPage() {
  const s = getState(),
    u = currentUser()!,
    today = dayKey(clock, s.rules.timezone),
    daily = u.daily[today],
    d = dailyDeck();
  const resume = s.runs.find((r) => r.userId === u.id && !r.completed);
  return h(
    "div",
    { class: "page-enter" },
    pageHeading(
      "SMALL STEPS COUNT",
      "Tiny quests. Real little progress.",
      "A few thoughtful questions go a long way.",
    ),
    levelCard(),
    resume
      ? h(
          "div",
          { class: "notice" },
          `Your ${deckById(resume.deckId)?.name} session is saved.`,
          button(
            "Keep discovering",
            () => go(`/play/${resume.id}`),
            "text-button",
          ),
        )
      : null,
    h(
      "div",
      { class: "quest-grid" },
      ...questDefinitions.map((q) => {
        const n = daily?.[q.key] ?? 0,
          claimed = daily?.quests.includes(q.id);
        return h(
          "article",
          { class: "quest-detail paper" },
          h("span", { class: "quest-big-icon green" }, icon(q.icon, 30)),
          h("h2", null, q.name),
          h("p", { class: "muted" }, q.description),
          progress((n / q.target) * 100, q.name),
          h(
            "div",
            { class: "quest-detail-meta" },
            `${Math.min(n, q.target)} / ${q.target}`,
            h("span", null, icon("coin", 16), `+${s.rules.questReward} merits`),
          ),
          button(
            claimed
              ? "A little reward, collected"
              : n >= q.target
                ? "Collect my little reward"
                : "Let’s make some progress",
            n >= q.target
              ? act(async () => {
                  await dispatch({ type: "ClaimQuest", questId: q.id });
                  toast("A little effort. A well-earned reward.");
                })
              : () => go("/island"),
            "button primary full",
            { disabled: claimed },
          ),
        );
      }),
    ),
    h(
      "section",
      { class: "daily-challenge blue" },
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "TODAY’S SHARED LITTLE CHALLENGE"),
        h("h2", null, d.name),
        h(
          "p",
          null,
          `Same deck, same seed, a new question each day. +${s.rules.dailyReward} bonus merits for completing today’s eight cards.`,
        ),
      ),
      button(
        daily?.challenge ? "Discovered today!" : "Take today’s challenge",
        act(() => startDeck(d.id, "medium", "daily", hashSeed(today))),
        "button primary",
        { disabled: daily?.challenge },
      ),
    ),
    h(
      "section",
      { class: "badge-shelf paper" },
      h("h2", null, "Little milestones"),
      h("p", { class: "muted" }, "Growing knowledge is worth celebrating."),
      h(
        "div",
        { class: "badge-grid" },
        ...[
          ["first-deck", "First little discovery", "Finish a deck"],
          ["ten-right", "Bright connections", "Get 10 ideas right"],
          [
            "perfect-deck",
            "A perfect little run",
            "Answer a full deck correctly",
          ],
          ["week-streak", "Growing every day", "Explore for 7 days in a row"],
        ].map(([id, name, desc]) =>
          h(
            "div",
            { class: `badge ${u.badges.includes(id) ? "earned" : ""}` },
            icon(u.badges.includes(id) ? "star" : "lock", 28),
            h("strong", null, name),
            h("small", null, desc),
            h(
              "span",
              null,
              u.badges.includes(id) ? "Yours to keep" : "Still growing",
            ),
          ),
        ),
      ),
    ),
  );
}
export function leaderboardPage() {
  const s = getState(),
    users = rankScientists(s.users);
  return h(
    "div",
    { class: "page-enter" },
    pageHeading(
      "WE GROW BETTER TOGETHER",
      "A whole lab of curious minds.",
      "Celebrate steady learning. Rankings use XP, never merits spent.",
    ),
    h(
      "div",
      { class: "leaderboard-banner yellow" },
      mascot("atom"),
      h(
        "div",
        null,
        h("h2", null, "Your only competition? Yesterday’s you."),
        h(
          "p",
          null,
          "Every thoughtful question grows your knowledge. Classmates are fellow explorers.",
        ),
      ),
    ),
    users.length
      ? h(
          "div",
          { class: "paper table-wrap" },
          h(
            "table",
            { class: "leaderboard-table" },
            h(
              "caption",
              null,
              "Scientists in this browser, ranked by learning XP",
            ),
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                ...[
                  "Place",
                  "Scientist",
                  "Grade & section",
                  "Level",
                  "XP grown",
                ].map((t) => h("th", { scope: "col" }, t)),
              ),
            ),
            h(
              "tbody",
              null,
              ...users.map((u, i) =>
                h(
                  "tr",
                  { class: u.id === currentUser()?.id ? "your-rank" : "" },
                  h("td", null, h("span", { class: "rank" }, i + 1)),
                  h(
                    "td",
                    null,
                    h(
                      "span",
                      { class: "leader-name" },
                      mascot(u.avatar),
                      h("strong", null, u.name),
                      u.id === currentUser()?.id
                        ? h("span", { class: "pill" }, "you")
                        : null,
                    ),
                  ),
                  h(
                    "td",
                    null,
                    `Grade ${u.grade}${u.section ? ` · ${u.section}` : ""}`,
                  ),
                  h("td", null, levelOf(u, s.rules)),
                  h("td", null, h("strong", null, u.xp)),
                ),
              ),
            ),
          ),
        )
      : empty(
          "sprout",
          "Every lab starts with one curious mind.",
          "Registered scientists in this browser will appear here as they explore. Guest play is practice, so it does not enter the rankings.",
          button("Back to my lab", () => go("/"), "button primary"),
        ),
    h(
      "p",
      { class: "fine-print" },
      "Local demo leaderboard · Only accounts on this browser are visible. This is not a school-wide live ranking.",
    ),
  );
}
export function labPage() {
  const mass = h("input", {
      type: "range",
      min: 1,
      max: 10,
      value: 4,
      "aria-label": "Cart mass in kilograms",
    }),
    force = h("input", {
      type: "range",
      min: 1,
      max: 20,
      value: 8,
      "aria-label": "Force in newtons",
    });
  const readout = h("div", { class: "experiment-readout" }),
    track = h(
      "div",
      { class: "cart-track" },
      h("div", { class: "lab-cart" }, icon("box", 40)),
    );
  function update() {
    const a = Number(force.value) / Number(mass.value);
    readout.replaceChildren(
      h("span", null, `${force.value} N ÷ ${mass.value} kg`),
      h("strong", null, `${a.toFixed(2)} m/s²`),
      h("small", null, "Acceleration · a = F / m"),
    );
    track.style.setProperty("--duration", `${Math.max(0.7, 7 / a)}s`);
  }
  force.addEventListener("input", update);
  mass.addEventListener("input", update);
  update();
  let running = false;
  const runButton = button(
    "Try my little experiment",
    () => {
      running = !running;
      track.classList.toggle("running", running);
      runButton.textContent = running
        ? "Pause my little experiment"
        : "Try my little experiment";
      runButton.setAttribute("aria-pressed", String(running));
    },
    "button primary",
    { "aria-pressed": false },
  );
  return h(
    "div",
    { class: "page-enter" },
    pageHeading(
      "A TINY EXPERIMENT",
      "A push, a cart, an a-ha.",
      "Change one variable. Predict what happens. Then try it.",
    ),
    h(
      "section",
      { class: "experiment paper" },
      h(
        "p",
        { class: "notice" },
        "Model: a cart starts at rest on a smooth, level track. A constant net force acts. Friction is ignored.",
      ),
      track,
      h(
        "div",
        { class: "experiment-controls" },
        field("Mass · 1–10 kg", mass),
        field("Net force · 1–20 N", force),
      ),
      readout,
      runButton,
      h(
        "p",
        { class: "muted" },
        "Twice the force means twice the acceleration for the same mass. Twice the mass means half the acceleration for the same force.",
      ),
      h(
        "p",
        { class: "fine-print" },
        "Animation illustrates a trend; time and distance are not to scale.",
      ),
    ),
    calculatorGarden(),
    button("Explore Newton’s laws", () => go("/branch/physics"), "text-button"),
  );
}
function calculatorGarden() {
  const names: Record<string, string> = {
    speed: "Speed",
    distance: "Distance",
    time: "Travel time",
    density: "Density",
    force: "Newton’s second law",
    work: "Work",
    power: "Power",
    kinetic: "Kinetic energy",
    potential: "Gravitational potential energy",
    ohm: "Ohm’s law",
    series: "Series resistance",
    parallel: "Parallel resistance",
    wave: "Wave speed",
    boyle: "Boyle’s law",
    charles: "Charles’s law",
    massNumber: "Mass number",
    ratio: "Percent & ratio",
    ph: "pH",
    punnett: "Punnett ratios",
  };
  const select = h(
    "select",
    { "aria-label": "Calculation topic" },
    ...Object.keys(generators).map((key) =>
      h("option", { value: key }, names[key]),
    ),
  );
  const content = h("div");
  function next() {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0],
      q = generators[select.value](seededRng(seed));
    const answer = input("calculation", "Your number goes here…", "", "number");
    answer.step = "any";
    const feedback = h("div", {
      class: "calculation-feedback",
      role: "status",
      "aria-live": "polite",
    });
    const submit = button(
      "Check my calculation",
      () => undefined,
      "button primary",
      { type: "submit" },
    );
    content.replaceChildren(
      h("p", { class: "calculation-prompt" }, q.prompt),
      h(
        "form",
        {
          onSubmit: (e: SubmitEvent) => {
            e.preventDefault();
            const correct = evaluateGenerated(q, answer.value);
            feedback.replaceChildren(
              h(
                "p",
                null,
                icon(correct ? "check" : "sprout", 18),
                correct
                  ? "A-ha! Your calculation checks out."
                  : `A little nudge: the answer is ${q.answer} ${q.unit}. Check which values need multiplying or dividing.`,
              ),
            );
            submit.disabled = true;
          },
        },
        field(q.unit ? `Answer in ${q.unit}` : "Numerical answer", answer),
        submit,
      ),
      feedback,
      button("Grow another little question", next, "text-button"),
      h(
        "p",
        { class: "fine-print" },
        `Practice garden · Seed ${seed} · No merits to farm, just room to learn.`,
      ),
    );
  }
  select.addEventListener("change", next);
  next();
  return h(
    "section",
    { class: "calculator-garden paper" },
    h("p", { class: "eyebrow" }, "A LITTLE NUMBER GARDEN"),
    h("h2", null, "Make the numbers make sense."),
    h(
      "p",
      { class: "muted" },
      "Fresh, seeded practice in 19 science calculations. Use SI units and give yourself time to think.",
    ),
    field("Pick a science calculation", select),
    content,
  );
}
