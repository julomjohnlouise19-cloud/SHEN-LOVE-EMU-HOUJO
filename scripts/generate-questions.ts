import { authorDeck } from "./author";
import { lifeContent } from "./content-life";
import { chemistryContent } from "./content-chemistry";
import { physicsContent } from "./content-physics";
import { earthContent } from "./content-earth";
import { skillsContent } from "./content-skills";
const all = [
  ...lifeContent,
  ...chemistryContent,
  ...physicsContent,
  ...earthContent,
  ...skillsContent,
];
const only = process.argv.find((a) => a.startsWith("--deck="))?.slice(7);
for (const content of all.filter((d) => !only || d.id === only))
  await authorDeck(content);
