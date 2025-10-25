// satellite loader service - converts tle data into satellite orbital parameters
import type { Satellite } from "../types";
import type { TleRecord } from "./tle";
import { loadTLEs } from "./tle";
import * as sat from "satellite.js";

// takes a tle record and extracts the orbital parameters we need
// tle gives us mean motion (revolutions per day), we need semi-major axis
function tleToSatellite(tle: TleRecord): Satellite | null {
  try {
    // parse the tle using satellite.js library
    const rec = sat.twoline2satrec(tle.line1, tle.line2);
    
    // pull out the orbital elements we can use directly
    const inclinationDeg = rec.inclo * (180 / Math.PI); // convert radians to degrees
    const eccentricity = rec.ecco;
    
    // work out the semi-major axis from the mean motion
    // satellite.js gives us mean motion in radians per minute
    const meanMotionRadPerMin = rec.no;
    const meanMotionRadPerSec = meanMotionRadPerMin / 60;
    
    // use kepler's third law: n = sqrt(μ/a³)
    // rearranging: a = (μ/n²)^(1/3)
    const MU_EARTH = 398600.4418; // earth's gravitational parameter (km³/s²)
    const semiMajorAxisKm = Math.pow(
      MU_EARTH / Math.pow(meanMotionRadPerSec, 2),
      1 / 3
    );
    
    return {
      name: tle.name,
      semiMajorAxisKm,
      inclinationDeg,
      eccentricity,
    };
  } catch (error) {
    console.error(`failed to parse tle for ${tle.name}:`, error);
    return null;
  }
}

// fetches real satellites from the tle api and converts them to our format
// limit parameter controls how many to load (default 10)
export async function loadSatellitesFromAPI(limit = 10): Promise<Satellite[]> {
  const tles = await loadTLEs(limit);
  const satellites: Satellite[] = [];
  
  // convert each tle to a satellite object
  for (const tle of tles) {
    const satellite = tleToSatellite(tle);
    if (satellite) {
      satellites.push(satellite);
    }
  }
  
  console.log(`Converted ${satellites.length} TLEs to satellite objects`);
  return satellites;
}
