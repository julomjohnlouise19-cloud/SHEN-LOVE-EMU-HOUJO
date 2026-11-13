import { sharedPhoto } from "../store/community";
import { h } from "./dom";
import { mascot } from "./svg";
import { getProfileDesign } from "../store/profile-design";
import { paintProfileAvatar } from "./profile-art";
export function communityAvatar(id: string, name: string) {
  const node = h("span", {
    class: "community-avatar",
    "data-community-avatar": id,
    "data-community-name": name,
  });
  draw(node);
  return node;
}
function draw(node: HTMLElement) {
  const url = sharedPhoto(node.dataset.communityAvatar ?? "");
  paintProfileAvatar(
    node,
    url
      ? h("img", {
          src: url,
          alt: `${node.dataset.communityName} shared profile photo`,
          width: 80,
          height: 80,
          onError: (event: Event) =>
            (event.target as HTMLImageElement).replaceWith(mascot("cat")),
        })
      : mascot("cat"),
    getProfileDesign(node.dataset.communityAvatar ?? "").border,
  );
}
window.addEventListener("csl:community-photo", () =>
  document
    .querySelectorAll<HTMLElement>("[data-community-avatar]")
    .forEach(draw),
);
window.addEventListener("csl:profile-design", () =>
  document
    .querySelectorAll<HTMLElement>("[data-community-avatar]")
    .forEach(draw),
);
