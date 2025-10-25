// main api file - fetches all threats from various sources and combines them
import type { Threat, Satellite } from "./types";
import type { TleRecord } from "./services/tle";
import { fetchKpThreat } from "./services/noaa";
import { screenConjunctions } from "./services/conjunction";

// this function pulls together all the different threat types and returns them as one array
// debrisCache is optional - only passed when debris data has been loaded via "load realtime data"
export async function fetchThreats(satellites: Satellite[], debrisCache?: TleRecord[]): Promise<Threat[]> {
  const threats: Threat[] = [];

  // check for solar storms from noaa space weather api
  const kpThreat = await fetchKpThreat();
  if (kpThreat) threats.push(kpThreat);

  // check for potential collisions with debris using cached tle data (if available)
  const conj = await screenConjunctions(satellites, debrisCache);
  threats.push(...conj);

  console.log(`Total threats detected: ${threats.length}`);
  return threats;
}
