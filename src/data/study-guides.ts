export interface StudyGuide {
  deckId: string;
  introduction: string;
  ideas: [string, string][];
  terms: [string, string][];
  example: [string, string];
  remember: string;
  check: [string, string];
  figures: string[];
}
export const studyGuides: StudyGuide[] = [
  {
    deckId: "life.cells",
    introduction:
      "Cells are the basic units of living things. Learning what their parts do helps explain growth, transport and how organisms obtain energy.",
    ideas: [
      [
        "Shared foundations",
        "Cells have a cell membrane, cytoplasm, genetic material and ribosomes. Plant and animal cells are eukaryotic: their DNA is mainly inside a nucleus. Bacteria are cells too, but they do not have a membrane-bound nucleus.",
      ],
      [
        "Plant and animal cells",
        "Both usually contain mitochondria and carry out cellular respiration. Plant cells have a cellulose cell wall and commonly a large central vacuole. Photosynthetic plant cells contain chloroplasts; not every plant cell has them.",
      ],
      [
        "Moving materials",
        "Diffusion is the net movement of particles down a concentration gradient. Osmosis concerns water moving across a selectively permeable membrane. Active transport requires an energy input to move substances against an electrochemical gradient.",
      ],
    ],
    terms: [
      ["Organelle", "A specialized cell structure with a particular role."],
      [
        "Selectively permeable",
        "Allows some substances to cross more readily than others.",
      ],
    ],
    example: [
      "A root cell and a leaf cell",
      "A photosynthetic leaf cell may contain many chloroplasts. A root cell underground normally does not photosynthesize. Both are living plant cells and need cellular respiration.",
    ],
    remember:
      "A cell wall supports a plant cell; the cell membrane still regulates exchange. A nucleus is not present in every kind of cell.",
    check: [
      "Why can an animal cell respire even though it has no chloroplasts?",
      "Cellular respiration uses chemical energy from food. Chloroplasts carry out photosynthesis; they are not required for respiration.",
    ],
    figures: ["plant-cell", "animal-cell"],
  },
  {
    deckId: "life.body",
    introduction:
      "Anatomy studies body structures; physiology studies how they work. Explore the organ map, then follow oxygen and food to see how structures and body systems cooperate.",
    ideas: [
      [
        "From cells to a whole person",
        "Cells form tissues, tissues help make organs, and organs cooperate in organ systems. The heart contains several tissues, including muscle and nervous tissue; an organ is not made from just one cell type.",
      ],
      [
        "Finding the organs",
        "The brain is protected by the skull. The lungs and heart lie in the chest, above the diaphragm. The stomach and intestines occupy the abdomen. The kidneys lie toward the back of the abdominal cavity. A front-view diagram may show overlapping structures separately.",
      ],
      [
        "Exchange and transport",
        "The respiratory system exchanges gases with the environment. Oxygen moves from the lungs into blood, and circulation carries it toward tissues. Cells use oxygen in aerobic respiration; breathing and cellular respiration are different processes.",
      ],
      [
        "Food and waste",
        "Digestion breaks food into absorbable substances. Most nutrient absorption occurs in the small intestine. Kidneys help regulate water and dissolved substances and remove wastes from blood; this is different from removing undigested food.",
      ],
      [
        "Coordination and defence",
        "The nervous and endocrine systems help coordinate responses. Immune defences recognize and respond to threats. Healthy function depends on cooperation among organs, tissues and cells.",
      ],
    ],
    terms: [
      ["Anatomy", "The study of body structures and their relationships."],
      ["Physiology", "The study of how living structures function."],
      [
        "Organ",
        "A structure containing different tissues that work together, such as the heart.",
      ],
      [
        "Alveoli",
        "Tiny lung air sacs with thin walls where gases exchange with nearby blood.",
      ],
      ["Tissue", "A group of cells working together in a function."],
      [
        "Homeostasis",
        "Regulation that keeps internal conditions within workable ranges.",
      ],
    ],
    example: [
      "Following oxygen",
      "Air reaches the lungs, oxygen crosses into blood, and the heart helps move that blood to body tissues. Oxygen then enters cells, where it supports aerobic respiration.",
    ],
    remember:
      "Deoxygenated human blood is dark red, not blue. Blue in a diagram is a colour key, not the actual colour of the blood.",
    check: [
      "Why does faster breathing during exercise involve more than the lungs?",
      "Working muscles need more energy; respiration, circulation and coordination work together to support gas exchange and transport.",
    ],
    figures: ["human-anatomy", "animal-cell"],
  },
  {
    deckId: "life.genetics",
    introduction:
      "Heredity explains how genetic information passes between generations. Evolution concerns changes in populations over generations.",
    ideas: [
      [
        "Genes and alleles",
        "DNA carries genetic information. A gene is a region of DNA associated with a functional product; alleles are versions at a genetic locus. Many traits depend on several genes and environmental conditions.",
      ],
      [
        "Simple inheritance models",
        "A Punnett square tracks possible allele combinations under stated assumptions. For a simple dominant/recessive model, genotype describes the allele combination and phenotype describes an observable characteristic.",
      ],
      [
        "Natural selection",
        "Heritable variation, differences in survival or reproduction, and repeated generations can change a population. Individuals do not evolve a needed inherited trait simply because they try to adapt.",
      ],
    ],
    terms: [
      ["Genotype", "The allele combination considered in a genetic model."],
      ["Variation", "Differences among individuals in a population."],
    ],
    example: [
      "Aa × Aa",
      "Each parent supplies A or a with equal probability in this simple model. The possible genotypes are AA, Aa, Aa and aa: probabilities 1/4, 1/2 and 1/4. These are probabilities, not a guarantee for four offspring.",
    ],
    remember:
      "Dominant does not mean more common, better or stronger. Real inheritance is often more complex than a one-gene model.",
    check: [
      "Does an individual animal evolve during its lifetime?",
      "An individual develops and can respond to its surroundings. Evolution describes changes in populations across generations.",
    ],
    figures: ["animal-cell"],
  },
  {
    deckId: "life.ecosystems",
    introduction:
      "An ecosystem includes organisms and their physical surroundings. Follow both energy and matter to understand how its parts connect.",
    ideas: [
      [
        "Energy enters and moves",
        "Producers build organic material using an energy source, often sunlight. Consumers obtain chemical energy by eating. Food-chain arrows point from a food source toward the organism receiving its matter and energy.",
      ],
      [
        "Matter cycles",
        "Decomposers break down organic material and help return nutrients to the environment. Matter can cycle through living and nonliving parts. Energy flows through the system and is increasingly dispersed as heat.",
      ],
      [
        "Biodiversity and change",
        "Biodiversity includes variation within species, among species and among ecosystems. Changes to habitat or a population can affect feeding relationships and other interactions, not just one isolated species.",
      ],
    ],
    terms: [
      ["Population", "Members of one species living in a defined area."],
      ["Food web", "A model showing interconnected feeding relationships."],
    ],
    example: [
      "Grass → grasshopper → frog",
      "The arrow from grasshopper to frog means the frog obtains material and energy by eating the grasshopper. It does not mean the grasshopper eats the frog.",
    ],
    remember:
      "Energy-transfer percentages vary. The often-used 10% value is a rough teaching model, not a universal law for every food chain.",
    check: [
      "Do decomposers recycle all the energy in dead organisms?",
      "They recycle nutrients and other matter. Energy is transferred and dispersed as heat; it does not cycle back in the same way.",
    ],
    figures: ["food-chain"],
  },
  {
    deckId: "life.classification",
    introduction:
      "Classification helps us communicate about biodiversity and investigate relationships among organisms.",
    ideas: [
      [
        "Nested groups",
        "Organisms can be grouped in a hierarchy. Common ranks include domain, kingdom, phylum, class, order, family, genus and species. A species name normally combines the genus and a specific epithet.",
      ],
      [
        "Evidence of relationships",
        "Scientists compare structures, development and molecular evidence such as DNA. Similar appearance can be informative, but it can also result from similar ways of living rather than close ancestry.",
      ],
      [
        "Models can change",
        "Classification reflects evidence and can be revised. Bacteria and Archaea are distinct domains in a widely used modern framework. School kingdom schemes are useful models, not an unchanging count accepted in every context.",
      ],
    ],
    terms: [
      ["Taxonomy", "Naming and classifying organisms."],
      [
        "Common ancestor",
        "An ancestral population shared by descendant lineages.",
      ],
    ],
    example: [
      "A scientific name",
      "In Homo sapiens, Homo is the genus and sapiens is the specific epithet. The genus begins with a capital letter; the epithet does not. Both words are conventionally italicized when typeset.",
    ],
    remember:
      "Size, habitat or the ability to fly alone cannot establish a close evolutionary relationship.",
    check: [
      "Why might a classification change after DNA evidence is studied?",
      "New evidence can support different relationships from those inferred using appearance alone.",
    ],
    figures: [],
  },
  {
    deckId: "life.photosynthesis",
    introduction:
      "Photosynthesis and cellular respiration connect energy transformations with the cycling of carbon, oxygen and water.",
    ideas: [
      [
        "Capturing light energy",
        "Photosynthetic organisms use light energy to build organic substances from carbon dioxide and water. In plants, photosynthesis occurs in chloroplasts and releases oxygen. Light supplies energy, not the carbon atoms in a plant.",
      ],
      [
        "Releasing usable chemical energy",
        "Aerobic cellular respiration transfers chemical energy from food into forms cells can use, including ATP, while releasing carbon dioxide, water and heat. Plant cells respire as well as photosynthesize.",
      ],
      [
        "Following the matter",
        "Carbon in newly formed plant material comes largely from carbon dioxide. Water supplies other atoms and helps support growth. Mineral nutrients from soil matter, but soil is not the main source of a plant's dry mass.",
      ],
    ],
    terms: [
      [
        "Chlorophyll",
        "A pigment involved in absorbing light for photosynthesis.",
      ],
      ["ATP", "A molecule used in transferring energy within cells."],
    ],
    example: [
      "A plant at night",
      "In darkness, a typical green plant cannot carry out light-dependent photosynthesis, but its living cells continue cellular respiration using available chemical energy.",
    ],
    remember:
      "Plants do not only respire at night. Photosynthesis and respiration are not simply the same process running backwards inside the same organelle.",
    check: [
      "Where does most of the carbon in a growing tree come from?",
      "Carbon dioxide taken from the surroundings supplies the carbon that photosynthesis incorporates into organic molecules.",
    ],
    figures: ["plant-cell", "food-chain"],
  },
  {
    deckId: "chemistry.matter",
    introduction:
      "Matter has mass and occupies space. Particle models help explain states, mixtures and separation methods.",
    ideas: [
      [
        "States and particle motion",
        "In a solid, particles fluctuate around relatively fixed positions. Liquid particles can move past one another; gas particles are widely separated and move through their container. Heating changes particle motion and can cause a change of state.",
      ],
      [
        "Substances and mixtures",
        "An element contains one atomic number; a compound has elements chemically combined in a defined composition. A mixture contains substances together without all being chemically combined into one new substance.",
      ],
      [
        "Choosing a separation",
        "Separation methods use differences in properties. Filtration separates suitable insoluble particles from a fluid; evaporation or distillation can help separate some solutions. Choose a method that suits the materials and the desired product.",
      ],
    ],
    terms: [
      ["Solution", "A homogeneous mixture at the molecular or ionic scale."],
      [
        "Physical change",
        "A change that does not alter the chemical identities of the substances involved.",
      ],
    ],
    example: [
      "Salt water and a filter",
      "Dissolved ions usually pass through an ordinary classroom filter with the water. Filtering sand from water works because the insoluble grains are large enough to be retained.",
    ],
    remember:
      "During melting, the particles themselves do not usually melt into a different kind of particle; their arrangement and motion change.",
    check: [
      "Why is distillation different from simply filtering a solution?",
      "Distillation uses differences in volatility and involves vaporization and condensation. Ordinary filtration cannot retain individual dissolved ions.",
    ],
    figures: ["water-cycle"],
  },
  {
    deckId: "chemistry.atoms",
    introduction:
      "Elements are organized by atomic number. Use the periodic table to connect an atom's identity with its place in a larger pattern.",
    ideas: [
      [
        "Identity of an element",
        "Atomic number is the number of protons in the nucleus. A neutral atom has the same number of electrons as protons. Electrons occupy energy states and regions of probability, not miniature planetary paths.",
      ],
      [
        "Isotopes and ions",
        "Isotopes of an element have the same proton count but different neutron counts. An ion has gained or lost electrons. Changing electrons does not change the atomic number.",
      ],
      [
        "Reading the table",
        "Periods are rows and numbered groups are columns. Elements in a group can show related chemical behaviour. The separately displayed lanthanide and actinide series are still part of periods 6 and 7.",
      ],
    ],
    terms: [
      [
        "Mass number",
        "The total protons plus neutrons for a specified isotope.",
      ],
      ["Atomic number", "The proton count that defines an element."],
    ],
    example: [
      "Carbon-14",
      "Carbon has atomic number 6. Carbon-14 therefore has 6 protons and 14 − 6 = 8 neutrons. A neutral carbon-14 atom has 6 electrons.",
    ],
    remember:
      "Mass number, atomic number and a periodic table's standard atomic weight are different quantities. Do not round a weight to invent the neutron count of an unspecified atom.",
    check: [
      "If sodium loses one electron, does it become a different element?",
      "No. It becomes a sodium ion with a +1 charge; its 11 protons still identify it as sodium.",
    ],
    figures: ["atom-cloud"],
  },
  {
    deckId: "chemistry.bonding",
    introduction:
      "Bonding models explain how atoms form substances and why those substances have different properties.",
    ideas: [
      [
        "Ionic bonding",
        "Electron transfer can produce oppositely charged ions. Ionic bonding is the electrostatic attraction between ions; an ionic solid such as sodium chloride forms an extended lattice.",
      ],
      [
        "Covalent bonding",
        "Covalent bonding involves shared electron density between atoms. Small covalent molecules and giant covalent networks can have very different melting points and other properties.",
      ],
      [
        "Metallic bonding",
        "In a metal, mobile, delocalized electrons are associated with an array of metal centres. This model helps explain electrical conductivity and why many metals can be shaped without simply shattering.",
      ],
    ],
    terms: [
      ["Ion", "An atom or group of atoms with a net electric charge."],
      ["Lattice", "A repeating arrangement of particles in a solid."],
    ],
    example: [
      "NaCl",
      "In the simple ion model, sodium forms Na+ and chlorine forms Cl−. Their charges balance in a 1:1 ratio. The formula describes the ratio in a lattice, not an isolated molecule in a salt crystal.",
    ],
    remember:
      "The octet rule is a useful introductory pattern with exceptions. It does not explain every bond or every element.",
    check: [
      "Why can an ionic substance's solution conduct electricity?",
      "Dissolved ions can move and carry charge. In a rigid ionic crystal, those ions are not free to move through the material in the same way.",
    ],
    figures: ["atom-cloud", "circuit"],
  },
  {
    deckId: "chemistry.acids",
    introduction:
      "Acid–base ideas help describe aqueous solutions. Compare measurements carefully and distinguish strength from concentration.",
    ideas: [
      [
        "Acidic, neutral and basic",
        "For ordinary aqueous solutions near 25 °C, pH below 7 is acidic, pH 7 is neutral and pH above 7 is basic. Neutral pH depends on temperature; 0–14 is a common teaching range, not an absolute limit.",
      ],
      [
        "A logarithmic scale",
        "A difference of one pH unit corresponds approximately to a tenfold difference in hydrogen-ion concentration in dilute solutions. A small-looking numerical change can therefore represent a large chemical difference.",
      ],
      [
        "Strength and amount",
        "Acid strength concerns the extent of ionization under specified conditions. Concentration concerns how much solute is present in a volume. A strong acid can be dilute and a weak acid can be concentrated.",
      ],
    ],
    terms: [
      [
        "Indicator",
        "A substance whose observable change can help identify a chemical condition such as pH.",
      ],
      [
        "Neutralization",
        "An acid–base reaction; the final pH depends on the reactants and their amounts.",
      ],
    ],
    example: [
      "pH 3 and pH 4",
      "Under the dilute-solution approximation, a pH 3 solution has about ten times the hydrogen-ion concentration of a pH 4 solution.",
    ],
    remember:
      "A final solution is not automatically pH 7 after any acid and base are mixed. Never identify an unknown solution by tasting it.",
    check: [
      "Does 'weak acid' mean there is only a small amount of acid?",
      "No. Weak describes ionization behaviour; dilute describes a low concentration.",
    ],
    figures: [],
  },
  {
    deckId: "chemistry.reactions",
    introduction:
      "Chemical reactions rearrange atoms. Equations and energy changes help us describe the rearrangement.",
    ideas: [
      [
        "Conserving atoms",
        "Chemical equations show reactants and products. Balance equations by changing coefficients, keeping the formulas intact. In ordinary chemical reactions in a closed system, total mass is conserved.",
      ],
      [
        "Energy transfer",
        "An exothermic process transfers energy to its surroundings; an endothermic one takes energy from them. Breaking bonds requires energy, while forming bonds releases energy. The overall balance determines the net change.",
      ],
      [
        "Rate and catalysts",
        "Reaction rates depend on conditions such as temperature, concentration and exposed surface. A catalyst provides a different reaction pathway and is regenerated overall; it does not supply unlimited energy.",
      ],
    ],
    terms: [
      [
        "Coefficient",
        "A number multiplying a whole chemical formula in an equation.",
      ],
      ["Reactant", "A substance consumed in a chemical reaction."],
    ],
    example: [
      "Balancing water formation",
      "2 H2 + O2 → 2 H2O gives four hydrogen atoms and two oxygen atoms on each side. Changing H2O to H2O2 would describe a different substance, not a balancing step.",
    ],
    remember:
      "If gas escapes an open container, a balance may show less mass remaining inside. That does not mean the atoms were destroyed.",
    check: [
      "Can a catalyst create more atoms than the reactants contained?",
      "No. A catalyst can affect a reaction pathway and rate, but atom conservation still applies.",
    ],
    figures: ["atom-cloud"],
  },
  {
    deckId: "chemistry.gases",
    introduction:
      "Gas models connect the motion of particles with pressure, volume and temperature.",
    ideas: [
      [
        "Pressure from collisions",
        "Gas particles move and collide with the walls of a container. Pressure is force per unit area. The ideal-gas model makes simplifying assumptions that work best away from extreme conditions.",
      ],
      [
        "Controlled comparisons",
        "For a fixed amount of gas at constant temperature, pressure varies inversely with volume. At constant volume, increasing absolute temperature increases pressure in the ideal model.",
      ],
      [
        "Use absolute temperature",
        "Gas-law temperature ratios use kelvin. Convert from degrees Celsius using T in K = temperature in °C + 273.15. Stating what remains fixed is part of using a gas law correctly.",
      ],
    ],
    terms: [
      ["Pressure", "Force divided by area; the SI unit is the pascal."],
      [
        "Kelvin",
        "The SI unit of thermodynamic temperature, symbol K without a degree sign.",
      ],
    ],
    example: [
      "A volume change",
      "A fixed amount of gas at 100 kPa occupies 2 L. If temperature stays constant and volume becomes 4 L, Boyle's-law reasoning gives 50 kPa.",
    ],
    remember:
      "Doubling a Celsius reading does not generally double absolute temperature. Gas particles do not themselves swell to fill a larger container.",
    check: [
      "What must stay fixed when using the simple inverse pressure–volume relationship?",
      "The amount of gas and its temperature must remain constant, within the limits of the model.",
    ],
    figures: [],
  },
  {
    deckId: "physics.motion",
    introduction:
      "Describe motion with a reference frame, a measured time interval and clear directions.",
    ideas: [
      [
        "Distance and displacement",
        "Distance is the length of a path. Displacement describes the change from initial to final position, including direction. A round trip can have a nonzero distance and zero displacement.",
      ],
      [
        "Speed, velocity and acceleration",
        "Average speed is total distance divided by elapsed time. Average velocity uses displacement instead. Acceleration is a change in velocity per time, so a change of direction can be an acceleration even at constant speed.",
      ],
      [
        "Projectiles as a model",
        "Ignoring air resistance near Earth's surface, a projectile has downward gravitational acceleration. Horizontal and vertical motion can be analysed separately in this model.",
      ],
    ],
    terms: [
      ["Scalar", "A quantity described by magnitude, such as distance."],
      [
        "Vector",
        "A quantity with magnitude and direction, such as displacement.",
      ],
    ],
    example: [
      "A round trip",
      "A learner walks 30 m east and 30 m west in 60 s. Distance is 60 m and average speed is 1 m/s. Displacement and average velocity are zero.",
    ],
    remember:
      "Ignoring air resistance, a heavier object does not fall faster simply because it has greater mass.",
    check: [
      "Can a moving object have zero average velocity for a trip?",
      "Yes. If it returns to its starting position, its displacement is zero even though it travelled a distance.",
    ],
    figures: [],
  },
  {
    deckId: "physics.forces",
    introduction:
      "Forces are interactions. Draw the forces on one chosen object before deciding how its motion changes.",
    ideas: [
      [
        "Net force and inertia",
        "An object keeps a constant velocity when the net force is zero in an inertial reference frame. A net force changes velocity; in a simple constant-mass model, net force = mass × acceleration.",
      ],
      [
        "Interaction pairs",
        "Newton's third-law forces are equal and opposite forces acting on different objects. They do not cancel when calculating the net force on just one of those objects.",
      ],
      [
        "Mass and weight",
        "Mass is measured in kilograms. Weight is a gravitational force measured in newtons. Near Earth's surface, weight is approximately mass × 9.8 m/s²; mass stays the same when local gravitational strength changes.",
      ],
    ],
    terms: [
      ["Net force", "The vector sum of the forces acting on an object."],
      [
        "Inertia",
        "The tendency to retain a state of motion unless acted on by a net force.",
      ],
    ],
    example: [
      "A 3 kg cart",
      "A net force of 12 N on a 3 kg cart produces an acceleration of 12/3 = 4 m/s² in the direction of the net force.",
    ],
    remember:
      "An object moving steadily does not require a forward net force. Resistive forces may need balancing, but balanced forces mean zero acceleration.",
    check: [
      "Why do action–reaction forces not cancel the acceleration of one cart?",
      "The two forces act on different objects. Only forces acting on the chosen cart enter its net-force sum.",
    ],
    figures: [],
  },
  {
    deckId: "physics.energy",
    introduction:
      "Energy transfers and transformations connect movement, work and thermal processes.",
    ideas: [
      [
        "Work and power",
        "For a constant force parallel to a displacement, work = force × distance. Work and energy are measured in joules. Power is energy transferred or work done per time and is measured in watts.",
      ],
      [
        "Mechanical energy",
        "Kinetic energy is ½mv² in the ordinary low-speed model. Near Earth's surface, gravitational potential-energy change is approximately mg times the height change. Specify a system and reference level when tracking energy.",
      ],
      [
        "Heat and temperature",
        "Heat is energy transfer caused by a temperature difference. Temperature describes a thermal condition, not the total energy stored in a body. Conduction, convection and radiation are mechanisms of energy transfer.",
      ],
    ],
    terms: [
      ["Joule", "The SI unit of energy, symbol J."],
      ["Watt", "One joule transferred per second, symbol W."],
    ],
    example: [
      "Lifting a book",
      "Lifting a 2 kg object upward by 5 m near Earth increases its gravitational potential energy by about 2 × 9.8 × 5 = 98 J.",
    ],
    remember:
      "Heat and temperature are different. A larger amount of a substance can have more internal energy at the same temperature as a smaller amount.",
    check: [
      "If the same work is done in half the time, what happens to average power?",
      "Average power doubles because power is work divided by elapsed time.",
    ],
    figures: ["circuit"],
  },
  {
    deckId: "physics.waves",
    introduction:
      "A wave transfers energy through a disturbance. Identify which direction the wave travels and how the medium, if present, moves.",
    ideas: [
      [
        "Reading a wave",
        "Wavelength is the spacing between corresponding points such as adjacent crests. Frequency counts cycles per second, in hertz. Amplitude measures maximum displacement from an equilibrium position in a displacement-wave model.",
      ],
      [
        "Wave relationships",
        "Wave speed = frequency × wavelength. In a fixed medium with approximately constant speed, a higher frequency corresponds to a shorter wavelength. Period is the time per cycle and equals 1/frequency.",
      ],
      [
        "Sound needs matter",
        "Sound travels as mechanical disturbances in a medium. In air, compressions and rarefactions form a longitudinal wave. Light is electromagnetic radiation and can travel through a vacuum.",
      ],
    ],
    terms: [
      ["Hertz", "One cycle per second, symbol Hz."],
      [
        "Equilibrium",
        "The undisturbed reference position in a displacement model.",
      ],
    ],
    example: [
      "Finding wavelength",
      "A wave travelling at 12 m/s with frequency 3 Hz has wavelength 12/3 = 4 m. Keep the units with the calculation.",
    ],
    remember:
      "Wave motion does not mean a piece of the medium travels with the wave all the way from source to receiver. Amplitude and frequency are different properties.",
    check: [
      "Why can astronauts use radio in space but not speak through the vacuum directly?",
      "Radio waves are electromagnetic. Ordinary sound needs a material medium to carry its disturbance.",
    ],
    figures: ["waves"],
  },
  {
    deckId: "physics.light",
    introduction:
      "Visible light is one part of the electromagnetic spectrum. Models of waves and rays help explain familiar observations.",
    ideas: [
      [
        "The spectrum",
        "Radio, microwave, infrared, visible, ultraviolet, X-ray and gamma radiation are all electromagnetic. All travel at the same speed in a vacuum, approximately 3 × 10⁸ m/s; their frequencies and wavelengths differ.",
      ],
      [
        "Reflection and refraction",
        "Reflection angles are measured from the normal to a surface. Refraction can change a ray's direction when it enters a material in which its speed differs. Frequency remains the same across a stationary boundary.",
      ],
      [
        "Images and models",
        "Mirrors and lenses redirect light. A converging lens can make different kinds of images depending on object distance. A ray diagram uses straight lines as a model of light paths in suitable conditions.",
      ],
    ],
    terms: [
      ["Normal", "A line perpendicular to a surface at the point considered."],
      [
        "Refraction",
        "A change in wave direction associated with a speed change across a boundary, except at normal incidence.",
      ],
    ],
    example: [
      "Frequency and wavelength",
      "For electromagnetic waves in a vacuum, doubling frequency halves wavelength because their product remains the same speed.",
    ],
    remember:
      "Infrared is invisible electromagnetic radiation; it is not a separate material called heat. Light does not need air to travel.",
    check: [
      "Does blue light outrun red light in a vacuum?",
      "No. Both travel at the same vacuum speed. Their frequencies and wavelengths differ.",
    ],
    figures: ["waves"],
  },
  {
    deckId: "physics.electricity",
    introduction:
      "A circuit is a connected path for charge flow. Use labelled symbols and keep current, voltage and resistance distinct.",
    ideas: [
      [
        "Three different quantities",
        "Current is charge flow per time, in amperes. Potential difference, or voltage, is energy transferred per charge, in volts. Resistance describes the relation between voltage and current, in ohms.",
      ],
      [
        "Closed paths and branches",
        "A steady current needs a complete conducting path. Series components share a path and carry the same steady current. Parallel branches connect across the same two nodes and have the same potential difference.",
      ],
      [
        "Electricity and magnetism",
        "Electric current produces a magnetic field. Coils and suitable cores can strengthen electromagnets. Conventional current is defined in the direction positive charge would move; electrons in a metal drift the opposite way.",
      ],
    ],
    terms: [
      ["Ampere", "The SI unit of electric current, symbol A."],
      ["Ohm", "The SI unit of resistance, symbol Ω."],
    ],
    example: [
      "Ohm's law",
      "An ohmic resistor with resistance 3 Ω connected across 6 V has current I = V/R = 2 A, under conditions where that resistance stays constant.",
    ],
    remember:
      "A battery supplies energy to a circuit; it does not supply a fresh store of electrons that is used up by a lamp.",
    check: [
      "Why does opening a series switch turn a lamp off?",
      "The break removes the complete conducting path required for a sustained current.",
    ],
    figures: ["circuit"],
  },
  {
    deckId: "earth.plates",
    introduction:
      "Plate tectonics connects patterns in mountains, ocean floors, volcanoes and earthquakes.",
    ideas: [
      [
        "Moving solid plates",
        "The lithosphere includes crust and rigid uppermost mantle. Plates move over deeper material that can deform over long times. Earth's mantle is mostly solid; it is not a global ocean of liquid magma.",
      ],
      [
        "Boundaries",
        "Divergent boundaries separate, convergent boundaries approach, and transform boundaries slide past. The effects depend on the plate materials and the particular setting; a convergent boundary does not always make the same landform.",
      ],
      [
        "Evidence and the Philippines",
        "Seafloor ages, magnetic patterns, earthquakes, rock evidence and modern position measurements support plate motion. The Philippines lies in an active tectonic setting with complex plate interactions and subduction zones.",
      ],
    ],
    terms: [
      [
        "Subduction",
        "One plate descending beneath another at a convergent boundary.",
      ],
      ["Lithosphere", "The rigid outer layer divided into tectonic plates."],
    ],
    example: [
      "Matching several clues",
      "Matching continental outlines can suggest a question. Comparing fossils, rock belts and ocean-floor evidence provides additional, independent tests of plate-motion explanations.",
    ],
    remember:
      "Plate motion is usually slow on a human timescale, even though an earthquake can release accumulated strain rapidly.",
    check: [
      "Is the entire mantle liquid because plates move?",
      "No. Most mantle material is solid but can deform and flow over geological time.",
    ],
    figures: ["rock-cycle"],
  },
  {
    deckId: "earth.volcanoes",
    introduction:
      "Explore a volcano from its underground magma to its surface vents, then compare volcanic hazards with earthquakes. Both can relate to tectonic activity, but they arise through different processes.",
    ideas: [
      [
        "Inside a volcano",
        "Magma is molten or partly molten material below the surface. It can move through passages to a vent, where lava, gases or fragments may emerge. A crater is a surface depression around a vent. Real volcanoes have different shapes and plumbing systems; magma does not come from Earth's outer core.",
      ],
      [
        "Lava, ash and dangerous flows",
        "Lava is erupted molten rock. Volcanic ash consists of tiny rock, mineral and glass fragments. Pyroclastic flows are fast, hot mixtures of gas and volcanic material. A lahar mixes water with volcanic debris and can travel down river valleys, including after an eruption.",
      ],
      [
        "Why eruptions vary",
        "Magma composition, viscosity, gas content and changing pressure influence eruption behaviour. Gas can become trapped in viscous magma, supporting explosive activity. A volcano's appearance alone cannot tell you whether an area is safe.",
      ],
      [
        "Earthquake sources",
        "An earthquake often begins when rocks slip along a fault and release elastic strain energy. The focus is the source within Earth; the epicentre is the point on the surface above it.",
      ],
      [
        "Waves and measurements",
        "P waves travel through solids and fluids; S waves do not travel through liquids. Magnitude describes earthquake size using a defined scale, while intensity describes observed effects at a location.",
      ],
      [
        "Volcanic systems",
        "Magma is molten or partially molten material below the surface; lava is erupted material at the surface. Eruption behaviour depends on factors including composition, gases and conditions in the system.",
      ],
    ],
    terms: [
      ["Magma", "Molten or partly molten material below Earth's surface."],
      ["Lava", "Molten rock after it reaches the surface."],
      [
        "Vent",
        "An opening through which volcanic material reaches the surface.",
      ],
      ["Crater", "A surface depression surrounding a volcanic vent."],
      ["Lahar", "A flowing mixture of water and volcanic debris."],
      [
        "Pyroclastic flow",
        "A fast-moving, hot mixture of volcanic gas and solid fragments.",
      ],
      ["Fault", "A fracture or zone along which rocks have moved."],
      ["Epicentre", "The surface point above an earthquake's focus."],
    ],
    example: [
      "One earthquake, different effects",
      "Two towns can experience different shaking intensity from the same earthquake because distance, local ground conditions and structures differ.",
    ],
    remember:
      "These are study notes, not a current hazard bulletin or an earthquake prediction. Use current DOST–PHIVOLCS information and your school's preparedness instructions.",
    check: [
      "Does a single earthquake have the same intensity in every town?",
      "No. Intensity describes effects at each location and can vary widely.",
    ],
    figures: ["volcano-structure", "rock-cycle"],
  },
  {
    deckId: "earth.weather",
    introduction:
      "Weather describes atmospheric conditions at a place and time. Climate concerns longer-term patterns and variability.",
    ideas: [
      [
        "Air, water and energy",
        "Uneven solar heating, water movement and Earth's rotation help drive atmospheric motion. Water evaporates, condenses and falls as precipitation, linking the atmosphere with land and oceans.",
      ],
      [
        "Monsoons and tropical cyclones",
        "Monsoons involve seasonal changes in prevailing winds. Tropical cyclones require a combination of conditions; warm ocean water alone does not guarantee formation. Philippine forecasts and warnings are issued by DOST–PAGASA.",
      ],
      [
        "Climate and evidence",
        "Climate conclusions use long records and multiple kinds of evidence. Greenhouse gases absorb and emit infrared radiation, affecting Earth's energy balance. The greenhouse effect and ozone depletion are different topics.",
      ],
    ],
    terms: [
      [
        "Humidity",
        "A measure concerning water vapour in air; the meaning depends on the particular measure used.",
      ],
      [
        "Climate",
        "Long-term statistical patterns of weather and related conditions.",
      ],
    ],
    example: [
      "A rainy day",
      "One unusually rainy day describes weather. Comparing rainfall records across many years helps investigate climate patterns and changes.",
    ],
    remember:
      "A science diagram is not a live weather forecast. Consult current PAGASA advisories for weather decisions.",
    check: [
      "Does one cool afternoon disprove a long-term warming trend?",
      "No. A local short-term event and a long-term climate trend describe different scales.",
    ],
    figures: ["water-cycle"],
  },
  {
    deckId: "earth.solar",
    introduction:
      "The Solar System contains the Sun, eight planets, dwarf planets, moons and smaller bodies. Use models while remembering their scale limits.",
    ideas: [
      [
        "Our place in space",
        "The Sun is a star. Earth is a planet with one natural satellite, the Moon. Pluto is a dwarf planet; the eight recognized planets extend from Mercury to Neptune.",
      ],
      [
        "Phases and eclipses",
        "Moon phases result from our changing view of the Moon's sunlit half. An eclipse involves a particular alignment and shadow. Earth's shadow is not the explanation for the ordinary cycle of Moon phases.",
      ],
      [
        "Seasons",
        "Earth's axial tilt changes the angle and duration of sunlight over a year. Opposite hemispheres experience opposite seasons. Changing Earth–Sun distance is not the primary cause of seasons.",
      ],
    ],
    terms: [
      [
        "Orbit",
        "A gravitationally influenced path around another body or a shared centre of mass.",
      ],
      [
        "Axial tilt",
        "The inclination of a body's rotation axis relative to its orbital plane's perpendicular.",
      ],
    ],
    example: [
      "Opposite seasons",
      "When the Northern Hemisphere is tilted toward the Sun, it receives longer days and more direct sunlight while the Southern Hemisphere is tilted away.",
    ],
    remember:
      "A classroom Solar System picture cannot show both sizes and distances accurately at the same convenient scale. Read its scale note.",
    check: [
      "Is a half Moon normally caused by Earth's shadow covering half of it?",
      "No. We see part of the illuminated half from our viewing direction; Earth's shadow is involved in a lunar eclipse.",
    ],
    figures: ["solar-system"],
  },
  {
    deckId: "earth.stars",
    introduction:
      "Astronomy studies very large distances and long histories using light, physical models and observations.",
    ideas: [
      [
        "Stars and energy",
        "Stars such as the Sun produce energy through nuclear fusion in their interiors. Their surface temperatures relate to colour; hotter stellar surfaces tend to appear bluer than cooler red ones.",
      ],
      [
        "Brightness and distance",
        "Apparent brightness depends on both a source's luminosity and its distance, as well as intervening material. A light-year is a distance: the distance light travels in one year in a vacuum.",
      ],
      [
        "Galaxies and scale",
        "Our Sun is one star in the Milky Way galaxy. Galaxies contain stars, gas, dust and other matter. Stellar life histories depend strongly on mass, so not every star ends its life in the same way.",
      ],
    ],
    terms: [
      ["Luminosity", "The rate at which a source emits energy."],
      ["Light-year", "A unit of distance, not an age."],
    ],
    example: [
      "Seeing the past",
      "Ignoring other complications, light from a star 10 light-years away takes about 10 years to reach us. We observe information emitted years earlier.",
    ],
    remember:
      "A star that looks dim is not necessarily intrinsically faint. It may be much farther away.",
    check: [
      "Why is 'the star is five light-years old' a unit mistake?",
      "Light-years measure distance. An age needs a time unit, such as years.",
    ],
    figures: ["solar-system"],
  },
  {
    deckId: "earth.rocks",
    introduction:
      "Rock and water cycles describe connected processes. Neither is a single compulsory route followed by every sample.",
    ideas: [
      [
        "Rock formation",
        "Igneous rocks form when molten material cools and solidifies. Sedimentary rocks can form as sediments are deposited, compacted and cemented. Metamorphic rocks form through changes caused by conditions such as heat and pressure without complete melting.",
      ],
      [
        "Changing landscapes",
        "Weathering breaks down or alters material. Erosion transports it, and deposition places it elsewhere. Many different pathways connect rock types over geological time.",
      ],
      [
        "Water in motion",
        "Solar energy supports evaporation and gravity helps move water through precipitation, runoff and groundwater flow. Plants release water through transpiration. Groundwater often fills pores and fractures rather than giant open underground lakes.",
      ],
    ],
    terms: [
      [
        "Weathering",
        "Breaking down or chemically altering material near Earth's surface.",
      ],
      ["Infiltration", "Water entering the ground from the surface."],
    ],
    example: [
      "A grain of sand",
      "Weathering can release a grain from a rock. Water can erode and transport it; slowing water may deposit it. Burial and other processes can later help form sedimentary rock.",
    ],
    remember:
      "Metamorphism is not the same as melting. Once rock melts and then solidifies, the resulting rock is igneous.",
    check: [
      "Can an igneous rock become sediment without first becoming metamorphic?",
      "Yes. Weathering and erosion can produce sediment from any exposed rock type under suitable conditions.",
    ],
    figures: ["rock-cycle", "water-cycle"],
  },
  {
    deckId: "skills.method",
    introduction:
      "Scientific investigation connects questions, evidence and explanations. It is iterative, not a single rigid checklist for every kind of science.",
    ideas: [
      [
        "Ask something testable",
        "A useful question states what will be observed or compared. Define how a variable will be measured so another investigator can understand or repeat the work.",
      ],
      [
        "Design a fair comparison",
        "An independent variable is deliberately changed in a simple experiment; a dependent variable is measured. Controlled conditions help reduce alternative explanations. Observational studies also provide scientific evidence when experiments are not suitable.",
      ],
      [
        "Evaluate evidence",
        "Repeated measurements, comparison groups when appropriate, uncertainty and possible bias affect interpretation. A result can support an explanation without proving it beyond all possible revision.",
      ],
    ],
    terms: [
      [
        "Hypothesis",
        "A testable proposed explanation or prediction within an investigation.",
      ],
      [
        "Controlled variable",
        "A condition held consistent to make a comparison more informative.",
      ],
    ],
    example: [
      "Light and plant growth",
      "Compare light exposure while using comparable plants and keeping water, soil, pot size and duration consistent. Measure growth with a defined method. State the limits of the comparison.",
    ],
    remember:
      "Change one variable at a time is useful for simple controlled experiments; it is not a claim that all valid science must use that exact design.",
    check: [
      "Why report how you measured growth, not just 'the plants grew more'?",
      "A defined measurement makes the evidence interpretable and helps another person repeat or evaluate the comparison.",
    ],
    figures: ["investigation"],
  },
  {
    deckId: "skills.measurement",
    introduction:
      "A measurement combines a value, a unit and an understanding of uncertainty. Good records make comparisons possible.",
    ideas: [
      [
        "SI foundations",
        "The seven SI base units are metre (m), kilogram (kg), second (s), ampere (A), kelvin (K), mole (mol) and candela (cd). Derived units combine base units; for example, speed can be measured in m/s.",
      ],
      [
        "Converting units",
        "A prefix changes scale: centi means 10⁻² and milli means 10⁻³. Multiply by an equivalent unit ratio so unwanted units cancel. Keep units visible rather than treating them as decoration.",
      ],
      [
        "Precision and accuracy",
        "Precision concerns agreement or spread among repeated measurements. Accuracy concerns closeness to a reference value. Instrument resolution, calibration and procedure all affect what a measurement can support.",
      ],
    ],
    terms: [
      [
        "Resolution",
        "The smallest displayed or distinguishable change on an instrument.",
      ],
      [
        "Uncertainty",
        "A quantified or described limitation in knowledge of a measurement value.",
      ],
    ],
    example: [
      "Centimetres to metres",
      "2.5 cm × (1 m / 100 cm) = 0.025 m. The centimetre units cancel, and the smaller numerical value is consistent with using a larger unit.",
    ],
    remember:
      "Mass and weight use different units and describe different quantities. More digits in a display do not automatically mean greater accuracy.",
    check: [
      "Can repeated results be precise but inaccurate?",
      "Yes. They may agree closely with one another while a calibration error shifts all of them away from a reference value.",
    ],
    figures: ["investigation"],
  },
  {
    deckId: "skills.data",
    introduction:
      "Organized data help make evidence understandable. A clear graph and a safe method are both parts of useful science.",
    ideas: [
      [
        "Choose a display",
        "Bar charts compare categories, line graphs can show ordered changes, and scatter plots help examine associations. Label axes and units, state what was measured and choose scales that do not mislead.",
      ],
      [
        "Describe a pattern carefully",
        "A mean is the sum divided by the number of values; a median is the middle of sorted data. Outliers can affect summaries. An association on a graph does not by itself show that one variable causes another.",
      ],
      [
        "Work safely",
        "Follow the teacher's procedure and use appropriate protective equipment. Read labels, keep food away from lab work, never taste unknown substances or pipette by mouth, and report spills or damaged equipment promptly.",
      ],
    ],
    terms: [
      ["Mean", "The arithmetic average of a set of numerical values."],
      [
        "Correlation",
        "An association between variables that does not alone establish causation.",
      ],
    ],
    example: [
      "A small dataset",
      "For 2, 3 and 10, the mean is 5 and the median is 3. Both calculations are correct, but they emphasize different aspects of the data.",
    ],
    remember:
      "A steep-looking line can result from the chosen axis scale. Inspect labels and numbers before interpreting the visual impression.",
    check: [
      "Why is 'these two quantities rise together' insufficient to establish a cause?",
      "Other variables, chance or reverse direction can help explain the association. A stronger design and additional evidence are needed.",
    ],
    figures: ["investigation"],
  },
];
export const guideByDeck = (id: string) =>
  studyGuides.find((guide) => guide.deckId === id);
