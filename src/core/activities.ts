import {
  activityTopic,
  activityTerm,
  puzzleWord,
} from "../data/activity-topics";
import { explorerPlanets } from "../data/activity-planets";
import { seededRng, shuffle } from "./random";
import type { BranchId } from "./types";

export type ActivityKind = "match" | "words" | "cards";
export interface ActivityRound {
  id: string;
  kind: ActivityKind;
  topic: BranchId;
  seed: number;
  items: string[];
  solved: string[];
  paths: Record<string, number[]>;
  queue: string[];
  known: string[];
  revealed: boolean;
  mistakes: number;
  hints: number;
  hintFor: string;
  completed: boolean;
}
export interface ActivityProgress {
  version: 1;
  owner: string;
  rev: number;
  sound: boolean;
  rounds: Partial<Record<ActivityKind, ActivityRound>>;
  completedRounds: number;
  formats: string[];
  topics: string[];
  visited: string[];
  stamped: string[];
  planetHints: string[];
  badges: Record<string, number>;
}
export type ActivityCommand =
  | {
      type: "Begin";
      kind: ActivityKind;
      topic: BranchId;
      seed: number;
      id: string;
    }
  | { type: "Match"; round: string; term: string; definition: string }
  | { type: "FindWord"; round: string; start: number; end: number }
  | { type: "Flip"; round: string }
  | { type: "RateCard"; round: string; known: boolean }
  | { type: "Hint"; round: string; target: string }
  | { type: "ReadPlanet"; planet: string }
  | { type: "AnswerPlanet"; planet: string; answer: number }
  | { type: "HintPlanet"; planet: string }
  | { type: "Sound"; enabled: boolean };
