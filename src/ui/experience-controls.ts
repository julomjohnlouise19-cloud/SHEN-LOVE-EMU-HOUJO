import { currentUser } from "../store";
import {
  getMotionStyle,
  soundEnabled,
  saveSound,
  saveMotion,
  loadExperience,
  reducedMotion,
  type MotionStyle,
} from "../store/experience";
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
          "Soft sounds for answers and activities. Start quiet; turn them on whenever you like.",
        ),
      ),
      sound,
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
  };
  watch(root, owner, reflect);
  reflect();
  void loadExperience(owner)
    .then(() => {
      select.disabled = false;
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
