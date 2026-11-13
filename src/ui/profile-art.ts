import { borderById } from "../data/profile-borders";
import { h } from "./dom";

// Keep the supplied artwork intact. The UI positions it as a round portrait
// sticker and places the photo in its aperture, including opaque source images.
export function paintProfileAvatar(
  node: HTMLElement,
  picture: Node,
  id: string,
) {
  const border = borderById(id);
  node.classList.toggle("framed-avatar", !!border);
  node.dataset.selectedBorder = border?.id ?? "";
  if (!border) {
    node.replaceChildren(picture);
    return;
  }
  const [cx, cy, size] = border.face;
  const [left, top, side] = border.crop;
  node.replaceChildren(
    h(
      "span",
      {
        class: "profile-frame-art",
        "aria-hidden": true,
        style: { background: border.background },
      },
      h("img", {
        src: `${import.meta.env.BASE_URL}profile-borders/${border.id}.jpg`,
        alt: "",
        class: "profile-frame-source",
        width: border.width,
        height: border.height,
        decoding: "async",
        loading: "lazy",
        style: {
          left: `${(-left / side) * 100}%`,
          top: `${(-top / side) * 100}%`,
          width: `${(border.width / side) * 100}%`,
          height: `${(border.height / side) * 100}%`,
        },
      }),
    ),
    h(
      "span",
      {
        class: "profile-frame-face",
        style: {
          left: `${cx - size / 2}%`,
          top: `${cy - size / 2}%`,
          width: `${size}%`,
          height: `${size}%`,
        },
      },
      picture,
    ),
  );
}
