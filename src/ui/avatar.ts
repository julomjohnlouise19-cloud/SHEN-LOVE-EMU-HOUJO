import { photoUrl } from "../store/photos";
import { h } from "./dom";
import { mascot } from "./svg";
import { getProfileDesign } from "../store/profile-design";
import { paintProfileAvatar } from "./profile-art";
export function avatar(id: string, name: string, preset = "cat") {
  const node = h("span", {
    class: "scientist-avatar",
    "data-avatar-user": id,
    "data-avatar-name": name,
    "data-avatar-preset": preset,
  });
  update(node);
  return node;
}
function update(node: HTMLElement) {
  const url = photoUrl(node.dataset.avatarUser || "");
  paintProfileAvatar(
    node,
    url
      ? h("img", {
          src: url,
          alt: `${node.dataset.avatarName || "Scientist"} profile photo`,
          width: 64,
          height: 64,
          onError: (event: Event) =>
            (event.target as HTMLImageElement).replaceWith(
              mascot(node.dataset.avatarPreset || "cat"),
            ),
        })
      : mascot(node.dataset.avatarPreset || "cat"),
    getProfileDesign(node.dataset.avatarUser || "").border,
  );
}
window.addEventListener("csl:photo", () =>
  document.querySelectorAll<HTMLElement>("[data-avatar-user]").forEach(update),
);
window.addEventListener("csl:profile-design", () =>
  document.querySelectorAll<HTMLElement>("[data-avatar-user]").forEach(update),
);
