import type { Question } from "../core/types";
import { cellsReasoning } from "../core/learning-support";
import { h, button, responsiveTable } from "./dom";
import { diagram } from "./svg";

export function reasoningCheck(question: Question) {
  const check = cellsReasoning(question);
  if (!check) return null;
  const feedback = h("p", {
    class: "reasoning-answer",
    role: "status",
    hidden: true,
  });
  const choices = h(
    "div",
    { class: "reasoning-options" },
    ...check.options.map((option, index) =>
      button(
        option,
        () => {
          feedback.hidden = false;
          feedback.textContent = `${index === check.answer ? "That reasoning fits the evidence. " : `You chose “${option}”. Let's compare it with the evidence. `}${check.explanation}`;
        },
        "button outline",
      ),
    ),
  );
  return h(
    "section",
    { class: "reasoning-check", "aria-label": "Cells reasoning practice" },
    h(
      "p",
      { class: "eyebrow" },
      question.level === "hard" ? "ANALYSE THE EVIDENCE" : "APPLY THE IDEA",
    ),
    h("h3", null, check.title),
    h("p", null, check.prompt),
    check.diagram
      ? h(
          "div",
          {
            class: "reasoning-diagram",
            "aria-label": "Simplified learning illustration, not to scale",
          },
          diagram(check.diagram),
        )
      : null,
    check.data
      ? responsiveTable(
          h(
            "div",
            { class: "table-scroll" },
            h(
              "table",
              { class: "reasoning-data" },
              h("caption", null, "Constructed classroom-model data"),
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  ...check.data.headers.map((header) =>
                    h("th", { scope: "col" }, header),
                  ),
                ),
              ),
              h(
                "tbody",
                null,
                ...check.data.rows.map((row) =>
                  h("tr", null, ...row.map((cell) => h("td", null, cell))),
                ),
              ),
            ),
          ),
        )
      : null,
    choices,
    feedback,
    h(
      "p",
      { class: "fine-print" },
      "Extra reasoning practice · not scored. Your main quiz answer remains in your saved record.",
    ),
  );
}
