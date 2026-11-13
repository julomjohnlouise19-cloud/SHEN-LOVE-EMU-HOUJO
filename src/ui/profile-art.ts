import { borderById } from "../data/profile-borders";
import { h } from "./dom";

// The portrait keeps its full box. A separate, masked artwork ring extends
// outside it; opaque source interiors never cover or shrink the face.
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
  const [cx, cy] = border.face;
  const [left, top, side] = border.crop;
  const centeredLeft = left + ((cx - 50) / 100) * side;
  const centeredTop = top + ((cy - 50) / 100) * side;
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
          left: `${(-centeredLeft / side) * 100}%`,
          top: `${(-centeredTop / side) * 100}%`,
          width: `${(border.width / side) * 100}%`,
          height: `${(border.height / side) * 100}%`,
        },
      }),
    ),
    h(
      "span",
      {
        class: "profile-frame-face",
      },
      picture,
    ),
  );
}
