import { h } from "./dom";

export function connectionNotice() {
  return h(
    "div",
    {
      class: "connection-notice",
      "data-connection-notice": true,
      role: "status",
      hidden: navigator.onLine,
    },
    h("span", { class: "connection-dot", "aria-hidden": true }),
    h(
      "span",
      null,
      h("strong", null, "Offline mode. "),
      "Keep exploring your saved content. Your progress stays in this browser.",
    ),
  );
}

export function updateConnectionNotices() {
  document
    .querySelectorAll<HTMLElement>("[data-connection-notice]")
    .forEach((notice) => {
      notice.hidden = navigator.onLine;
    });
}
