import { bannerUrl, getProfileDesign } from "../store/profile-design";
import { h } from "./dom";

export function mountProfileBanner(host: HTMLElement, id: string) {
  host.dataset.profileBannerOwner = id;
  const cover =
    host.querySelector<HTMLElement>(":scope > .profile-cover") ?? host;
  cover.prepend(
    h("div", { class: "profile-banner-layer", "aria-hidden": true }),
  );
  draw(host);
}
export function withProfileBanner<T extends HTMLElement>(
  host: T,
  id: string,
): T {
  mountProfileBanner(host, id);
  return host;
}
function draw(host: HTMLElement) {
  const id = host.dataset.profileBannerOwner!;
  const url = bannerUrl(id),
    design = getProfileDesign(id);
  host.classList.toggle("has-custom-banner", !!url);
  const layer = host.querySelector<HTMLElement>(".profile-banner-layer");
  layer?.replaceChildren(
    ...(url
      ? [
          h("img", {
            src: url,
            alt: "",
            class: "profile-cover-image",
            style: { objectPosition: `${design.x}% ${design.y}%` },
            onError: () => {
              host.classList.remove("has-custom-banner");
              layer?.replaceChildren();
            },
          }),
        ]
      : []),
  );
}
window.addEventListener("csl:profile-design", () =>
  document
    .querySelectorAll<HTMLElement>("[data-profile-banner-owner]")
    .forEach(draw),
);
