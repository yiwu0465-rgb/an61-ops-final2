// noaa space weather service - checks for solar storms using the kp index
import type { Threat } from "../types";

// noaa's real-time planetary kp index api (measures geomagnetic activity from solar storms)
const KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";

// fetches the latest kp index and determines if there's a cme threat
// returns null if no threat, otherwise returns a threat object with severity based on kp value
export async function fetchKpThreat(): Promise<Threat | null> {
  try {
    const res = await fetch(KP_URL);
    const data = await res.json(); // array of kp readings with timestamps
    if (!Array.isArray(data) || data.length === 0) return null;

    // grab the most recent kp reading from the array
    const latest = data[data.length - 1];
    const kp = Number(latest.kp_index ?? latest.kp); // field name varies in the api response

    // work out the severity based on kp value (higher = worse)
    let severity: Threat["severity"] | null = null;
    if (kp >= 7) severity = "HIGH";      // severe geomagnetic storm
    else if (kp >= 5) severity = "MEDIUM"; // moderate storm
    else severity = null;                  // normal conditions, no threat

    if (!severity) return null;

    // create and return the threat object
    return {
      id: crypto.randomUUID(),
      type: "CME",
      when: new Date(latest.time_tag ?? Date.now()).toISOString(),
      severity,
      description: `Elevated geomagnetic activity detected (Kp=${kp}).`,
      suggestedAction: "Enter safe mode and shut down non-critical systems.",
    };
  } catch {
    // if the api call fails, just return null (no threat)
    return null;
  }
}
