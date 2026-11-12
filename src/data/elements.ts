export const elementFamilies = {
  alkali: {
    name: "Alkali metals",
    color: "#f8dfd2",
    note: "Group 1 metals include lithium, sodium and potassium. They tend to form +1 ions. Hydrogen shares the first column but is a nonmetal.",
  },
  alkaline: {
    name: "Alkaline earth metals",
    color: "#f8edc9",
    note: "Group 2 includes magnesium and calcium. These metals commonly form +2 ions.",
  },
  dblock: {
    name: "d-block metals",
    color: "#e7e3f5",
    note: "The middle block contains familiar metals such as iron and copper. Group 12 is included here; definitions of transition metals can classify some members differently.",
  },
  otherMetal: {
    name: "Other metals",
    color: "#dbeaf1",
    note: "Metals in the right-hand p-block include aluminium, tin and lead. Their properties vary; position alone does not tell us every property.",
  },
  metalloid: {
    name: "Metalloids",
    color: "#e0ead3",
    note: "Elements such as boron and silicon have a mix of metallic and nonmetallic characteristics. The exact boundary used in classroom charts can vary.",
  },
  nonmetal: {
    name: "Other nonmetals",
    color: "#e1f0e8",
    note: "This set includes hydrogen, carbon, nitrogen and oxygen. Nonmetals have varied properties and often form covalent bonds.",
  },
  halogen: {
    name: "Halogens",
    color: "#f7e2ef",
    note: "Group 17 includes fluorine, chlorine and bromine. Familiar halogens often gain one electron in ionic compounds. Properties of the heaviest members are less well established.",
  },
  noble: {
    name: "Noble gases",
    color: "#dceff0",
    note: "Group 18 contains helium through oganesson. Familiar members are gases with low chemical reactivity; the name does not establish the physical state or reactivity of oganesson.",
  },
  lanthanide: {
    name: "Lanthanide series",
    color: "#efead3",
    note: "Elements 57–71 are shown together below the main table. They belong to period 6. Charts can differ in how the ends of this series connect to group 3.",
  },
  actinide: {
    name: "Actinide series",
    color: "#f0e0d4",
    note: "Elements 89–103 are shown together below the main table and belong to period 7. All have radioactive isotopes; many are produced for research.",
  },
} as const;
export type ElementFamily = keyof typeof elementFamilies;
export interface ChemicalElement {
  number: number;
  symbol: string;
  name: string;
  period: number;
  group: number | null;
  row: number;
  column: number;
  family: ElementFamily;
}
const identities =
  `H Hydrogen|He Helium|Li Lithium|Be Beryllium|B Boron|C Carbon|N Nitrogen|O Oxygen|F Fluorine|Ne Neon|Na Sodium|Mg Magnesium|Al Aluminium|Si Silicon|P Phosphorus|S Sulfur|Cl Chlorine|Ar Argon|K Potassium|Ca Calcium|Sc Scandium|Ti Titanium|V Vanadium|Cr Chromium|Mn Manganese|Fe Iron|Co Cobalt|Ni Nickel|Cu Copper|Zn Zinc|Ga Gallium|Ge Germanium|As Arsenic|Se Selenium|Br Bromine|Kr Krypton|Rb Rubidium|Sr Strontium|Y Yttrium|Zr Zirconium|Nb Niobium|Mo Molybdenum|Tc Technetium|Ru Ruthenium|Rh Rhodium|Pd Palladium|Ag Silver|Cd Cadmium|In Indium|Sn Tin|Sb Antimony|Te Tellurium|I Iodine|Xe Xenon|Cs Caesium|Ba Barium|La Lanthanum|Ce Cerium|Pr Praseodymium|Nd Neodymium|Pm Promethium|Sm Samarium|Eu Europium|Gd Gadolinium|Tb Terbium|Dy Dysprosium|Ho Holmium|Er Erbium|Tm Thulium|Yb Ytterbium|Lu Lutetium|Hf Hafnium|Ta Tantalum|W Tungsten|Re Rhenium|Os Osmium|Ir Iridium|Pt Platinum|Au Gold|Hg Mercury|Tl Thallium|Pb Lead|Bi Bismuth|Po Polonium|At Astatine|Rn Radon|Fr Francium|Ra Radium|Ac Actinium|Th Thorium|Pa Protactinium|U Uranium|Np Neptunium|Pu Plutonium|Am Americium|Cm Curium|Bk Berkelium|Cf Californium|Es Einsteinium|Fm Fermium|Md Mendelevium|No Nobelium|Lr Lawrencium|Rf Rutherfordium|Db Dubnium|Sg Seaborgium|Bh Bohrium|Hs Hassium|Mt Meitnerium|Ds Darmstadtium|Rg Roentgenium|Cn Copernicium|Nh Nihonium|Fl Flerovium|Mc Moscovium|Lv Livermorium|Ts Tennessine|Og Oganesson`.split(
    "|",
  );
