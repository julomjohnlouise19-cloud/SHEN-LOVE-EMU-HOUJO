let context: AudioContext | undefined;
export const activitySoundAvailable = () => typeof AudioContext !== "undefined";
export async function activitySound(
  kind: "correct" | "wrong" | "hint" | "complete" | "flip",
) {
  if (!activitySoundAvailable() || document.hidden) return;
  try {
    const audio = (context ??= new AudioContext());
    await audio.resume();
    if (context !== audio || document.hidden) return;
    const notes =
      kind === "complete"
        ? [523.25, 659.25, 783.99]
        : kind === "correct"
          ? [523.25, 659.25]
          : kind === "wrong"
            ? [220, 196]
            : kind === "flip"
              ? [440]
              : [392, 523.25];
    for (const [i, frequency] of notes.entries()) {
      const oscillator = audio.createOscillator(),
        gain = audio.createGain();
      const start = audio.currentTime + i * 0.09;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.028, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  } catch {
    /* Text feedback remains available when browser audio is unavailable. */
  }
}
export function stopActivitySound() {
  const audio = context;
  context = undefined;
  if (audio && audio.state !== "closed")
    void audio.close().catch(() => undefined);
}
window.addEventListener("hashchange", stopActivitySound);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopActivitySound();
});
