import { soundCues, type SoundCue } from "../core/sound-cues";
import { currentUser } from "../store";
import { soundEnabled, soundVolume } from "../store/experience";

let context: AudioContext | undefined,
  sequence = 0,
  audioOwner = "";
const voices = new Map<OscillatorNode, GainNode>();
export const activitySoundAvailable = () => typeof AudioContext !== "undefined";
function stopVoices() {
  for (const [voice, gain] of voices) {
    try {
      const now = gain.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.004);
      voice.stop(now + 0.02);
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
      const peak = (cue.gain * soundVolume(owner)) / 100;
      gain.gain.linearRampToValueAtTime(peak, start + 0.012);
      gain.gain.linearRampToValueAtTime(peak * 0.72, start + 0.035);
      gain.gain.setValueAtTime(peak * 0.72, end - 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, end);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      voices.set(oscillator, gain);
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
