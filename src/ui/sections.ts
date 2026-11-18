import { schoolSections } from "../data/sections";
import { h } from "./dom";

export function sectionSelect(current = "") {
  const choices: readonly string[] = schoolSections;
  const values =
    current && !choices.includes(current) ? [current, ...choices] : choices;
  return h(
    "select",
    { name: "section" },
    h("option", { value: "", selected: current === "" }, "Choose your section"),
    ...values.map((value) =>
      h("option", { value, selected: value === current }, value),
    ),
  );
}
