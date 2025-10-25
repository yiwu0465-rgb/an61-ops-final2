// action log panel component - displays a chronological list of all executed actions
import { useStore } from "../store";

export function ActionLogPanel() {
  const log = useStore((s) => s.actionLog);
  
  return (
    <div style={{ 
      border: "1px solid var(--border-primary)", 
      padding: "2rem", 
      borderRadius: 4,
      background: 'var(--bg-secondary)'
    }}>
      <h2 style={{ marginBottom: '1.5rem' }}>ACTION LOG</h2>
      
      {/* show empty state if no actions have been executed yet */}
      {log.length === 0 ? 
        <p style={{ 
          color: 'var(--text-tertiary)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.85rem',
          textAlign: 'center'
        }}>NO ACTIONS RECORDED</p> 
        :
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem' 
        }}>
          {/* map through action log entries and display as cards */}
          {log.map((e) => (
            <div 
              key={e.id}
              style={{
                padding: '1rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                {/* status badge and timestamp */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    color: e.status === "EXECUTED" ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>
                    [{e.status}]
                  </span>
                  <span style={{ 
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.7rem',
                    color: 'var(--text-tertiary)'
                  }}>
                    {new Date(e.time).toLocaleTimeString()}
                  </span>
                </div>
                
                {/* action description */}
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  lineHeight: 1.5
                }}>
                  {e.action}
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
