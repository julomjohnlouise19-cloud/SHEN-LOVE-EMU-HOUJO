import { branches, decks, branchById, deckById } from "../data/catalog";
import { currentUser, getState, clock } from "../store";
import { dayKey } from "../core/time";
import { hashSeed } from "../core/random";
import { questDefinitions } from "../core/rules";
import { button, h, progress } from "./dom";
import { icon, mascot, heroIllustration, diagram } from "./svg";
import { go } from "./actions";
import { pageHeading } from "./shell";
import { openDeck } from "./learn";
import { APP_NAME } from "./branding";
import { cloudEnabled } from "../store/cloud";
export function dashboard() {
  const u = currentUser()!,
    s = getState(),
    today = dayKey(clock, s.rules.timezone),
    daily = u.daily[today];
  const completed = Object.values(u.mastery).reduce(
    (n, m) => n + m.completed,
    0,
  );
  const unfinished = [...s.runs]
    .reverse()
    .find((run) => run.userId === u.id && !run.completed);
  const unfinishedDeck = unfinished ? deckById(unfinished.deckId) : undefined;
  const gradeDecks = decks.filter(
    (d) => d.branch !== "skills" && d.grades.includes(u.grade),
  );
  const recommended =
    gradeDecks.find((d) => !u.mastery[d.id]?.completed) ??
    [...gradeDecks].sort(
      (a, b) =>
        (u.mastery[a.id]?.attempts ?? 0) - (u.mastery[b.id]?.attempts ?? 0),
    )[0] ??
    decks[0];
  const explored = Object.values(u.mastery).filter(
    (m) => m.completed > 0,
  ).length;
  const due = u.review.filter(
    (card) => card.due <= today && card.lastReviewed !== today,
  ).length;
  const answersToday = Math.min(daily?.answers ?? 0, 8);
  const facts = [
    "A single tree can be home to hundreds of living things. Small habitats make a big difference.",
    "Sunlight takes about eight minutes to reach Earth. The light you see has been on a little journey.",
    "The Philippines is part of the Coral Triangle, a region rich in marine life.",
    "The atoms in your body were formed in the early universe and in stars. You’re part of a big story.",
    "A plant’s new mass comes mostly from carbon dioxide and water, with light supplying the energy.",
    "Your heart and lungs work together to bring oxygen to your cells. Teamwork is science, too.",
  ];
  let factIndex = hashSeed(today) % facts.length;
  const factText = h("p", { role: "status" }, facts[factIndex]);
  const factCount = h(
    "small",
    { class: "wonder-count" },
    `IDEA ${factIndex + 1} OF ${facts.length}`,
  );
  const trail = h(
    "section",
    { class: "learning-trail", "aria-label": "Your learning trail" },
    h(
      "div",
      { class: "trail-heading" },
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "SMALL STEPS, YOUR OWN PACE"),
        h("h2", null, "Your learning trail"),
      ),
      h(
        "span",
        { class: "trail-date" },
        new Intl.DateTimeFormat("en-PH", {
          month: "short",
          day: "numeric",
          timeZone: s.rules.timezone,
        }).format(clock.now()),
      ),
    ),
    h(
      "div",
      { class: "trail-grid" },
      h(
        "article",
        { class: "trail-step trail-discover" },
        h("span", { class: "trail-number", "aria-hidden": true }, "01"),
        icon("island", 22),
        h("h3", null, unfinishedDeck?.name ?? recommended.name),
        h(
          "p",
          null,
          unfinished
            ? "Your unfinished discovery is ready whenever you are."
            : `An eight-card discovery chosen for Grade ${u.grade}.`,
        ),
        button(
          unfinished ? "Resume this discovery" : "Start today’s discovery",
          () =>
            unfinished
              ? go(`/play/${unfinished.id}`)
              : openDeck(recommended.id),
          "button primary",
        ),
      ),
      h(
        "a",
        {
          href: "#/review",
          class: "trail-step trail-review",
          "aria-label": "Open Review Box",
        },
        h("span", { class: "trail-number", "aria-hidden": true }, "02"),
        icon("box", 22),
        h(
          "h3",
          null,
          due ? `${due} ideas to revisit` : "Let your learning settle",
        ),
        h(
          "p",
          null,
          due
            ? "A gentle review helps a tricky idea click."
            : "Your tricky science cards will find a home here.",
        ),
        h(
          "span",
          { class: "trail-link" },
          "Visit your Review Box",
          icon("arrow", 16),
        ),
      ),
      h(
        "a",
        {
          href: "#/notebook",
          class: "trail-step trail-notes",
          "aria-label": "Open my notebook",
        },
        h("span", { class: "trail-number", "aria-hidden": true }, "03"),
        icon("notebook", 22),
        h("h3", null, "Keep your a-ha moment"),
        h(
          "p",
          null,
          `${u.notes.length} notebook ${u.notes.length === 1 ? "page" : "pages"} on this device. What did you notice today?`,
        ),
        h(
          "span",
          { class: "trail-link" },
          "Open your notebook",
          icon("arrow", 16),
        ),
      ),
    ),
    h(
      "div",
      { class: "trail-progress" },
      h(
        "div",
        null,
        h("strong", null, `${answersToday} / 8 answers today`),
        h(
          "span",
          null,
          answersToday === 8
            ? "A little goal, beautifully done."
            : "One short discovery is a lovely place to start.",
        ),
      ),
      progress((answersToday / 8) * 100, "Today’s eight-answer learning goal"),
    ),
    h(
      "small",
      { class: "trail-device" },
      `${completed} completed practice sessions on this device.${cloudEnabled && u.id !== "guest" ? " Account quizzes also appear in Saved records." : " Practice and notebook pages stay on this device."}`,
    ),
  );
  return h(
    "div",
    { class: "dashboard page-enter" },
    pageHeading(
      "YOUR LITTLE LEARNING SPACE",
      u.id === "guest" ? "Hey, curious mind!" : `Hey, ${u.name.split(" ")[0]}!`,
      "A fresh day. A new question. A little more wonder.",
      h(
        "span",
        { class: "streak-pill" },
        icon("flame", 18),
        `${u.streak}-day streak`,
        h("span", { class: "streak-dot" }, "Keep growing"),
      ),
    ),
    unfinished && unfinishedDeck
      ? h(
          "section",
          {
            class: "resume-card paper",
            "aria-label": "Continue your science session",
          },
          h(
            "div",
            { class: "resume-copy" },
            h("p", { class: "eyebrow" }, "YOUR SAVED DISCOVERY"),
            h("h2", null, "Pick up where you left off"),
            h(
              "p",
              null,
              `${unfinishedDeck.name} · ${unfinished.level} · ${unfinished.answers.length} of ${unfinished.ids.length} cards answered`,
            ),
            progress(
              (unfinished.answers.length / unfinished.ids.length) * 100,
              `${unfinishedDeck.name} session progress`,
            ),
          ),
          button(
            h("span", null, "Continue learning", icon("arrow", 17)),
            () => go(`/play/${unfinished.id}`),
            "button primary",
          ),
        )
      : null,
    h(
      "section",
      {
        class: "hero-card discovery-hero",
        "aria-label": `Welcome to ${APP_NAME}`,
      },
      h("span", { class: "hero-tape" }),
      h(
        "div",
        { class: "hero-copy" },
        h(
          "span",
          { class: "hero-tag" },
          h("span", { class: "tiny-flower" }, "✳"),
          `${explored} OF ${decks.length} SCIENCE TOPICS EXPLORED`,
        ),
        h(
          "h2",
          null,
          "Your curiosity.",
          h("br"),
          h("span", { class: "underline" }, "A world of possibility."),
        ),
        h(
          "p",
          null,
          "A learning trail made for you. Find a science idea,",
          h("br", { class: "desktop-break" }),
          " make a discovery, and keep the thought that stays with you.",
        ),
        button(
          h("span", null, "Let’s explore", icon("arrow", 18)),
          () => go("/island"),
          "button primary",
        ),
        h(
          "span",
          { class: "hero-footnote" },
          icon("heart", 13),
          "No pressure. Just curiosity.",
        ),
      ),
      heroIllustration(),
      h(
        "span",
        { class: "hero-scribble" },
        "your next a-ha is waiting",
        icon("arrowup", 12),
      ),
    ),
    trail,
    h(
      "div",
      { class: "dashboard-columns" },
      h(
        "div",
        { class: "dashboard-main" },
        h(
          "section",
          { class: "branches-section" },
          h(
            "div",
            { class: "section-heading" },
            h(
              "div",
              null,
              h("h2", null, "Where will curiosity take you?"),
              h("p", null, "Pick a branch. Find your next little discovery."),
            ),
            button(
              h("span", null, "See the island", icon("arrow", 15)),
              () => go("/island"),
              "text-button",
            ),
          ),
          h(
            "div",
            { class: "branch-grid" },
            ...branches.slice(0, 4).map((b, i) =>
              h(
                "a",
                {
                  class: `branch-card ${b.color}`,
                  href: `#/branch/${b.id}`,
                  "aria-label": `Explore ${b.name}, 6 decks`,
                },
                h(
                  "div",
                  { class: "branch-card-top" },
                  h("span", { class: "deck-count" }, "06 DECKS"),
                  h("span", { class: "branch-number" }, `0${i + 1}`),
                ),
                mascot(b.icon),
                h("h3", null, b.name),
                h("p", null, b.description),
                h(
                  "span",
                  { class: "branch-card-bottom" },
                  "Let’s discover",
                  icon("arrowup", 15),
                ),
              ),
            ),
          ),
        ),
        h(
          "section",
          { class: "next-section" },
          h(
            "div",
            { class: "section-heading" },
            h(
              "div",
              null,
              h("h2", null, "Your next little discovery"),
              h("p", null, `Picked for your Grade ${u.grade} curiosity.`),
            ),
          ),
          h(
            "div",
            { class: "next-deck paper" },
            h(
              "div",
              { class: "next-illustration green" },
              diagram(recommended.diagram),
            ),
            h(
              "div",
              { class: "next-deck-copy" },
              h(
                "span",
                { class: "eyebrow" },
                branchById(recommended.branch)?.name,
              ),
              h("h3", null, recommended.name),
              h("p", null, recommended.description),
              h(
                "div",
                { class: "deck-meta" },
                h("span", null, icon("box", 14), "8 cards"),
                h("span", null, icon("clock", 14), "About 5 min"),
                h("span", null, icon("coin", 14), "Earn merits"),
              ),
            ),
            button(
              icon("arrow", 21),
              () => openDeck(recommended.id),
              "circle-button",
              { "aria-label": `Play ${recommended.name}` },
            ),
          ),
        ),
        h(
          "div",
          { class: "lab-summary" },
          h(
            "span",
            null,
            icon("sprout", 17),
            `${explored} ${explored === 1 ? "topic" : "topics"} explored`,
          ),
          h("span", null, icon("star", 17), `${u.xp} XP grown`),
          h("span", null, icon("heart", 17), "Every question is progress"),
        ),
      ),
      h(
        "aside",
        { class: "daily-column", "aria-label": "Daily discoveries" },
        h(
          "section",
          { class: "daily-spin-card" },
          h("span", { class: "mini-eyebrow" }, "A DAILY LITTLE TREAT"),
          h(
            "div",
            { class: "daily-spin-art" },
            h("div", { class: "mini-wheel" }, icon("star", 23)),
            mascot("pudding"),
          ),
          h("h2", null, "A spin of science"),
          h(
            "p",
            null,
            daily?.spin
              ? "Today’s discovery is yours. Come back tomorrow for another little treat."
              : "A little luck, a little wonder.",
            h("br"),
            !daily?.spin ? "Your free daily spin is ready!" : null,
          ),
          button(
            h(
              "span",
              null,
              daily?.spin ? "See my discovery" : "Give it a spin",
              icon("arrow", 16),
            ),
            () => go("/spin"),
            "button outline full",
          ),
          h("small", null, icon("clock", 12), "A fresh spin every Manila day"),
        ),
        h(
          "section",
          { class: "quest-card paper" },
          h(
            "div",
            { class: "section-heading" },
            h("h2", null, "Tiny quests"),
            h("span", { class: "hand-star" }, "✧"),
          ),
          ...questDefinitions.map((q) => {
            const n = daily?.[q.key] ?? 0;
            return button(
              h(
                "span",
                { class: "quest-row" },
                h(
                  "span",
                  {
                    class: `quest-icon ${q.id === "curious" ? "green" : "yellow"}`,
                  },
                  icon(q.icon, 17),
                ),
                h(
                  "span",
                  { class: "quest-info" },
                  h("strong", null, q.name),
                  h("small", null, q.description),
                  progress((n / q.target) * 100, q.name),
                ),
                h(
                  "small",
                  { class: "quest-counter" },
                  `${Math.min(n, q.target)}/${q.target}`,
                ),
              ),
              () => go("/quests"),
              "quest-button",
            );
          }),
          button(
            h("span", null, "All my little quests", icon("arrow", 14)),
            () => go("/quests"),
            "text-button quest-link",
          ),
        ),
      ),
    ),
    h(
      "section",
      { class: "daily-fact" },
      h("span", { class: "fact-icon" }, icon("sparkles", 23)),
      h(
        "div",
        null,
        h("span", { class: "eyebrow" }, "A POCKETFUL OF SCIENCE"),
        factText,
        factCount,
      ),
      button(
        "Another little wonder",
        () => {
          factIndex = (factIndex + 1) % facts.length;
          factText.textContent = facts[factIndex];
          factCount.textContent = `IDEA ${factIndex + 1} OF ${facts.length}`;
        },
        "button outline",
        { "aria-label": "Next science fact" },
      ),
    ),
    h(
      "section",
      { class: "mini-lab-invitation paper" },
      h("span", { class: "mini-lab-icon" }, icon("flask", 24)),
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "A TINY HANDS-ON LAB"),
        h("h2", null, "What happens if you give curiosity a little push?"),
        h(
          "p",
          { class: "muted" },
          "Change a force. Move a cart. Make a little prediction.",
        ),
      ),
      button(
        h("span", null, "Try the tiny lab", icon("arrow", 16)),
        () => go("/experiment"),
        "button outline",
      ),
    ),
  );
}
