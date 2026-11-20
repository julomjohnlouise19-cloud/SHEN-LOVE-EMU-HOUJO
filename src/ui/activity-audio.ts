import { soundCues, type SoundCue } from "../core/sound-cues";
import { currentUser } from "../store";
import { soundEnabled, soundVolume } from "../store/experience";

let context: AudioContext | undefined,
  sequence = 0,
  audioOwner = "";
const voices = new Set<OscillatorNode>();
export const activitySoundAvailable = () => typeof AudioContext !== "undefined";
function stopVoices() {
  for (const voice of voices) {
    try {
      voice.stop();
    } catch {
      /* Already ended. */
    }
  }
  voices.clear();
}
export async function activitySound(kind: SoundCue) {
  const owner = currentUser()?.id;
  if (
    !owner ||
    !soundEnabled(owner) ||
    !activitySoundAvailable() ||
    document.hidden
  )
    return;
  const ticket = ++sequence;
  stopVoices();
  try {
    const audio = (context ??= new AudioContext());
    audioOwner = owner;
    await audio.resume();
    if (
      context !== audio ||
      ticket !== sequence ||
      document.hidden ||
      currentUser()?.id !== owner ||
      !soundEnabled(owner)
    )
      return;
    const cue = soundCues.find((value) => value.id === kind)!;
    for (const [i, frequency] of cue.notes.entries()) {
      const oscillator = audio.createOscillator(),
        gain = audio.createGain();
      const start = audio.currentTime + i * cue.step,
        end = start + cue.duration;
      oscillator.type = cue.wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        (0.12 * soundVolume(owner)) / 100,
        start + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, end);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      voices.add(oscillator);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
      oscillator.onended = () => {
        voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  } catch {
    /* Text feedback remains available when browser audio is unavailable. */
  }
}
export function stopActivitySound() {
  sequence++;
  stopVoices();
  const audio = context;
  context = undefined;
  audioOwner = "";
  if (audio && audio.state !== "closed")
    void audio.close().catch(() => undefined);
}
window.addEventListener("hashchange", stopActivitySound);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopActivitySound();
});
window.addEventListener("csl:experience", () => {
  const owner = currentUser()?.id;
  if (!owner || owner !== audioOwner || !soundEnabled(owner))
    stopActivitySound();
});
window.addEventListener("csl:platform", () => {
  if (currentUser()?.id !== audioOwner) stopActivitySound();
});
