export const videoCategories = [
  { id: "biology", name: "Biology & anatomy", icon: "sprout" },
  { id: "chemistry", name: "Chemistry", icon: "flask" },
  { id: "physics", name: "Physics", icon: "atom" },
  { id: "earth", name: "Earth science", icon: "planet" },
  { id: "space", name: "Space science", icon: "star" },
] as const;
export type VideoCategory = (typeof videoCategories)[number]["id"];
export interface ScienceVideo {
  id: string;
  title: string;
  category: VideoCategory;
  deckId: string;
  focus: string;
}
// Topic labels and original video IDs supplied in Math Research - Group 1.pdf.
// These are topic labels, not claims about channel names or exact video titles.
export const scienceVideos: readonly ScienceVideo[] = [
  {
    id: "ex0x-w00Uy4",
    title: "Cells",
    category: "biology",
    deckId: "life.cells",
    focus: "Connect cell structures with the jobs they do in living things.",
  },
  {
    id: "AHQGNb0zBgg",
    title: "Human Body",
    category: "biology",
    deckId: "life.body",
    focus: "Explore how organs and body systems work together.",
  },
  {
    id: "URUJD5NEXC8",
    title: "DNA",
    category: "biology",
    deckId: "life.genetics",
    focus: "Link DNA, genes and inherited characteristics.",
  },
  {
    id: "tZE_fQFK8EY",
    title: "Introduction to Biology",
    category: "biology",
    deckId: "life.classification",
    focus: "Start with living things and how scientists organize their study.",
  },
  {
    id: "W55-QiHCYGA",
    title: "Digestive System",
    category: "biology",
    deckId: "life.body",
    focus: "Follow food through digestion and nutrient absorption.",
  },
  {
    id: "jpO52VTHecQ",
    title: "Seven Processes of Life",
    category: "biology",
    deckId: "life.classification",
    focus: "Consider the processes living organisms carry out.",
  },
  {
    id: "00jbG_cfGuQ",
    title: "Respiration",
    category: "biology",
    deckId: "life.photosynthesis",
    focus:
      "Compare breathing with cellular respiration; they are different processes.",
  },
  {
    id: "x49BtB5dOwg",
    title: "Physical and Chemical",
    category: "chemistry",
    deckId: "chemistry.matter",
    focus: "Compare physical properties and changes with chemical changes.",
  },
  {
    id: "36nlbUdRvUM",
    title: "Compounds and Chemical Formulas",
    category: "chemistry",
    deckId: "chemistry.bonding",
    focus: "Read element symbols and the ratios shown by a formula.",
  },
  {
    id: "AVVDP_XJHkA",
    title: "Atoms",
    category: "chemistry",
    deckId: "chemistry.atoms",
    focus: "Explore atoms, their nuclei and their electrons.",
  },
  {
    id: "sw-wtIpxku0",
    title: "Protons and Neutrons",
    category: "chemistry",
    deckId: "chemistry.atoms",
    focus: "Distinguish atomic number from mass number.",
  },
  {
    id: "5-2NLHB4Gxg",
    title: "Force",
    category: "physics",
    deckId: "physics.forces",
    focus: "Ask how a net force changes an object's motion.",
  },
  {
    id: "JvSClZ3vHOI",
    title: "Swings, Slides and Science",
    category: "physics",
    deckId: "physics.energy",
    focus: "Look for energy transfers in familiar playground motion.",
  },
  {
    id: "CVsdXKO9xlk",
    title: "Wave Motion",
    category: "physics",
    deckId: "physics.waves",
    focus: "Connect wave speed, frequency and wavelength.",
  },
  {
    id: "s94suB5uLWw",
    title: "Magnetism",
    category: "physics",
    deckId: "physics.electricity",
    focus:
      "Explore magnetic interactions and their connection with electricity.",
  },
  {
    id: "U78NOo-oxOY",
    title: "Weight, Force, Mass and Gravity",
    category: "physics",
    deckId: "physics.forces",
    focus: "Keep mass and weight distinct: weight is a gravitational force.",
  },
  {
    id: "ZihywtixUYo",
    title: "The Map of Physics",
    category: "physics",
    deckId: "physics.energy",
    focus: "Find connections among motion, energy, waves and matter.",
  },
  {
    id: "EGqpLug-sDk",
    title: "Speed, Distance and Time",
    category: "physics",
    deckId: "physics.motion",
    focus: "Use average speed = total distance divided by total time.",
  },
  {
    id: "CXkC8BdQmp0",
    title: "Planet Earth",
    category: "earth",
    deckId: "earth.rocks",
    focus: "Explore connections among Earth's land, water and atmosphere.",
  },
  {
    id: "PFzTZJHKkZE",
    title: "Layers of the Earth",
    category: "earth",
    deckId: "earth.plates",
    focus: "Compare the crust, mantle and core in Earth's structure.",
  },
  {
    id: "l64YwNl1wr0",
    title: "Earth's Rotation and Revolution",
    category: "earth",
    deckId: "earth.solar",
    focus: "Distinguish spinning on an axis from orbiting the Sun.",
  },
  {
    id: "oz-Y1Xzx5iQ",
    title: "Five Wonders of Our Universe",
    category: "space",
    deckId: "earth.stars",
    focus: "Explore the scale of stars, galaxies and the universe.",
  },
  {
    id: "IgFcU02FpM4",
    title: "Why Is Space Black?",
    category: "space",
    deckId: "earth.stars",
    focus: "Think about light, scattering and what reaches an observer.",
  },
];
export const originalVideoUrl = (id: string) =>
  "https://www.youtube.com/watch?v=" + id;
export function videoPlayerUrl(id: string) {
  if (!scienceVideos.some((video) => video.id === id))
    throw new Error("Choose a video from the collection.");
  return (
    "https://www.youtube-nocookie.com/embed/" + id + "?rel=0&playsinline=1"
  );
}
export function findScienceVideos(query = "", category = "") {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return scienceVideos.filter(
    (video) =>
      (!category || video.category === category) &&
      words.every((word) =>
        (
          video.title +
          " " +
          video.focus +
          " " +
          videoCategories.find((value) => value.id === video.category)!.name
        )
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
}
