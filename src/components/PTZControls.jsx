import useAppStore from '../store/useAppStore'

export default function PTZControls() {
  const { ptzTargetStreamId, activeStreams, setActivePanel } = useAppStore()
  const stream = activeStreams[ptzTargetStreamId]

  const send = (cmd) => {
    // In production: send ONVIF PTZ commands via IPC
    console.log(`[PTZ] Command: ${cmd} → stream ${ptzTargetStreamId}`)
  }

  const BTN = ({ cmd, children, style }) => (
    <button className="ptz-btn" onMouseDown={() => send(`${cmd}_start`)} onMouseUp={() => send(`${cmd}_stop`)} onMouseLeave={() => send(`${cmd}_stop`)} style={style}>
      {children}
    </button>
  )

  return (
    <div className="side-panel">
      <div className="panel-header">
        <span className="panel-title">PTZ Controls</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActivePanel(null)}>✕</button>
      </div>
      <div className="panel-body" style={{ alignItems: 'center' }}>
        {stream && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{stream.name}</div>}

        {/* D-pad */}
        <div className="ptz-pad">
          <div />
          <BTN cmd="up">▲</BTN>
          <div />
          <BTN cmd="left">◀</BTN>
          <button className="ptz-btn ptz-center" onClick={() => send('home')} title="Home">⌂</button>
          <BTN cmd="right">▶</BTN>
          <div />
          <BTN cmd="down">▼</BTN>
          <div />
        </div>

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, width: '100%' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Zoom</span>
          <BTN cmd="zoom_out" style={{ width: 34, height: 34, fontSize: 16 }}>−</BTN>
          <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2 }} />
          <BTN cmd="zoom_in" style={{ width: 34, height: 34, fontSize: 16 }}>+</BTN>
        </div>

        {/* Presets */}
        <div style={{ width: '100%', marginTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Presets</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <button key={n} className="ptz-btn" onClick={() => send(`preset_${n}`)} style={{ fontSize: 11 }}>P{n}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
          Hold directional buttons to move.<br />ONVIF PTZ required on camera.
        </div>
      </div>
    </div>
  )
}
