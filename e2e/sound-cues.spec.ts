import { test, expect, exploreAsGuest } from "./fixtures";
import { soundCues } from "../src/core/sound-cues";

test("seven cue previews are distinct, clearer volume saves and mute stops audio", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const stats = window as unknown as {
      cueNotes: number[];
      cuePeaks: number[];
      audioClosed: number;
    };
    stats.cueNotes = [];
    stats.cuePeaks = [];
    stats.audioClosed = 0;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      createOscillator() {
        const node = super.createOscillator(),
          start = node.start.bind(node),
          schedule = node.frequency.setValueAtTime.bind(node.frequency);
        let frequency = node.frequency.value;
        node.frequency.setValueAtTime = (value, when) => {
          frequency = value;
          return schedule(value, when);
        };
        node.start = (when = 0) => {
          stats.cueNotes.push(frequency);
          start(when);
        };
        return node;
      }
      createGain() {
        const gain = super.createGain(),
          ramp = gain.gain.linearRampToValueAtTime.bind(gain.gain);
        gain.gain.linearRampToValueAtTime = (value, time) => {
          stats.cuePeaks.push(value);
          return ramp(value, time);
        };
        return gain;
      }
      close() {
        stats.audioClosed++;
        return super.close();
      }
    };
  });
  await exploreAsGuest(page);
  async function profile() {
    await page
      .getByRole("button", { name: "Open scientist profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
  }
  await profile();
  const preview = page.getByRole("button", {
    name: "Preview selected sound",
    exact: true,
  });
  await expect(preview).toBeDisabled();
  await page
    .getByRole("button", { name: "Turn on learning sounds", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { cueNotes: number[] }).cueNotes,
      ),
    )
    .toEqual([740]);
  const signatures: string[] = [];
  for (const cue of soundCues) {
    await page
      .getByRole("combobox", { name: "Sound to preview", exact: true })
      .selectOption(cue.id);
    await page.evaluate(() => {
      (window as unknown as { cueNotes: number[] }).cueNotes = [];
    });
    await preview.click();
    await expect(preview).toBeEnabled();
    const notes = await page.evaluate(
      () => (window as unknown as { cueNotes: number[] }).cueNotes,
    );
    expect(notes).toHaveLength(cue.notes.length);
    signatures.push(notes.join(","));
  }
  expect(new Set(signatures).size).toBe(7);
  const volume = page.getByRole("slider", {
    name: "Sound volume",
    exact: true,
  });
  await volume.focus();
  await volume.press("End");
  await expect(volume).toHaveValue("100");
  await expect(volume).toBeEnabled();
  await page.evaluate(() => {
    (window as unknown as { cuePeaks: number[] }).cuePeaks = [];
  });
  await preview.click();
  await expect(preview).toBeEnabled();
  expect(
    await page.evaluate(() =>
      Math.max(...(window as unknown as { cuePeaks: number[] }).cuePeaks),
    ),
  ).toBeCloseTo(0.12);
  await page
    .getByRole("button", { name: "Mute learning sounds", exact: true })
    .click();
  await expect(preview).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { audioClosed: number }).audioClosed,
    ),
  ).toBeGreaterThan(0);
  await page.reload();
  await profile();
  await expect(volume).toHaveValue("100");
  await expect(preview).toBeDisabled();
});
