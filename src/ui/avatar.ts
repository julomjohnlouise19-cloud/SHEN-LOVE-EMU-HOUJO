import { photoUrl } from "../store/photos";
import { h } from "./dom";
import { mascot } from "./svg";
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
  node.replaceChildren(
    url
      ? h("img", {
          src: url,
          alt: `${node.dataset.avatarName || "Scientist"} profile photo`,
          width: 64,
          height: 64,
          onError: () =>
            node.replaceChildren(mascot(node.dataset.avatarPreset || "cat")),
        })
      : mascot(node.dataset.avatarPreset || "cat"),
  );
}
window.addEventListener("csl:photo", () =>
  document.querySelectorAll<HTMLElement>("[data-avatar-user]").forEach(update),
);
