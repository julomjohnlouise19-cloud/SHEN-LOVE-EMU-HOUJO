import { currentUser } from "../store";
import {
  getColorMode,
  loadColorMode,
  saveColorMode,
} from "../store/color-mode";
import { h } from "./dom";
import { icon } from "./svg";

export function displayModeControl(id: string) {
  const toggle = h("input", {
    type: "checkbox",
    role: "switch",
    "aria-label": "Dark mode",
    checked: getColorMode(id) === "dark",
  });
  const status = h("p", { class: "display-mode-status", role: "status" });
  const panel = h(
    "section",
    { class: "display-mode-panel", "aria-label": "Display mode" },
    h(
      "div",
      { class: "display-mode-copy" },
      h("h4", null, icon("moonlight", 20), "Cozy after dark"),
      h(
        "p",
        null,
        "Use Dark mode across the whole website, or keep the light pastel look.",
      ),
      h(
        "p",
        { class: "fine-print" },
        "Saved for this account on this device. You can change it anytime.",
      ),
    ),
    h(
      "label",
      { class: "dark-mode-switch" },
      toggle,
      h("span", { class: "mode-switch-track", "aria-hidden": true }, h("span")),
      h("strong", null, "Dark mode"),
    ),
    status,
  );
  const paint = () => {
    if (currentUser()?.id === id && !toggle.disabled)
      toggle.checked = getColorMode(id) === "dark";
  };
  toggle.addEventListener("change", async () => {
    const wanted = toggle.checked ? "dark" : "light";
    toggle.disabled = true;
    status.textContent = "";
    try {
      await saveColorMode(id, wanted);
      if (currentUser()?.id === id)
        status.textContent =
          wanted === "dark" ? "Dark mode is on." : "Light mode is on.";
    } catch (error) {
      if (currentUser()?.id === id)
        status.textContent =
          error instanceof Error
            ? error.message
            : "The display setting could not be saved.";
    } finally {
      toggle.disabled = false;
      paint();
    }
  });
  window.addEventListener("csl:color-mode", paint);
  queueMicrotask(() => {
    const dialog = panel.closest("dialog");
    dialog?.addEventListener(
      "close",
      () => window.removeEventListener("csl:color-mode", paint),
      { once: true },
    );
  });
  void loadColorMode(id)
    .then(paint)
    .catch(() => {
      status.textContent = "Choose a mode to save your display preference.";
    });
  return panel;
}
