// conjunction screening service - detects potential collisions between satellites and debris
import type { Satellite, Threat } from "../types";
import type { TleRecord } from "./tle";
import * as sat from "satellite.js";

// physical constants and screening parameters
const MU_EARTH = 398600.4418; // earth's gravitational parameter in km^3/s^2
const HORIZON_HOURS = 2;      // how far ahead to look for conjunctions
const STEP_SEC = 5 * 60;      // check every 5 minutes
const THRESHOLD_KM = 100;     // alert if objects get closer than 100km (realistic operational threshold)

// calculates the position of a user satellite at a given time using simplified orbital mechanics
// this is for satellites we've added manually (not from tle data)
// returns position as [x, y, z] in earth-centred inertial (eci) coordinates
function userSatEciAt(
  s: Satellite,
  tSinceEpochSec: number
): [number, number, number] {
  const a = s.semiMajorAxisKm;
  const e = Math.max(0, Math.min(0.1, s.eccentricity ?? 0)); // keep eccentricity reasonable
  const i = ((s.inclinationDeg ?? 0) * Math.PI) / 180; // convert inclination to radians

  // calculate mean motion using kepler's third law
  const n = Math.sqrt(MU_EARTH / Math.pow(a, 3)); // radians per second
  const M = n * tSinceEpochSec; // mean anomaly (how far along the orbit)

  // solve kepler's equation (simplified for small eccentricity)
  const E = M + e * Math.sin(M); // eccentric anomaly
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);

  // work out position in the orbital plane first
  const x_op = a * (cosE - e);
  const y_op = a * Math.sqrt(1 - e * e) * sinE;

  // then rotate it by the inclination to get the 3d position
  // (we're assuming raan = 0 and argument of perigee = 0 for simplicity)
  const x = x_op;
  const y = y_op * Math.cos(i);
  const z = y_op * Math.sin(i);
  return [x, y, z];
}

// calculates the position of a debris object using its tle data
// uses the satellite.js library which implements the sgp4 propagation model
function tleEciAt(tle: TleRecord, date: Date): [number, number, number] | null {
  try {
    const rec = sat.twoline2satrec(tle.line1, tle.line2);
    const pv = sat.propagate(rec, date);
    
    // make sure we got a valid result back
    if (!pv || !pv.position) return null;
    const pos = pv.position;
    
    // satellite.js returns position in kilometres already
    return [pos.x, pos.y, pos.z];
  } catch {
    return null; // return null if the tle is invalid or propagation fails
  }
}

// simple euclidean distance calculator for 3d space
function distKm(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// main function that screens all user satellites against debris for potential conjunctions
// returns an array of threat objects for any close approaches detected
// debrisCache parameter allows passing pre-loaded TLE data to avoid repeated API calls
export async function screenConjunctions(
  userSats: Satellite[],
  debrisCache?: TleRecord[]
): Promise<Threat[]> {
  if (!userSats.length) return [];
  
  try {
    // only load TLE data if not provided (when explicitly requested)
    let debris: TleRecord[] = [];
    
    if (debrisCache && debrisCache.length > 0) {
      debris = debrisCache;
      console.log(`Using cached ${debris.length} debris objects for conjunction screening`);
    } else {
      console.log('No debris cache available - skipping conjunction screening');
      return [];
    }
    
    const threats: Threat[] = [];
    
    // only do real screening if we have debris data
    if (debris.length === 0) {
      console.log('No debris available for screening');
      return threats;
    }
    
    const now = new Date();
    const end = new Date(now.getTime() + HORIZON_HOURS * 3600 * 1000);

    console.log(`Screening ${userSats.length} satellites against ${debris.length} debris objects over ${HORIZON_HOURS}h horizon`);

    // check each user satellite against all the debris
    for (const u of userSats) {
      let best = { d: Number.POSITIVE_INFINITY, when: now }; // track the closest approach

      // step through time from now to the end of our horizon
      for (
        let t = new Date(now);
        t <= end;
        t = new Date(t.getTime() + STEP_SEC * 1000)
      ) {
        const dtSec = (t.getTime() - now.getTime()) / 1000;
        const pUser = userSatEciAt(u, dtSec);

        // check distance to each debris object at this time
        for (const tle of debris) {
          const pDebris = tleEciAt(tle, t);
          if (!pDebris) {
            console.warn(`Failed to propagate TLE for ${tle.name}`);
            continue; // skip if propagation failed
          }
          
          const d = distKm(pUser, pDebris);
          if (d < best.d) best = { d, when: new Date(t) }; // update if this is closer
        }
      }

      console.log(`${u.name}: closest approach ${best.d.toFixed(2)} km at ${best.when.toISOString()}`);

      // if the closest approach is within our threshold, create a threat
      if (best.d < THRESHOLD_KM) {
        // determine severity based on miss distance (realistic operational thresholds)
        let severity: "HIGH" | "MEDIUM" | "LOW";
        if (best.d < 5) {
          severity = "HIGH";        // < 5 km: critical, immediate action required
        } else if (best.d < 25) {
          severity = "MEDIUM";      // 5-25 km: concerning, plan maneuver
        } else {
          severity = "LOW";         // 25-100 km: monitor closely
        }
        
        threats.push({
          id: crypto.randomUUID(),
          type: "CONJUNCTION",
          when: best.when.toISOString(),
          severity,
          description: `Close approach predicted for ${u.name} (miss distance ~${best.d.toFixed(
            2
          )} km) within ${HORIZON_HOURS}h.`,
          suggestedAction:
            best.d < 5
              ? "CRITICAL: Immediate Δv 0.5 m/s radial-out at T-20 min. Notify ground control." // emergency manoeuvre
              : best.d < 25
              ? "Plan Δv 0.2 m/s prograde to raise perigee at next opportunity." // preventative manoeuvre
              : "Monitor trajectory closely. Prepare contingency maneuver if distance decreases below 25 km.", // precautionary
        });
      }
    }

    console.log(`Generated ${threats.length} conjunction threats`);
    
    return threats;
  } catch (error) {
    console.error('Conjunction screening failed:', error);
    // return empty array if screening fails
    return [];
  }
}
