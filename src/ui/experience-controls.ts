import { currentUser } from "../store";
import {
  getMotionStyle,
  soundEnabled,
  saveSound,
  saveMotion,
  loadExperience,
  reducedMotion,
  type MotionStyle,
  soundVolume,
  saveSoundVolume,
} from "../store/experience";
import { soundCues, type SoundCue } from "../core/sound-cues";
import {
  activitySound,
  activitySoundAvailable,
  stopActivitySound,
} from "./activity-audio";
import { h, button, field } from "./dom";
import { icon } from "./svg";

const mounted = new Set<{
  node: HTMLElement;
  owner: string;
  reflect: () => void;
}>();
function watch(node: HTMLElement, owner: string, reflect: () => void) {
  for (const item of mounted) if (!item.node.isConnected) mounted.delete(item);
  requestAnimationFrame(() => {
    if (node.isConnected && currentUser()?.id === owner)
      mounted.add({ node, owner, reflect });
  });
}
window.addEventListener("csl:experience", () => {
  const owner = currentUser()?.id;
  if (!owner || !soundEnabled(owner)) stopActivitySound();
  if (reducedMotion())
    document
      .querySelectorAll(".growth-confetti")
      .forEach((node) => node.remove());
  for (const item of mounted) {
    if (!item.node.isConnected) mounted.delete(item);
    else if (item.owner === owner) item.reflect();
  }
});

export function soundButton() {
  const owner = currentUser()!.id;
  let ready = false;
  const toggle = button(
    "Sound off",
    async () => {
      const enabled = !soundEnabled(owner);
      await saveSound(owner, enabled);
      if (currentUser()?.id !== owner) return;
      reflect();
      if (enabled) void activitySound("flip");
    },
    "button outline learning-sound-toggle",
    { disabled: true },
  );
  function reflect() {
    toggle.replaceChildren(
      icon(soundEnabled(owner) ? "volume" : "muted", 17),
      document.createTextNode(soundEnabled(owner) ? "Sound on" : "Sound off"),
    );
    toggle.setAttribute("aria-pressed", String(soundEnabled(owner)));
    toggle.setAttribute(
      "aria-label",
      soundEnabled(owner) ? "Mute learning sounds" : "Turn on learning sounds",
    );
    toggle.disabled = !ready || !activitySoundAvailable();
  }
  watch(toggle, owner, reflect);
  reflect();
  void loadExperience(owner)
    .then(() => {
      ready = true;
      reflect();
    })
    .catch(() => {
      toggle.disabled = true;
    });
  return toggle;
}

export function experienceControls(owner: string) {
  const error = h("p", { class: "form-error", role: "alert", hidden: true });
  const select = h(
    "select",
    { "aria-label": "Animation style", disabled: true },
    h("option", { value: "system" }, "Follow my device"),
    h("option", { value: "reduce" }, "Keep it calm · reduced motion"),
  );
  const sound = soundButton();
  const cue = h(
    "select",
    { "aria-label": "Sound to preview" },
    ...soundCues.map((value) => h("option", { value: value.id }, value.name)),
  );
  const volume = h("input", {
    type: "range",
    min: 10,
    max: 100,
    step: 10,
    value: soundVolume(owner),
    "aria-label": "Sound volume",
    disabled: true,
  });
  const volumeValue = h(
    "output",
    { class: "sound-volume-value" },
    soundVolume(owner) + "%",
  );
  volume.addEventListener("input", () => {
    volumeValue.textContent = volume.value + "%";
    volume.setAttribute("aria-valuetext", volume.value + " percent");
  });
  volume.addEventListener("change", async () => {
    volume.disabled = true;
    error.hidden = true;
    try {
      await saveSoundVolume(owner, Number(volume.value));
    } catch (value) {
      error.textContent =
        value instanceof Error
          ? value.message
          : "Your volume could not be saved.";
      error.hidden = false;
    } finally {
      volume.disabled = !activitySoundAvailable();
      reflect();
    }
  });
  const preview = button(
    "Preview selected sound",
    () => {
      if (currentUser()?.id === owner && soundEnabled(owner))
        return activitySound(cue.value as SoundCue);
    },
    "button outline sound-preview-button",
    { disabled: true },
  );
  const root = h(
    "section",
    {
      class: "experience-controls",
      "aria-label": "Sound and animation preferences",
    },
    h(
      "div",
      { class: "experience-sound-row" },
      h(
        "div",
        null,
        h("strong", null, "Little sounds, your choice"),
        h(
          "p",
          null,
          "Different little sounds for answers, hints and celebrations. Turn them on, choose your volume, and try a preview.",
        ),
      ),
      sound,
    ),
    h(
      "div",
      { class: "sound-preview-controls" },
      field("Sound to preview", cue),
      preview,
    ),
    h(
      "div",
      { class: "sound-volume-control" },
      field("Sound volume", volume),
      volumeValue,
    ),
    field(
      "Animation style",
      select,
      "Your device’s reduced-motion preference is always respected.",
    ),
    error,
  );
  select.addEventListener("change", async () => {
    select.disabled = true;
    error.hidden = true;
    try {
      await saveMotion(owner, select.value as MotionStyle);
    } catch (failure) {
      error.textContent =
        failure instanceof Error
          ? failure.message
          : "Your animation choice could not be saved.";
      error.hidden = false;
    } finally {
      select.disabled = false;
      select.value = getMotionStyle(owner);
    }
  });
  const reflect = () => {
    select.value = getMotionStyle(owner);
    preview.disabled = !soundEnabled(owner) || !activitySoundAvailable();
    volume.value = String(soundVolume(owner));
    volume.setAttribute("aria-valuetext", volume.value + " percent");
    volumeValue.textContent = volume.value + "%";
  };
  watch(root, owner, reflect);
  reflect();
  void loadExperience(owner)
    .then(() => {
      select.disabled = false;
      volume.disabled = !activitySoundAvailable();
      reflect();
    })
    .catch(() => {
      select.disabled = false;
    });
  return root;
}

export function celebrateLevelUp() {
  if (reducedMotion() || document.hidden) return;
  const confetti = h(
    "div",
    { class: "growth-confetti", "aria-hidden": true },
    ...Array.from({ length: 18 }, (_, index) =>
      h("span", {
        style: {
          "--confetti-x": `${(index * 37) % 100}vw`,
          "--confetti-drift": `${((index % 5) - 2) * 28}px`,
          "--confetti-delay": `${(index % 6) * 35}ms`,
          "--confetti-color": [
            "var(--lab-brand)",
            "var(--lab-lilac)",
            "var(--lab-peach)",
            "var(--lab-blue)",
          ][index % 4],
        },
      }),
    ),
  );
  document.body.append(confetti);
  setTimeout(() => confetti.remove(), 1700);
}
