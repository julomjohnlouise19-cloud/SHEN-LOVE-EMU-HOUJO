export interface FigureShape {
  tag:
    | "rect"
    | "circle"
    | "ellipse"
    | "line"
    | "path"
    | "polyline"
    | "polygon"
    | "text";
  attrs: Record<string, string | number>;
  text?: string;
  part?: string;
  when?: "open" | "closed";
}
export interface ScienceFigure {
  id: string;
  title: string;
  branch: string;
  width: number;
  height: number;
  description: string;
  limit: string;
  parts: { id: string; name: string; explanation: string }[];
  shapes: FigureShape[];
}
const shape = (
  tag: FigureShape["tag"],
  attrs: FigureShape["attrs"],
  part?: string,
): FigureShape => ({ tag, attrs, part });
const text = (
  x: number,
  y: number,
  value: string,
  part?: string,
  size = 18,
): FigureShape => ({
  tag: "text",
  attrs: {
    x,
    y,
    "font-size": size,
    fill: "#293b35",
    stroke: "none",
    "text-anchor": "middle",
  },
  text: value,
  part,
});
const line = (x1: number, y1: number, x2: number, y2: number, part?: string) =>
  shape(
    "line",
    { x1, y1, x2, y2, stroke: "#546a60", "stroke-width": 2.5 },
    part,
  );
const arrow = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  part?: string,
): FigureShape[] => {
  const angle = Math.atan2(y2 - y1, x2 - x1),
    len = 11;
  return [
    line(x1, y1, x2, y2, part),
    shape(
      "polyline",
      {
        points: `${x2 - len * Math.cos(angle - 0.5)},${y2 - len * Math.sin(angle - 0.5)} ${x2},${y2} ${x2 - len * Math.cos(angle + 0.5)},${y2 - len * Math.sin(angle + 0.5)}`,
        fill: "none",
        stroke: "#546a60",
        "stroke-width": 2.5,
      },
      part,
    ),
  ];
};
const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  part?: string,
) =>
  shape(
    "rect",
    {
      x,
      y,
      width,
      height,
      rx: 18,
      fill,
      stroke: "#62766c",
      "stroke-width": 2.5,
    },
    part,
  );
const circle = (
  cx: number,
  cy: number,
  r: number,
  fill: string,
  part?: string,
) =>
  shape(
    "circle",
    { cx, cy, r, fill, stroke: "#62766c", "stroke-width": 2.5 },
    part,
  );
const ellipse = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  part?: string,
) =>
  shape(
    "ellipse",
    { cx, cy, rx, ry, fill, stroke: "#62766c", "stroke-width": 2.5 },
    part,
  );

