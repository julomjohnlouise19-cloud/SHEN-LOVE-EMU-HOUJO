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
  const recommended =
    decks.find(
      (d) =>
        d.id ===
        Object.entries(u.mastery).find(([, m]) => m.completed === 0)?.[0],
    ) ??
    decks.find((d) => d.branch === "life" && d.grades.includes(u.grade)) ??
    decks[0];
  const facts = [
    "A single tree can be home to hundreds of living things. Small habitats make a big difference.",
    "Sunlight takes about eight minutes to reach Earth. The light you see has been on a little journey.",
    "The Philippines is part of the Coral Triangle, a region rich in marine life.",
    "The atoms in your body were formed in the early universe and in stars. You’re part of a big story.",
    "A plant’s new mass comes mostly from carbon dioxide and water, with light supplying the energy.",
    "Your heart and lungs work together to bring oxygen to your cells. Teamwork is science, too.",
  ];
  const dailyFact = facts[hashSeed(today) % facts.length];
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
    h(
      "section",
      { class: "dashboard-arcade-callout" },
      h("span", { class: "dashboard-arcade-icon" }, icon("trophy", 28)),
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "NEW AT THE DISCOVERY FAIR"),
        h("h2", null, "A little aim. A lot of science."),
        h(
          "p",
          null,
          "Moving targets, bright questions and your next winning combo.",
        ),
      ),
      button("Play Science Arcade", () => go("/arcade"), "button primary"),
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
      { class: "hero-card", "aria-label": `Welcome to ${APP_NAME}` },
      h("span", { class: "hero-tape" }),
      h(
        "div",
        { class: "hero-copy" },
        h(
          "span",
          { class: "hero-tag" },
          h("span", { class: "tiny-flower" }, "✳"),
          "BIG WONDERS START SMALL",
        ),
        h(
          "h2",
          null,
          "Small discoveries.",
          h("br"),
          h("span", { class: "underline" }, "Big a-ha moments."),
        ),
        h(
          "p",
          null,
          "Play a little. Learn a lot. Explore the science",
          h("br", { class: "desktop-break" }),
          " in you and the world around you.",
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
            `${completed} ${completed === 1 ? "deck" : "decks"} explored`,
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
        h("p", null, dailyFact),
      ),
      h("span", { class: "fact-doodle" }, "✦"),
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
