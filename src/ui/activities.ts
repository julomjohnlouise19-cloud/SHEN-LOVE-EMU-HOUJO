import { badgeArtwork } from "./badge-art";
import { diarySticker } from "./diary-art";
import { currentUser } from "../store";
import {
  activityAction,
  loadActivities,
  newActivity,
} from "../store/activities";
import {
  activityBadges,
  badgeCount,
  roundTerms,
  wordBoard,
  wordPath,
  type ActivityKind,
  type ActivityCommand,
  type ActivityRound,
  type ActivityProgress,
} from "../core/activities";
import {
  activityTopics,
  activityTopic,
  activityTerm,
} from "../data/activity-topics";
import { explorerPlanets } from "../data/activity-planets";
import { decks } from "../data/catalog";
import { seededRng, shuffle } from "../core/random";
import { h, button, modal, toast, field, setButtonDisabled } from "./dom";
import { icon } from "./svg";
import { pageHeading } from "./shell";
import { sourceButton } from "./sources";
import { planetExplorer } from "./planet-explorer";
import { activitySound, activitySoundAvailable } from "./activity-audio";
import {
  celebrateCorrectAnswer,
  clearCelebration,
} from "./experience-controls";

const formats = [
  {
    id: "match",
    name: "Match Lab",
    icon: "connections",
    color: "mint",
    kicker: "MAKE A CONNECTION",
    description:
      "Drag a science term to its definition, or tap a pair. Six bright connections await.",
    action: "Let's match",
    time: "3–5 min",
  },
  {
    id: "words",
    name: "Word Hunt",
    icon: "wordgrid",
    color: "blue",
    kicker: "FIND A LITTLE WONDER",
    description:
      "Follow hidden science words through a fresh letter garden. Find them, then learn them.",
    action: "Find the words",
    time: "3–6 min",
  },
  {
    id: "cards",
    name: "Flashcards",
    icon: "cards",
    color: "lilac",
    kicker: "GROW YOUR MEMORY",
    description:
      "Recall, flip and check. Tricky ideas return for another gentle look.",
    action: "Flip a card",
    time: "2–5 min",
  },
  {
    id: "planets",
    name: "Planet Explorer",
    icon: "planet",
    color: "peach",
    kicker: "TAKE THE SCENIC ORBIT",
    description:
      "Visit eight very different worlds. Read their stories and collect planet passport stamps.",
    action: "Start exploring",
    time: "At your pace",
  },
] as const;
const route = (mode = "", topic = "life") =>
  `#/island/activities${mode ? `/${mode}` : ""}?topic=${topic}`;
let cached:
  | {
      key: string;
      owner: string;
      node: HTMLElement;
      refresh: () => Promise<void>;
      busy: () => boolean;
    }
  | undefined;
const lastTopic = new Map<string, string>();
window.addEventListener("csl:activities", (event) => {
  if (
    cached?.node.isConnected &&
    cached.owner === (event as CustomEvent).detail &&
    !cached.busy()
  )
    void cached.refresh();
});

