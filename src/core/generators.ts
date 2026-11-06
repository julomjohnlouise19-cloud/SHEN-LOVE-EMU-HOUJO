import type { RNG } from "./types";
export interface Generated {
  prompt: string;
  answer: number;
  unit: string;
  distractors: number[];
  values: Record<string, number>;
}
const integer = (rng: RNG, min: number, max: number) =>
  min + Math.floor(rng.next() * (max - min + 1));
const item = (
  prompt: string,
  answer: number,
  unit: string,
  values: Record<string, number>,
  distractors: number[],
): Generated => ({
  prompt,
  answer,
  unit,
  values,
  distractors: [
    ...new Set(distractors.map((v) => Math.round(v * 1000) / 1000)),
  ].filter((v) => Math.abs(v - answer) > 0.001),
});
// Distractors model inverse/addition mistakes, missed factors, prefix errors, confusing weight with net force, and assuming zero energy for steady motion.
export const generators: Record<string, (rng: RNG) => Generated> = {
  distance: (rng) => {
    const speed = integer(rng, 2, 20),
      time = integer(rng, 2, 12);
    return item(
      `A cart moves at ${speed} m/s for ${time} s. How far does it travel?`,
      speed * time,
      "m",
      { speed, time },
      [speed / time, time / speed, speed + time, speed, speed * time * 3.6],
    );
  },
  time: (rng) => {
    const speed = integer(rng, 2, 20),
      time = integer(rng, 2, 12),
      distance = speed * time;
    return item(
      `A cart covers ${distance} m at a steady ${speed} m/s. How long does it take?`,
      time,
      "s",
      { speed, distance },
      [speed / distance, distance * speed, distance - speed, distance],
    );
  },
  speed: (rng) => {
    const speed = integer(rng, 2, 20),
      time = integer(rng, 2, 12),
      distance = speed * time;
    return item(
      `A cart travels ${distance} m in ${time} s. What is its average speed?`,
      speed,
      "m/s",
      { distance, time },
      [distance * time, time / distance, distance - time, distance],
    );
  },
  density: (rng) => {
    const density = integer(rng, 2, 12),
      volume = integer(rng, 2, 20),
      mass = density * volume;
    return item(
      `A sample has mass ${mass} kg and volume ${volume} m³. What is its density?`,
      density,
      "kg/m³",
      { mass, volume },
      [mass * volume, volume / mass, mass - volume, mass],
    );
  },
  force: (rng) => {
    const mass = integer(rng, 2, 15),
      acceleration = integer(rng, 2, 10);
    return item(
      `A ${mass} kg cart speeds up at ${acceleration} m/s². What net force acts on it?`,
      mass * acceleration,
      "N",
      { mass, acceleration },
      [
        mass / acceleration,
        mass + acceleration,
        acceleration / mass,
        mass * 9.8,
        0,
      ],
    );
  },
  work: (rng) => {
    const force = integer(rng, 2, 20),
      distance = integer(rng, 2, 15);
    return item(
      `A ${force} N force moves a box ${distance} m in the force's direction. How much work is done?`,
      force * distance,
      "J",
      { force, distance },
      [
        force / distance,
        force + distance,
        distance / force,
        force,
        force * distance * 100,
      ],
    );
  },
  power: (rng) => {
    const power = integer(rng, 2, 20),
      time = integer(rng, 2, 20),
      work = power * time;
    return item(
      `A motor does ${work} J of work in ${time} s. What is its average power?`,
      power,
      "W",
      { work, time },
      [work * time, time / work, work - time, work],
    );
  },
  kinetic: (rng) => {
    const mass = integer(rng, 1, 10) * 2,
      speed = integer(rng, 2, 10);
    return item(
      `A ${mass} kg cart moves at ${speed} m/s. What is its kinetic energy?`,
      0.5 * mass * speed ** 2,
      "J",
      { mass, speed },
      [mass * speed, mass * speed ** 2, 0.5 * mass * speed, 0],
    );
  },
  potential: (rng) => {
    const mass = integer(rng, 1, 10),
      height = integer(rng, 2, 12),
      gravity = 10;
    return item(
      `A ${mass} kg object is ${height} m above a reference level. Use g = 10 m/s². What is its gravitational potential energy?`,
      mass * gravity * height,
      "J",
      { mass, height, gravity },
      [mass * height, (mass * gravity) / height, mass + gravity + height, 0],
    );
  },
  ohm: (rng) => {
    const current = integer(rng, 2, 10),
      resistance = integer(rng, 2, 10),
      voltage = current * resistance;
    return item(
      `A resistor has ${voltage} V across it and resistance ${resistance} Ω. What current flows?`,
      current,
      "A",
      { voltage, resistance },
      [
        voltage * resistance,
        resistance / voltage,
        voltage - resistance,
        voltage,
      ],
    );
  },
  series: (rng) => {
    const r1 = integer(rng, 2, 15),
      r2 = integer(rng, 2, 15);
    return item(
      `Resistors of ${r1} Ω and ${r2} Ω are connected in series. What is the total resistance?`,
      r1 + r2,
      "Ω",
      { r1, r2 },
      [(r1 * r2) / (r1 + r2), r1 * r2, Math.abs(r1 - r2), r1],
    );
  },
  parallel: (rng) => {
    const r1 = integer(rng, 2, 10) * 2,
      r2 = r1;
    return item(
      `Two ${r1} Ω resistors are connected in parallel. What is their equivalent resistance?`,
      r1 / 2,
      "Ω",
      { r1, r2 },
      [r1 + r2, r1 * r2, 2 / r1, r1, 1 / (r1 + r2)],
    );
  },
  wave: (rng) => {
    const frequency = integer(rng, 2, 20),
      wavelength = integer(rng, 2, 12);
    return item(
      `A wave has frequency ${frequency} Hz and wavelength ${wavelength} m. What is its speed?`,
      frequency * wavelength,
      "m/s",
      { frequency, wavelength },
      [
        frequency / wavelength,
        wavelength / frequency,
        frequency + wavelength,
        frequency,
        0,
      ],
    );
  },
  boyle: (rng) => {
    const p1 = integer(rng, 2, 6) * 100,
      v1 = integer(rng, 2, 10),
      p2 = p1 * 2;
    return item(
      `At constant temperature, a gas occupies ${v1} m³ at ${p1} Pa. Pressure rises to ${p2} Pa. What is its new volume?`,
      v1 / 2,
      "m³",
      { p1, v1, p2 },
      [v1 * 2, v1, (p1 * p2) / v1],
    );
  },
  charles: (rng) => {
    const v1 = integer(rng, 2, 10),
      t1 = integer(rng, 2, 4) * 100,
      t2 = t1 * 2;
    return item(
      `At constant pressure, a gas occupies ${v1} m³ at ${t1} K. It warms to ${t2} K. What is its new volume?`,
      v1 * 2,
      "m³",
      { v1, t1, t2 },
      [v1 / 2, v1, (v1 * (t2 - 273.15)) / (t1 - 273.15)],
    );
  },
  massNumber: (rng) => {
    const protons = integer(rng, 2, 30),
      neutrons = integer(rng, 2, 35);
    return item(
      `An atom has ${protons} protons and ${neutrons} neutrons. What is its mass number?`,
      protons + neutrons,
      "",
      { protons, neutrons },
      [
        protons,
        neutrons,
        protons * neutrons,
        protons - neutrons,
        2 * protons + neutrons,
      ],
    );
  },
  ratio: (rng) => {
    const part = integer(rng, 1, 4),
      total = 5;
    return item(
      `${part} of ${total} seedlings sprout. What percent sprout?`,
      (part / total) * 100,
      "%",
      { part, total },
      [part / total, (total / part) * 100, total - part],
    );
  },
  ph: (rng) => {
    const exponent = integer(rng, 1, 13);
    return item(
      `A dilute solution has [H⁺] = 10⁻${exponent} mol/L. Using pH = −log₁₀[H⁺], what is its pH?`,
      exponent,
      "",
      { exponent },
      [-exponent, 14 - exponent, 10 ** -exponent, 14 + exponent],
    );
  },
  punnett: (rng) => {
    const count = integer(rng, 1, 4) * 4;
    return item(
      `In an Aa × Aa cross, each offspring has a 1/4 chance of aa. Among ${count} offspring, what is the expected number with aa?`,
      count / 4,
      "",
      { count },
      [count / 2, (count * 3) / 4, count],
    );
  },
};
export function evaluateGenerated(q: Generated, value: string): boolean {
  return (
    value.trim() !== "" &&
    Number.isFinite(Number(value)) &&
    Math.abs(Number(value) - q.answer) <= 0.001
  );
}