const rows = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10],
  [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18],
  Array.from({ length: 18 }, (_, i) => i + 19),
  Array.from({ length: 18 }, (_, i) => i + 37),
  [55, 56, 0, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
  [
    87, 88, 0, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
    117, 118,
  ],
];
const nonmetals = new Set([1, 6, 7, 8, 15, 16, 34]);
const metalloids = new Set([5, 14, 32, 33, 51, 52]);
export const elements: ChemicalElement[] = identities.map((identity, i) => {
  const number = i + 1,
    [symbol, name] = identity.split(" ");
  let row = 0,
    column = 0,
    period = 0,
    group: number | null = null;
  if (number >= 57 && number <= 71) {
    period = 6;
    row = 9;
    column = number - 54;
  } else if (number >= 89 && number <= 103) {
    period = 7;
    row = 10;
    column = number - 86;
  } else {
    period = rows.findIndex((r) => r.includes(number)) + 1;
    row = period;
    column = rows[period - 1].indexOf(number) + 1;
    group = column;
  }
  const family: ElementFamily =
    row === 9
      ? "lanthanide"
      : row === 10
        ? "actinide"
        : group === 18
          ? "noble"
          : group === 17
            ? "halogen"
            : nonmetals.has(number)
              ? "nonmetal"
              : group === 1
                ? "alkali"
                : group === 2
                  ? "alkaline"
                  : metalloids.has(number)
                    ? "metalloid"
                    : group !== null && group >= 3 && group <= 12
                      ? "dblock"
                      : "otherMetal";
  return { number, symbol, name, period, group, row, column, family };
});
export const elementExamples: Record<string, string> = {
  H: "Hydrogen is part of water and many organic compounds. Its atomic number is 1; a neutral hydrogen atom has one electron.",
  He: "Helium is used in cooling and some balloons. Its two electrons fill its first energy level; it belongs to group 18, not group 2.",
  C: "Carbon forms the framework of many molecules in living things. Carbon-12 has 6 protons and 6 neutrons; other carbon isotopes have different neutron counts.",
  N: "Nitrogen gas makes up most of Earth's dry atmosphere by volume. Nitrogen atoms also occur in proteins and DNA.",
  O: "Oxygen atoms occur in water and many minerals. Oxygen gas supports aerobic respiration; photosynthesis releases oxygen gas.",
  Na: "Sodium atoms can form +1 ions. In table salt, sodium ions and chloride ions are part of an ionic lattice, not little NaCl molecules.",
  Mg: "Magnesium occurs in minerals and is part of chlorophyll. Magnesium metal and magnesium ions have different properties.",
  Al: "Aluminium is a lightweight metal used in cans and structures. Its protective oxide layer helps limit further corrosion.",
  Si: "Silicon is a metalloid used in semiconductor devices. Silicon dioxide occurs in quartz; an element and its compounds have different properties.",
  P: "Phosphorus atoms occur in DNA, ATP and phosphate minerals. Different forms and compounds of an element can have very different properties.",
  S: "Sulfur occurs in some proteins and many minerals. The IUPAC spelling is sulfur; sulfur atoms can combine with other elements in many compounds.",
  Cl: "Chloride ions occur in table salt. Chlorine gas has different properties from chloride ions, so an element's name alone does not describe its compounds.",
  Ar: "Argon is a familiar noble gas in the atmosphere. Its low reactivity makes it useful as a protective gas in some processes.",
  K: "Potassium ions help cells maintain electrical and chemical conditions. The symbol K comes from the historical name kalium.",
  Ca: "Calcium compounds help give bones and teeth strength. Calcium ions also support cell signalling and muscle function.",
  Fe: "Iron is a major ingredient in many steels. Iron in haemoglobin helps transport oxygen; metallic iron and iron in compounds behave differently.",
  Cu: "Copper conducts electricity well and is widely used in wires. Conductivity describes how easily electric charge can move through a material.",
  Zn: "Zinc is used in coatings that help protect iron from corrosion. It is in the d-block; strict definitions may separate it from transition metals.",
  Br: "Bromine is one of the two elements that are liquids at about 20 °C and 1 atmosphere; mercury is the other.",
  I: "Iodine is needed in small amounts for thyroid hormones. Iodine compounds in iodized salt differ from pure iodine.",
  Au: "Gold is a metal often used in jewellery and electrical contacts. The symbol Au comes from aurum.",
  Hg: "Mercury is a liquid metal at about 20 °C and 1 atmosphere. Learning its properties does not require handling it.",
  U: "Uranium is an actinide with radioactive isotopes. Isotopes of uranium share 92 protons but have different numbers of neutrons.",
};