export const scienceFigures: ScienceFigure[] = [
  {
    id: "plant-cell",
    title: "Inside a plant cell",
    branch: "life",
    width: 600,
    height: 360,
    description:
      "Explore a simplified photosynthetic plant cell, from its supporting wall to the structures that transform energy.",
    limit:
      "Schematic, not to scale. Shapes and numbers vary among real cells. Many root cells do not contain chloroplasts.",
    parts: [
      {
        id: "wall",
        name: "Cell wall",
        explanation:
          "The cellulose-rich wall supports and protects the cell. It lies outside the cell membrane.",
      },
      {
        id: "membrane",
        name: "Cell membrane",
        explanation:
          "A selectively permeable boundary regulates exchange. Plant cells have a membrane as well as a wall.",
      },
      {
        id: "nucleus",
        name: "Nucleus",
        explanation:
          "The nucleus contains most of this eukaryotic cell's DNA. Not every kind of cell has a nucleus.",
      },
      {
        id: "vacuole",
        name: "Central vacuole",
        explanation:
          "A large fluid-filled compartment stores materials and helps maintain turgor pressure.",
      },
      {
        id: "chloroplast",
        name: "Chloroplast",
        explanation:
          "Photosynthesis in chloroplasts uses light energy to build organic substances. Chloroplasts are not present in every plant cell.",
      },
      {
        id: "mitochondrion",
        name: "Mitochondrion",
        explanation:
          "Mitochondria support aerobic respiration. Plant cells need respiration as well as photosynthesis.",
      },
    ],
    shapes: [
      box(80, 60, 420, 225, "#d9e9cd", "wall"),
      box(92, 72, 396, 201, "#edf4de", "membrane"),
      box(225, 106, 210, 145, "#dcecf1", "vacuole"),
      circle(157, 177, 34, "#e4d9f1", "nucleus"),
      circle(157, 177, 10, "#b4a0ce", "nucleus"),
      ellipse(155, 108, 28, 15, "#9dbf82", "chloroplast"),
      ellipse(451, 234, 24, 13, "#9dbf82", "chloroplast"),
      ellipse(155, 249, 28, 12, "#f0c5a4", "mitochondrion"),
      text(104, 31, "Cell wall", "wall"),
      line(104, 37, 115, 60, "wall"),
      text(453, 31, "Membrane", "membrane"),
      line(453, 39, 450, 72, "membrane"),
      text(42, 177, "Nucleus", "nucleus", 15),
      line(73, 174, 123, 174, "nucleus"),
      text(330, 177, "Central vacuole", "vacuole"),
      text(453, 327, "Chloroplast", "chloroplast"),
      line(453, 305, 453, 248, "chloroplast"),
      text(151, 327, "Mitochondrion", "mitochondrion"),
      line(151, 305, 154, 261, "mitochondrion"),
    ],
  },
  {
    id: "animal-cell",
    title: "Inside an animal cell",
    branch: "life",
    width: 600,
    height: 360,
    description:
      "Compare an animal cell with a plant cell and explore the structures they share.",
    limit:
      "Schematic, not to scale. Real cells have many more structures and varied shapes.",
    parts: [
      {
        id: "membrane",
        name: "Cell membrane",
        explanation:
          "The membrane forms a flexible, selectively permeable boundary. An animal cell has no cellulose cell wall.",
      },
      {
        id: "cytoplasm",
        name: "Cytoplasm",
        explanation:
          "The cytoplasm includes the cytosol and cell structures outside the nucleus; many chemical processes occur here.",
      },
      {
        id: "nucleus",
        name: "Nucleus",
        explanation:
          "Most DNA in this eukaryotic cell is inside its nucleus. DNA also occurs in mitochondria.",
      },
      {
        id: "mitochondrion",
        name: "Mitochondrion",
        explanation:
          "This organelle supports aerobic respiration, transferring chemical energy into forms cells can use.",
      },
      {
        id: "ribosome",
        name: "Ribosomes",
        explanation:
          "Ribosomes help make proteins. They occur in both prokaryotic and eukaryotic cells.",
      },
    ],
    shapes: [
      ellipse(300, 184, 215, 119, "#e8f0f5", "membrane"),
      ellipse(300, 184, 200, 105, "#eef6f6", "cytoplasm"),
      circle(228, 181, 45, "#e4d9f1", "nucleus"),
      circle(228, 181, 13, "#b4a0ce", "nucleus"),
      ellipse(391, 123, 29, 14, "#f0c5a4", "mitochondrion"),
      ellipse(411, 233, 29, 14, "#f0c5a4", "mitochondrion"),
      ...[
        [135, 171],
        [147, 208],
        [331, 213],
        [348, 150],
      ].map(([x, y]) => circle(x, y, 5, "#647b6e", "ribosome")),
      text(137, 34, "Cell membrane", "membrane"),
      line(150, 41, 161, 88, "membrane"),
      text(227, 176, "Nucleus", "nucleus"),
      text(421, 45, "Mitochondrion", "mitochondrion"),
      line(415, 52, 397, 109, "mitochondrion"),
      text(150, 335, "Ribosomes", "ribosome"),
      line(150, 313, 147, 215, "ribosome"),
      text(404, 335, "Cytoplasm", "cytoplasm"),
      line(395, 311, 351, 265, "cytoplasm"),
    ],
  },
  {
    id: "atom-cloud",
    title: "An atom is not a tiny solar system",
    branch: "chemistry",
    width: 600,
    height: 360,
    description:
      "A carbon-12 model separates a nucleus from a shaded electron-probability region.",
    limit:
      "Conceptual model, not to scale or a calculated probability plot. Electrons do not follow the drawn edges as planetary paths.",
    parts: [
      {
        id: "cloud",
        name: "Electron cloud",
        explanation:
          "Shading represents a region associated with the probability of finding electrons. A neutral carbon atom has six electrons in allowed energy states.",
      },
      {
        id: "protons",
        name: "Six protons",
        explanation:
          "Carbon's six protons give atomic number 6. Proton count identifies an element.",
      },
      {
        id: "neutrons",
        name: "Six neutrons",
        explanation:
          "This example is carbon-12: six protons plus six neutrons. Carbon-14 has eight neutrons instead.",
      },
      {
        id: "scale",
        name: "Model limits",
        explanation:
          "The nucleus is drawn much too large to show its contents clearly. The picture does not show literal electron tracks or the full quantum model.",
      },
    ],
    shapes: [
      ...[
        [145, 99],
        [115, 83],
        [85, 60],
      ].map(([rx, ry]) =>
        shape(
          "ellipse",
          {
            cx: 250,
            cy: 178,
            rx,
            ry,
            fill: "#92b6ce",
            opacity: 0.22,
            stroke: "none",
          },
          "cloud",
        ),
      ),
      ...[
        [235, 159],
        [254, 158],
        [272, 171],
        [259, 194],
        [238, 195],
        [222, 177],
      ].map(([x, y]) => circle(x, y, 10, "#edb2a0", "protons")),
      ...[
        [246, 175],
        [235, 179],
        [259, 177],
        [246, 194],
        [220, 159],
        [274, 193],
      ].map(([x, y]) => circle(x, y, 8, "#a3c39d", "neutrons")),
      text(436, 82, "Electron cloud", "cloud"),
      line(408, 91, 350, 126, "cloud"),
      text(420, 214, "Nucleus: 6 p + 6 n", "protons"),
      line(352, 203, 282, 183, "protons"),
      text(298, 324, "Carbon-12 · neutral atom: 6 electrons", "scale", 18),
    ],
  },
  {
    id: "water-cycle",
    title: "Follow a water molecule",
    branch: "earth",
    width: 600,
    height: 360,
    description:
      "Explore evaporation, condensation, precipitation and the return of water across land and sea.",
    limit:
      "Simplified pathways, not to scale. Water vapour is invisible; clouds contain tiny liquid droplets and/or ice particles.",
    parts: [
      {
        id: "evaporation",
        name: "Evaporation",
        explanation:
          "Liquid water changes to water vapour. Energy from the Sun supports evaporation from oceans, lakes, soil and other surfaces.",
      },
      {
        id: "condensation",
        name: "Condensation",
        explanation:
          "Water vapour can change to liquid droplets. Cloud formation also depends on atmospheric conditions and small particles.",
      },
      {
        id: "precipitation",
        name: "Precipitation",
        explanation:
          "Water falls from clouds as rain, snow or other forms when particles grow large enough under suitable conditions.",
      },
      {
        id: "runoff",
        name: "Runoff",
        explanation:
          "Water flows over land toward streams, lakes and oceans, influenced by gravity and the surface.",
      },
      {
        id: "groundwater",
        name: "Infiltration and groundwater",
        explanation:
          "Some water enters the ground and moves through pores and fractures. Plants can also return water to air by transpiration.",
      },
    ],
    shapes: [
      box(0, 280, 600, 80, "#dcecf1", "runoff"),
      box(272, 280, 328, 80, "#f1e5d4", "groundwater"),
      shape("polygon", {
        points: "250,280 426,130 570,280",
        fill: "#d5e4c8",
        stroke: "#62766c",
        "stroke-width": 2,
      }),
      circle(71, 56, 25, "#f4db91", "evaporation"),
      ...[
        [274, 87, 42],
        [320, 71, 47],
        [361, 92, 43],
      ].map(([x, y, r]) => ellipse(x, y, r, 27, "#edf0ee", "condensation")),
      ...arrow(132, 263, 132, 142, "evaporation"),
      ...arrow(142, 130, 237, 101, "evaporation"),
      ...arrow(363, 121, 400, 211, "precipitation"),
      ...arrow(423, 254, 229, 285, "runoff"),
      ...arrow(470, 281, 470, 337, "groundwater"),
      text(100, 197, "Evaporation", "evaporation", 17),
      text(315, 33, "Condensation", "condensation"),
      text(470, 105, "Precipitation", "precipitation", 17),
      text(308, 265, "Runoff", "runoff"),
      text(473, 356, "Infiltration", "groundwater", 16),
      text(104, 326, "Ocean / lake", "runoff"),
      text(356, 320, "Ground / soil", "groundwater", 16),
    ],
  },
  {
    id: "food-chain",
    title: "Energy flows; matter cycles",
    branch: "life",
    width: 600,
    height: 360,
    description:
      "Follow a simplified feeding chain and distinguish energy transfer from nutrient cycling.",
    limit:
      "A teaching model, not a complete food web. Transfer efficiencies vary; arrow directions identify the receiver of material and energy.",
    parts: [
      {
        id: "producer",
        name: "Producer",
        explanation:
          "Grass uses photosynthesis to build organic material using light energy, carbon dioxide and water.",
      },
      {
        id: "consumer",
        name: "Consumers",
        explanation:
          "A grasshopper eats plant material; a frog may eat the grasshopper. Arrows go from food toward the organism receiving it.",
      },
      {
        id: "heat",
        name: "Energy dispersal",
        explanation:
          "Organisms transfer energy and disperse some as heat during life processes. Energy is not recycled through the ecosystem in the same way as matter.",
      },
      {
        id: "decomposer",
        name: "Matter cycling",
        explanation:
          "Decomposers act on dead material and wastes. Nutrients can return to the environment and later be incorporated into living things.",
      },
    ],
    shapes: [
      circle(99, 50, 25, "#f4db91", "producer"),
      text(99, 96, "Sunlight", "producer"),
      ...arrow(99, 105, 99, 142, "producer"),
      box(36, 149, 128, 75, "#e0ead3", "producer"),
      text(100, 185, "Grass", "producer"),
      text(100, 207, "producer", "producer", 14),
      box(226, 149, 148, 75, "#f7e9c9", "consumer"),
      text(300, 188, "Grasshopper", "consumer", 17),
      box(436, 149, 128, 75, "#dcecf1", "consumer"),
      text(500, 188, "Frog", "consumer"),
      ...arrow(172, 185, 217, 185, "consumer"),
      ...arrow(382, 185, 427, 185, "consumer"),
      text(300, 260, "Life processes disperse energy as heat", "heat", 17),
      box(89, 282, 422, 49, "#f1e5d4", "decomposer"),
      text(300, 312, "Decomposers help cycle nutrients", "decomposer", 17),
    ],
  },
  {
    id: "circuit",
    title: "Close the path, light the lamp",
    branch: "physics",
    width: 640,
    height: 360,
    description:
      "Toggle a series switch and trace the circuit's conducting path.",
    limit:
      "Idealized circuit diagram. The cell transfers energy; charge is not used up by the lamp. Conventional-current arrows are shown only for a closed switch.",
    parts: [
      {
        id: "cell",
        name: "Cell / energy source",
        explanation:
          "The cell maintains a potential difference and transfers chemical energy to the circuit. The longer line marks its positive terminal.",
      },
      {
        id: "switch",
        name: "Switch",
        explanation:
          "A closed switch connects the conducting path. An open switch breaks it, stopping a sustained current in this simple series circuit.",
      },
      {
        id: "lamp",
        name: "Lamp",
        explanation:
          "The lamp transfers electrical energy to light and thermal energy when current flows through the closed circuit.",
      },
      {
        id: "wire",
        name: "Conventional current",
        explanation:
          "Outside the source, conventional current runs from positive toward negative. Electrons in a metal drift in the opposite direction.",
      },
    ],
    shapes: [
      shape(
        "path",
        {
          d: "M100 200 V80 H400 M480 80 H560 V170 M560 230 V320 H100 V240",
          fill: "none",
          stroke: "#526b60",
          "stroke-width": 4,
        },
        "wire",
      ),
      line(74, 200, 126, 200, "cell"),
      line(85, 240, 115, 240, "cell"),
      text(54, 201, "+", "cell", 23),
      text(54, 247, "−", "cell", 23),
      text(151, 232, "Cell", "cell"),
      circle(400, 80, 4, "#fffef9", "switch"),
      circle(480, 80, 4, "#fffef9", "switch"),
      { ...line(400, 80, 468, 42, "switch"), when: "open" },
      { ...line(400, 80, 480, 80, "switch"), when: "closed" },
      text(430, 119, "Switch", "switch"),
      { ...circle(560, 200, 30, "#fffef9", "lamp"), when: "open" },
      { ...circle(560, 200, 30, "#f4db91", "lamp"), when: "closed" },
      line(539, 179, 581, 221, "lamp"),
      line(539, 221, 581, 179, "lamp"),
      text(560, 268, "Lamp", "lamp"),
      ...arrow(230, 80, 290, 80, "wire").map((n) => ({
        ...n,
        when: "closed" as const,
      })),
      { ...text(280, 54, "Conventional current", "wire", 15), when: "closed" },
    ],
  },
  {
    id: "waves",
    title: "Read a transverse wave",
    branch: "physics",
    width: 640,
    height: 360,
    description:
      "Identify amplitude, wavelength and the distinction between wave travel and displacement.",
    limit:
      "A displacement-versus-position sketch, not a sound-pressure graph or a movie of particles travelling with a wave. Dimensions are illustrative.",
    parts: [
      {
        id: "wavelength",
        name: "Wavelength",
        explanation:
          "The horizontal distance between corresponding points, such as neighbouring crests. It is not the distance from a crest to the next trough.",
      },
      {
        id: "amplitude",
        name: "Amplitude",
        explanation:
          "Maximum displacement from the equilibrium line. Crest-to-trough displacement is twice the amplitude for this symmetric wave.",
      },
      {
        id: "wave",
        name: "Disturbance",
        explanation:
          "In a transverse wave, displacement is perpendicular to propagation. A medium's particles can move around equilibrium while the disturbance travels onward.",
      },
      {
        id: "travel",
        name: "Travel and speed",
        explanation:
          "Wave speed equals frequency times wavelength. For sound, the disturbance is mechanical; electromagnetic waves can also travel in a vacuum.",
      },
    ],
    shapes: [
      shape(
        "line",
        {
          x1: 45,
          y1: 170,
          x2: 570,
          y2: 170,
          stroke: "#85958b",
          "stroke-width": 2,
          "stroke-dasharray": "7 6",
        },
        "wave",
      ),
      shape(
        "polyline",
        {
          points: Array.from(
            { length: 121 },
            (_, i) =>
              `${60 + i * 4},${170 - 70 * Math.sin((i * Math.PI) / 30)}`,
          ).join(" "),
          fill: "none",
          stroke: "#507d9c",
          "stroke-width": 4,
        },
        "wave",
      ),
      ...arrow(120, 72, 360, 72, "wavelength"),
      ...arrow(360, 72, 120, 72, "wavelength"),
      text(240, 50, "Wavelength (λ)", "wavelength"),
      line(120, 99, 120, 169, "amplitude"),
      line(111, 100, 130, 100, "amplitude"),
      line(111, 170, 130, 170, "amplitude"),
      text(170, 135, "Amplitude", "amplitude", 16),
      text(484, 158, "Equilibrium", "wave", 15),
      ...arrow(380, 290, 531, 290, "travel"),
      text(453, 324, "Wave travel", "travel", 17),
      text(189, 292, "Displacement is up / down", "wave", 16),
    ],
  },
  {
    id: "rock-cycle",
    title: "Rocks can take many paths",
    branch: "earth",
    width: 640,
    height: 360,
    description:
      "Connect rock types to processes that transform or recycle their material.",
    limit:
      "Selected pathways only. Any exposed rock can weather; several rock types can undergo metamorphism or melting. This is not a compulsory one-way cycle.",
    parts: [
      {
        id: "igneous",
        name: "Cooling and solidification",
        explanation:
          "Igneous rocks form when molten material cools and solidifies. Cooling conditions influence texture.",
      },
      {
        id: "sediment",
        name: "Weathering and erosion",
        explanation:
          "Weathering breaks down or changes rocks. Erosion transports material; deposition places sediments elsewhere.",
      },
      {
        id: "sedimentary",
        name: "Sedimentary formation",
        explanation:
          "Burial, compaction and cementation can transform deposited sediments into rock. Other sedimentary rocks form by chemical or biological processes.",
      },
      {
        id: "metamorphic",
        name: "Metamorphism",
        explanation:
          "Heat, pressure and fluids can change solid rock without complete melting. Metamorphic rock is not simply cooled magma.",
      },
      {
        id: "magma",
        name: "Melting",
        explanation:
          "Suitable conditions can produce molten or partly molten material. If that material later solidifies, it forms igneous rock.",
      },
    ],
    shapes: [
      box(20, 60, 135, 65, "#ead9cc", "igneous"),
      text(87, 99, "Igneous", "igneous"),
      box(253, 60, 135, 65, "#f4e8c8", "sediment"),
      text(320, 99, "Sediment", "sediment"),
      box(485, 60, 142, 65, "#e1ebd7", "sedimentary"),
      text(556, 99, "Sedimentary", "sedimentary", 16),
      box(485, 260, 142, 65, "#e3dcec", "metamorphic"),
      text(556, 300, "Metamorphic", "metamorphic", 16),
      box(20, 260, 135, 65, "#f3d0bb", "magma"),
      text(87, 300, "Magma", "magma"),
      ...arrow(87, 250, 87, 137, "igneous"),
      text(140, 195, "Cooling", "igneous", 15),
      ...arrow(167, 91, 241, 91, "sediment"),
      text(206, 35, "Weathering / erosion", "sediment", 14),
      ...arrow(400, 91, 472, 91, "sedimentary"),
      text(438, 35, "Burial / cementation", "sedimentary", 14),
      ...arrow(556, 137, 556, 249, "metamorphic"),
      text(452, 193, "Heat + pressure", "metamorphic", 15),
      ...arrow(473, 293, 166, 293, "magma"),
      text(320, 324, "Melting", "magma", 16),
    ],
  },
  {
    id: "solar-system",
    title: "Eight planets, one star",
    branch: "earth",
    width: 660,
    height: 360,
    description:
      "Locate the eight planets in order from the Sun and compare what a classroom model can show.",
    limit:
      "Planet sizes, distances and spacing are deliberately NOT to scale. The Sun is a star; Pluto is a dwarf planet, not a ninth planet.",
    parts: [
      {
        id: "sun",
        name: "Sun",
        explanation:
          "The Sun is the star of our Solar System and contains most of its mass.",
      },
      {
        id: "mercury",
        name: "Mercury",
        explanation:
          "The innermost planet is rocky and has a very thin exosphere.",
      },
      {
        id: "venus",
        name: "Venus",
        explanation:
          "Venus has a dense carbon-dioxide atmosphere and a strong greenhouse effect.",
      },
      {
        id: "earth",
        name: "Earth",
        explanation:
          "Earth is a rocky planet with liquid surface water and one natural satellite, the Moon.",
      },
      {
        id: "mars",
        name: "Mars",
        explanation:
          "Mars is a rocky planet with a thin atmosphere. Evidence indicates liquid water flowed there in the past.",
      },
      {
        id: "jupiter",
        name: "Jupiter",
        explanation:
          "Jupiter is the largest planet. It is a gas giant; the picture greatly compresses its size relative to the Sun.",
      },
      {
        id: "saturn",
        name: "Saturn",
        explanation:
          "Saturn is a gas giant with a prominent ring system. Its rings are not solid hoops.",
      },
      {
        id: "uranus",
        name: "Uranus",
        explanation:
          "Uranus is an ice giant with a highly tilted rotation axis.",
      },
      {
        id: "neptune",
        name: "Neptune",
        explanation:
          "Neptune is the outermost of the eight recognized planets and is classified as an ice giant.",
      },
    ],
    shapes: [
      circle(46, 184, 31, "#f4ce78", "sun"),
      text(46, 250, "Sun", "sun"),
      ...[
        ["mercury", 114, 5, "#c6b9a3", 134],
        ["venus", 170, 9, "#e6c89c", 264],
        ["earth", 226, 10, "#96bdcf", 134],
        ["mars", 278, 7, "#d8a28b", 264],
        ["jupiter", 351, 25, "#d3ba9a", 123],
        ["saturn", 444, 21, "#e4d3a7", 282],
        ["uranus", 533, 15, "#bdd5cd", 123],
        ["neptune", 616, 15, "#90b0d2", 282],
      ].flatMap(([id, x, r, fill, y]) => [
        circle(Number(x), 184, Number(r), String(fill), String(id)),
        text(
          Number(x),
          Number(y),
          String(id).replace(/^./, (c) => c.toUpperCase()),
          String(id),
          16,
        ),
      ]),
      shape(
        "ellipse",
        {
          cx: 444,
          cy: 184,
          rx: 34,
          ry: 9,
          fill: "none",
          stroke: "#95896b",
          "stroke-width": 4,
          transform: "rotate(-18 444 184)",
        },
        "saturn",
      ),
      text(
        330,
        44,
        "Order from the Sun · sizes and distances NOT to scale",
        "sun",
        17,
      ),
      text(330, 332, "Pluto is a dwarf planet", "sun", 17),
    ],
  },
  {
    id: "investigation",
    title: "Design a fair comparison",
    branch: "skills",
    width: 640,
    height: 360,
    description:
      "Identify what changes, what is measured and what stays controlled in a light-and-growth example.",
    limit:
      "Constructed teaching example, not experimental results. Use replication and consider confounding variables in a real investigation.",
    parts: [
      {
        id: "independent",
        name: "Independent variable",
        explanation:
          "The deliberately changed condition in this example is daily light-exposure duration: two hours versus six hours.",
      },
      {
        id: "dependent",
        name: "Dependent variable",
        explanation:
          "Measure growth in a defined way, such as change in height in centimetres over ten days. Do not invent a result from the drawing.",
      },
      {
        id: "controlled",
        name: "Controlled conditions",
        explanation:
          "Use comparable plants, soil, pots, water, temperature and observation duration. Real comparisons should also include replication and consider other differences.",
      },
    ],
    shapes: [
      box(25, 34, 270, 230, "#edf3e5", "controlled"),
      box(345, 34, 270, 230, "#eef1f8", "controlled"),
      text(160, 75, "A: 2 h light / day", "independent", 19),
      text(480, 75, "B: 6 h light / day", "independent", 19),
      ...[160, 480].flatMap((x) => [
        shape(
          "polygon",
          {
            points: `${x - 33},195 ${x + 33},195 ${x + 23},245 ${x - 23},245`,
            fill: "#e9c8ac",
            stroke: "#62766c",
            "stroke-width": 2,
          },
          "controlled",
        ),
        line(x, 195, x, 126, "dependent"),
        ellipse(x - 15, 151, 19, 10, "#a2c18e", "dependent"),
        ellipse(x + 16, 130, 20, 10, "#bad19c", "dependent"),
      ]),
      text(320, 299, "Measure growth using the same method", "dependent", 18),
      text(
        320,
        333,
        "Same species, soil, pots, water and observation time",
        "controlled",
        16,
      ),
    ],
  },
];
export const figureById = (id: string) =>
  scienceFigures.find((figure) => figure.id === id);
