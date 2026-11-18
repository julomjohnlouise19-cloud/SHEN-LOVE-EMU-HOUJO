import { button, h } from "./dom";

export function siteHelpButton() {
  const trigger = button(
    h("span", { "aria-hidden": true }, "?"),
    async () => (await import("./site-help")).siteHelpModal(trigger),
    "icon-button site-help-button",
    {
      "aria-label": "About The Cozy Science Lab",
      "aria-haspopup": "dialog",
      title: "What is The Cozy Science Lab?",
    },
  );
  return trigger;
}
