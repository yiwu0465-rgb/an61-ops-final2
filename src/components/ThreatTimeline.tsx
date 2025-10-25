// threat timeline component - visualises action log as a horizontal timeline
import { useMemo } from "react";
import { useStore } from "../store";

// format time as HH:MM for timeline labels
function fmt(t: string) {
  const d = new Date(t);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ThreatTimeline() {
  const actionLog = useStore((s) => s.actionLog);

  // calculate timeline range based on action timestamps
  const { minT, maxT } = useMemo(() => {
    if (actionLog.length === 0) {
      // if no actions, show past 1 hour window
      const now = Date.now();
      return { minT: now - 3600_000, maxT: now };
    }
    
    // find earliest and latest action times
    const times = actionLog.map((a) => +new Date(a.time));
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    // add 10% padding on each side for better visibility
    const padding = (max - min) * 0.1 || 60000; // at least 1 min padding
    return { minT: min - padding, maxT: max + padding };
  }, [actionLog]);

  const range = Math.max(1, maxT - minT);
  
  // helper to convert timestamp to percentage position on timeline
  const x = (ts: number) => ((ts - minT) / range) * 100;

  return (
    <div style={{ 
      border: "1px solid var(--border-primary)", 
      padding: "2rem", 
      borderRadius: 4,
      background: 'var(--bg-secondary)'
    }}>
      <h2 style={{ marginBottom: '1.5rem' }}>ACTION TIMELINE</h2>
      
      {/* empty state if no actions recorded yet */}
      {actionLog.length === 0 ? (
        <p style={{ 
          color: 'var(--text-tertiary)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.85rem',
          textAlign: 'center',
          padding: '2rem'
        }}>
          NO ACTIONS RECORDED YET
        </p>
      ) : (
        <div style={{ position: "relative", height: 80, marginTop: 8 }}>
          {/* horizontal timeline base line */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 0,
              right: 0,
              height: 1,
              background: "var(--border-accent)",
            }}
          />
          
          {/* time range labels at start and end */}
          <div style={{
            position: 'absolute',
            top: 60,
            left: 0,
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {fmt(new Date(minT).toISOString())}
          </div>
          <div style={{
            position: 'absolute',
            top: 60,
            right: 0,
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {fmt(new Date(maxT).toISOString())}
          </div>
          
          {/* tick marks at 0%, 25%, 50%, 75%, 100% */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <div key={pct} style={{ 
              position: "absolute", 
              left: `${pct}%`, 
              top: 30, 
              textAlign: "center",
              transform: 'translateX(-50%)'
            }}>
              <div style={{ 
                width: 1, 
                height: 20, 
                background: "var(--border-primary)", 
                margin: '0 auto'
              }} />
            </div>
          ))}
          
          {/* action markers positioned along timeline */}
          {actionLog.map((action) => {
            const ts = +new Date(action.time);
            const isExecuted = action.status === "EXECUTED";
            return (
              <div key={action.id} style={{ 
                position: "absolute", 
                left: `${x(ts)}%`, 
                top: 6,
                transform: 'translateX(-50%)'
              }}>
                {/* circular marker with tooltip */}
                <div
                  title={`${action.status}: ${action.action} @ ${fmt(action.time)}`}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: isExecuted ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    border: `2px solid ${isExecuted ? 'var(--text-primary)' : 'var(--text-tertiary)'}`,
                    margin: '0 auto',
                    boxShadow: isExecuted ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none'
                  }}
                />
                {/* timestamp label below marker */}
                <div style={{ 
                  fontSize: '0.65rem',
                  color: "var(--text-tertiary)",
                  marginTop: 6,
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap'
                }}>
                  {fmt(action.time)}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* usage hint at bottom */}
      <div style={{ 
        marginTop: '1.5rem',
        fontSize: '0.7rem',
        color: 'var(--text-tertiary)',
        textAlign: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.05em'
      }}>
        SHOWS EXECUTED ACTIONS OVER TIME • HOVER FOR DETAILS
      </div>
    </div>
  );
}
