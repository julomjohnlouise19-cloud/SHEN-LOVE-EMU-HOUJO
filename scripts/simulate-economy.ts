import { defaultRules, reward } from "../src/core/rules";
import { seededRng } from "../src/core/random";
import type { Difficulty } from "../src/core/types";
const ctx = {
  clock: { now: () => 0 },
  rng: seededRng(42),
  rules: defaultRules,
};
console.log("Cozy Science Lab · deterministic 30-day merit simulation");
console.log(
  "Daily play includes reviews under one cap. Spin / quests / challenge are each one-time rewards.",
);
for (const [name, runs, accuracy, level] of [
  ["Gentle explorer", 2, 0.6, "medium"],
  ["Steady scientist", 4, 0.8, "hard"],
  ["Repeated-play attempt", 100, 1, "hard"],
] as const) {
  let total = defaultRules.starterMerits,
    min = Infinity,
    max = 0;
  for (let day = 0; day < 30; day++) {
    let merits = 0,
      correct = 0;
    for (let i = 0; i < runs * 8; i++) {
      const yes = ctx.rng.next() < accuracy;
      if (yes) correct++;
      const r = reward(
        yes,
        level as Difficulty,
        yes ? (i % 8) + 1 : 0,
        merits,
        ctx,
      );
      merits += r.merits;
    }
    if (merits > defaultRules.dailyCap)
      throw new Error("Daily cap was exceeded.");
    const quests =
      (runs * 8 >= 8 ? defaultRules.questReward : 0) +
      (correct >= 5 ? defaultRules.questReward : 0);
    const daily =
      merits +
      Math.floor(ctx.rng.next() * (defaultRules.spinMax + 1)) +
      quests +
      defaultRules.dailyReward;
    total += daily;
    min = Math.min(min, daily);
    max = Math.max(max, daily);
  }
  console.log(
    `${name}: ${total} merits after 30 days; daily range ${min}–${max}; play cap ${defaultRules.dailyCap}.`,
  );
}
console.log(
  "Supply targets: pencils 35, notebook 65, goggles 150. Repeated play cannot bypass the play-merit cap.",
);
