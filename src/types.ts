// type definitions for the main data structures in our app

// represents a satellite we're tracking
export type Satellite = {
  name: string;                  // satellite identifier (e.g. "ISS", "SAT-001")
  semiMajorAxisKm: number;       // average orbital radius in kilometres
  inclinationDeg: number;        // orbital tilt relative to equator in degrees
  eccentricity: number;          // how elliptical the orbit is (0 = circle, close to 1 = very elliptical)
};

// represents a threat detected by the system
export type Threat = {
  id: string;                            // unique identifier
  type: "CONJUNCTION" | "CME";           // either a collision risk or solar storm
  when: string;                          // iso timestamp of when the threat occurs
  severity: "LOW" | "MEDIUM" | "HIGH";   // how dangerous it is
  description: string;                   // what's happening
  suggestedAction: string;               // what the operator should do about it
};

// represents an action that was executed in response to a threat
export type ActionLog = {
  id: string;
  time: string;                  // iso timestamp of when the action was taken
  sat?: string;                  // which satellite (if applicable)
  threatId?: string;             // which threat this action responds to
  action: string;                // description of what was done
  status: "EXECUTED" | "FAILED"; // whether it worked or not
};
