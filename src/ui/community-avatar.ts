import { sharedPhoto } from "../store/community";
import { h } from "./dom";
import { mascot } from "./svg";
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
  node.replaceChildren(
    url
      ? h("img", {
          src: url,
          alt: `${node.dataset.communityName} shared profile photo`,
          width: 80,
          height: 80,
          onError: () => node.replaceChildren(mascot("cat")),
        })
      : mascot("cat"),
  );
}
window.addEventListener("csl:community-photo", () =>
  document
    .querySelectorAll<HTMLElement>("[data-community-avatar]")
    .forEach(draw),
);
