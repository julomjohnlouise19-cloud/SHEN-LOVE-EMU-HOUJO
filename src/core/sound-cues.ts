export const soundCues = [
  {
    id: "correct",
    name: "Correct answer · bright chime",
    notes: [659.25, 987.77],
    step: 0.11,
    duration: 0.21,
    wave: "triangle",
  },
  {
    id: "wrong",
    name: "Try again · gentle tap",
    notes: [349.23, 293.66],
    step: 0.13,
    duration: 0.16,
    wave: "sine",
  },
  {
    id: "hint",
    name: "Hint · a little glimmer",
    notes: [440, 659.25, 880],
    step: 0.12,
    duration: 0.22,
    wave: "sine",
  },
  {
    id: "flip",
    name: "Card flip · soft pop",
    notes: [740],
    step: 0.08,
    duration: 0.1,
    wave: "triangle",
  },
  {
    id: "complete",
    name: "Activity complete · happy finish",
    notes: [523.25, 659.25, 783.99, 1046.5],
    step: 0.13,
    duration: 0.23,
    wave: "triangle",
  },
  {
    id: "badge",
    name: "New badge · tiny sparkle",
    notes: [783.99, 987.77, 1174.66],
    step: 0.1,
    duration: 0.3,
    wave: "sine",
  },
  {
    id: "level",
    name: "Level up · growing fanfare",
    notes: [523.25, 659.25, 783.99, 987.77, 1046.5],
    step: 0.14,
    duration: 0.32,
    wave: "triangle",
  },
] as const;
export type SoundCue = (typeof soundCues)[number]["id"];
export const defaultSoundVolume = 60;
export const isSoundVolume = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 10 &&
  value <= 100;
