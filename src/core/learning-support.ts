import type { Answer, Difficulty, Question, RNG } from "./types";
import { shuffle } from "./random";
import { studyGuides } from "../data/study-guides";

const cellRoles: [RegExp, string][] = [
  [
    /mitochondri/i,
    "Mitochondria release usable energy through cellular respiration. Chloroplasts capture light for photosynthesis; the two organelles have different jobs.",
  ],
  [
    /chloroplast/i,
    "Chloroplasts capture light energy for photosynthesis. They are different from mitochondria, which help release usable energy from food through cellular respiration.",
  ],
  [
    /nucleus/i,
    "The nucleus stores most of a plant or animal cell's DNA and helps control gene expression. It is not the cell's light-capturing or main aerobic energy-releasing structure.",
  ],
  [
    /cell wall/i,
    "A plant cell wall provides rigid support and helps resist overexpansion. The cell membrane still regulates the movement of substances into and out of the cell.",
  ],
  [
    /cell membrane|plasma membrane/i,
    "The cell membrane is selectively permeable: some substances cross more readily than others. It controls exchange rather than providing the rigid support of a cell wall.",
  ],
  [
    /ribosome/i,
    "Ribosomes join amino acids to build proteins. They do not store most of the cell's DNA or capture sunlight.",
  ],
  [
    /vacuole/i,
    "A plant cell's large central vacuole stores cell sap and helps maintain turgor pressure. It does not make proteins or capture light.",
  ],
  [
    /cytoplasm/i,
    "Cytoplasm contains the cell's fluid and many structures, and many chemical reactions occur there. It is not a separate light-capturing organelle.",
  ],
  [
    /osmosis/i,
    "Osmosis is the net movement of water across a selectively permeable membrane. Diffusion is the broader movement of particles down a concentration gradient.",
  ],
  [
    /diffusion/i,
    "Diffusion is the net movement of particles down a concentration gradient. When the question specifically describes water crossing a selectively permeable membrane, the more specific term is osmosis.",
  ],
  [
    /mitosis/i,
    "Mitosis separates copied chromosomes into two nuclei with the same chromosome number as the parent nucleus. DNA must be copied before the chromosomes separate.",
  ],
];
export function incorrectChoiceRationale(question: Question, answer: Answer) {
  if (
    typeof answer !== "string" ||
    typeof question.answer !== "string" ||
    answer === question.answer
  )
    return undefined;
  const option = question.options?.find((o) => o.id === answer);
  if (!option) return undefined;
  if (question.deckId === "life.cells") {
    const role = cellRoles.find(([pattern]) => pattern.test(option.text));
    if (role) return role[1];
  }
  const definition = studyGuides
    .find((g) => g.deckId === question.deckId)
    ?.terms.find(([term]) => term.toLowerCase() === option.text.toLowerCase());
  return definition
    ? `${definition[0]}: ${definition[1]} This describes the choice you selected; compare it with the evidence in the question.`
    : undefined;
}
export function sessionQuestions(
  pool: Question[],
  level: Difficulty,
  rng: RNG,
  limit = 8,
) {
  const mixed = shuffle(pool, rng);
  const quota = level === "hard" ? 4 : level === "medium" ? 2 : 0;
  const contextual = mixed
    .filter(
      (q) =>
        q.data ||
        ["data", "diagram", "calc", "order", "match"].includes(q.type),
    )
    .slice(0, quota);
  const ids = new Set(contextual.map((q) => q.id));
  const selected = [
    ...contextual,
    ...mixed
      .filter((q) => !ids.has(q.id))
      .slice(0, Math.max(0, limit - contextual.length)),
  ];
  return shuffle(selected, rng).slice(0, limit);
}
export interface ReasoningCheck {
  title: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  data?: { headers: string[]; rows: string[][] };
  diagram?: string;
}
export function questionDiagram(question: Question) {
  return question.deckId === "life.cells" &&
    question.diagram === "cell" &&
    /red blood/i.test(question.prompt) &&
    /nerve/i.test(question.prompt)
    ? "specializedCells"
    : question.diagram;
}
export function cellsReasoning(question: Question): ReasoningCheck | undefined {
  if (question.deckId !== "life.cells" || question.level === "easy")
    return undefined;
  const hard = question.level === "hard",
    index = Number(question.id.split(".").at(-1));
  if ([3, 4].includes(index))
    return hard
      ? {
          title: "Separate two energy processes",
          prompt:
            "A leaf chamber gains 6 mL of oxygen per minute in light and loses 2 mL per minute in darkness. Assume respiration uses oxygen at the same rate in both conditions. How much oxygen does photosynthesis produce per minute in the light?",
          data: {
            headers: ["Condition", "Net oxygen change"],
            rows: [
              ["Light", "+6 mL per minute"],
              ["Dark", "−2 mL per minute"],
            ],
          },
          options: ["6 mL per minute", "8 mL per minute", "2 mL per minute"],
          answer: 1,
          explanation:
            "The 6 mL is the net gain after respiration has used 2 mL. Gross photosynthetic production is 6 + 2 = 8 mL per minute under the stated assumption. Chloroplasts support photosynthesis; mitochondria support aerobic respiration.",
        }
      : {
          title: "Use the evidence, not just the name",
          prompt:
            "Two leaves from a destarched plant were kept under otherwise similar conditions. What conclusion is best supported by the starch tests?",
          data: {
            headers: ["Leaf condition", "Iodine starch test"],
            rows: [
              ["Exposed to light", "Blue-black: starch detected"],
              ["Covered from light", "Yellow-brown: starch not detected"],
            ],
          },
          options: [
            "Light supported starch production under these conditions",
            "Every form of respiration stops in darkness",
            "The cell wall captures the light",
          ],
          answer: 0,
          explanation:
            "The controlled comparison supports a role for light in photosynthetic starch production. It does not show that respiration stops in darkness. Mitochondria can release usable energy in both light and dark conditions when suitable resources are available.",
        };
  if ([2, 6, 9].includes(index))
    return {
      title: hard ? "Interpret the mass changes" : "Predict water movement",
      prompt: hard
        ? "Equal potato samples were placed in two solutions. Assume water crosses the cell membranes more readily than the dissolved substance. Which interpretation fits both mass changes?"
        : "A potato sample gains mass in water. Which explanation best connects the membrane to this change?",
      data: {
        headers: ["Sample", "Starting mass", "Final mass"],
        rows: [
          ["A: dilute solution", "10 g", "12 g"],
          ["B: concentrated solution", "10 g", "8 g"],
        ],
      },
      options: [
        "Water entered A and left B by osmosis",
        "The cell walls dissolved in both samples",
        "No particles moved in either sample",
      ],
      answer: 0,
      explanation:
        "A gained water while B lost water. Osmosis moves water across selectively permeable membranes toward lower water potential, often the more concentrated side in this kind of model. The membrane and the concentration difference both matter.",
    };
  if ([1, 5].includes(index))
    return {
      title: hard
        ? "Choose a useful follow-up test"
        : "Apply the protein-building idea",
      prompt:
        "A cell has intact DNA, available amino acids and RNA instructions, but makes very little new protein. Which follow-up test is most relevant?",
      options: [
        "Measure the thickness of its cell wall",
        "Test whether its ribosomes can join amino acids",
        "Measure the amount of light outside the cell",
      ],
      answer: 1,
      explanation:
        "The observations point toward the protein-building step, so testing ribosome activity is more relevant than measuring cell-wall thickness or light. Having DNA and raw materials does not guarantee that protein assembly is working.",
    };
  if (index === 7)
    return {
      title: "Compare two structures working together",
      prompt:
        "Plant cells with intact walls and cells with their walls removed take in water. The wall-free cells burst more readily. Which explanation best fits the comparison?",
      diagram: "plant",
      options: [
        "The wall stops all water from entering",
        "The wall makes the cell's ATP",
        "The wall helps resist excessive expansion while the membrane allows water movement",
      ],
      answer: 2,
      explanation:
        "A cell wall supports the cell and limits overexpansion. It does not stop all water exchange, and it does not produce ATP. The comparison separates support from membrane transport.",
    };
  if (index === 8)
    return {
      title: "Look for a changing pattern",
      prompt:
        "Particles can cross a barrier. After the concentrations become equal, what happens to their motion?",
      data: {
        headers: ["Time", "Particles on left", "Particles on right"],
        rows: [
          ["Start", "80", "20"],
          ["Later", "60", "40"],
          ["Equilibrium", "50", "50"],
        ],
      },
      options: [
        "All movement stops",
        "Particles still move randomly, with no overall net transfer",
        "An energy pump must move every particle",
      ],
      answer: 1,
      explanation:
        "At diffusion equilibrium, particles continue to move in both directions. Equal average movement means there is no overall net transfer; equilibrium does not mean motion has stopped.",
    };
  if ([10, 11].includes(index))
    return {
      title: hard
        ? "Track information through a cell cycle"
        : "Explain a growth-and-repair pattern",
      prompt:
        "The table describes a typical human body-cell cycle. Which interpretation explains the pattern?",
      data: {
        headers: ["Stage", "Chromosomes per nucleus", "Relative DNA amount"],
        rows: [
          ["Before DNA copying", "46", "1"],
          ["After copying, before chromosome separation", "46", "2"],
          ["Each nucleus after mitosis", "46", "1"],
        ],
      },
      options: [
        "DNA is copied before division and the copies are distributed to two nuclei",
        "Each new nucleus permanently has twice the chromosome number",
        "The parent nucleus loses its genetic instructions before division",
      ],
      answer: 0,
      explanation:
        "DNA is copied before mitosis. Before separation, sister chromatids are counted together as one chromosome. Mitosis then distributes the copies, preserving the usual chromosome number in each new body-cell nucleus.",
    };
  return {
    title: "Connect structure with function",
    prompt:
      "A nerve cell has long extensions, while a red blood cell is a thin, flexible disc. What is the strongest explanation for these different shapes?",
    diagram: "specializedCells",
    options: [
      "Every cell has exactly the same job",
      "The shapes help the cells perform different jobs",
      "A cell's shape cannot affect what it does",
    ],
    answer: 1,
    explanation:
      "Long extensions help nerve cells transmit signals over distances. A thin, flexible red blood cell supports gas exchange and passage through small vessels. Different structures support different functions.",
  };
}