function activityHelp(mode: string) {
  const instructions: Record<string, string[]> = {
    match: [
      "Select a term, then its definition. With a mouse, you can drag the term straight onto a definition.",
      "Green pairs are connected. If a pair is not quite right, choose again; a hint highlights the matching definition.",
      "Connect all six pairs to finish. Your unfinished round is saved here, and a fresh round gets a new shuffle.",
    ],
    words: [
      "Look for the six listed science words. Spaces and hyphens are omitted from the letter grid.",
      "Tap the first and last letters, or drag between them. Words run straight horizontally, vertically or diagonally, forwards or backwards.",
      "Arrow keys move between letters; Enter or Space chooses the start or end. Escape clears a selection. A hint marks the first letter of an unfinished word.",
    ],
    cards: [
      "Read a term and try recalling its meaning before flipping the card.",
      "Choose I know this to plant that idea, or Practice again to return it to the back of your stack.",
      "Finish when you have marked every card as known. Your stack and review queue are saved if you leave.",
    ],
    planets: [
      "Choose any of the eight planets and read its field notes. Distances and years are rounded; the illustrated map is not to scale.",
      "Answer the little planet check to collect its stamp. Wrong answers allow another try, and hints highlight the field notes.",
      "Collect all eight stamps to earn Orbit ranger. You can revisit any planet whenever you like.",
    ],
  };
  modal(
    "A little guide to your next discovery",
    [
      h("p", { class: "eyebrow" }, "NO RUSH. JUST CURIOSITY."),
      h(
        "ol",
        { class: "activity-help-list" },
        ...(
          instructions[mode] ?? [
            "Choose a science branch, then an activity.",
            "Use hints whenever you need a little nudge. Sound is optional and starts off.",
            "Complete activities to collect badges in your discovery passport. Activity progress stays with this account on this device.",
          ]
        ).map((text) => h("li", null, text)),
      ),
    ],
    true,
  );
}
function learningSources(round: ActivityRound) {
  const ids = [...new Set(roundTerms(round).map((t) => t.deckId))];
  modal(
    "The ideas behind your activity",
    [
      h(
        "p",
        null,
        "These are original lab practice definitions from the science notes, with additional Science Skills vocabulary. They are learning summaries, not publisher quotations. Read the matching notes and supporting publications below.",
      ),
      ...ids.map((id) =>
        h(
          "section",
          { class: "activity-citation" },
          h("h3", null, decks.find((d) => d.id === id)!.name),
          sourceButton(id),
        ),
      ),
    ],
    true,
  );
}
function badgeCards(progress: ActivityProgress, compact = false) {
  return h(
    "div",
    { class: compact ? "activity-badge-grid compact" : "activity-badge-grid" },
    ...(compact ? activityBadges.slice(0, 3) : activityBadges).map((badge) => {
      const earned = progress.badges[badge.id] !== undefined,
        value = badgeCount(progress, badge.id);
      return h(
        "article",
        {
          class: `activity-badge ${badge.color} ${earned ? "is-earned" : "is-locked"}`,
          "aria-label": `${badge.name}: ${earned ? "earned" : "in progress"}`,
        },
        badgeArtwork(
          { id: `activity:${badge.id}`, icon: badge.icon, earned },
          compact ? "activity-mini" : "",
        ),
        h("h3", null, badge.name),
        h("p", null, badge.description),
        h("progress", {
          max: badge.goal,
          value,
          "aria-label": `${badge.name} progress: ${value} of ${badge.goal}`,
        }),
        h(
          "span",
          { class: "badge-state" },
          earned ? "Yours to keep" : `${value} / ${badge.goal} · Still growing`,
        ),
      );
    }),
  );
}

