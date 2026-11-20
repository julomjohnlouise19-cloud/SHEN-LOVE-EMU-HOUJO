import { expect, it } from "vitest";
import { soundCues, isSoundVolume } from "../src/core/sound-cues";

it("keeps distinct brief sound signatures and bounded saved volume", () => {
  expect(
    new Set(
      soundCues.map(
        (cue) => `${cue.wave}:${cue.notes}:${cue.step}:${cue.duration}`,
      ),
    ).size,
  ).toBe(7);
  for (const cue of soundCues) {
    expect((cue.notes.length - 1) * cue.step + cue.duration).toBeLessThan(1);
    expect(cue.notes.every((value) => value >= 250 && value <= 1500)).toBe(
      true,
    );
  }
  for (const value of [10, 30, 60, 100])
    expect(isSoundVolume(value)).toBe(true);
  for (const value of [0, -1, 101, NaN, 59.5, "60", null])
    expect(isSoundVolume(value)).toBe(false);
});
