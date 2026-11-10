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
          "Guest practice stays on this device. Sign in to save completed quiz records to the cloud.",
      ),
    ];
  return [
    h(
      "span",
      null,
      message
        ? message
        : syncing
          ? "Uploading quiz records…"
          : pending
            ? `${pending} quiz record${pending === 1 ? "" : "s"} waiting on this device.`
            : "Completed quiz records are uploaded.",
      message ? "" : " Merits, notebook and supplies remain local demos.",
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
