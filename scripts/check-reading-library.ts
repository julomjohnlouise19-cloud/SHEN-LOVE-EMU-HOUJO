import { readFileSync } from "node:fs";
import { branches, decks } from "../src/data/catalog";
import { studyGuides } from "../src/data/study-guides";
import { elements } from "../src/data/elements";
import { scienceFigures } from "../src/data/science-figures";
import { HANDBOOK_EDITION } from "../src/data/handbook-edition";
import {
  readingSourceHash,
  contentHash,
  type ReadingManifest,
} from "./reading-handbook-files";

if (
  studyGuides.length !== decks.length ||
  new Set(studyGuides.map((g) => g.deckId)).size !== decks.length
)
  throw new Error("Each of the 27 decks needs one complete study guide.");
for (const deck of decks) {
  const g = studyGuides.find((g) => g.deckId === deck.id);
  if (
    !g ||
    g.ideas.length < 3 ||
    g.terms.length < 2 ||
    g.introduction.length < 50 ||
    g.remember.length < 30 ||
    [...g.ideas, ...g.terms, g.example, g.check].some(
      (pair) =>
        pair.length !== 2 || pair.some((value) => value.trim().length < 3),
    )
  )
    throw new Error(`Complete the authored notes for ${deck.id}.`);
  for (const id of g.figures)
    if (!scienceFigures.some((f) => f.id === id))
      throw new Error(`Missing diagram ${id}.`);
}
if (
  elements.length !== 118 ||
  elements.some((e, i) => e.number !== i + 1) ||
  new Set(elements.map((e) => e.symbol)).size !== 118 ||
  new Set(elements.map((e) => `${e.row}/${e.column}`)).size !== 118
)
  throw new Error(
    "The periodic table must contain 118 unique elements and positions.",
  );
const manifest = JSON.parse(
  readFileSync("public/study-guides/manifest.json", "utf8"),
) as ReadingManifest;
if (
  manifest.version !== 1 ||
  manifest.sourceHash !== readingSourceHash() ||
  manifest.files.length !== branches.length ||
  HANDBOOK_EDITION !== manifest.sourceHash.slice(0, 12)
)
  throw new Error(
    "Study handbooks are out of date. Run npm run reading:build.",
  );
for (const branch of branches) {
  const file = manifest.files.find((f) => f.branch === branch.id);
  if (!file || file.path !== `study-guides/${branch.id}-study-handbook.pdf`)
    throw new Error(`Missing ${branch.id} handbook.`);
  const pdf = readFileSync(`public/${file.path}`);
  if (
    pdf.subarray(0, 5).toString() !== "%PDF-" ||
    pdf.byteLength !== file.bytes ||
    contentHash(pdf) !== file.sha256 ||
    pdf.byteLength < 10000
  )
    throw new Error(`Invalid PDF artifact for ${branch.id}.`);
}
console.log(
  `Reading library checked: ${studyGuides.length} original guides, ${elements.length} elements, ${scienceFigures.length} diagrams and ${manifest.files.length} matching PDF handbooks.`,
);
