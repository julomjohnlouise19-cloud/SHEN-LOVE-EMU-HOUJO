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
// Retains all 23 IDs supplied in Math Research - Group 1.pdf, plus 27 selections.
// Titles are topic labels; see docs/SCIENCE_VIDEOS.md for link evidence and scope.
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
  {
    id: "uixA8ZXx0KU",
    title: "Photosynthesis",
    category: "biology",
    deckId: "life.photosynthesis",
    focus:
      "Trace how light energy helps plants build sugars from carbon dioxide and water.",
  },
  {
    id: "f-ldPgEfAHI",
    title: "Mitosis & Cell Division",
    category: "biology",
    deckId: "life.cells",
    focus:
      "Follow the stages that produce two daughter cells during growth and repair.",
  },
  {
    id: "BSypUV6QUNw",
    title: "Your Immune System’s Tiny Helpers",
    category: "biology",
    deckId: "life.body",
    focus:
      "Meet the complement system and connect it with the body's other immune defences.",
  },
  {
    id: "FSyAehMdpyI",
    title: "Inside the Atom: The Nucleus",
    category: "chemistry",
    deckId: "chemistry.atoms",
    focus:
      "Look closely at the nucleus and the particles that make up an atom.",
  },
  {
    id: "0RRVV4Diomg",
    title: "Reading the Periodic Table",
    category: "chemistry",
    deckId: "chemistry.atoms",
    focus:
      "Use groups, periods and atomic numbers to find patterns among elements.",
  },
  {
    id: "NgD9yHSJ29I",
    title: "How Atoms Bond",
    category: "chemistry",
    deckId: "chemistry.bonding",
    focus:
      "Compare the ways electrons are involved when atoms form chemical bonds.",
  },
  {
    id: "UL1jmJaUkaQ",
    title: "Stoichiometry: Counting Chemical Reactions",
    category: "chemistry",
    deckId: "chemistry.reactions",
    focus:
      "Extend balanced equations into ratios of reactants and products. Try the balancing notes first.",
  },
  {
    id: "vt8fB3MFzLk",
    title: "Acids & Bases",
    category: "chemistry",
    deckId: "chemistry.acids",
    focus:
      "Compare acids and bases, then connect the examples with pH and indicators.",
  },
  {
    id: "thnDxFdkzZs",
    title: "The History of Atomic Chemistry",
    category: "chemistry",
    deckId: "chemistry.atoms",
    focus:
      "Notice how evidence changed atomic models over time; models have limits.",
  },
  {
    id: "kKKM8Y-u7ds",
    title: "Newton’s Laws in Action",
    category: "physics",
    deckId: "physics.forces",
    focus:
      "Connect inertia, net force and paired interactions with everyday motion.",
  },
  {
    id: "w4QFJb9a8vo",
    title: "Work, Energy & Power",
    category: "physics",
    deckId: "physics.energy",
    focus:
      "Distinguish energy transferred by work from the rate of transfer called power.",
  },
  {
    id: "FfgT6zx4k3Q",
    title: "Phones & the Electromagnetic Spectrum",
    category: "physics",
    deckId: "physics.light",
    focus:
      "Compare ionizing and non-ionizing radiation. Use the supporting references when evaluating health claims.",
  },
  {
    id: "kwfNGatxUJI",
    title: "Plate Tectonics Explained",
    category: "earth",
    deckId: "earth.plates",
    focus:
      "Connect moving tectonic plates with the features found at their boundaries.",
  },
  {
    id: "VNGUdObDoLk",
    title: "Volcanoes 101",
    category: "earth",
    deckId: "earth.volcanoes",
    focus:
      "Explore how magma reaches the surface and why eruptions vary. Follow local official safety advice.",
  },
  {
    id: "e7ho6z32yyo",
    title: "Earthquakes 101",
    category: "earth",
    deckId: "earth.volcanoes",
    focus:
      "Link moving faults and seismic waves with shaking. Review PHIVOLCS guidance in the notes.",
  },
  {
    id: "al-do-HGuIk",
    title: "Water on the Move",
    category: "earth",
    deckId: "earth.rocks",
    focus:
      "Follow evaporation, condensation, precipitation and water stored around Earth.",
  },
  {
    id: "wbR-5mHI6bo",
    title: "Understanding Climate Change",
    category: "earth",
    deckId: "earth.weather",
    focus:
      "Separate long-term climate trends from daily weather, and compare the roles of emissions and solutions.",
  },
  {
    id: "RS7IzU2VJIQ",
    title: "Plastic Pollution & Our Planet",
    category: "earth",
    deckId: "life.ecosystems",
    focus:
      "Track how plastic waste moves through ecosystems and consider practical ways to reduce it.",
  },
  {
    id: "PaErPyEnDvk",
    title: "A Journey into the Deep Sea",
    category: "earth",
    deckId: "life.ecosystems",
    focus:
      "Explore ocean habitats and ask how organisms live with little light and high pressure.",
  },
  {
    id: "libKVRa01L8",
    title: "Solar System 101",
    category: "space",
    deckId: "earth.solar",
    focus: "Meet the Sun, eight planets and other members of our solar system.",
  },
  {
    id: "2HoTK_Gqi2Q",
    title: "Sun 101",
    category: "space",
    deckId: "earth.stars",
    focus:
      "Explore our nearest star and the energy it sends across the solar system.",
  },
  {
    id: "EFO_bsg1sw8",
    title: "Stars 101",
    category: "space",
    deckId: "earth.stars",
    focus: "Compare stellar properties and the stages in a star's life.",
  },
  {
    id: "3mnSDifDSxQ",
    title: "How Big Can a Star Be?",
    category: "space",
    deckId: "earth.stars",
    focus:
      "Compare stellar sizes and remember that measurements and record holders can change with new evidence.",
  },
  {
    id: "oHHSSJDJ4oo",
    title: "Solar Storms & Space Weather",
    category: "space",
    deckId: "earth.stars",
    focus:
      "Distinguish solar flares from coronal mass ejections and explore their possible effects on Earth.",
  },
  {
    id: "udFxKZRyQt4",
    title: "Neutron Stars",
    category: "space",
    deckId: "earth.stars",
    focus:
      "Explore the dense remnants of some massive stars and compare them with black holes.",
  },
  {
    id: "NtQkz0aRDe8",
    title: "Designing a Moon Base",
    category: "space",
    deckId: "earth.solar",
    focus:
      "Consider a proposed lunar habitat. Separate engineering concepts from missions that have already happened.",
  },
  {
    id: "uqKGREZs6-w",
    title: "Could We Build a Base on Mars?",
    category: "space",
    deckId: "earth.solar",
    focus:
      "Think through the challenges of a proposed Mars base, including air, water, radiation and distance.",
  },
];
export const originalVideoUrl = (id: string) =>
  "https://www.youtube.com/watch?v=" + id;
export function videoThumbnailUrl(id: string) {
  if (!scienceVideos.some((video) => video.id === id))
    throw new Error("Choose a video from the collection.");
  return "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg";
}
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
