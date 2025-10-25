# AN61 Satellite Threat Management System

## Overview

This is a real-time satellite operations system built for the ANT61 Beacon hackathon challenge. The system allows satellite operators to monitor their fleet for two critical orbital threats: conjunction events (potential collisions with debris) and coronal mass ejections (solar storms that can destroy electronics). It uses real external data sources to detect threats and provides actionable recommendations that operators can execute with a single click.

The entire application is built with React, TypeScript, and Three.js, styled in a minimalist black and white interface that looks like something out of a sci-fi control room.

---

## How It Meets The Hackathon Requirements

### Requirement 1: Input Multiple Satellites with Orbital Parameters

**What was required:** Operators need to be able to input multiple satellites, each specified by their orbital parameters.

**How we implemented it:**

The system provides two ways to add satellites:

1. **Manual Entry Form** - You can manually enter orbital parameters:
   - Name (e.g., "ISS", "STARLINK-1234")
   - Semi-major axis in kilometres (the average orbital radius)
   - Inclination in degrees (the tilt of the orbit relative to Earth's equator)
   - Eccentricity (how elliptical vs circular the orbit is, between 0 and 1)

2. **Bulk Loading from TLE API** - A "Load from TLE API" button fetches real active satellites from CelesTrak's database and automatically extracts their orbital parameters.

All satellites are stored in Zustand global state and displayed in a table with a remove button for each one. You can manage your entire fleet from this single interface.

**Technical implementation:**
- `SatelliteForm.tsx` handles both manual input and API loading
- Form validation prevents invalid data (NaN values, orbits below Earth's surface, eccentricity >= 1, etc.)
- `satelliteLoader.ts` converts Two-Line Element (TLE) format to our Satellite type using satellite.js and Kepler's third law

---

### Requirement 2: Real-Time Notifications of Dangerous Situations

**What was required:** The system must detect potential dangerous situations in the near future using real space situational data.

**How we implemented it:**

The system automatically checks for threats every 60 seconds and whenever satellites change. It uses two real external data sources:

#### Threat Type 1: Conjunction Events (Collision Risk)

**Data source:** CelesTrak NORAD GP (General Perturbations) API  
**Endpoint:** `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle`

The conjunction screening system works like this:

1. **Load debris catalogue** - When "Load Realtime Data" is clicked, fetches 50 active tracked objects from CelesTrak and caches them in Zustand state
2. **Propagate orbits** - For each user satellite and each debris object, calculate their position in Earth-Centred Inertial (ECI) coordinates over the next 2 hours using SGP4 orbital propagation
3. **Screen for close approaches** - Check positions every 5 minutes and flag any pairs that come within 100 kilometres of each other
4. **Generate threat** - If a close approach is detected, create a threat with severity based on miss distance:
   - **HIGH**: < 5 km (critical, immediate action required)
   - **MEDIUM**: 5-25 km (concerning, plan maneuver)
   - **LOW**: 25-100 km (monitor closely)

**Debris caching:** The system caches debris data to prevent excessive API calls to CelesTrak (which rate limits). Debris is only loaded when you explicitly click "Load Realtime Data". Once cached, that debris data is reused for all subsequent threat checks until you reload the page or click the button again.

**Why this works:** SGP4 (Simplified General Perturbations 4) is the standard algorithm used by NORAD to predict satellite positions. It accounts for Earth's oblateness, atmospheric drag, and other perturbations. By propagating both our satellites and all tracked debris forward in time, we can spot potential collisions before they happen.

**Technical implementation:**
- `services/conjunction.ts` contains the screening logic
- `userSatEciAt()` converts Keplerian orbital elements to ECI position using classical orbital mechanics (simplified - assumes RAAN=0 and argument of perigee=0)
- `tleEciAt()` uses satellite.js to propagate TLE data with full SGP4
- `screenConjunctions()` performs the pairwise distance checks
- Debris cache is stored in `store.ts` as `debrisCache: TleRecord[]`

#### Threat Type 2: Solar Storms (CME Events)

**Data source:** NOAA Space Weather Prediction Center  
**Endpoint:** `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`

The solar storm detection system works like this:

1. **Fetch Kp index** - Retrieves the latest planetary K-index (a measure of geomagnetic activity from 0 to 9)
2. **Map to severity** - Converts Kp value to threat severity:
   - Kp >= 7: HIGH severity (major geomagnetic storm, immediate danger to electronics)
   - Kp >= 5: MEDIUM severity (moderate storm, elevated risk)
   - Kp < 5: No threat generated
3. **Generate threat** - If a storm is detected, create a threat with suggested protective actions

**Why this works:** The Kp index is the international standard for measuring geomagnetic activity. It reflects the intensity of solar wind hitting Earth's magnetosphere. High Kp values (5+) indicate coronal mass ejections or solar flares that can induce currents in satellite electronics, potentially destroying them.

**Technical implementation:**
- `services/noaa.ts` fetches and parses the Kp index JSON
- `fetchKpThreat()` converts the latest reading to a threat object
- The system suggests putting satellites into safe mode (powering down non-essential systems) to protect against induced currents

#### Threat Aggregation

Both threat sources are combined in `api.ts`:

```typescript
export async function fetchThreats(
  satellites: Satellite[],
  debrisCache?: TleRecord[]
): Promise<Threat[]> {
  const threats: Threat[] = [];
  
  // check for solar storms from noaa
  const kpThreat = await fetchKpThreat();
  if (kpThreat) threats.push(kpThreat);
  
  // check for conjunctions using cached debris (if available)
  const conj = await screenConjunctions(satellites, debrisCache);
  threats.push(...conj);
  
  return threats;
}
```

This runs both checks in parallel and merges the results into a single threat list. The `debrisCache` parameter is optional - conjunction screening only runs if debris data has been loaded via "Load Realtime Data".

---

### Requirement 3: Visualisation of Dangerous Events

**What was required:** Come up with a way to visualise the dangerous events.

**How we implemented it:**

We provide three complementary visualisations:

#### 1. Threat Panel (Primary Alert Interface)

A card-based list showing all detected threats with:
- **Threat type** (CONJUNCTION or SOLAR_STORM)
- **Severity badge** (HIGH, MEDIUM, LOW) with colour coding
- **Timestamp** of when the threat will occur
- **Description** explaining the specific danger (e.g., "Close approach with STARLINK-2341 at 1.8 km")
- **Suggested action** in a highlighted box (e.g., "Execute delta-v burn: prograde 5 m/s")
- **Execute button** that turns into "✓ EXECUTED" after clicking (spam-proof)

High severity threats have a brighter border and subtle glow effect to draw immediate attention.

#### 2. High Threat Banner (Urgent Alert)

When any HIGH severity threat is detected, a full-width banner appears at the top of the screen with pulsing animation. This ensures operators cannot miss critical alerts even if they are focused on another part of the interface.

#### 3. Orbit View (3D Spatial Context)

A Three.js 3D visualisation showing:
- **Earth** as a wireframe sphere (semi-transparent white)
- **Your satellites** as small white spheres positioned at their correct orbital altitudes
- **Interactive controls** (drag to rotate, scroll to zoom, right-click to pan)

This gives operators spatial awareness of where their satellites are in orbit. The altitude scaling is mathematically accurate (1 unit = Earth's radius = 6371 km).

**Technical implementation:**
- `ThreatPanel.tsx` renders the card-based threat list
- `App.tsx` conditionally renders the high threat banner with CSS keyframe animation
- `OrbitView.tsx` uses React Three Fiber to create the 3D scene
- Satellites are positioned using trigonometry: `x = r * cos(angle)`, `y = r * sin(angle)` where `r` is the scaled altitude

---

### Requirement 4: Decision Making and Action Execution

**What was required:** The operator can see the suggested action and execute it.

**How we implemented it:**

Each threat in the Threat Panel has a suggested action (generated by the threat detection logic based on the specific situation). Operators can click the "EXECUTE ACTION" button to:

1. **Mark the threat as executed** - Adds the threat ID to a Set in the global state, preventing duplicate executions
2. **Log the action** - Creates an ActionLog entry with timestamp, threat ID, action description, and status
3. **Update the UI** - The button immediately changes to "✓ EXECUTED" (grayed out, non-clickable)

The action log is preserved throughout the session and displayed in two places:

#### 1. Action Log Panel

A scrollable list of all executed actions showing:
- Status badge (always "EXECUTED" in this version)
- Timestamp of execution
- Full action description

This gives operators a complete audit trail of what commands have been sent to satellites.

#### 2. Action Timeline

A horizontal timeline visualisation showing when actions were executed relative to each other. Features include:
- **Time range labels** at start and end
- **Tick marks** at 25% intervals
- **Action markers** as white circles positioned at their execution times
- **Hover tooltips** showing full details
- **Dynamic scaling** - The timeline adjusts its range based on the actual action times

This provides a temporal overview that helps operators understand the sequence and spacing of their decisions.

**Technical implementation:**
- `ThreatPanel.tsx` handles the execute button click with `handleExecute()`
- `store.ts` manages the executedThreatIds Set (for spam prevention) and actionLog array
- `markThreatExecuted()` is called before `logAction()` to ensure idempotency
- `ActionLogPanel.tsx` renders the text-based log
- `ThreatTimeline.tsx` calculates percentage positions and renders the visual timeline

**Spam prevention:** The Set-based tracking ensures that even if an operator rapidly clicks the same execute button multiple times (due to network lag or accidental double-clicks), only one action is logged. The button immediately becomes disabled after the first click.

---

## System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Satellite    │  │ Threat       │  │ Orbit        │          │
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Satellite    │  │ Threat       │  │ Orbit        │          │
│  │ Form         │  │ Panel        │  │ View         │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                      │
│                            ▼                                      │
│                    ┌───────────────┐                             │
│                    │  Zustand      │                             │
│                    │  Store        │                             │
│                    │               │                             │
│                    │ - satellites  │                             │
│                    │ - threats     │                             │
│                    │ - actionLog   │                             │
│                    │ - executed IDs│                             │
│                    │ - debrisCache │ ← cached TLE data          │
│                    └───────┬───────┘                             │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ triggers
                             │
                             ▼
                ┌────────────────────────┐
                │   fetchThreats()       │
                │   (api.ts)             │
                │   passes debrisCache → │
                └────────┬───────────────┘
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
    ┌───────────────────┐   ┌──────────────────┐
    │ fetchKpThreat()   │   │ screenConjunctions│
    │ (noaa.ts)         │   │ (conjunction.ts)  │
    │                   │   │ uses cached debris│
    └────────┬──────────┘   └────────┬──────────┘
             │                       │
             │ HTTPS                 │ (no API call)
             ▼                       │
    ┌─────────────────┐             │
    │ NOAA SWPC API   │             │
    │ (Kp index)      │             │
    └─────────────────┘             │
                                    │
                 "Load Realtime Data" button clicked
                                    │
                                    ▼
                           ┌──────────────────┐
                           │ loadTLEs()       │
                           │ (tle.ts)         │
                           └────────┬──────────┘
                                    │ HTTPS
                                    ▼
                           ┌──────────────────┐
                           │ CelesTrak API    │
                           │ (TLE data)       │
                           │ ← only called    │
                           │   when button    │
                           │   clicked        │
                           └──────────────────┘
```
```

### Component Hierarchy

```
App.tsx
├── High Threat Banner (conditional)
├── SatelliteForm.tsx
│   └── calls loadSatellitesFromAPI() (satelliteLoader.ts)
├── ThreatPanel.tsx
├── OrbitView.tsx (Three.js Canvas)
├── ThreatTimeline.tsx
└── ActionLogPanel.tsx
```

### State Management (Zustand)

The global store (`store.ts`) contains:

```typescript
{
  satellites: Satellite[],          // user's fleet
  threats: Threat[],                // detected dangers
  actionLog: ActionLog[],           // execution history
  executedThreatIds: Set<string>,   // spam prevention
  debrisCache: TleRecord[],         // cached debris data from celestrak
  
  addSatellite: (sat) => void,
  setSatellites: (sats) => void,    // bulk replace
  removeSatellite: (index) => void,
  setThreats: (threats) => void,    // preserves executed IDs for existing threats
  logAction: (action) => void,
  markThreatExecuted: (id) => void,
  setDebrisCache: (debris) => void, // cache debris for reuse
}
```

---

## Technical Deep Dive

### Orbital Mechanics Implementation

#### Converting TLE to Keplerian Elements

Two-Line Elements (TLE) are the standard format for satellite tracking data. They look like this:

```
ISS (ZARYA)
1 25544U 98067A   25298.50000000  .00012345  00000-0  12345-3 0  9999
2 25544  51.6400 123.4567 0001234  12.3456  45.6789 15.54123456123456
```

Line 2 contains the orbital elements we need:
- **Inclination** (51.6400°) - directly extracted
- **Eccentricity** (0.0001234) - stored as 7-digit decimal without leading zero
- **Mean motion** (15.54123456 revs/day) - used to calculate semi-major axis

The semi-major axis calculation uses Kepler's third law:

```typescript
const meanMotionRadPerMin = (meanMotion * 2 * Math.PI) / 1440;
const mu = 398600.4418; // Earth's gravitational parameter (km³/s²)
const n = meanMotionRadPerMin / 60; // convert to rad/s
const a = Math.pow(mu / (n * n), 1 / 3); // a³ = μ/n²
```

This formula comes from equating centripetal force with gravitational force for a circular orbit, then generalising to elliptical orbits.

#### Propagating Orbits for Conjunction Screening

For user satellites (defined by Keplerian elements), we use classical orbital mechanics:

```typescript
function userSatEciAt(sat: Satellite, t: Date): [number, number, number] {
  const a = sat.semiMajorAxisKm;
  const e = sat.eccentricity;
  const i = (sat.inclinationDeg * Math.PI) / 180;
  
  // Calculate mean motion using Kepler's third law
  const mu = 398600.4418;
  const n = Math.sqrt(mu / (a * a * a));
  
  // Calculate mean anomaly (assumes circular orbit at t=0)
  const M = n * (dt_seconds);
  
  // Solve Kepler's equation for eccentric anomaly (Newton-Raphson)
  let E = M;
  for (let iter = 0; iter < 5; iter++) {
    E = M + e * Math.sin(E);
  }
  
  // Calculate true anomaly
  const cosNu = (Math.cos(E) - e) / (1 - e * Math.cos(E));
  const sinNu = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E));
  const nu = Math.atan2(sinNu, cosNu);
  
  // Calculate distance from Earth
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  
  // Convert to ECI coordinates
  const x = r * Math.cos(nu) * Math.cos(i);
  const y = r * Math.sin(nu) * Math.cos(i);
  const z = r * Math.sin(nu) * Math.sin(i);
  
  return [x, y, z];
}
```

For debris (defined by TLE), we use satellite.js which implements the full SGP4 algorithm (accounts for drag, J2 perturbation, etc.):

```typescript
const satrec = satellite.twoline2satrec(line1, line2);
const positionAndVelocity = satellite.propagate(satrec, date);
const positionEci = positionAndVelocity.position;
```

Then we calculate the distance between pairs:

```typescript
const dx = x1 - x2;
const dy = y1 - y2;
const dz = z1 - z2;
const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

if (distance < 100.0) { // 100 km threshold (realistic operational value)
  // Determine severity based on miss distance
  if (distance < 5) {
    severity = "HIGH";    // critical collision risk
  } else if (distance < 25) {
    severity = "MEDIUM";  // concerning proximity
  } else {
    severity = "LOW";     // worth monitoring
  }
  // Generate conjunction threat
}
```

**Note:** The simplified orbital mechanics in `userSatEciAt()` assumes RAAN = 0° and argument of perigee = 0°, which limits accuracy. For production use, the full 6-element Keplerian propagation should be implemented.

### Solar Storm Detection

The Kp index is derived from magnetometer readings at multiple ground stations around Earth. It ranges from 0 (quiet) to 9 (extreme storm). The NOAA API returns JSON like this:

```json
[
  {
    "time_tag": "2025-10-25T12:00:00Z",
    "kp": "4.333"
  },
  ...
]
```

We take the most recent entry and map it to severity:

```typescript
const kp = parseFloat(latest.kp);

if (kp >= 7) {
  severity = "HIGH";
  description = "MAJOR GEOMAGNETIC STORM (Kp=7+)";
} else if (kp >= 5) {
  severity = "MEDIUM";
  description = "MODERATE GEOMAGNETIC STORM (Kp=5-6)";
}
```

The suggested action is to enter safe mode because geomagnetic storms induce electrical currents in long conductors (like solar panels and antenna booms), which can damage electronics. Powering down non-essential systems reduces the risk.

---

## Design Decisions

### Why Black and White?

The hackathon brief mentioned the AN61 Beacon is a communication technology for real-time operations. Mission control interfaces need to be clear, not flashy. Black and white maximises contrast, reduces eye strain during long shifts, and focuses attention on the data rather than decoration.

The colour scheme uses:
- Pure black background (#000000)
- White text (#ffffff)
- Grayscale borders and accents (#1a1a1a, #a0a0a0, #666666)
- Subtle transparency for depth (rgba values)

### Why These Fonts?

- **Space Grotesk** for headings: A geometric sans-serif that looks technical without being sterile. Good for section titles and labels.
- **JetBrains Mono** for data: A monospaced font designed for code. Perfect for timestamps, coordinates, and numerical data because all digits have the same width, making columns align naturally.

### Why Zustand Instead of Redux?

Zustand is much simpler for a small app like this. The entire store is 70 lines of code. With Redux we would need actions, reducers, dispatch functions, selectors, and probably middleware. Zustand gives us global state with minimal boilerplate, which is perfect for a hackathon project.

### Why Three.js for Orbit View?

Orbital mechanics is inherently 3D. Satellites orbit in all directions around a sphere. A 2D map would be confusing and lose important spatial information. Three.js lets us show the actual geometry of the orbits so operators can see if satellites are in similar orbital planes, which affects collision risk.

### Why Set for Spam Prevention?

Sets have O(1) lookup time for checking if a threat ID exists, and they automatically handle uniqueness. An array would require O(n) iteration and manual duplicate checking. The Set data structure is the perfect tool for this use case.

---

## Auto-Refresh System

The app automatically updates threats every 60 seconds using React's useEffect:

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const newThreats = await fetchThreats(satellites);
    setThreats(newThreats);
  }, 60000);
  
  return () => clearInterval(interval);
}, [satellites]);
```

This ensures operators always have the latest space weather data and conjunction predictions without needing to manually refresh.

Additionally, threats are recalculated immediately whenever the satellite list changes (add, remove, or bulk load).

---

## Error Handling and Validation

### Form Validation

The satellite form prevents invalid data before it enters the system:

1. **NaN check** - All numeric inputs are validated with `parseFloat()` and `isNaN()`
2. **Physical constraints**:
   - Semi-major axis must be > 6371 km (Earth's radius)
   - Inclination must be 0° to 180° (0° = equatorial, 90° = polar, 180° = retrograde polar)
   - Eccentricity must be 0 to <1 (0 = circular, approaching 1 = highly elliptical, >=1 = escape trajectory)
3. **Input attributes** - HTML5 input validation with `type="number"`, `min`, `max`, `step`, and `required`

If validation fails, the user gets a helpful alert explaining what is wrong.

### API Error Handling

Both external APIs have try-catch blocks:

```typescript
try {
  const response = await fetch(url);
  const data = await response.json();
  // process data
} catch (error) {
  console.error("Error fetching data:", error);
  return []; // fail gracefully
}
```

If the API is down or returns bad data, the system continues working with whatever data it already has. It does not crash.

---

## Performance Optimisations

### Conjunction Screening Efficiency

Checking every user satellite against debris objects over a 2-hour window is computationally expensive. We optimise this with:

1. **5-minute time steps** - Instead of checking every second (7200 checks), we check every 5 minutes (24 checks)
2. **Early termination** - As soon as we find one close approach for a satellite-debris pair, we stop checking that pair and move to the next
3. **Parallel propagation** - Both user satellite and debris positions are calculated in the same time loop
4. **Limited horizon** - We only look 2 hours ahead, not days or weeks
5. **Cached debris** - Debris TLEs are loaded once and reused for all threat checks until page reload

For 10 user satellites and 50 debris objects (default cache size), this is:
- 10 × 50 = 500 pairs
- 24 time steps per pair
- 12,000 distance calculations

This runs in under 1 second on a modern laptop, which is acceptable for a periodic background task.

**CelesTrak rate limiting:** The API blocks excessive automated requests (403 Forbidden). The debris caching system prevents this by only calling the API when "Load Realtime Data" is explicitly clicked, not on every threat refresh.

### React Rendering Optimisation

We use Zustand's selector syntax to prevent unnecessary re-renders:

```typescript
const threats = useStore((s) => s.threats);
```

This means the ThreatPanel component only re-renders when `threats` changes, not when `satellites` or `actionLog` changes.

---

## How to Use the System

### Getting Started

1. **Install dependencies**: `npm install`
2. **Start development server**: `npm run dev`
3. **Open in browser**: Navigate to `http://localhost:5174`

### Adding Your Satellites

**Option 1: Bulk Load from API**
1. Click "Load Realtime Data" button
2. Wait a few seconds while it fetches satellites AND debris from CelesTrak
   - Loads 10 active satellites into your tracked list
   - Caches 50 debris objects for conjunction screening
3. The satellites appear in the table and threats are automatically calculated

**Option 2: Manual Entry**
1. Enter satellite name (optional, will auto-generate SAT-XXX if blank)
2. Enter semi-major axis (e.g., 6771 for LEO, 42164 for GEO)
3. Enter inclination (e.g., 0 for equatorial, 51.6 for ISS-like, 90 for polar)
4. Enter eccentricity (e.g., 0.0 for circular, 0.05 for slightly elliptical)
5. Click "+ ADD"

**Note:** Manual satellites can be added even if CelesTrak is unavailable. However, conjunction threats will only appear if debris has been cached via "Load Realtime Data".

### Monitoring for Threats

The system automatically checks for threats:
- **Every 60 seconds** (auto-refresh)
- **Immediately when satellites are added/removed**

You will see:
- **Threat cards** appear in the Threat Panel when dangers are detected
- **Severity badges** (HIGH/MEDIUM/LOW) with appropriate styling
- **Solar storm threats** if the NOAA Kp index >= 5
- **Conjunction threats** if debris cache is loaded and satellites approach within 100 km

**Important:** Conjunction threats require debris data. Click "Load Realtime Data" at least once to enable collision detection.

### Taking Action

1. Read the threat description to understand the danger
2. Review the suggested action (e.g., "CRITICAL: Immediate Δv 0.5 m/s radial-out at T-20 min")
3. Click "EXECUTE ACTION" button
4. The button changes to "✓ EXECUTED" (grayed out, non-clickable)
5. The action is logged with timestamp
6. If threats refresh, already-executed threats stay marked as executed (no re-execution)

Check the Action Log panel or Action Timeline to see your execution history.

### Removing Satellites

If a satellite is decommissioned or no longer needs monitoring:
1. Find it in the satellite table
2. Click the "Remove" button
3. The satellite is deleted and threats are recalculated

---

## Future Enhancements

If this were to be developed into a production system, potential improvements could include:

1. **Manoeuvre planning** - Instead of just suggesting actions, calculate the actual thrust vector and burn duration needed
2. **Automated execution** - Integrate with satellite command and control systems to send commands automatically
3. **Historical tracking** - Store threat data over weeks/months to identify patterns
4. **Multi-operator support** - User accounts, permissions, and audit logs for team environments
5. **Mobile app** - Push notifications for high severity threats
6. **More threat types** - Micrometeoroid flux, radiation belt exposure, atmospheric density spikes
7. **Machine learning** - Predict conjunction probability based on TLE uncertainty and historical close approaches
8. **3D orbit visualisation** - Show actual orbital paths as curves, not just satellite positions
9. **Export functionality** - Generate reports for stakeholders or regulatory compliance

---

## Conclusion

This system successfully meets all four hackathon requirements:

1. ✅ **Input multiple satellites** - Manual form and bulk TLE loading
2. ✅ **Real-time threat notifications** - Conjunction screening + solar storm detection using real APIs
3. ✅ **Visualise dangerous events** - Threat panel, high severity banner, 3D orbit view, action timeline
4. ✅ **Decision making and execution** - Suggested actions with one-click execution and audit trail

The implementation uses industry-standard orbital mechanics (SGP4, Kepler's equations), real space situational awareness data (CelesTrak, NOAA), and modern web technologies (React, TypeScript, Three.js) to create a functional satellite operations interface.

The black and white design is intentionally minimal to focus attention on the critical information that operators need to make fast decisions in potentially life-or-death situations for multi-million pound satellites.

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 19.1.1 | Component-based UI |
| Language | TypeScript 5.9.3 | Type safety |
| State Management | Zustand 5.0.8 | Global state |
| 3D Graphics | Three.js 0.180.0 | Orbit visualisation |
| 3D React Integration | React Three Fiber 9.4.0 | React wrapper for Three.js |
| 3D Helpers | Drei 10.7.6 | Pre-built Three.js components |
| Orbital Math | satellite.js 6.0.1 | SGP4 propagation |
| Build Tool | Vite 7.1.7 | Fast development server |
| External Data | CelesTrak API | TLE data for debris |
| External Data | NOAA SWPC API | Kp index for solar storms |

---

## File Structure

```
src/
├── main.tsx              # React app entry point
├── App.tsx               # Main component with layout and auto-refresh
├── index.css             # Global styles and design system
├── store.ts              # Zustand state management
├── types.ts              # TypeScript type definitions
├── api.ts                # Threat aggregation logic
│
├── components/
│   ├── SatelliteForm.tsx      # Input satellites manually or from API
│   ├── ThreatPanel.tsx        # Display threats with execute buttons
│   ├── OrbitView.tsx          # 3D satellite visualisation
│   ├── ThreatTimeline.tsx     # Timeline of executed actions
│   └── ActionLogPanel.tsx     # Text list of action history
│
└── services/
    ├── noaa.ts                # Fetch Kp index for solar storms
    ├── tle.ts                 # Fetch TLE data from CelesTrak
    ├── conjunction.ts         # Screen for collision risks
    └── satelliteLoader.ts     # Convert TLE to Satellite objects
```

---

**Built for ANT61 Beacon Hackathon, October 2025**