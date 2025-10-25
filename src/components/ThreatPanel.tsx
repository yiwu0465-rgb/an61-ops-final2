// threat panel component - displays all detected threats with their details and action buttons
import { useStore } from "../store";

export function ThreatPanel() {
  const threats = useStore((s) => s.threats);
  const logAction = useStore((s) => s.logAction);
  const executedThreatIds = useStore((s) => s.executedThreatIds);
  const markThreatExecuted = useStore((s) => s.markThreatExecuted);

  // if there are no threats, show an empty state message
  if (!threats.length) {
    return <div style={{ 
      border: "1px solid var(--border-primary)", 
      padding: "2rem", 
      borderRadius: 4,
      background: 'var(--bg-secondary)',
      textAlign: 'center'
    }}>
      <h2 style={{ marginBottom: '1rem' }}>THREATS</h2>
      <p style={{ 
        color: 'var(--text-tertiary)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.85rem'
      }}>NO THREATS DETECTED</p>
    </div>;
  }

  // helper to determine border colour based on severity
  const getBorderColor = (sev: "LOW"|"MEDIUM"|"HIGH") =>
    sev === "HIGH" ? "var(--text-primary)" : "var(--border-accent)";

  // helper to style severity levels differently
  const getSeverityStyle = (sev: "LOW"|"MEDIUM"|"HIGH") => {
    if (sev === "HIGH") return { color: 'var(--text-primary)', fontWeight: 700 };
    if (sev === "MEDIUM") return { color: 'var(--text-secondary)', fontWeight: 600 };
    return { color: 'var(--text-tertiary)', fontWeight: 500 };
  };

  // handles executing an action for a threat
  // marks it as executed first to prevent spam clicking
  const handleExecute = (threat: typeof threats[0]) => {
    markThreatExecuted(threat.id);
    
    logAction({
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      threatId: threat.id,
      action: threat.suggestedAction,
      status: "EXECUTED",
    });
  };

  return (
    <div style={{ 
      border: "1px solid var(--border-primary)", 
      padding: "2rem", 
      borderRadius: 4,
      background: 'var(--bg-secondary)'
    }}>
      <h2 style={{ marginBottom: '1.5rem' }}>THREATS</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {threats.map((t) => (
          <div key={t.id} style={{ 
            padding: "1.5rem", 
            border: `1px solid ${getBorderColor(t.severity)}`, 
            borderRadius: 4,
            background: t.severity === "HIGH" ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-primary)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  letterSpacing: '0.05em'
                }}>
                  {t.type}
                </span>
                <span style={{ 
                  ...getSeverityStyle(t.severity),
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  fontFamily: 'Space Grotesk, sans-serif'
                }}>
                  [{t.severity}]
                </span>
              </div>
              <div style={{ 
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)'
              }}>
                {new Date(t.when).toLocaleString()}
              </div>
            </div>
            
            <div style={{ 
              marginBottom: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              fontSize: '0.9rem'
            }}>
              {t.description}
            </div>
            
            <div style={{ 
              fontStyle: 'italic',
              marginBottom: '1rem',
              color: 'var(--text-primary)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.85rem',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderLeft: '2px solid var(--border-accent)',
              borderRadius: 2
            }}>
              → {t.suggestedAction}
            </div>
            
            {executedThreatIds.has(t.id) ? (
              <div style={{
                padding: '0.7rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-primary)',
                borderRadius: 4,
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                letterSpacing: '0.05em',
                fontFamily: 'Space Grotesk, sans-serif'
              }}>
                ✓ EXECUTED
              </div>
            ) : (
              <button
                onClick={() => handleExecute(t)}
              >
                EXECUTE ACTION
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
