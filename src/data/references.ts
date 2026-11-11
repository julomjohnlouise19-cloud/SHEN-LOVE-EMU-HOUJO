export interface ScienceReference {
  title: string;
  publisher: string;
  url: string;
  focus: string;
}
const biology: ScienceReference = {
  title: "Biology 2e",
  publisher: "OpenStax · Rice University",
  url: "https://openstax.org/details/books/biology-2e",
  focus: "Cells, body systems, heredity, evolution and ecology.",
};
const chemistry: ScienceReference = {
  title: "Chemistry 2e",
  publisher: "OpenStax · Rice University",
  url: "https://openstax.org/details/books/chemistry-2e",
  focus: "Matter, atoms, bonding, reactions, acids and gases.",
};
const physics: ScienceReference = {
  title: "Physics",
  publisher: "OpenStax · Rice University",
  url: "https://openstax.org/details/books/physics",
  focus: "Motion, forces, energy, waves, light and electricity.",
};
const nasa: ScienceReference = {
  title: "Solar System Exploration",
  publisher: "NASA Science",
  url: "https://science.nasa.gov/solar-system/",
  focus: "Planets, moons, orbits and our place in the solar system.",
};
const geology: ScienceReference = {
  title: "Earthquake Hazards Program",
  publisher: "U.S. Geological Survey",
  url: "https://www.usgs.gov/programs/earthquake-hazards",
  focus: "Tectonic plates, faults and earthquake science.",
};
const water: ScienceReference = {
  title: "Water Science School",
  publisher: "U.S. Geological Survey",
  url: "https://www.usgs.gov/special-topics/water-science-school",
  focus: "The water cycle, water movement and Earth processes.",
};
const weather: ScienceReference = {
  title: "Weather and Climate Information",
  publisher: "DOST–PAGASA",
  url: "https://www.pagasa.dost.gov.ph/",
  focus: "Philippine weather, tropical cyclones, monsoons and climate.",
};
const volcano: ScienceReference = {
  title: "Volcano and Earthquake Information",
  publisher: "DOST–PHIVOLCS",
  url: "https://www.phivolcs.dost.gov.ph/",
  focus: "Philippine volcanoes, earthquakes and preparedness.",
};
const si: ScienceReference = {
  title: "The International System of Units (SI)",
  publisher: "Bureau International des Poids et Mesures",
  url: "https://www.bipm.org/en/publications/si-brochure",
  focus: "The SI base units, symbols and measurement conventions.",
};
const statistics: ScienceReference = {
  title: "Introductory Statistics 2e",
  publisher: "OpenStax · Rice University",
  url: "https://openstax.org/details/books/introductory-statistics-2e",
  focus: "Reading tables, representing data and interpreting evidence.",
};
const curriculum: ScienceReference = {
  title: "K to 12 Basic Education Curriculum",
  publisher: "Philippine Department of Education",
  url: "https://www.deped.gov.ph/k-to-12/about/k-to-12-basic-education-curriculum/",
  focus:
    "Curriculum context for the Grade 7–10 science areas; no official competency codes are claimed.",
};
export function referencesFor(deckId: string): ScienceReference[] {
  const branch = deckId.split(".")[0];
  const specific = (
    {
      "earth.plates": geology,
      "earth.volcanoes": volcano,
      "earth.weather": weather,
      "earth.solar": nasa,
      "earth.stars": {
        title: "Astronomy 2e",
        publisher: "OpenStax · Rice University",
        url: "https://openstax.org/details/books/astronomy-2e",
        focus: "Stars, light, galaxies and distances in space.",
      },
      "earth.rocks": water,
      "skills.measurement": si,
      "skills.data": statistics,
    } as Record<string, ScienceReference>
  )[deckId];
  return [
    specific ??
      (
        { life: biology, chemistry, physics, skills: biology } as Record<
          string,
          ScienceReference
        >
      )[branch] ??
      nasa,
    curriculum,
  ];
}
