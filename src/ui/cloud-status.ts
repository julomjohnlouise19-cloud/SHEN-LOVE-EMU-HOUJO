import { currentUser } from "../store";
import { cloudEnabled, cloudStatus, flushCloud } from "../store/cloud";
import { button, h } from "./dom";

function contents() {
  const user = currentUser();
  const { pending, syncing, message } = cloudStatus();
  if (!user || user.id === "guest")
    return [
      h(
        "span",
        null,
        message ||
          "Guest practice stays on this device. Sign in to save completed discoveries.",
      ),
    ];
  return [
    h(
      "span",
      null,
      message
        ? message
        : syncing
          ? "Saving your discoveries…"
          : pending
            ? `${pending} quiz record${pending === 1 ? "" : "s"} waiting on this device.`
            : "Your completed discoveries are saved.",
      message ? "" : " Your notebook pages stay on this device.",
    ),
    pending || message
      ? button("Retry upload", flushCloud, "text-button", { disabled: syncing })
      : null,
  ];
}
export function cloudNotice() {
  if (!cloudEnabled) return null;
  return h(
    "div",
    {
      class: "cloud-notice",
      "data-cloud-notice": true,
      role: "status",
      "aria-live": "polite",
    },
    ...contents(),
  );
}
export function updateCloudNotices() {
  document
    .querySelectorAll<HTMLElement>("[data-cloud-notice]")
    .forEach((node) => {
      node.replaceChildren(
        ...contents().filter((c): c is HTMLElement => c !== null),
      );
    });
}
