import useAppStore from '../store/useAppStore'

const BUFFER_MODES = [
  { value: 'low_latency', label: 'Low Latency', desc: '< 1s, drones/live' },
  { value: 'balanced',    label: 'Balanced',    desc: '1-3s, CCTV' },
  { value: 'stable',      label: 'Stable',      desc: '3s+, stable feeds' },
]

export default function SettingsPanel() {
  const { settings, updateSettings, setActivePanel } = useAppStore()

  const toggle = (key) => updateSettings({ [key]: !settings[key] })

  const saveToBackend = async (key, value) => {
    updateSettings({ [key]: value })
    await window.maso?.settings.set(key, value)
  }

  return (
    <div className="side-panel">
      <div className="panel-header">
        <span className="panel-title">Settings</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActivePanel(null)}>✕</button>
      </div>
      <div className="panel-body">

        {/* Stats Overlay */}
        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>Display</div>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Stats Overlay (S)</span>
            <input type="checkbox" checked={settings.showStatsOverlay} onChange={() => toggle('showStatsOverlay')} />
          </label>
        </div>

        {/* Default Buffer Mode */}
        <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Default Buffer Mode</div>
          {BUFFER_MODES.map((m) => (
            <button
              key={m.value}
              className={`btn btn-ghost btn-sm${settings.bufferMode === m.value ? ' active' : ''}`}
              style={{ justifyContent: 'space-between', ...(settings.bufferMode === m.value ? { borderColor: 'var(--border-accent)', background: 'var(--accent-dim)', color: 'var(--accent)' } : {}) }}
              onClick={() => saveToBackend('bufferMode', m.value)}
            >
              <span>{m.label}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{m.desc}</span>
            </button>
          ))}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Keyboard Shortcuts</div>
          {[
            ['N', 'Add stream'],
            ['B', 'Toggle sidebar'],
            ['R', 'Recordings'],
            ['D', 'Diagnostics'],
            [',', 'Settings'],
            ['1–4', 'Grid layout'],
            ['Dbl-click', 'Fullscreen'],
          ].map(([key, action]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>{action}</span>
              <code style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>{key}</code>
            </div>
          ))}
        </div>

        {/* About */}
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          Maso v1.0.0 · RTSP Media Player<br />
          Built for drones, CCTV &amp; robotics
        </div>
      </div>
    </div>
  )
}
