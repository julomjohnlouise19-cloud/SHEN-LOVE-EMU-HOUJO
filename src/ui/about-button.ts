import { h, button } from "./dom";
import { icon } from "./svg";

export function aboutUsButton(className = "", beforeOpen = () => {}) {
  const trigger = button(
    h("span", null, icon("sparkles", 16), "About us"),
    async () => {
      beforeOpen();
      (await import("./about")).aboutUsModal(trigger);
    },
    `about-us-button ${className}`,
    { "aria-haspopup": "dialog" },
  );
  return trigger;
}
