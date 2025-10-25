// conjunction screening service -> detects potential collisions between satellites and debris
import type { Satellite, Threat } from "../types";
import type { TleRecord } from "./tle";
import * as sat from "satellite.js";

const MU_EARTH = 398600.4418;
const HORIZON_HOURS = 2;
const STEP_SEC = 5 * 60;
const THRESHOLD_KM = 500;     // alert if objects get closer than 500 km (scaled for sake of simulation)

// calculates satellite position with simplified orbital mechanics
function userSatEciAt(
  s: Satellite,
  tSinceEpochSec: number
): [number, number, number] {
  const a = s.semiMajorAxisKm;
  const e = Math.max(0, Math.min(0.1, s.eccentricity ?? 0)); //
  const i = ((s.inclinationDeg ?? 0) * Math.PI) / 180;

  const n = Math.sqrt(MU_EARTH / Math.pow(a, 3));
  const M = n * tSinceEpochSec;

  // approximate Kepler’s equation for small e
  const E = M + e * Math.sin(M);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);

  const x_op = a * (cosE - e);
  const y_op = a * Math.sqrt(1 - e * e) * sinE;

  const x = x_op;
  const y = y_op * Math.cos(i);
  const z = y_op * Math.sin(i);

  return [x, y, z];
}

// calculates the position of a debris object using TLE data (SGP4 propagation)
function tleEciAt(tle: TleRecord, date: Date): [number, number, number] | null {
  try {
    const rec = sat.twoline2satrec(tle.line1, tle.line2);
    const pv = sat.propagate(rec, date);
    if (!pv || !pv.position) return null;
    const pos = pv.position;
    return [pos.x, pos.y, pos.z]; // already in km
  } catch {
    return null;
  }
}

function distKm(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export async function screenConjunctions(
  userSats: Satellite[],
  debrisCache?: TleRecord[]
): Promise<Threat[]> {
  if (!userSats.length) return [];

  try {
    let debris: TleRecord[] = [];
    if (debrisCache && debrisCache.length > 0) {
      debris = debrisCache;
      console.log(`Using cached ${debris.length} debris objects for conjunction screening`);
    } else {
      console.log("No debris cache available - skipping conjunction screening");
      return [];
    }

    const threats: Threat[] = [];
    if (debris.length === 0) {
      console.log("No debris available for screening");
      return threats;
    }

    const now = new Date();
    const end = new Date(now.getTime() + HORIZON_HOURS * 3600 * 1000);
    console.log(
      `Screening ${userSats.length} satellites against ${debris.length} debris objects over ${HORIZON_HOURS}h horizon`
    );

    for (const u of userSats) {
      let best = { d: Number.POSITIVE_INFINITY, when: now };

      for (
        let t = new Date(now);
        t <= end;
        t = new Date(t.getTime() + STEP_SEC * 1000)
      ) {
        const dtSec = (t.getTime() - now.getTime()) / 1000;
        const pUser = userSatEciAt(u, dtSec);

        for (const tle of debris) {
          const pDebris = tleEciAt(tle, t);
          if (!pDebris) continue;
          const d = distKm(pUser, pDebris);
          if (d < best.d) best = { d, when: new Date(t) };
        }
      }

      console.log(`${u.name}: closest approach ${best.d.toFixed(2)} km at ${best.when.toISOString()}`);

      if (best.d < THRESHOLD_KM) {
        // scaled thresholds
        let severity: "HIGH" | "MEDIUM" | "LOW";
        if (best.d < 50) {
          severity = "HIGH"; // <50 km
        } else if (best.d < 200) {
          severity = "MEDIUM"; // 50–200 km
        } else {
          severity = "LOW"; // 200–500 km
        }

        threats.push({
          id: crypto.randomUUID(),
          type: "CONJUNCTION",
          when: best.when.toISOString(),
          severity,
          description: `Close approach predicted for ${u.name} (miss distance ≈ ${best.d.toFixed(
            1
          )} km) within ${HORIZON_HOURS}h.`,
          suggestedAction:
            severity === "HIGH"
              ? "⚠️ CRITICAL: Perform 0.5 m/s radial-out burn at T–20 min. Notify ground control."
              : severity === "MEDIUM"
              ? "Plan 0.2 m/s prograde burn at next opportunity to increase separation."
              : "Monitor trajectory; prepare contingency if distance drops below 200 km.",
        });
      }
    }

    console.log(`Generated ${threats.length} conjunction threats`);
    return threats;
  } catch (error) {
    console.error("Conjunction screening failed:", error);
    return [];
  }
}
