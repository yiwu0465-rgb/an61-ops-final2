# Test Satellites for Threat Detection

Add these satellites manually to test different threat severity levels. The system now uses hardcoded test debris when CelesTrak is unavailable.

## Threat Severity Levels (Realistic Operational Thresholds):
- **HIGH**: Miss distance < 5 km (Critical - immediate action required)
- **MEDIUM**: Miss distance 5-25 km (Concerning - plan maneuver)
- **LOW**: Miss distance 25-100 km (Monitor closely)
- **NONE**: Miss distance > 100 km (Safe - routine tracking)

---

## 1. HIGH THREAT - Very Low Earth Orbit
**Name:** TEST-HIGH-LEO  
**Semi-major axis:** 6700 km  
**Eccentricity:** 0.001  
**Inclination:** 82.5°  
**RAAN:** 0°  
**Arg of Perigee:** 0°  
**True Anomaly:** 0°  

*This matches the test debris orbit closely - should generate HIGH severity threat (~6688 km).*

---

## 2. MEDIUM THREAT - ISS Orbital Zone
**Name:** TEST-MEDIUM-ISS  
**Semi-major axis:** 6778 km  
**Eccentricity:** 0.0005  
**Inclination:** 51.6°  
**RAAN:** 45°  
**Arg of Perigee:** 90°  
**True Anomaly:** 180°  

*Should generate MEDIUM severity threat (~6757 km miss distance).*

---

## 3. LOW THREAT - Mid Earth Orbit  
**Name:** TEST-LOW-MEO  
**Semi-major axis:** 20000 km  
**Eccentricity:** 0.01  
**Inclination:** 55°  
**RAAN:** 120°  
**Arg of Perigee:** 45°  
**True Anomaly:** 270°  

*Should generate LOW severity threat (~19799 km miss distance).*

---

## 4. NO THREAT - Geostationary Orbit
**Name:** TEST-NONE-GEO  
**Semi-major axis:** 42164 km  
**Eccentricity:** 0.0001  
**Inclination:** 0.1°  
**RAAN:** 0°  
**Arg of Perigee:** 0°  
**True Anomaly:** 0°  

*Should generate NO threats (~42155 km miss distance - exceeds threshold).*

---

## How to Test

1. Add each satellite manually using the form
2. Watch the console logs for "closest approach" distances
3. Threats will appear in the threat panel based on proximity
4. Try executing a threat, then refresh - it should stay marked as executed

**Note:** The system now has fallback test debris, so threats will be generated even without CelesTrak access.
