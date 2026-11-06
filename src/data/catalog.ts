import type { Branch, Deck } from '../core/types';
export const branches: Branch[] = [
  { id: 'life', name: 'Life Science', short: 'Life', color: 'green', mascot: 'Sprout', description: 'From tiny cells to wild ecosystems.', icon: 'sprout' },
  { id: 'chemistry', name: 'Chemistry', short: 'Chemistry', color: 'yellow', mascot: 'Beaker Buddy', description: 'A little matter. A lot of possibility.', icon: 'flask' },
  { id: 'physics', name: 'Physics', short: 'Physics', color: 'peach', mascot: 'Atom Star', description: 'Find the forces behind the everyday.', icon: 'atom' },
  { id: 'earth', name: 'Earth & Space', short: 'Earth & space', color: 'blue', mascot: 'Planet Cloud', description: 'Big wonders, on Earth and beyond.', icon: 'planet' },
  { id: 'skills', name: 'Science Skills Lab', short: 'Skills lab', color: 'lilac', mascot: 'Tabby', description: 'Think, measure, and discover like a scientist.', icon: 'cat' },
];
const definitions: [string, string, string, string, number[], string][] = [
  ['life.cells', 'Cells', 'A tiny world, full of life. Meet the building blocks of every living thing.', 'cell', [7, 8], 'Cell structures, transport and cell division'],
  ['life.body', 'Human Body Systems', 'Discover the brilliant teamwork happening inside you.', 'body', [8, 9], 'Body systems, health, disease and immunity'],
  ['life.genetics', 'Genetics & Evolution', 'Follow the clues that make living things unique.', 'punnett', [9, 10], 'Heredity, variation and natural selection'],
  ['life.ecosystems', 'Ecosystems & Biodiversity', 'Everything is connected. Find your place in the web.', 'foodweb', [7, 9], 'Energy flow, biodiversity and Philippine ecosystems'],
  ['life.classification', 'Classification', 'Bring a little order to a wonderfully wild world.', 'tree', [7, 8], 'Classification and shared characteristics'],
  ['life.photosynthesis', 'Photosynthesis & Respiration', 'Follow the energy, from sunshine to a single cell.', 'plant', [8, 9], 'Photosynthesis, respiration and matter cycles'],
  ['chemistry.matter', 'Matter & Mixtures', 'Solids, liquids, and a little everyday magic.', 'beakers', [7, 8], 'Properties, states, solutions and safe separation'],
  ['chemistry.atoms', 'Atoms & the Periodic Table', 'Small pieces. A whole universe of possibilities.', 'atom', [7, 8], 'Atomic structure, elements and periodic patterns'],
  ['chemistry.bonding', 'Bonding & Compounds', 'Find out how atoms make a great team.', 'molecule', [9, 10], 'Chemical bonds, compounds and biomolecules'],
  ['chemistry.acids', 'Acids, Bases & pH', 'Explore the science in calamansi and kitchen vinegar.', 'ph', [7, 9], 'Acids, bases, indicators and the pH scale'],
  ['chemistry.reactions', 'Reactions & Balancing', 'New substances, same atoms. Let’s balance things out.', 'reaction', [9, 10], 'Chemical change and conservation of mass'],
  ['chemistry.gases', 'Gas Laws', 'Give your curiosity a little room to expand.', 'gas', [9, 10], 'Pressure, volume, temperature and ideal gas models'],
  ['physics.motion', 'Motion & Projectiles', 'Ready, set, explore the science of moving things.', 'distance', [7, 9], 'Speed, velocity, acceleration and projectiles'],
  ['physics.forces', 'Newton’s Laws & Forces', 'A push, a pull, and a new way to see the world.', 'forces', [8, 9], 'Newton’s laws, friction, gravity and net force'],
  ['physics.energy', 'Work, Energy & Heat', 'Follow energy through work, warmth, and simple machines.', 'ramp', [8, 10], 'Mechanical energy, heat transfer and power'],
  ['physics.waves', 'Waves & Sound', 'Make a little ripple. Discover how waves travel.', 'wave', [8, 9], 'Wave speed, frequency, sound and vibration'],
  ['physics.light', 'Light & the EM Spectrum', 'Look at the world in a whole new light.', 'lens', [8, 10], 'Reflection, refraction and electromagnetic radiation'],
  ['physics.electricity', 'Electricity & Magnetism', 'Bright ideas start with a little connection.', 'circuit', [8, 9], 'Current, voltage, resistance and electromagnetism'],
  ['earth.plates', 'Plate Tectonics', 'Explore the slow dance beneath our feet.', 'plates', [7, 10], 'Earth’s layers and tectonic plate boundaries'],
  ['earth.volcanoes', 'Volcanoes & Earthquakes', 'Get curious about our ever-changing islands.', 'volcano', [8, 10], 'Volcanism, faults, earthquake waves and preparedness'],
  ['earth.weather', 'Weather, Climate & Typhoons', 'Make sense of the skies above the Philippines.', 'weather', [7, 9, 10], 'Atmosphere, monsoons, tropical cyclones and climate change'],
  ['earth.solar', 'Our Solar System', 'One small planet. So much to wonder about.', 'solar', [7, 8], 'Planetary motion, moon phases, eclipses and seasons'],
  ['earth.stars', 'Stars & Galaxies', 'A pocketful of questions about a sky full of stars.', 'stars', [8, 9], 'Stars, light, galaxies and the scale of space'],
  ['earth.rocks', 'Rocks & the Water Cycle', 'Every pebble, every raindrop has a story.', 'water', [7, 8], 'Rock formation, weathering and the water cycle'],
  ['skills.method', 'Scientific Method & Variables', 'Good science begins with a great question.', 'lab', [7, 8, 9, 10], 'Testable questions, fair tests, evidence and variables'],
  ['skills.measurement', 'Measurement & SI Units', 'A little precision makes a big difference.', 'measure', [7, 8, 9, 10], 'SI units, measurement, uncertainty and conversions'],
  ['skills.data', 'Data, Graphs & Lab Safety', 'Spot the pattern. Tell the story. Stay safe.', 'graph', [7, 8, 9, 10], 'Data representation, interpretation and laboratory safety'],
];
export const decks: Deck[] = definitions.map(([id, name, description, diagram, grades, area]) => ({ id, branch: id.split('.')[0] as Deck['branch'], name, description, diagram, grades, sourceNote: `Philippine K–12 Science, Grades ${grades.join(', ')}: ${area}. Content aligns with these curriculum areas; no official competency codes are claimed.` }));
export const deckById = (id: string) => decks.find(d => d.id === id);
export const branchById = (id: string) => branches.find(b => b.id === id);
