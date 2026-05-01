import useAppStore from '../store/useAppStore'

const LAYOUTS = ['1x1', '2x2', '3x3', '4x4']

// SVG Icons
const Icon = {
  Menu:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Plus:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Rec:      () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>,
  Diag:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Settings: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Min:      () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Max:      () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  Close:    () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Film:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>,
  Scan:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3H3v2"/><path d="M21 3h-2v2"/><path d="M5 21H3v-2"/><path d="M21 21h-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>,
}

export default function TopToolbar() {
  const {
    toggleSidebar, layout, setLayout,
    activePanel, setActivePanel, openAddStreamModal, activeStreams,
  } = useAppStore()

  const liveCount = Object.values(activeStreams).filter((s) => s.status === 'connected').length

  const isElectron = !!window.maso

  return (
    <div className="titlebar">
      {/* Logo */}
      <div className="app-logo">
        <div className="logo-mark">M</div>
        <span>Maso</span>
      </div>

      <div className="toolbar-sep" />

      {/* Sidebar toggle */}
      <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleSidebar} title="Toggle Sidebar (B)">
        <Icon.Menu />
      </button>

      <div className="toolbar-sep" />

      {/* Add stream */}
      <button id="btn-add-stream" className="btn btn-primary btn-sm" onClick={openAddStreamModal} title="Add Stream (N)">
        <Icon.Plus /> Add Stream
      </button>

      <div className="toolbar-sep" />

      {/* Layout selector */}
      <div className="layout-btns">
        {LAYOUTS.map((l) => (
          <button
            key={l}
            className={`layout-btn${layout === l ? ' active' : ''}`}
            onClick={() => setLayout(l)}
            title={`${l} grid layout`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="toolbar-sep" />

      {/* Live count */}
      {liveCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-success)' }}>
          <span className="status-dot live" />
          {liveCount} Live
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Panel toggles */}
      <div className="toolbar-segment">
        <button
          className={`btn btn-ghost btn-icon btn-sm${activePanel === 'recordings' ? ' active' : ''}`}
          onClick={() => setActivePanel(activePanel === 'recordings' ? null : 'recordings')}
          title="Recordings (R)"
          style={activePanel === 'recordings' ? { borderColor: 'var(--border-accent)', color: 'var(--accent)' } : {}}
        >
          <Icon.Film />
        </button>
        <button
          className={`btn btn-ghost btn-icon btn-sm${activePanel === 'diagnostics' ? ' active' : ''}`}
          onClick={() => setActivePanel(activePanel === 'diagnostics' ? null : 'diagnostics')}
          title="Diagnostics (D)"
          style={activePanel === 'diagnostics' ? { borderColor: 'var(--border-accent)', color: 'var(--accent)' } : {}}
        >
          <Icon.Diag />
        </button>
        <button
          className={`btn btn-ghost btn-icon btn-sm${activePanel === 'settings' ? ' active' : ''}`}
          onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
          title="Settings (,)"
          style={activePanel === 'settings' ? { borderColor: 'var(--border-accent)', color: 'var(--accent)' } : {}}
        >
          <Icon.Settings />
        </button>
      </div>

      <div className="toolbar-sep" />

      {/* Window Controls (Electron only) */}
      {isElectron && (
        <div className="win-controls">
          <button className="win-btn" onClick={() => window.maso.window.minimize()} title="Minimize"><Icon.Min /></button>
          <button className="win-btn" onClick={() => window.maso.window.maximize()} title="Maximize"><Icon.Max /></button>
          <button className="win-btn close" onClick={() => window.maso.window.close()} title="Close"><Icon.Close /></button>
        </div>
      )}
    </div>
  )
}
