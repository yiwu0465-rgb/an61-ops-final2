// main app component - orchestrates the whole satellite operations console
import { useEffect, useRef, useState } from "react";
import { SatelliteForm } from "./components/SatelliteForm";
import { ThreatPanel } from "./components/ThreatPanel";
import { ThreatTimeline } from "./components/ThreatTimeline";
import { OrbitView } from "./components/OrbitView";
import { ActionLogPanel } from "./components/ActionLogPanel";
import { useStore } from "./store";
import { fetchThreats } from "./api";

export default function App() {
  const satellites = useStore((s) => s.satellites);
  const setThreats = useStore((s) => s.setThreats);
  const threats = useStore((s) => s.threats);
  const debrisCache = useStore((s) => s.debrisCache);

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  // fetches all threats from the apis and updates the state
  async function refreshThreats() {
    if (satellites.length === 0) return;
    setLoading(true);
    try {
      const t = await fetchThreats(satellites, debrisCache);
      setThreats(t);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to refresh threats:', error);
      // don't update state on error, keep showing previous threats
    } finally {
      setLoading(false);
    }
  }

  // refresh threats whenever the satellite list changes
  useEffect(() => {
    if (satellites.length > 0) {
      // IMMEDIATELY check for threats when satellites change
      refreshThreats();
    } else {
      setThreats([]);
      setLastUpdated(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites]);

  // set up auto-refresh every 60 seconds
  useEffect(() => {
    if (satellites.length === 0) return;
    intervalRef.current = window.setInterval(() => {
      refreshThreats();
    }, 60_000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites.length]);

  // show an alert banner when a high severity threat is detected
  useEffect(() => {
    const high = threats.find((t) => t.severity === "HIGH");
    if (high) {
      setBanner(`⚠️ HIGH: ${high.type} detected at ${new Date(high.when).toLocaleTimeString()}`);
      const id = setTimeout(() => setBanner(null), 6000);
      return () => clearTimeout(id);
    }
  }, [threats]);

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '3rem',
        width: '100%'
      }}>
        <h1 style={{ 
          marginBottom: '0.5rem',
          fontSize: '2.5rem'
        }}>
          AN61 OPS CONSOLE
        </h1>
        <div style={{ 
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase'
        }}>
          SATELLITE THREAT MANAGEMENT SYSTEM
        </div>
      </div>

      {/* high severity threat alert banner - only shows when there's a critical threat */}
      {banner && (
        <div
          style={{
            width: '100%',
            maxWidth: '1200px',
            margin: '0 0 2rem',
            padding: '1rem 1.5rem',
            border: '1px solid var(--text-primary)',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 4,
            fontWeight: '600',
            textAlign: 'center',
            letterSpacing: '0.05em',
            animation: 'pulse 2s ease-in-out infinite',
            textTransform: 'uppercase',
            fontSize: '0.9rem'
          }}
        >
          {banner}
        </div>
      )}

      {/* main content area with all the panels */}
      <div style={{ 
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <SatelliteForm />

        {/* threat refresh controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: '1rem 1.5rem',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            background: 'var(--bg-secondary)'
          }}
        >
          <button
            onClick={refreshThreats}
            disabled={loading || satellites.length === 0}
          >
            {loading ? "SCANNING..." : "REFRESH THREATS"}
          </button>
          <div style={{ 
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}>
            {lastUpdated ? `LAST UPDATE: ${lastUpdated}` : "NO DATA"}
          </div>
        </div>

        <ThreatPanel />
        <ThreatTimeline />
        <ActionLogPanel />
        <OrbitView />
      </div>

      {/* keyframe animation for the pulsing alert banner */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
