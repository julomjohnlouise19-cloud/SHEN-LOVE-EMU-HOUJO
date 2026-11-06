import type { Question } from "../src/core/types";
const table = (
  headers: string[],
  ...rows: string[][]
): NonNullable<Question["data"]> => ({ headers, rows });
// Illustrative classroom records, not claims about current measurements in a named location.
export const evidence: Record<string, NonNullable<Question["data"]>[]> = {
  "life.cells": [
    table(
      ["Feature", "Observed record"],
      ["DNA", "Inside a round enclosed region"],
      ["Boundary", "Double membrane"],
    ),
    table(
      ["Test substance", "Barrier result"],
      ["Water", "Can pass"],
      ["Some large solutes", "Blocked"],
    ),
    table(["Model leaf cell", "Green structures"], ["A", "Many"], ["B", "Few"]),
  ],
  "life.body": [
    table(
      ["Substance needed by cells", "Transport route"],
      ["Oxygen", "Blood"],
      ["Glucose", "Blood"],
    ),
    table(
      ["Lung feature", "Observed change"],
      ["Air sacs", "Damaged"],
      ["Gas uptake", "Reduced"],
    ),
    table(
      ["Feature", "Patient observation"],
      ["Villi", "Damaged"],
      ["Nutrient uptake", "Reduced"],
    ),
  ],
  "life.ecosystems": [
    table(
      ["Rice-field model", "Food source"],
      ["Green rice plant", "Sugar made using light"],
      ["Grasshopper", "Plant tissue"],
    ),
    table(
      ["Model reef", "Area / species recorded"],
      ["A", "1 hectare / 18 species"],
      ["B", "1 hectare / 45 species"],
    ),
    table(
      ["Forest model", "Observation"],
      ["Before eagle loss", "Predation occurs"],
      ["After eagle loss", "Some prey populations rise"],
    ),
  ],
  "life.classification": [
    table(
      ["Tarsier feature", "Recorded trait"],
      ["Body covering", "Hair"],
      ["Young fed by mother", "Milk"],
    ),
    table(
      ["Philippine animal", "Recorded trait"],
      ["Covering", "Feathers"],
      ["Mouth structure", "Beak"],
    ),
    table(
      ["Pond animal", "Life-stage record"],
      ["Young stage", "Aquatic tadpole"],
      ["Adult skin", "Moist"],
    ),
  ],
  "life.photosynthesis": [
    table(
      ["Rice growth model", "Observation"],
      ["Plant dry mass", "Increases"],
      ["Soil dry mass", "Changes little"],
      ["Gas carbon source", "Carbon dioxide"],
    ),
    table(
      ["Rice plant model", "Sugar formed"],
      ["Light present", "More"],
      ["Darkness", "Less"],
    ),
    table(
      ["Pond plant model", "Observation"],
      ["Bright light", "More gas bubbles"],
      ["Dim light", "Fewer gas bubbles"],
    ),
  ],
  "chemistry.bonding": [
    table(
      ["Particle model", "Electron behavior"],
      ["Two nonmetal atoms", "Electron pairs shared"],
    ),
    table(
      ["Salt crystal model", "Structure"],
      ["Positive particles", "Na⁺ ions"],
      ["Negative particles", "Cl⁻ ions"],
      ["Arrangement", "Repeating lattice"],
    ),
    table(
      ["Water molecule model", "Atom count"],
      ["Hydrogen", "2"],
      ["Oxygen", "1"],
    ),
  ],
  "chemistry.reactions": [
    table(
      ["Sealed bag model", "Mass"],
      ["Before reaction", "100.0 g"],
      ["After bubbles form", "100.0 g"],
    ),
    table(
      ["Sample record", "Observed result"],
      ["After liquid added", "Bubbles form"],
      ["Temperature", "Below boiling"],
    ),
    table(
      ["Damp iron model", "Observation"],
      ["Surface", "Reddish-brown layer forms"],
      ["Added material", "Includes oxygen from air"],
    ),
  ],
  "physics.light": [
    table(
      ["Wave tested", "Travels through vacuum?"],
      ["Visible light", "Yes"],
      ["Sound in air", "No"],
    ),
    table(
      ["Path to Earth", "Conditions"],
      ["Most of the route", "Near-vacuum"],
      ["Energy detected", "Sunlight"],
    ),
    table(
      ["Trial model", "Angle to the normal"],
      ["Incoming ray", "30°"],
      ["Reflected ray", "30°"],
    ),
  ],
  "earth.plates": [
    table(
      ["Map observation", "Location"],
      ["Many volcanoes", "Pacific plate edges"],
      ["Many earthquakes", "Pacific plate edges"],
    ),
    table(
      ["Offshore profile", "Record"],
      ["Surface feature", "Deep trench"],
      ["Plate motion", "Toward another plate and down"],
    ),
    table(
      ["Fault model", "Record"],
      ["Motion", "Mainly sideways"],
      ["Rock layer markers", "Offset across a fault"],
    ),
  ],
  "earth.volcanoes": [
    table(
      ["Mayon model region", "Material position"],
      ["Underground chamber", "Molten rock below ground"],
      ["Surface flow", "Molten rock above ground"],
    ),
    table(
      ["Quake model point", "Position"],
      ["Rupture starts", "10 km below ground"],
      ["Point to name", "Surface directly above the start"],
    ),
    table(
      ["Pinatubo case model", "Hazard record"],
      ["Contents", "Hot gas and fragments"],
      ["Motion", "Fast, dense flow down slopes"],
    ),
  ],
  "earth.weather": [
    table(
      ["Forecast comparison", "Source"],
      ["Verified weather bulletin", "PAGASA"],
      ["Unverified message", "Anonymous chat"],
    ),
    table(
      ["Philippine wind pattern", "Seasonal direction"],
      ["Amihan", "Northeast"],
      ["Habagat", "Southwest"],
    ),
    table(
      ["Cyclone model", "Record"],
      ["Sea surface", "Warm"],
      ["Air supply", "Moist, rising air"],
    ),
  ],
  "earth.solar": [
    table(
      ["Solar object", "Energy process"],
      ["Sun", "Hydrogen fusion in the core"],
      ["Jupiter", "Not a hydrogen-fusing star"],
    ),
    table(
      ["Moon record", "Observation"],
      ["Shape seen", "Changes over weeks"],
      ["Ordinary phase nights", "No lunar eclipse"],
    ),
    table(
      ["Object group", "Origin"],
      ["The Moon", "Natural"],
      ["Human-launched satellites", "Artificial"],
    ),
  ],
  "earth.stars": [
    table(
      ["Solar core model", "Particle change"],
      ["Input nuclei", "Hydrogen"],
      ["Output nuclei", "Helium"],
      ["Energy", "Released"],
    ),
    table(
      ["Sky-guide entry", "Meaning of unit"],
      ["Distance", "4 light-years"],
      ["One light-year", "Path light covers in one year"],
    ),
    table(["Model star", "Surface color"], ["A", "Blue"], ["B", "Red"]),
  ],
  "earth.rocks": [
    table(
      ["Philippine rock sample", "Record"],
      ["Starting material", "Molten lava"],
      ["Formation", "Cools and becomes solid"],
    ),
    table(
      ["Ifugao hillside model", "Observation"],
      ["Rock", "Breaks into pieces"],
      ["Pieces", "Remain in place"],
    ),
    table(
      ["Luzon storm model", "Observation"],
      ["Loose particles", "Move downhill"],
      ["Destination", "River channel"],
    ),
  ],
  "skills.method": [
    table(
      ["Rice study plan", "Record"],
      ["Proposed cause", "More light may increase growth"],
      ["Next step", "Test the proposed explanation"],
    ),
    table(
      ["Luzon study groups", "Light per day"],
      ["A", "4 hours"],
      ["B", "8 hours"],
      ["C", "12 hours"],
    ),
    table(
      ["Philippine rice study", "Variable role"],
      ["Fertilizer dose", "Deliberately changed"],
      ["Plant mass", "Recorded as the outcome"],
    ),
  ],
};
