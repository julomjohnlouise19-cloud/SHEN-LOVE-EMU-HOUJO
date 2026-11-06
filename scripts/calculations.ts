export interface Calculation {
  prompt: string;
  answer: string;
  unit: string;
  explanation: string;
  ph?: boolean;
}
const calc = (
  prompt: string,
  answer: string,
  unit: string,
  explanation: string,
  ph = true,
): Calculation => ({ prompt, answer, unit, explanation, ph });
// Fixed, hand-checked questions. These count toward the static pool, separately from the seeded generators.
export const calculations: Record<string, Calculation[]> = {
  "chemistry.matter": [
    calc(
      "A Philippine lab sample has mass 240 kg and volume 0.12 m³. What is its density?",
      "2000",
      "kg/m³",
      "Density = mass ÷ volume = 240 ÷ 0.12 = 2000 kg/m³.",
    ),
    calc(
      "A Cebu class dissolves 5 g of salt in 95 g of water. What percent of the solution’s mass is salt?",
      "5",
      "%",
      "The solution has mass 100 g. Salt makes up 5 ÷ 100 × 100 = 5%.",
    ),
    calc(
      "A Manila class separates a 50 g sand-salt mixture. It recovers 18 g of sand with no losses. What mass is salt?",
      "32",
      "g",
      "Conservation of mass gives 50 − 18 = 32 g of salt.",
    ),
  ],
  "chemistry.atoms": [
    calc(
      "A Philippine atom model has 11 protons and 12 neutrons. What is its mass number?",
      "23",
      "",
      "Mass number counts protons plus neutrons: 11 + 12 = 23.",
    ),
    calc(
      "A Cebu class models an atom with mass number 31 and 15 protons. How many neutrons does it have?",
      "16",
      "",
      "Neutrons = mass number − protons = 31 − 15 = 16.",
    ),
    calc(
      "A Manila class models a neutral oxygen atom with 8 protons. How many electrons must it have?",
      "8",
      "",
      "A neutral atom has equal proton and electron counts, so it has 8 electrons.",
    ),
  ],
  "chemistry.acids": [
    calc(
      "A dilute solution in a Philippine lab has [H⁺] = 10⁻³ mol/L. Using pH = −log₁₀[H⁺], what is its pH?",
      "3",
      "",
      "The negative base-ten logarithm of 10⁻³ is 3, so the pH is 3.",
    ),
    calc(
      "A Cebu lab compares pH 2 and pH 4 dilute solutions. How many times greater is [H⁺] at pH 2?",
      "100",
      "times",
      "Two pH units mean a factor of 10². The pH 2 sample has 100 times the hydrogen-ion concentration.",
    ),
    calc(
      "A Manila lab dilutes a pH 3 strong acid tenfold. Assume full dissociation and negligible water contribution. What is its approximate new pH?",
      "4",
      "",
      "Tenfold dilution lowers the hydrogen-ion concentration by a factor of ten. The pH rises by one unit, from 3 to 4.",
    ),
  ],
  "chemistry.gases": [
    calc(
      "A Cebu lab seals a gas at 100 kPa and 0.04 m³. At fixed temperature, pressure rises to 200 kPa. What volume results?",
      "0.02",
      "m³",
      "Boyle’s law gives V₂ = P₁V₁ ÷ P₂ = 100 × 0.04 ÷ 200 = 0.02 m³.",
    ),
    calc(
      "A Philippine gas sample has volume 0.03 m³ at 300 K. At fixed pressure, it warms to 400 K. What is its volume?",
      "0.04",
      "m³",
      "Charles’s law gives V₂ = V₁T₂ ÷ T₁ = 0.03 × 400 ÷ 300 = 0.04 m³.",
    ),
    calc(
      "A Manila lab holds a gas at fixed volume. Pressure is 100 kPa at 300 K. What is its pressure at 600 K?",
      "200",
      "kPa",
      "At fixed volume, P/T is constant for a fixed ideal gas amount. Doubling kelvin temperature doubles pressure.",
    ),
  ],
  "physics.motion": [
    calc(
      "A jeepney travels 180 m in 15 s, then stops for 5 s. What is its average speed for the whole 20 s?",
      "9",
      "m/s",
      "Average speed = total distance ÷ total time = 180 ÷ 20 = 9 m/s. Include the stop time.",
    ),
    calc(
      "A cyclist in Cebu goes 60 m east, then 20 m west in 10 s. What is the eastward average velocity?",
      "4",
      "m/s",
      "Net eastward displacement is 60 − 20 = 40 m. Average velocity is 40 ÷ 10 = 4 m/s east.",
    ),
    calc(
      "A Manila cart changes velocity from 2 m/s east to 10 m/s east in 4 s. What is its eastward acceleration?",
      "2",
      "m/s²",
      "Acceleration = change in velocity ÷ time = (10 − 2) ÷ 4 = 2 m/s² east.",
    ),
  ],
  "physics.forces": [
    calc(
      "A Philippine lab cart has mass 4 kg. Forces of 20 N east and 8 N west act on it. What is its eastward acceleration?",
      "3",
      "m/s²",
      "Net force is 20 − 8 = 12 N east. Acceleration = 12 ÷ 4 = 3 m/s² east.",
    ),
    calc(
      "A Cebu lab cart has mass 3 kg and speeds up at 4 m/s². What net force is needed?",
      "12",
      "N",
      "Newton’s second law gives net force = mass × acceleration = 3 × 4 = 12 N.",
    ),
    calc(
      "A Philippine rice sack has mass 5 kg. Use g = 10 m/s². What is its weight near Earth’s surface?",
      "50",
      "N",
      "Weight = mass × gravitational acceleration = 5 × 10 = 50 N. Mass and weight use different units.",
    ),
  ],
  "physics.energy": [
    calc(
      "A Philippine lab cart has mass 2 kg and speed 3 m/s. What is its kinetic energy?",
      "9",
      "J",
      "Kinetic energy = ½mv² = ½ × 2 × 3² = 9 J. Squaring the speed is essential.",
    ),
    calc(
      "A farmer lifts a 4 kg rice sack 2 m above a reference level. Use g = 10 m/s². How much gravitational potential energy is added?",
      "80",
      "J",
      "Potential energy added = mgh = 4 × 10 × 2 = 80 J.",
    ),
    calc(
      "A Cebu student does 120 J of work in 6 s. What is the average power?",
      "20",
      "W",
      "Average power = work ÷ time = 120 ÷ 6 = 20 W.",
    ),
  ],
  "physics.waves": [
    calc(
      "A Philippine coastal wave model has wavelength 3 m and frequency 2 Hz. What is its speed?",
      "6",
      "m/s",
      "Wave speed = frequency × wavelength = 2 × 3 = 6 m/s.",
    ),
    calc(
      "A kulintang sound wave has speed 340 m/s and frequency 680 Hz. What is its wavelength?",
      "0.5",
      "m",
      "Wavelength = wave speed ÷ frequency = 340 ÷ 680 = 0.5 m.",
    ),
    calc(
      "A Cebu student hears an echo after 2 s. Sound speed is 340 m/s. How far away is the reflecting wall?",
      "340",
      "m",
      "Sound travels to the wall and back. Distance to the wall = speed × time ÷ 2 = 340 × 2 ÷ 2 = 340 m.",
    ),
  ],
  "physics.electricity": [
    calc(
      "A Philippine lab has a 12 V supply across a 4 Ω resistor. What current flows?",
      "3",
      "A",
      "Ohm’s law gives I = V ÷ R = 12 ÷ 4 = 3 A.",
    ),
    calc(
      "A Cebu class connects 3 Ω and 5 Ω resistors in series. What is the total resistance?",
      "8",
      "Ω",
      "Series resistances add: 3 + 5 = 8 Ω.",
    ),
    calc(
      "A Manila class connects two 6 Ω resistors in parallel. What is their equivalent resistance?",
      "3",
      "Ω",
      "For two equal resistors in parallel, equivalent resistance is half one resistance: 6 ÷ 2 = 3 Ω.",
    ),
  ],
  "life.genetics": [
    calc(
      "A Philippine pea study crosses Aa × Aa. What percent of offspring are expected to have genotype aa?",
      "25",
      "%",
      "The four equally likely combinations are AA, Aa, Aa and aa. One out of four is aa, giving 25%.",
    ),
    calc(
      "A Cebu class predicts an aa probability of 1/4 in a pea cross. Out of 80 offspring, what is the expected aa count?",
      "20",
      "",
      "Expected count = total × probability = 80 × ¼ = 20. Actual counts may vary by chance.",
    ),
    calc(
      "A Manila class models Aa × aa with equal allele chances. What percent of offspring are expected to be Aa?",
      "50",
      "%",
      "The first parent passes A or a equally; the second passes a. Half the expected pairs are Aa.",
    ),
  ],
  "skills.measurement": [
    calc(
      "A Philippine rice plot is 2.5 m wide. What is the width in centimeters?",
      "250",
      "cm",
      "One meter is 100 cm. Multiply 2.5 by 100 to get 250 cm.",
    ),
    calc(
      "A Cebu lab measures a mass of 3500 g. What is that mass in kilograms?",
      "3.5",
      "kg",
      "One kilogram is 1000 g. Divide 3500 by 1000 to get 3.5 kg.",
    ),
    calc(
      "A Manila lab measures a rectangular block, 2 m by 3 m by 4 m. What is its volume?",
      "24",
      "m³",
      "A rectangular block’s volume is length × width × height = 2 × 3 × 4 = 24 m³.",
    ),
  ],
  "skills.data": [
    calc(
      "A Philippine rice trial records heights of 4, 6 and 8 cm. What is the mean height?",
      "6",
      "cm",
      "The mean is (4 + 6 + 8) ÷ 3 = 18 ÷ 3 = 6 cm.",
    ),
    calc(
      "A Cebu plant study records 3, 7, 8 and 10 cm of growth. What is the range?",
      "7",
      "cm",
      "Range = highest value − lowest value = 10 − 3 = 7 cm.",
    ),
    calc(
      "A Manila class counts 12 sprouted seeds out of 20. What percent sprouted?",
      "60",
      "%",
      "Percent sprouted = 12 ÷ 20 × 100 = 60%.",
    ),
  ],
};
