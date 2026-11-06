import { authorDeck } from './author';
import { lifeContent } from './content-life';
import { chemistryContent } from './content-chemistry';
const all = [...lifeContent, ...chemistryContent];
const only = process.argv.find(a => a.startsWith('--deck='))?.slice(7);
for (const content of all.filter(d => !only || d.id === only)) await authorDeck(content);