export async function activitiesPage(requestedMode: string) {
  const user = currentUser()!;
  const mode = ["match", "words", "cards", "planets", "badges", ""].includes(
    requestedMode,
  )
    ? requestedMode
    : "";
  const query = new URLSearchParams(location.hash.split("?")[1]);
  const topicId = query.get("topic") ?? lastTopic.get(user.id) ?? "life";
  const topic = activityTopic(topicId) ?? activityTopics[0];
  if (!mode && query.get("topic") !== topic.id) {
    query.set("topic", topic.id);
    history.replaceState(null, "", location.hash.split("?")[0] + "?" + query);
  }
  lastTopic.set(user.id, topic.id);
  const cacheKey = `${user.id}:${mode}:${topic.id}`;
  if (cached?.key === cacheKey) {
    void cached.refresh();
    return cached.node;
  }
  let progress = await loadActivities(user.id);
  const kind = ["match", "words", "cards"].includes(mode)
    ? (mode as ActivityKind)
    : undefined;
  if (
    kind &&
    (!progress.rounds[kind] ||
      (progress.rounds[kind]!.completed &&
        progress.rounds[kind]!.topic !== topic.id))
  )
    progress = (await newActivity(kind, topic.id)).patch;
  let selectedPlanet =
    explorerPlanets.find((p) => !progress.stamped.includes(p.id))?.id ??
    "earth";
  if (mode === "planets" && !progress.visited.includes(selectedPlanet))
    progress = (
      await activityAction({ type: "ReadPlanet", planet: selectedPlanet })
    ).patch;
  if (currentUser()?.id !== user.id)
    throw new Error(
      "Your account changed. Open your discovery passport again.",
    );
  let busy = false,
    selectedTerm = "",
    wordAnchor: number | undefined;
  let dragStart: number | undefined,
    dragEnd: number | undefined,
    suppressClickUntil = 0;
  const format = formats.find((f) => f.id === mode);
  const page = h("div", {
    class: `activities-page page-enter activity-mode-${mode || "hub"}`,
  });
  const live = h("p", {
    class: "activity-feedback",
    role: "status",
    "aria-live": "polite",
    hidden: true,
  });
  const stage = h("div", { class: "activity-stage" });
  const sound = button(
    "",
    async () => {
      const result = await send({ type: "Sound", enabled: !progress.sound });
      if (result && progress.sound) void activitySound("hint");
    },
    "activity-tool",
    {
      "aria-pressed": progress.sound,
      disabled: !activitySoundAvailable(),
      "data-focus-key": "sound",
    },
  );
  const help = button(
    h("span", null, icon("bulb", 17), "How to play"),
    () => activityHelp(mode),
    "activity-tool",
  );
  const hints = button(
    h("span", null, icon("bulb", 17), "A little hint"),
    () => {
      if (mode === "planets")
        return send({ type: "HintPlanet", planet: selectedPlanet });
      const round = kind && progress.rounds[kind];
      if (!round || round.completed) return;
      const target =
        kind === "cards"
          ? round.queue[0]
          : selectedTerm ||
            round.items.find((id) => !round.solved.includes(id))!;
      if (kind === "match") selectedTerm = target;
      return send({ type: "Hint", round: round.id, target });
    },
    "activity-tool hint-tool",
    { "data-focus-key": "hint" },
  );
  const topicSelect = h(
    "select",
    { "aria-label": "Activity science branch" },
    ...activityTopics.map((t) => h("option", { value: t.id }, t.name)),
  );
  topicSelect.value = topic.id;
  topicSelect.addEventListener("change", () => {
    location.hash = route(mode, topicSelect.value);
  });
  const toolbar = h(
    "div",
    { class: "activity-toolbar" },
    mode !== "planets" && mode !== "badges"
      ? field("Your science branch", topicSelect)
      : h(
          "span",
          { class: "activity-toolbar-note" },
          icon("notebook", 18),
          mode === "planets"
            ? `${progress.stamped.length} / 8 planet stamps`
            : "A little record of your curiosity",
        ),
    h(
      "div",
      { class: "activity-tools" },
      mode && mode !== "badges" ? hints : null,
      sound,
      help,
    ),
  );
  const saveNote = h(
    "p",
    { class: "activity-save-note" },
    icon("check", 14),
    "Your rounds and badges are saved for this account on this device. Pick up where you left off.",
  );
  page.append(
    pageHeading(
      mode === "badges"
        ? "YOUR DISCOVERY PASSPORT"
        : "SCIENCE ISLAND · DISCOVERY ACTIVITIES",
      format?.name ??
        (mode === "badges"
          ? "Your curiosity, collected."
          : "Big ideas. Little adventures."),
      format?.description ??
        (mode === "badges"
          ? "Every badge tells a little story about something you learned."
          : "Match it. Find it. Remember it. Explore it. A whole new way to get curious."),
    ),
    toolbar,
    live,
    stage,
    saveNote,
  );

  async function refresh() {
    if (busy || currentUser()?.id !== user.id) return;
    try {
      const fresh = await loadActivities(user.id);
      if (fresh.rev !== progress.rev) {
        progress = fresh;
        draw();
      }
    } catch (error) {
      if (page.isConnected)
        feedback(
          error instanceof Error
            ? error.message
            : "Please reopen your passport.",
          "wrong",
        );
    }
  }
  function feedback(message: string, type = "hint") {
    live.hidden = false;
    live.className = `activity-feedback feedback-${type}`;
    live.textContent = message;
  }
  async function send(command: ActivityCommand, focus?: string) {
    if (busy || currentUser()?.id !== user.id) return false;
    clearCelebration();
    busy = true;
    page.setAttribute("aria-busy", "true");
    const waiting = [
      ...stage.querySelectorAll<HTMLButtonElement>("button:enabled"),
    ];
    waiting.forEach((control) => {
      setButtonDisabled(control, true);
    });
    try {
      const result = await activityAction(command);
      if (currentUser()?.id !== user.id || !page.isConnected) return false;
      progress = result.patch;
      if (
        selectedTerm &&
        kind &&
        progress.rounds[kind]?.solved.includes(selectedTerm)
      )
        selectedTerm = "";
      const primary = result.events.filter((e) => e.type !== "badge").at(-1);
      if (primary) feedback(primary.message, primary.type);
      for (const event of result.events.filter((e) => e.type === "badge"))
        toast(event.message);
      if (progress.sound && primary)
        void activitySound(
          result.events.some((event) => event.type === "badge")
            ? "badge"
            : primary.type,
        );
      if (result.events.some((event) => event.type === "correct"))
        celebrateCorrectAnswer();
      draw(focus);
      return true;
    } catch (error) {
      feedback(
        error instanceof Error
          ? error.message
          : "This discovery could not be saved. Please try again.",
        "wrong",
      );
      const fresh = await loadActivities(user.id).catch(() => undefined);
      if (fresh && currentUser()?.id === user.id && page.isConnected) {
        progress = fresh;
        draw();
      }
      return false;
    } finally {
      busy = false;
      page.removeAttribute("aria-busy");
      waiting.forEach((control) => {
        if (control.isConnected) setButtonDisabled(control, false);
      });
    }
  }
  async function begin() {
    if (!kind || busy) return;
    const old = progress.rounds[kind];
    const run = async () => {
      selectedTerm = "";
      wordAnchor = undefined;
      await send({
        type: "Begin",
        kind,
        topic: topic.id,
        id: crypto.randomUUID(),
        seed: crypto.getRandomValues(new Uint32Array(1))[0],
      });
      feedback(
        "A fresh little discovery is ready. Your earned badges stay in your passport.",
      );
    };
    if (old && !old.completed && old.topic === topic.id) {
      const { close } = modal("Start a fresh round?", [
        h(
          "p",
          null,
          "This replaces your unfinished round with a new shuffle. Your completed discoveries and badges are kept.",
        ),
        button("Keep my round", () => close(), "button outline"),
        button(
          "Start a fresh round",
          async () => {
            close();
            await run();
          },
          "button primary",
        ),
      ]);
    } else await run();
  }
  function choosePlanet(id: string) {
    selectedPlanet = id;
    return send({ type: "ReadPlanet", planet: id }, `planet-${id}`);
  }
  function draw(focus?: string) {
    const focusKey =
      focus ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.focusKey
        : undefined);
    sound.replaceChildren(
      icon(progress.sound ? "volume" : "muted", 17),
      progress.sound ? "Sound on" : "Sound off",
    );
    sound.setAttribute("aria-pressed", String(progress.sound));
    sound.setAttribute(
      "aria-label",
      activitySoundAvailable()
        ? `Activity sound ${progress.sound ? "on" : "off"}`
        : "Sound is unavailable in this browser",
    );
    const round = kind && progress.rounds[kind];
    hints.disabled =
      !!round?.completed ||
      (mode === "planets" && progress.stamped.includes(selectedPlanet));
    if (!mode) stage.replaceChildren(hub());
    else if (mode === "badges")
      stage.replaceChildren(
        h(
          "section",
          { class: "activity-passport-banner" },
          icon("trophy", 35),
          h(
            "div",
            null,
            h(
              "h2",
              null,
              `${Object.keys(progress.badges).length} of ${activityBadges.length} badges collected`,
            ),
            h(
              "p",
              null,
              "Hints are welcome here. Keep exploring at your own pace.",
            ),
          ),
        ),
        badgeCards(progress),
        h(
          "a",
          { href: route("", topic.id), class: "button primary" },
          "Find my next discovery",
        ),
      );
    else if (mode === "planets")
      stage.replaceChildren(
        planetExplorer(progress, selectedPlanet, choosePlanet, send),
      );
    else if (round) {
      if (round.topic !== topic.id)
        stage.replaceChildren(
          h(
            "section",
            { class: "activity-saved-round paper" },
            icon("notebook", 40),
            h("h2", null, "A little discovery is waiting for you."),
            h(
              "p",
              null,
              `You have an unfinished ${activityTopic(round.topic)!.name} round. Starting ${topic.name} replaces that round.`,
            ),
            h(
              "a",
              { class: "button outline", href: route(mode, round.topic) },
              "Continue my saved round",
            ),
            button(`Start ${topic.name}`, begin, "button primary"),
          ),
        );
      else if (round.completed) stage.replaceChildren(completed(round));
      else
        stage.replaceChildren(
          roundHeading(round),
          kind === "match"
            ? matching(round)
            : kind === "words"
              ? wordHunt(round)
              : flashcards(round),
          h(
            "div",
            { class: "activity-bottom-actions" },
            button(
              h("span", null, icon("notebook", 16), "Learning sources"),
              () => learningSources(round),
              "text-button",
            ),
            button("New shuffle", begin, "text-button"),
          ),
        );
    }
    if (focusKey && page.isConnected) {
      const target = [
        ...page.querySelectorAll<HTMLElement>("[data-focus-key]"),
      ].find(
        (n) =>
          n.dataset.focusKey === focusKey &&
          !(n instanceof HTMLButtonElement && n.disabled),
      );
      target?.focus({ preventScroll: true });
    }
  }
  function hub() {
    const landmarks = {
      match: {
        name: "Connection Cove",
        art: 6,
        description: "Two ideas. One bright connection.",
      },
      words: {
        name: "Wordwood Grove",
        art: 7,
        description: "Follow the letters. Find a little wonder.",
      },
      cards: {
        name: "Memory Meadow",
        art: 8,
        description: "A quiet corner for an a-ha moment.",
      },
      planets: {
        name: "Starlight Lookout",
        art: 4,
        description: "Eight worlds, one very curious explorer.",
      },
    };
    return h(
      "div",
      { class: "activity-hub discovery-adventure" },
      h(
        "section",
        {
          class: "adventure-welcome",
          "aria-label": "Your discovery adventure",
        },
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "YOUR DISCOVERY MAP"),
          h("h2", null, "Your next little adventure."),
          h(
            "p",
            null,
            "Your " + topic.name + " trail is ready. Pick an island to begin.",
          ),
        ),
        h(
          "div",
          { class: "adventure-welcome-art", "aria-hidden": true },
          diarySticker(0),
          h("span", { class: "adventure-compass" }, icon("island", 20)),
        ),
      ),
      h(
        "div",
        {
          class: "adventure-map-summary",
          role: "group",
          "aria-label": "Your saved activity progress",
        },
        h(
          "span",
          null,
          icon("connections", 17),
          h("strong", null, progress.completedRounds),
          " rounds explored",
        ),
        h(
          "span",
          null,
          icon("trophy", 17),
          h(
            "strong",
            null,
            Object.keys(progress.badges).length + "/" + activityBadges.length,
          ),
          " badges",
        ),
        h(
          "span",
          null,
          icon("planet", 17),
          h("strong", null, progress.stamped.length + "/8"),
          " planet stamps",
        ),
      ),
      h(
        "section",
        {
          class: "activity-adventure-map",
          "aria-label": "Discovery adventure map",
        },
        h(
          "div",
          { class: "adventure-map-route", "aria-hidden": true },
          h("i"),
          h("i"),
          h("i"),
        ),
        h(
          "span",
          { class: "adventure-map-caption", "aria-hidden": true },
          "a little trail of possibility",
        ),
        ...formats.map((format, index) => {
          const landmark = landmarks[format.id];
          const saved =
            format.id === "planets" ? undefined : progress.rounds[format.id];
          const sameTopic = saved?.topic === topic.id;
          const continuing = saved && !saved.completed && sameTopic;
          const done = saved
            ? saved.kind === "cards"
              ? saved.known.length
              : saved.solved.length
            : 0;
          const status =
            format.id === "planets"
              ? progress.stamped.length + " of 8 worlds stamped"
              : continuing
                ? done + " of " + saved.items.length + " ideas explored"
                : saved && !saved.completed
                  ? "Saved round in " + activityTopic(saved.topic)!.name
                  : saved && sameTopic
                    ? "A fresh round is ready"
                    : "Your next discovery starts here";
          return h(
            "article",
            {
              class: "adventure-islet islet-" + format.id,
              "data-adventure-islet": format.id,
            },
            h(
              "a",
              {
                href: route(format.id, topic.id),
                class: "adventure-island-link",
                "aria-label": "Open " + format.name,
                "data-focus-key": "island-" + format.id,
              },
              h(
                "span",
                { class: "adventure-islet-land", "aria-hidden": true },
                h("span", { class: "islet-land-shadow" }),
                h("span", { class: "islet-land-top" }),
                h(
                  "span",
                  { class: "islet-doodle doodle-one" },
                  icon(format.icon, 24),
                ),
                h(
                  "span",
                  { class: "islet-doodle doodle-two" },
                  icon(format.id === "planets" ? "star" : "sprout", 19),
                ),
                format.id === "words"
                  ? h(
                      "span",
                      { class: "islet-letter-trail" },
                      ...[..."SCIENCE"].map((letter) => h("i", null, letter)),
                    )
                  : format.id === "cards"
                    ? h(
                        "span",
                        { class: "islet-card-stack" },
                        h("i"),
                        h("i"),
                        h("i"),
                      )
                    : format.id === "planets"
                      ? h("span", { class: "islet-little-orbit" })
                      : h("span", { class: "islet-connection-line" }),
                diarySticker(landmark.art),
                h("span", { class: "islet-number" }, "0" + (index + 1)),
              ),
              h(
                "div",
                { class: "adventure-islet-copy" },
                h("span", { class: "eyebrow" }, landmark.name),
                h("h3", null, format.name),
                h("span", { class: "islet-description" }, landmark.description),
                h(
                  "span",
                  { class: "islet-saved-status" },
                  icon(continuing ? "clock" : "sparkles", 14),
                  status,
                ),
                h(
                  "span",
                  { class: "islet-open" },
                  continuing ? "Continue round" : format.action,
                  icon("arrow", 17),
                ),
                h("small", null, icon("clock", 13), format.time),
              ),
            ),
          );
        }),
      ),
      h(
        "section",
        {
          class: "adventure-passport-dock",
          "aria-label": "Your activity passport",
        },
        diarySticker(11),
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "LITTLE ADVENTURES. LOVELY KEEPSAKES."),
          h("h2", null, "Your discovery passport"),
          h(
            "p",
            null,
            Object.keys(progress.badges).length +
              " of " +
              activityBadges.length +
              " badges collected. Make room for your next little win.",
          ),
        ),
        h(
          "a",
          { href: route("badges", topic.id), class: "button outline" },
          "Open my badge collection",
          icon("arrow", 16),
        ),
      ),
    );
  }
  function roundHeading(round: ActivityRound) {
    const done =
      round.kind === "cards" ? round.known.length : round.solved.length;
    return h(
      "div",
      { class: "activity-round-header" },
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, topic.name),
        h(
          "h2",
          null,
          round.kind === "match"
            ? "Every idea has a meaning."
            : round.kind === "words"
              ? "A little science is hiding here."
              : "Plant one idea at a time.",
        ),
      ),
      h(
        "div",
        { class: "activity-round-progress" },
        h("strong", null, `${done} / ${round.items.length}`),
        h(
          "span",
          null,
          round.kind === "cards"
            ? "ideas planted"
            : round.kind === "words"
              ? "words found"
              : "pairs connected",
        ),
        h("progress", {
          value: done,
          max: round.items.length,
          "aria-label": "Round progress",
        }),
      ),
    );
  }
  function completed(round: ActivityRound) {
    return h(
      "section",
      { class: "activity-complete" },
      h(
        "span",
        { class: "activity-complete-medal", "aria-hidden": true },
        icon("trophy", 45),
      ),
      h("p", { class: "eyebrow" }, "A LITTLE MORE SCIENCE, YOURS TO KEEP"),
      h("h2", null, "Discovery complete!"),
      h(
        "p",
        null,
        `${round.items.length} ${round.kind === "cards" ? "ideas reviewed" : round.kind === "words" ? "words discovered" : "connections made"} · ${round.hints} ${round.hints === 1 ? "hint" : "hints"} used. Keep the knowledge, and take another trail whenever you like.`,
      ),
      h(
        "div",
        { class: "activity-complete-actions" },
        button("Play another round", begin, "button primary", {
          "data-focus-key": "play-again",
        }),
        h(
          "a",
          { href: route("badges", topic.id), class: "button outline" },
          "See my badges",
        ),
        h(
          "a",
          { href: route("", topic.id), class: "button outline" },
          "Choose another activity",
        ),
      ),
      h(
        "details",
        { class: "activity-recap" },
        h("summary", null, "Keep these ideas close"),
        ...roundTerms(round).map((term) =>
          h("p", null, h("strong", null, `${term.term} · `), term.definition),
        ),
      ),
      button("Learning sources", () => learningSources(round), "text-button"),
    );
  }
  function matching(round: ActivityRound) {
    const terms = roundTerms(round),
      definitions = shuffle(terms, seededRng(round.seed ^ 0x691));
    const zone = h("div", { class: "match-zone" });
    const paintSelection = () => {
      zone
        .querySelectorAll<HTMLElement>("[data-match-term]")
        .forEach((node) => {
          const yes = node.dataset.matchTerm === selectedTerm;
          node.classList.toggle("is-selected", yes);
          node.setAttribute("aria-pressed", String(yes));
        });
      const selection = zone.querySelector(".match-selection-status");
      if (selection)
        selection.textContent = selectedTerm
          ? `${activityTerm(selectedTerm)!.term} selected. Choose its definition.`
          : "Select a term to begin a connection.";
    };
    const attempt = (term: string, definition: string) =>
      send(
        { type: "Match", round: round.id, term, definition },
        term === definition
          ? `term-${round.items.find((id) => id !== term && !round.solved.includes(id)) ?? ""}`
          : `definition-${definition}`,
      );
    zone.append(
      h(
        "p",
        { class: "activity-instructions" },
        "Drag a term onto its definition, or tap a term and then its meaning. Green pairs are connected.",
      ),
      h("p", { class: "match-selection-status", role: "status" }),
      h(
        "div",
        { class: "match-columns" },
        h(
          "section",
          { "aria-label": "Science terms", class: "match-terms" },
          h("h3", null, "The idea"),
          ...terms.map((term, i) => {
            const solved = round.solved.includes(term.id);
            const tile = button(
              h(
                "span",
                null,
                h("small", null, String(i + 1).padStart(2, "0")),
                h("strong", null, term.term),
                icon(solved ? "check" : "connections", 18),
              ),
              () => {
                selectedTerm = selectedTerm === term.id ? "" : term.id;
                paintSelection();
              },
              `match-term ${solved ? "is-solved" : ""}`,
              {
                disabled: solved,
                draggable: solved ? "false" : "true",
                "data-match-term": term.id,
                "data-focus-key": `term-${term.id}`,
                "aria-pressed": selectedTerm === term.id,
              },
            );
            tile.addEventListener("dragstart", (event) => {
              selectedTerm = term.id;
              event.dataTransfer?.setData("application/x-cozy-term", term.id);
              if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
              paintSelection();
            });
            return tile;
          }),
        ),
        h(
          "section",
          { "aria-label": "Science definitions", class: "match-definitions" },
          h("h3", null, "Its meaning"),
          ...definitions.map((term) => {
            const solved = round.solved.includes(term.id);
            const tile = button(
              h(
                "span",
                null,
                h("span", null, term.definition),
                solved ? icon("check", 20) : null,
              ),
              () => {
                if (selectedTerm) return attempt(selectedTerm, term.id);
                feedback("Choose a term first, then tap its definition.");
              },
              `match-definition ${solved ? "is-solved" : ""} ${round.hintFor === term.id ? "is-hinted" : ""}`,
              {
                disabled: solved,
                "data-definition": term.id,
                "data-focus-key": `definition-${term.id}`,
              },
            );
            tile.addEventListener("dragover", (event) => {
              if (!solved) {
                event.preventDefault();
                tile.classList.add("is-over");
              }
            });
            tile.addEventListener("dragleave", () =>
              tile.classList.remove("is-over"),
            );
            tile.addEventListener("drop", (event) => {
              event.preventDefault();
              tile.classList.remove("is-over");
              const termId = event.dataTransfer?.getData(
                "application/x-cozy-term",
              );
              if (!solved && termId && round.items.includes(termId))
                void attempt(termId, term.id);
            });
            return tile;
          }),
        ),
      ),
    );
    paintSelection();
    if (round.hintFor)
      zone.append(
        h(
          "p",
          { class: "activity-hint-note" },
          icon("bulb", 18),
          `Look for the highlighted definition for ${activityTerm(round.hintFor)!.term}.`,
        ),
      );
    return zone;
  }
  function wordHunt(round: ActivityRound) {
    const board = wordBoard(round),
      foundCells = new Set(Object.values(round.paths).flat());
    const selectedCells = () =>
      dragStart !== undefined && dragEnd !== undefined
        ? wordPath(dragStart, dragEnd)
        : wordAnchor === undefined
          ? []
          : [wordAnchor];
    const grid = h("div", {
      class: "word-grid",
      role: "group",
      "aria-label":
        "Word Hunt letter grid. Arrow keys move; Enter selects a start or end.",
    });
    const cells: HTMLButtonElement[] = [];
    const paint = () => {
      const selected = new Set(selectedCells());
      cells.forEach((cell, i) => {
        cell.classList.toggle("is-selected", selected.has(i));
        cell.setAttribute(
          "aria-pressed",
          String(selected.has(i) || foundCells.has(i)),
        );
      });
    };
    const find = async (start: number, end: number) => {
      wordAnchor = undefined;
      dragStart = dragEnd = undefined;
      await send(
        { type: "FindWord", round: round.id, start, end },
        `letter-${end}`,
      );
    };
    const atPoint = (x: number, y: number) => {
      const node = document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>("[data-letter-index]");
      return node && grid.contains(node)
        ? Number(node.dataset.letterIndex)
        : undefined;
    };
    board.cells.forEach((letter, i) => {
      const hint = round.hintFor && board.placements[round.hintFor]?.[0] === i;
      const cell = button(
        letter,
        () => {
          if (performance.now() < suppressClickUntil) return;
          if (wordAnchor === undefined) {
            wordAnchor = i;
            paint();
            feedback(
              `Start chosen at row ${Math.floor(i / 10) + 1}, column ${(i % 10) + 1}. Choose the final letter.`,
            );
          } else void find(wordAnchor, i);
        },
        `word-cell ${foundCells.has(i) ? "is-found" : ""} ${hint ? "is-hinted" : ""}`,
        {
          tabindex: i === 0 ? 0 : -1,
          "data-letter-index": i,
          "data-focus-key": `letter-${i}`,
          "aria-label": `Row ${Math.floor(i / 10) + 1}, column ${(i % 10) + 1}: ${letter}`,
          "aria-pressed": foundCells.has(i),
        },
      );
      cell.addEventListener("focus", () =>
        cells.forEach((node) => {
          node.tabIndex = node === cell ? 0 : -1;
        }),
      );
      cells.push(cell);
      grid.append(cell);
    });
    grid.addEventListener("keydown", (event) => {
      const index = Number((event.target as HTMLElement).dataset.letterIndex);
      let next = index;
      if (event.key === "ArrowLeft")
        next = Math.max(Math.floor(index / 10) * 10, index - 1);
      else if (event.key === "ArrowRight")
        next = Math.min(Math.floor(index / 10) * 10 + 9, index + 1);
      else if (event.key === "ArrowUp") next = Math.max(0, index - 10);
      else if (event.key === "ArrowDown") next = Math.min(99, index + 10);
      else if (event.key === "Home") next = Math.floor(index / 10) * 10;
      else if (event.key === "End") next = Math.floor(index / 10) * 10 + 9;
      else if (event.key === "Escape") {
        wordAnchor = undefined;
        paint();
        feedback("Selection cleared. Choose another starting letter.");
        return;
      } else return;
      event.preventDefault();
      cells[next]?.focus();
    });
    grid.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      dragStart = atPoint(event.clientX, event.clientY);
      dragEnd = dragStart;
    });
    grid.addEventListener("pointermove", (event) => {
      if (dragStart === undefined || !event.buttons) return;
      dragEnd = atPoint(event.clientX, event.clientY);
      paint();
    });
    grid.addEventListener("pointerup", (event) => {
      const start = dragStart,
        end = atPoint(event.clientX, event.clientY);
      dragStart = dragEnd = undefined;
      if (start !== undefined && end !== undefined && start !== end) {
        suppressClickUntil = performance.now() + 350;
        void find(start, end);
      } else paint();
    });
    grid.addEventListener("pointerleave", () => {
      dragStart = dragEnd = undefined;
      paint();
    });
    grid.addEventListener("pointercancel", () => {
      dragStart = dragEnd = undefined;
      paint();
    });
    const chosen = round.hintFor ? activityTerm(round.hintFor) : undefined;
    const start = chosen ? board.placements[chosen.id][0] : 0;
    paint();
    return h(
      "div",
      { class: "word-hunt" },
      h(
        "section",
        { class: "word-board-card" },
        h(
          "p",
          { class: "activity-instructions" },
          "Tap the first and last letters, or drag between them. Words can run in eight directions. Spaces and hyphens are left out.",
        ),
        grid,
        h(
          "div",
          { class: "word-board-footer" },
          h("span", null, "← ↑ ↗ · All eight directions"),
          button(
            "Clear selection",
            () => {
              wordAnchor = undefined;
              paint();
              feedback("Selection cleared.");
            },
            "text-button",
          ),
        ),
        chosen
          ? h(
              "p",
              { class: "activity-hint-note" },
              icon("bulb", 17),
              `${chosen.term} starts at row ${Math.floor(start / 10) + 1}, column ${(start % 10) + 1}. Its first letter is highlighted.`,
            )
          : null,
      ),
      h(
        "section",
        { class: "word-trail-list", "aria-label": "Words to discover" },
        h("p", { class: "eyebrow" }, "YOUR WORD TRAIL"),
        h("h3", null, "Six ideas to discover"),
        h(
          "ul",
          null,
          ...roundTerms(round).map((term) =>
            h(
              "li",
              { class: round.solved.includes(term.id) ? "found" : "" },
              h(
                "strong",
                null,
                icon(round.solved.includes(term.id) ? "check" : "search", 17),
                term.term,
              ),
              h(
                "p",
                null,
                round.solved.includes(term.id)
                  ? term.definition
                  : "Find the word to reveal its meaning.",
              ),
            ),
          ),
        ),
      ),
    );
  }
  function flashcards(round: ActivityRound) {
    const term = activityTerm(round.queue[0])!;
    return h(
      "section",
      { class: "flashcard-studio" },
      h(
        "p",
        { class: "activity-instructions" },
        "Recall first. Flip to reveal the meaning. Keep tricky cards in your stack until they feel familiar.",
      ),
      button(
        h(
          "span",
          { class: "flashcard-inner" },
          h(
            "span",
            {
              class: "flashcard-side flashcard-front",
              "aria-hidden": round.revealed,
            },
            h("small", null, "THE IDEA"),
            h("strong", null, term.term),
            h("span", { class: "flashcard-sprout" }, icon("sprout", 33)),
            h("span", null, "What does it mean?"),
          ),
          h(
            "span",
            {
              class: "flashcard-side flashcard-back",
              "aria-hidden": !round.revealed,
            },
            h("small", null, term.term),
            h("strong", null, term.definition),
            h("span", null, "A little more knowledge, yours to grow."),
          ),
        ),
        () => send({ type: "Flip", round: round.id }, "flip-card"),
        `activity-flashcard ${round.revealed ? "is-revealed" : ""}`,
        {
          "aria-label": round.revealed
            ? "Show term again"
            : `Reveal definition of ${term.term}`,
          "aria-pressed": round.revealed,
          "data-focus-key": "flip-card",
        },
      ),
      round.hintFor === term.id && !round.revealed
        ? h(
            "p",
            { class: "activity-hint-note" },
            icon("bulb", 17),
            `A little start: “${term.definition.slice(0, 58)}${term.definition.length > 58 ? "…" : ""}”`,
          )
        : null,
      h(
        "div",
        { class: "flashcard-actions" },
        button(
          h("span", null, icon("cards", 17), "Practice again"),
          () =>
            send(
              { type: "RateCard", round: round.id, known: false },
              "flip-card",
            ),
          "button outline",
          { disabled: !round.revealed },
        ),
        button(
          h("span", null, icon("check", 17), "I know this"),
          () =>
            send(
              { type: "RateCard", round: round.id, known: true },
              round.queue.length === 1 ? "play-again" : "flip-card",
            ),
          "button primary",
          { disabled: !round.revealed },
        ),
      ),
      h(
        "p",
        { class: "activity-small" },
        `${round.queue.length} ${round.queue.length === 1 ? "card" : "cards"} left in your stack · Reveal a card before choosing.`,
      ),
    );
  }
  cached = {
    key: cacheKey,
    owner: user.id,
    node: page,
    refresh,
    busy: () => busy,
  };
  draw();
  return page;
}