export interface ActivityEvent {
  type: "correct" | "wrong" | "hint" | "complete" | "flip" | "badge";
  message: string;
  badge?: string;
}
export const activityBadges = [
  {
    id: "first",
    name: "First spark",
    icon: "sparkles",
    color: "peach",
    description: "Complete your first activity.",
    goal: 1,
  },
  {
    id: "match",
    name: "Connection keeper",
    icon: "connections",
    color: "mint",
    description: "Finish a Match Lab round.",
    goal: 1,
  },
  {
    id: "words",
    name: "Word wanderer",
    icon: "wordgrid",
    color: "blue",
    description: "Find every word in a Word Hunt.",
    goal: 1,
  },
  {
    id: "cards",
    name: "Memory gardener",
    icon: "cards",
    color: "lilac",
    description: "Finish a flashcard review stack.",
    goal: 1,
  },
  {
    id: "planets",
    name: "Orbit ranger",
    icon: "planet",
    color: "blue",
    description: "Earn all eight planet passport stamps.",
    goal: 8,
  },
  {
    id: "branches",
    name: "Curiosity blooms",
    icon: "sprout",
    color: "mint",
    description: "Complete rounds in three science branches.",
    goal: 3,
  },
  {
    id: "all",
    name: "Island explorer",
    icon: "trophy",
    color: "peach",
    description: "Complete all four activity formats.",
    goal: 4,
  },
] as const;
const kinds: ActivityKind[] = ["match", "words", "cards"];
const branches = ["life", "chemistry", "physics", "earth", "skills"];
const requireThat: (
  condition: unknown,
  message: string,
) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
export function initialActivities(owner: string): ActivityProgress {
  return {
    version: 1,
    owner,
    rev: 0,
    sound: false,
    rounds: {},
    completedRounds: 0,
    formats: [],
    topics: [],
    visited: [],
    stamped: [],
    planetHints: [],
    badges: {},
  };
}
export function badgeCount(progress: ActivityProgress, badge: string) {
  if (badge === "first")
    return Math.min(
      1,
      progress.completedRounds + (progress.formats.includes("planets") ? 1 : 0),
    );
  if (badge === "planets") return progress.stamped.length;
  if (badge === "branches") return Math.min(3, progress.topics.length);
  if (badge === "all") return progress.formats.length;
  return progress.formats.includes(badge) ? 1 : 0;
}
export function roundTerms(round: ActivityRound) {
  return round.items.map((id) => activityTerm(id)!);
}
export function wordPath(start: number, end: number, size = 10) {
  if (
    ![start, end].every((n) => Number.isInteger(n) && n >= 0 && n < size * size)
  )
    return [];
  const row = Math.floor(start / size),
    col = start % size;
  const dr = Math.floor(end / size) - row,
    dc = (end % size) - col;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return [];
  const length = Math.max(Math.abs(dr), Math.abs(dc));
  return Array.from(
    { length: length + 1 },
    (_, i) => (row + i * Math.sign(dr)) * size + col + i * Math.sign(dc),
  );
}
export function wordBoard(round: Pick<ActivityRound, "seed" | "items">) {
  const rng = seededRng(round.seed ^ 0x73a2),
    size = 10;
  const targets = round.items.map((id) => ({
    id,
    word: puzzleWord(activityTerm(id)!.term),
  }));
  let cells: string[] = [],
    placements: Record<string, number[]> = {};
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
    [0, -1],
    [-1, 0],
    [-1, -1],
    [1, -1],
  ];
  for (let retry = 0; retry < 12; retry++) {
    cells = Array<string>(size * size).fill("");
    placements = {};
    for (const { id, word } of [...targets].sort(
      (a, b) => b.word.length - a.word.length,
    )) {
      for (let attempt = 0; attempt < 160; attempt++) {
        const [dr, dc] = directions[Math.floor(rng.next() * directions.length)];
        const r = Math.floor(rng.next() * size),
          c = Math.floor(rng.next() * size);
        const er = r + dr * (word.length - 1),
          ec = c + dc * (word.length - 1);
        if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
        const path = wordPath(r * size + c, er * size + ec);
        if (path.some((index, i) => cells[index] && cells[index] !== word[i]))
          continue;
        path.forEach((index, i) => {
          cells[index] = word[i];
        });
        placements[id] = path;
        break;
      }
      if (!placements[id]) break;
    }
    if (Object.keys(placements).length === targets.length) break;
  }
  if (Object.keys(placements).length !== targets.length) {
    cells.fill("");
    placements = {};
    const rows = shuffle(
      Array.from({ length: size }, (_, i) => i),
      rng,
    );
    targets.forEach(({ id, word }, i) => {
      const start = Math.floor(rng.next() * (size - word.length + 1));
      const path = wordPath(
        rows[i] * size + start,
        rows[i] * size + start + word.length - 1,
      );
      placements[id] = path;
      path.forEach((index, n) => {
        cells[index] = word[n];
      });
    });
  }
  cells = cells.map(
    (letter) =>
      letter || "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(rng.next() * 26)],
  );
  return { cells, placements, size };
}
export function applyActivity(
  previous: ActivityProgress,
  actor: { id: string; role: string },
  command: ActivityCommand,
  now: number,
): {
  patch: ActivityProgress;
  inverse: ActivityProgress;
  events: ActivityEvent[];
} {
  requireThat(
    actor.id === previous.owner && ["student", "admin"].includes(actor.role),
    "Sign in to use your own discovery passport.",
  );
  const progress = structuredClone(previous),
    events: ActivityEvent[] = [];
  const event = (type: ActivityEvent["type"], message: string) =>
    events.push({ type, message });
  let round: ActivityRound | undefined;
  if ("round" in command) {
    round = Object.values(progress.rounds).find((r) => r.id === command.round);
    requireThat(
      round && !round.completed,
      "This round changed in another tab. Reopen the activity to continue.",
    );
  }
  switch (command.type) {
    case "Begin": {
      const topic = activityTopic(command.topic);
      requireThat(
        topic &&
          kinds.includes(command.kind) &&
          Number.isSafeInteger(command.seed) &&
          command.seed >= 0 &&
          command.seed <= 4294967295 &&
          /^[a-zA-Z0-9-]{8,80}$/.test(command.id),
        "Choose a valid science activity.",
      );
      const candidates =
        command.kind === "words"
          ? topic.terms.filter((term) =>
              /^[A-Z]{2,10}$/.test(puzzleWord(term.term)),
            )
          : topic.terms;
      const seen = new Set<string>();
      const unique = candidates.filter((t) => {
        const value =
          command.kind === "words" ? puzzleWord(t.term) : t.definition;
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
      const count = command.kind === "cards" ? 8 : 6;
      requireThat(
        unique.length >= count,
        "This topic needs more study terms before it can open.",
      );
      const items = shuffle(unique, seededRng(command.seed))
        .slice(0, count)
        .map((t) => t.id);
      progress.rounds[command.kind] = {
        id: command.id,
        kind: command.kind,
        topic: command.topic,
        seed: command.seed,
        items,
        solved: [],
        paths: {},
        queue: [...items],
        known: [],
        revealed: false,
        mistakes: 0,
        hints: 0,
        hintFor: "",
        completed: false,
      };
      break;
    }
    case "Match": {
      requireThat(
        round?.kind === "match" &&
          round.items.includes(command.term) &&
          round.items.includes(command.definition),
        "Choose a term and one of this round's definitions.",
      );
      if (
        round.solved.includes(command.term) ||
        round.solved.includes(command.definition)
      )
        break;
      if (command.term === command.definition) {
        round.solved.push(command.term);
        round.hintFor = "";
        event(
          "correct",
          `${activityTerm(command.term)!.term}: ${activityTerm(command.term)!.definition}`,
        );
      } else {
        round.mistakes++;
        event(
          "wrong",
          "Not quite connected yet. Try another definition, or ask for a hint.",
        );
      }
      break;
    }
    case "FindWord": {
      requireThat(round?.kind === "words", "Open a Word Hunt first.");
      const board = wordBoard(round),
        path = wordPath(command.start, command.end);
      const letters = path.map((i) => board.cells[i]).join("");
      const term = roundTerms(round).find((t) => {
        const word = puzzleWord(t.term);
        return word === letters || [...word].reverse().join("") === letters;
      });
      if (term && round.solved.includes(term.id)) {
        event(
          "hint",
          "You have already found that word. Look for another one!",
        );
        break;
      }
      if (term) {
        round.solved.push(term.id);
        round.paths[term.id] = path;
        round.hintFor = "";
        event("correct", `${term.term}: ${term.definition}`);
      } else {
        round.mistakes++;
        event(
          "wrong",
          path.length
            ? "Keep looking! Follow one listed word in a straight line, forwards or backwards."
            : "Choose the first and last letters in a straight row, column or diagonal.",
        );
      }
      break;
    }
    case "Flip":
      requireThat(round?.kind === "cards", "Open a flashcard stack first.");
      round.revealed = !round.revealed;
      event(
        "flip",
        round.revealed
          ? "Definition revealed. Decide whether you know it or want another look."
          : "Try recalling the definition again.",
      );
      break;
    case "RateCard": {
      requireThat(
        round?.kind === "cards" && round.revealed && round.queue.length,
        "Reveal the card before choosing your next step.",
      );
      const id = round.queue.shift()!;
      if (command.known) {
        round.known.push(id);
        event("correct", "A little knowledge planted. On to the next card!");
      } else {
        round.queue.push(id);
        event(
          "hint",
          "Saved for another look. This card returns later in your stack.",
        );
      }
      round.revealed = false;
      round.hintFor = "";
      break;
    }
    case "Hint": {
      requireThat(
        round &&
          round.items.includes(command.target) &&
          !round.solved.includes(command.target) &&
          (round.kind !== "cards" || round.queue[0] === command.target),
        "Choose an unfinished term for your hint.",
      );
      if (round.hintFor !== command.target) round.hints++;
      round.hintFor = command.target;
      event(
        "hint",
        "A little nudge is ready. Hints are here to help you learn.",
      );
      break;
    }
    case "ReadPlanet":
    case "HintPlanet":
    case "AnswerPlanet": {
      const planet = explorerPlanets.find((p) => p.id === command.planet);
      requireThat(planet, "Choose one of the eight planets.");
      if (command.type === "ReadPlanet") {
        if (!progress.visited.includes(planet.id))
          progress.visited.push(planet.id);
      } else if (command.type === "HintPlanet") {
        if (!progress.planetHints.includes(planet.id))
          progress.planetHints.push(planet.id);
        event(
          "hint",
          "Look closely at the highlighted field notes, then try the planet check.",
        );
      } else {
        requireThat(
          progress.visited.includes(planet.id) &&
            Number.isInteger(command.answer) &&
            command.answer >= 0 &&
            command.answer < planet.options.length,
          "Read this planet's field notes and choose an answer.",
        );
        if (progress.stamped.includes(planet.id)) break;
        if (command.answer === planet.answer) {
          progress.stamped.push(planet.id);
          event("correct", planet.explanation);
          if (
            progress.stamped.length === 8 &&
            !progress.formats.includes("planets")
          ) {
            progress.formats.push("planets");
            if (!progress.topics.includes("earth"))
              progress.topics.push("earth");
            event(
              "complete",
              "Your Solar System passport has all eight stamps!",
            );
          }
        } else
          event(
            "wrong",
            "Take another look at the field notes, or use a hint. You can try again.",
          );
      }
      break;
    }
    case "Sound":
      requireThat(
        typeof command.enabled === "boolean",
        "Choose sound on or off.",
      );
      progress.sound = command.enabled;
      break;
  }
  if (
    round &&
    !round.completed &&
    (round.kind === "cards"
      ? round.known.length === round.items.length
      : round.solved.length === round.items.length)
  ) {
    round.completed = true;
    progress.completedRounds++;
    if (!progress.formats.includes(round.kind))
      progress.formats.push(round.kind);
    if (!progress.topics.includes(round.topic))
      progress.topics.push(round.topic);
    event("complete", "Discovery complete! Your passport has been updated.");
  }
  for (const badge of activityBadges)
    if (
      progress.badges[badge.id] === undefined &&
      badgeCount(progress, badge.id) >= badge.goal
    ) {
      progress.badges[badge.id] = now;
      events.push({
        type: "badge",
        message: `New badge: ${badge.name}!`,
        badge: badge.id,
      });
    }
  progress.rev++;
  return { patch: progress, inverse: previous, events };
}

export function validActivities(
  value: unknown,
  owner: string,
): value is ActivityProgress {
  if (!value || typeof value !== "object") return false;
  const p = value as ActivityProgress;
  const count = (n: unknown) =>
    typeof n === "number" &&
    Number.isSafeInteger(n) &&
    n >= 0 &&
    n <= 1000000000;
  const strings = (v: unknown, allowed: readonly string[]) =>
    Array.isArray(v) &&
    v.length <= allowed.length &&
    new Set(v).size === v.length &&
    v.every((s) => typeof s === "string" && allowed.includes(s));
  const planetIds = explorerPlanets.map((p) => p.id);
  if (
    p.version !== 1 ||
    p.owner !== owner ||
    !count(p.rev) ||
    !count(p.completedRounds) ||
    typeof p.sound !== "boolean" ||
    !strings(p.formats, [...kinds, "planets"]) ||
    !strings(p.topics, branches) ||
    !strings(p.visited, planetIds) ||
    !strings(p.stamped, p.visited) ||
    !strings(p.planetHints, planetIds) ||
    !p.badges ||
    typeof p.badges !== "object" ||
    Object.keys(p.badges).some(
      (id) =>
        !activityBadges.some((b) => b.id === id) ||
        !Number.isFinite(p.badges[id]) ||
        p.badges[id] < 0,
    ) ||
    !p.rounds ||
    typeof p.rounds !== "object" ||
    Object.keys(p.rounds).some((key) => !kinds.includes(key as ActivityKind))
  )
    return false;
  return Object.entries(p.rounds).every(([kind, r]) => {
    if (
      !r ||
      r.kind !== kind ||
      !activityTopic(r.topic) ||
      !/^[a-zA-Z0-9-]{8,80}$/.test(r.id) ||
      !Number.isInteger(r.seed) ||
      r.seed < 0 ||
      r.seed > 4294967295 ||
      !Array.isArray(r.items) ||
      r.items.length !== (kind === "cards" ? 8 : 6)
    )
      return false;
    const allowed = activityTopic(r.topic)!.terms.map((t) => t.id);
    if (
      !strings(r.items, allowed) ||
      !strings(r.solved, r.items) ||
      !strings(r.known, r.items) ||
      !strings(r.queue, r.items) ||
      !count(r.hints) ||
      !count(r.mistakes) ||
      typeof r.revealed !== "boolean" ||
      typeof r.completed !== "boolean" ||
      typeof r.hintFor !== "string" ||
      (r.hintFor !== "" && !r.items.includes(r.hintFor)) ||
      !r.paths ||
      typeof r.paths !== "object"
    )
      return false;
    if (
      kind === "words" &&
      (r.items.some(
        (id) => !/^[A-Z]{2,10}$/.test(puzzleWord(activityTerm(id)!.term)),
      ) ||
        Object.entries(r.paths).some(
          ([id, path]) =>
            !r.solved.includes(id) ||
            !Array.isArray(path) ||
            path.length > 10 ||
            !path.every((n) => Number.isInteger(n) && n >= 0 && n < 100),
        ))
    )
      return false;
    if (
      kind === "cards" &&
      (r.known.some((id) => r.queue.includes(id)) ||
        r.known.length + r.queue.length !== r.items.length)
    )
      return false;
    return (
      r.completed ===
      (kind === "cards"
        ? r.known.length === r.items.length
        : r.solved.length === r.items.length)
    );
  });
}
