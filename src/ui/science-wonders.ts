import { hashSeed } from "../core/random";
import { learningToday } from "./learning-day";
import { h, button } from "./dom";
import { icon } from "./svg";

export function scienceWonderCard() {
  const facts = [
    "A single tree can be home to hundreds of living things. Small habitats make a big difference.",
    "Sunlight takes about eight minutes to reach Earth. The light you see has been on a little journey.",
    "The Philippines is part of the Coral Triangle, a region rich in marine life.",
    "The atoms in your body were formed in the early universe and in stars. You’re part of a big story.",
    "A plant’s new mass comes mostly from carbon dioxide and water, with light supplying the energy.",
    "Your heart and lungs work together to bring oxygen to your cells. Teamwork is science, too.",
  ];
  let index = hashSeed(learningToday()) % facts.length;
  const copy = h("p", { role: "status" }, facts[index]);
  const count = h(
    "small",
    { class: "wonder-count" },
    "IDEA " + (index + 1) + " OF " + facts.length,
  );
  return h(
    "section",
    { class: "daily-fact" },
    h("span", { class: "fact-icon" }, icon("sparkles", 23)),
    h("div", null, h("h2", null, "A pocketful of science"), copy, count),
    button(
      "Another little wonder",
      () => {
        index = (index + 1) % facts.length;
        copy.textContent = facts[index];
        count.textContent = "IDEA " + (index + 1) + " OF " + facts.length;
      },
      "button outline",
      { "aria-label": "Next science fact" },
    ),
  );
}
