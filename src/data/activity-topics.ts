import { branches, decks } from "./catalog";
import { studyGuides } from "./study-guides";

export interface ActivityTerm {
  id: string;
  term: string;
  definition: string;
  deckId: string;
}
const skillsTerms: [string, string, string][] = [
  [
    "Variable",
    "A factor that can change or be measured in an investigation.",
    "skills.method",
  ],
  [
    "Control",
    "A comparison setup used to judge the effect of the factor being investigated.",
    "skills.method",
  ],
  [
    "Accuracy",
    "Closeness of a measurement to an accepted reference value.",
    "skills.measurement",
  ],
  [
    "Precision",
    "Closeness of repeated measurements to one another.",
    "skills.measurement",
  ],
  [
    "Evidence",
    "Observations or measurements used to evaluate an explanation.",
    "skills.data",
  ],
  [
    "Median",
    "The middle of ordered data; average the two middle values when there is an even number.",
    "skills.data",
  ],
];
export const activityTopics = branches.map((branch) => {
  const seen = new Set<string>();
  const terms: ActivityTerm[] = [];
  for (const deck of decks.filter((d) => d.branch === branch.id)) {
    const guide = studyGuides.find((g) => g.deckId === deck.id)!;
    guide.terms.forEach(([term, definition], i) => {
      const name = term.toLowerCase();
      if (seen.has(name)) return;
      seen.add(name);
      terms.push({ id: `${deck.id}:${i}`, term, definition, deckId: deck.id });
    });
  }
  if (branch.id === "skills")
    skillsTerms.forEach(([term, definition, deckId], i) =>
      terms.push({ id: `skills.practice:${i}`, term, definition, deckId }),
    );
  return { ...branch, terms };
});
export const activityTopic = (id: string) =>
  activityTopics.find((t) => t.id === id);
export const activityTerm = (id: string) =>
  activityTopics.flatMap((t) => t.terms).find((t) => t.id === id);
export const puzzleWord = (term: string) =>
  term.toUpperCase().replace(/[^A-Z]/g, "");
