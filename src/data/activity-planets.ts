export interface ExplorerPlanet {
  id: string;
  name: string;
  group: string;
  color: string;
  distance: string;
  year: string;
  tagline: string;
  facts: string[];
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}
// Original learning summaries supported by NASA Science / Solar System Exploration.
// Rounded mean distances and orbital periods; no changing moon counts are asserted.
export const explorerPlanets: ExplorerPlanet[] = [
  {
    id: "mercury",
    name: "Mercury",
    group: "Rocky planet",
    color: "#b8a597",
    distance: "0.39 AU",
    year: "About 88 Earth days",
    tagline: "Small planet. Quick orbit.",
    facts: [
      "Mercury is the smallest of the eight planets and the closest to the Sun.",
      "Its rocky surface is heavily cratered. Its extremely thin exosphere cannot keep temperatures steady.",
      "It travels around the Sun quickly, but rotates slowly. Being closest does not make it the hottest planet.",
    ],
    question: "Which planet travels closest to the Sun?",
    options: ["Mercury", "Venus", "Earth"],
    answer: 0,
    explanation:
      "Mercury's orbit is closest to the Sun. Venus is hotter because of its powerful greenhouse effect.",
  },
  {
    id: "venus",
    name: "Venus",
    group: "Rocky planet",
    color: "#e6bd72",
    distance: "0.72 AU",
    year: "About 225 Earth days",
    tagline: "Our very warm neighbour.",
    facts: [
      "Venus is similar in size to Earth, but its surface is much hotter.",
      "Its thick carbon-dioxide atmosphere traps heat through a strong greenhouse effect. It is the hottest planet.",
      "Venus rotates slowly in the opposite direction to most planets. Its clouds hide the rocky surface.",
    ],
    question: "Why is Venus hotter than Mercury?",
    options: [
      "It is closer to the Sun",
      "Its thick atmosphere traps heat",
      "Its surface is a burning star",
    ],
    answer: 1,
    explanation:
      "Venus's thick carbon-dioxide atmosphere traps heat. Venus is a planet, not a star, and Mercury is closer to the Sun.",
  },
  {
    id: "earth",
    name: "Earth",
    group: "Rocky planet",
    color: "#68b8b6",
    distance: "1 AU",
    year: "About 365.25 Earth days",
    tagline: "Our one wonderful home.",
    facts: [
      "Earth has liquid-water oceans, a protective atmosphere and one natural satellite: the Moon.",
      "Earth is the only world currently known to support life.",
      "Its tilted axis changes sunlight angles and day length through the year, causing seasons. Distance from the Sun is not the main cause.",
    ],
    question: "What mainly causes Earth's seasons?",
    options: [
      "Earth's changing distance from the Sun",
      "The Moon blocking sunlight",
      "Earth's tilted axis as it orbits",
    ],
    answer: 2,
    explanation:
      "Earth's axial tilt changes the sunlight angle and day length as Earth orbits the Sun.",
  },
  {
    id: "mars",
    name: "Mars",
    group: "Rocky planet",
    color: "#dd8b70",
    distance: "1.52 AU",
    year: "About 687 Earth days",
    tagline: "A rusty, rocky red world.",
    facts: [
      "Iron oxides in surface materials give Mars its rusty colour.",
      "Mars has a thin atmosphere, polar ice, large volcanoes and deep canyons.",
      "Evidence shows liquid water flowed on ancient Mars. That does not establish that life exists there today.",
    ],
    question: "What gives Mars its reddish appearance?",
    options: [
      "Iron oxides in its surface materials",
      "Oceans of red liquid",
      "A surface glowing like the Sun",
    ],
    answer: 0,
    explanation:
      "Iron oxides, like rust, colour much of Mars's surface material.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    group: "Gas giant",
    color: "#d8b39a",
    distance: "5.20 AU",
    year: "About 11.9 Earth years",
    tagline: "The giant of our neighbourhood.",
    facts: [
      "Jupiter is the largest planet. Its atmosphere is mostly hydrogen and helium.",
      "It has cloud bands, powerful storms and a faint ring system.",
      "As a gas giant, it does not have a solid surface like Earth's. The Great Red Spot is a long-lived atmospheric storm.",
    ],
    question: "Which gases make up most of Jupiter's atmosphere?",
    options: [
      "Oxygen and carbon dioxide",
      "Hydrogen and helium",
      "Only water vapour",
    ],
    answer: 1,
    explanation:
      "Jupiter's atmosphere is mostly hydrogen and helium, unlike Earth's nitrogen-and-oxygen atmosphere.",
  },
  {
    id: "saturn",
    name: "Saturn",
    group: "Gas giant",
    color: "#e0c47e",
    distance: "9.58 AU",
    year: "About 29.4 Earth years",
    tagline: "A world wearing icy rings.",
    facts: [
      "Saturn is a gas giant with a mostly hydrogen-and-helium atmosphere.",
      "Its bright rings contain countless particles, mostly water ice with some rock and dust.",
      "The rings are not one solid sheet. All four giant planets have ring systems, although Saturn's are especially easy to see.",
    ],
    question: "What are Saturn's rings made of?",
    options: [
      "One solid sheet of rock",
      "Clouds attached to the surface",
      "Many particles, mostly water ice",
    ],
    answer: 2,
    explanation:
      "Saturn's rings consist of many orbiting particles, mostly water ice, with some rock and dust.",
  },
  {
    id: "uranus",
    name: "Uranus",
    group: "Ice giant",
    color: "#9bd4d9",
    distance: "19.2 AU",
    year: "About 84 Earth years",
    tagline: "The planet with a sideways spin.",
    facts: [
      "Uranus is an ice giant, different in composition from Jupiter and Saturn.",
      "Its rotation axis is tilted so strongly that the planet appears to roll around the Sun on its side.",
      "It has rings and a hydrogen-and-helium atmosphere containing methane. 'Ice giant' does not mean a solid ball of ordinary ice.",
    ],
    question: "What is unusual about Uranus's rotation axis?",
    options: [
      "It is tilted strongly onto its side",
      "It does not rotate",
      "It always points straight upright",
    ],
    answer: 0,
    explanation:
      "Uranus has an extreme axial tilt. Its unusual orientation gives it very different seasons.",
  },
  {
    id: "neptune",
    name: "Neptune",
    group: "Ice giant",
    color: "#83aed6",
    distance: "30.1 AU",
    year: "About 165 Earth years",
    tagline: "Far away, with fierce winds.",
    facts: [
      "Neptune is the farthest of the eight planets from the Sun.",
      "It is an ice giant with a thick atmosphere, strong winds and a faint ring system.",
      "Methane in its atmosphere absorbs red light, contributing to its blue-green colour. Image processing can make pictures look more intensely blue.",
    ],
    question: "Which type of planet is Neptune?",
    options: ["A rocky planet", "An ice giant", "A dwarf planet"],
    answer: 1,
    explanation:
      "Neptune and Uranus are ice giants. Pluto is a dwarf planet and is not one of the eight planets.",
  },
];
