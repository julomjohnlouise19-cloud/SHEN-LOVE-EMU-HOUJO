import { h } from "./dom";

// Twelve coordinated science stickers share one transparent, offline-cached image.
// Each CSS viewport shows one complete cell; the generated source is left intact.
export function diarySticker(index: number, className = "") {
  const cell = Number.isInteger(index) && index >= 0 && index < 12 ? index : 0;
  return h(
    "span",
    { class: "science-diary-sticker " + className, "aria-hidden": true },
    h("img", {
      src: import.meta.env.BASE_URL + "diary-buddies/science-diary.webp",
      alt: "",
      width: 1448,
      height: 1086,
      loading: "lazy",
      decoding: "async",
      style: {
        left: -(cell % 4) * 100 + "%",
        top: -Math.floor(cell / 4) * 100 + "%",
      },
    }),
  );
}
