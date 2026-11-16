import { explorerPlanets } from "../data/activity-planets";
import type { ActivityCommand, ActivityProgress } from "../core/activities";
import { h, button } from "./dom";
import { icon } from "./svg";
import { sourceButton } from "./sources";

export function planetExplorer(
  progress: ActivityProgress,
  selected: string,
  choose: (id: string) => unknown,
  act: (command: ActivityCommand, focus?: string) => unknown,
) {
  const planet =
    explorerPlanets.find((p) => p.id === selected) ?? explorerPlanets[0];
  const stamped = progress.stamped.includes(planet.id);
  const next = explorerPlanets.find((p) => !progress.stamped.includes(p.id));
  return h(
    "div",
    { class: "planet-explorer" },
    h(
      "section",
      { class: "planet-map", "aria-label": "Choose a planet" },
      h(
        "div",
        { class: "planet-map-caption" },
        h("span", null, "OUR SOLAR NEIGHBOURHOOD"),
        h("strong", null, "Eight worlds. Endless wonder."),
        h(
          "p",
          null,
          "Choose a planet, read its field notes and earn its passport stamp.",
        ),
      ),
      h(
        "div",
        { class: "planet-orbit-list" },
        ...explorerPlanets.map((p, i) =>
          button(
            h(
              "span",
              { class: "planet-stop" },
              h("span", {
                class: `planet-orb planet-${p.id}`,
                style: { "--planet-color": p.color },
                "aria-hidden": true,
              }),
              h("small", null, `0${i + 1}`),
              h("strong", null, p.name),
              progress.stamped.includes(p.id)
                ? h(
                    "span",
                    { class: "planet-stamp-label" },
                    icon("check", 12),
                    "Stamped",
                  )
                : h("span", null, "Explore"),
            ),
            () => choose(p.id),
            "planet-stop-button",
            {
              "aria-label": `Explore ${p.name}`,
              "aria-pressed": selected === p.id,
              "data-focus-key": `planet-${p.id}`,
            },
          ),
        ),
      ),
      h(
        "p",
        { class: "planet-model-note" },
        "Illustrated colours. Planet sizes, spacings and paths are not to scale. Pluto is a dwarf planet, outside this eight-planet trail.",
      ),
    ),
    h(
      "section",
      {
        class: "planet-field-notes",
        "aria-label": `${planet.name} field notes`,
      },
      h(
        "div",
        { class: "planet-portrait", style: { "--planet-color": planet.color } },
        h("span", {
          class: `planet-orb planet-${planet.id}`,
          "aria-hidden": true,
        }),
        h("span", { class: "planet-type" }, planet.group),
        h("h2", null, planet.name),
        h("p", null, planet.tagline),
      ),
      h(
        "div",
        { class: "planet-facts" },
        h("p", { class: "eyebrow" }, "YOUR FIELD NOTES"),
        h(
          "dl",
          { class: "planet-measurements" },
          h(
            "div",
            null,
            h("dt", null, "Mean distance from Sun"),
            h("dd", null, planet.distance),
          ),
          h(
            "div",
            null,
            h("dt", null, "One orbit"),
            h("dd", null, planet.year),
          ),
        ),
        h(
          "p",
          { class: "activity-small" },
          "1 AU is approximately Earth's mean distance from the Sun. Values are rounded.",
        ),
        h(
          "ul",
          {
            class: progress.planetHints.includes(planet.id)
              ? "planet-fact-list is-hinted"
              : "planet-fact-list",
          },
          ...planet.facts.map((fact) => h("li", null, fact)),
        ),
      ),
    ),
    h(
      "section",
      {
        class: `planet-check ${stamped ? "is-stamped" : ""}`,
        "aria-label": `${planet.name} passport check`,
      },
      h(
        "div",
        null,
        h(
          "p",
          { class: "eyebrow" },
          stamped ? "A WORLD WELL DISCOVERED" : "READ. REMEMBER. STAMP.",
        ),
        h(
          "h2",
          null,
          stamped
            ? `${planet.name}, in your passport!`
            : "One little planet check",
        ),
        h("p", null, stamped ? planet.explanation : planet.question),
      ),
      stamped
        ? h(
            "div",
            { class: "planet-check-finish" },
            h(
              "span",
              { class: "passport-seal", "aria-hidden": true },
              icon("check", 30),
            ),
            next
              ? button(
                  `Next stop: ${next.name}`,
                  () => choose(next.id),
                  "button primary",
                  { "data-focus-key": "planet-next" },
                )
              : h(
                  "a",
                  {
                    class: "button primary",
                    href: "#/island/activities/badges",
                    "data-focus-key": "planet-next",
                  },
                  "See your Orbit ranger badge",
                ),
          )
        : h(
            "div",
            { class: "planet-answers" },
            ...planet.options.map((option, i) =>
              button(
                option,
                () =>
                  act(
                    { type: "AnswerPlanet", planet: planet.id, answer: i },
                    i === planet.answer ? "planet-next" : `planet-answer-${i}`,
                  ),
                "planet-answer",
                { "data-focus-key": `planet-answer-${i}` },
              ),
            ),
          ),
    ),
    h(
      "section",
      {
        class: "planet-passport-strip",
        "aria-label": "Planet passport stamps",
      },
      h(
        "div",
        null,
        h("h2", null, "Your planet passport"),
        h(
          "p",
          null,
          `${progress.stamped.length} of 8 stamps · A correct planet check earns a stamp.`,
        ),
      ),
      h(
        "div",
        { class: "planet-stamp-row" },
        ...explorerPlanets.map((p) =>
          h(
            "span",
            {
              class: `mini-planet-stamp ${progress.stamped.includes(p.id) ? "earned" : ""}`,
            },
            icon(progress.stamped.includes(p.id) ? "check" : "planet", 15),
            p.name,
          ),
        ),
      ),
    ),
    h(
      "div",
      { class: "activity-source-row" },
      h(
        "p",
        null,
        "Original lab summaries supported by NASA Science · Solar System Exploration.",
      ),
      sourceButton("earth.solar"),
    ),
  );
}
