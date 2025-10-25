// satellite form component - allows manual satellite entry or bulk loading from tle api
import { useState } from "react";
import { useStore } from "../store";
import type { Satellite } from "../types";
import { loadSatellitesFromAPI } from "../services/satelliteLoader";
import { loadTLEs } from "../services/tle";

export function SatelliteForm() {
  // local state for form inputs
  const [name, setName] = useState("");
  const [semiMajorAxisKm, setSemiMajorAxisKm] = useState("");
  const [inclinationDeg, setInclinationDeg] = useState("");
  const [eccentricity, setEccentricity] = useState("");
  const [loading, setLoading] = useState(false);
  
  // zustand store actions and state
  const addSatellite = useStore((s) => s.addSatellite);
  const setSatellites = useStore((s) => s.setSatellites);
  const removeSatellite = useStore((s) => s.removeSatellite);
  const satellites = useStore((s) => s.satellites);
  const setDebrisCache = useStore((s) => s.setDebrisCache);

  // handles manual satellite form submission with validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // parse string inputs to numbers
    const sma = parseFloat(semiMajorAxisKm);
    const inc = parseFloat(inclinationDeg);
    const ecc = parseFloat(eccentricity);
    
    // check for NaN values (empty or invalid inputs)
    if (isNaN(sma) || isNaN(inc) || isNaN(ecc)) {
      alert("Please enter valid numbers for all orbital parameters");
      return;
    }
    
    // validate semi-major axis is above earth's radius (6371 km)
    if (sma < 6371) {
      alert("Semi-major axis must be greater than Earth's radius (6371 km)");
      return;
    }
    
    // validate inclination is between 0° (equatorial) and 180° (retrograde polar)
    if (inc < 0 || inc > 180) {
      alert("Inclination must be between 0° and 180°");
      return;
    }
    
    // validate eccentricity is between 0 (circular) and 1 (parabolic escape)
    if (ecc < 0 || ecc >= 1) {
      alert("Eccentricity must be between 0 and 1");
      return;
    }
    
    // create satellite object with validated data
    const sat: Satellite = {
      name: name.trim() || `SAT-${Math.floor(Math.random() * 1000)}`,
      semiMajorAxisKm: sma,
      inclinationDeg: inc,
      eccentricity: ecc,
    };
    addSatellite(sat);
    
    // clear form after successful submission
    setName("");
    setSemiMajorAxisKm("");
    setInclinationDeg("");
    setEccentricity("");
  };

  // loads satellites from celestrak tle api (replaces current satellites)
  // ALSO loads debris TLE data and caches it for threat detection
  const handleLoadFromAPI = async () => {
    setLoading(true);
    try {
      // load satellites and debris data in parallel
      const [apiSatellites, debrisData] = await Promise.all([
        loadSatellitesFromAPI(10),
        loadTLEs(50) // load 50 debris objects for conjunction screening
      ]);
      
      if (apiSatellites.length > 0) {
        setSatellites(apiSatellites);
        console.log(`Loaded ${apiSatellites.length} satellites from API`);
      } else {
        alert("Failed to load satellites from API");
      }
      
      if (debrisData.length > 0) {
        setDebrisCache(debrisData);
        console.log(`Cached ${debrisData.length} debris objects for threat screening`);
      }
    } catch (error) {
      console.error("Error loading from API:", error);
      alert("Failed to load data from CelesTrak. The API may be temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--border-primary)",
        padding: "2rem",
        borderRadius: 4,
        background: 'var(--bg-secondary)'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{ margin: 0 }}>ADD SATELLITE</h2>
        <button
          onClick={handleLoadFromAPI}
          disabled={loading}
          type="button"
          style={{
            padding: '0.7rem 1.5rem',
            fontSize: '0.8rem'
          }}
        >
          {/* ts from api twin - regards giordan*/}
          {loading ? "LOADING" : "LOAD REALTIME DATA"} 
        </button>
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: satellites.length > 0 ? "2rem" : "0"
        }}
      >
        <div>
          <label style={{ 
            display: "block", 
            fontSize: "0.7rem", 
            color: "var(--text-tertiary)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 500
          }}>
            NAME
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="SAT-001"
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label style={{ 
            display: "block", 
            fontSize: "0.7rem", 
            color: "var(--text-tertiary)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 500
          }}>
            SEMI-MAJOR AXIS (KM)
          </label>
          <input
            type="number"
            value={semiMajorAxisKm}
            onChange={(e) => setSemiMajorAxisKm(e.target.value)}
            placeholder="7000"
            step="0.1"
            min="6371"
            style={{ width: "100%" }}
            required
          />
        </div>

        <div>
          <label style={{ 
            display: "block", 
            fontSize: "0.7rem", 
            color: "var(--text-tertiary)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 500
          }}>
            INCLINATION (°)
          </label>
          <input
            type="number"
            value={inclinationDeg}
            onChange={(e) => setInclinationDeg(e.target.value)}
            placeholder="98"
            step="0.1"
            min="0"
            max="180"
            style={{ width: "100%" }}
            required
          />
        </div>

        <div>
          <label style={{ 
            display: "block", 
            fontSize: "0.7rem", 
            color: "var(--text-tertiary)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 500
          }}>
            ECCENTRICITY
          </label>
          <input
            type="number"
            value={eccentricity}
            onChange={(e) => setEccentricity(e.target.value)}
            placeholder="0.001"
            step="0.0001"
            min="0"
            max="0.99"
            style={{ width: "100%" }}
            required
          />
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end'
        }}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem'
            }}
          >
            + ADD
          </button>
        </div>
      </form>

      {satellites.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ marginBottom: '1rem' }}>TRACKED SATELLITES</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead style={{ 
                color: "var(--text-secondary)", 
                textAlign: "left",
                borderBottom: '1px solid var(--border-primary)'
              }}>
                <tr>
                  <th style={{ 
                    paddingBottom: "0.75rem",
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>NAME</th>
                  <th style={{ 
                    paddingBottom: "0.75rem",
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>SEMI-MAJOR AXIS</th>
                  <th style={{ 
                    paddingBottom: "0.75rem",
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>INCLINATION</th>
                  <th style={{ 
                    paddingBottom: "0.75rem",
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>ECCENTRICITY</th>
                  <th style={{ 
                    paddingBottom: "0.75rem",
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {satellites.map((s, i) => (
                  <tr key={i} style={{ 
                    borderTop: i > 0 ? "1px solid var(--border-primary)" : 'none'
                  }}>
                    <td style={{ 
                      padding: "0.75rem 0",
                      color: 'var(--text-primary)',
                      fontWeight: 500
                    }}>{s.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.semiMajorAxisKm.toFixed(1)} km</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.inclinationDeg.toFixed(2)}°</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.eccentricity.toFixed(4)}</td>
                    <td>
                      <button
                        onClick={() => removeSatellite(i)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.75rem',
                          background: 'transparent',
                          border: '1px solid var(--border-primary)',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer'
                        }}
                      >
                        REMOVE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
