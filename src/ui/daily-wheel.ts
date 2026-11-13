import { h } from "./dom";
import { icon } from "./svg";

// Decorative sectors keep the existing six science discoveries and landing math.
export function dailyWheel(
  spinning: boolean,
  collected: boolean,
  selected: number,
) {
  const labels = ["Leaf", "Orbit", "Wave", "Atom", "Life", "Earth"];
  const icons = ["sprout", "planet", "star", "atom", "heart", "planet"];
  return h(
    "div",
    { class: "carnival-wheel-stand", "aria-hidden": true },
    h(
      "div",
      { class: "carnival-wheel-stage" },
      h(
        "div",
        { class: "wheel-rim" },
        ...Array.from({ length: 16 }, (_, i) => {
          const angle = (i * Math.PI) / 8;
          return h("span", {
            class: "wheel-bulb",
            style: {
              left: `${50 + Math.sin(angle) * 48}%`,
              top: `${50 - Math.cos(angle) * 48}%`,
            },
          });
        }),
      ),
      h(
        "div",
        {
          class: `science-wheel ${spinning ? "spinning" : ""}`,
          "data-discovery-slot": collected ? selected : undefined,
          style: {
            "--wheel-landing": `${1440 - (selected * 60 + 30)}deg`,
            transform:
              collected && !spinning
                ? `rotate(${360 - (selected * 60 + 30)}deg)`
                : undefined,
          },
        },
        ...labels.map((label, i) => {
          const degrees = i * 60 + 30,
            angle = (degrees * Math.PI) / 180;
          return h(
            "span",
            {
              class: `wheel-label wheel-label-${i}`,
              style: {
                left: `${50 + Math.sin(angle) * 33}%`,
                top: `${50 - Math.cos(angle) * 33}%`,
                transform: `translate(-50%, -50%) rotate(${degrees}deg)`,
              },
            },
            icon(icons[i], 22),
            h("strong", null, label),
          );
        }),
      ),
      h("span", { class: "wheel-pointer" }),
      h(
        "div",
        { class: "wheel-center" },
        h(
          "span",
          { class: "wheel-center-ring" },
          h("span", { class: "wheel-center-dot" }),
        ),
      ),
    ),
    h(
      "div",
      { class: "wheel-pedestal" },
      h("span", { class: "wheel-pedestal-foot" }),
    ),
  );
}
