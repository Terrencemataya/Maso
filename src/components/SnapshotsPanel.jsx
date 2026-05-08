import React, { useEffect } from 'react'
import useAppStore from '../store/useAppStore'

const SnapshotsPanel = () => {
  const { snapshots, setSnapshots, setActivePanel } = useAppStore()

  useEffect(() => {
    loadSnapshots()
  }, [])

  const loadSnapshots = async () => {
    try {
      const data = await window.maso?.db.snapshots.getAll()
      setSnapshots(data || [])
    } catch (err) {
      console.error('Failed to load snapshots:', err)
    }
  }

  const handleOpenFolder = async () => {
    try {
      const path = await window.maso?.fs.getDocumentsPath()
      window.maso?.fs.openFolder(path + '/Snapshots')
    } catch (err) {
      console.error('Failed to open snapshots folder:', err)
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="side-panel active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header" style={{ padding: '20px 15px 15px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Snapshots</h2>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActivePanel(null)}>✕</button>
      </div>

      <div style={{ padding: '0 15px 15px', flex: 1, overflowY: 'auto' }}>
        <button 
          className="btn btn-secondary" 
          style={{ width: '100%', marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12 }}
          onClick={handleOpenFolder}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Explore Folder
        </button>

        {snapshots.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 60 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: 12 }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
            <p style={{ fontSize: 13 }}>No snapshots captured yet.</p>
          </div>
        ) : (
          <div className="snapshot-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {snapshots.map((snap) => (
              <div key={snap.id} className="snapshot-card" style={{ 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: 12, 
                overflow: 'hidden', 
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer'
              }} onClick={() => window.maso?.fs.openFolder(snap.path)}>
                <div style={{ 
                  aspectRatio: '16/9', 
                  background: '#000', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <img 
                    src={`file://${snap.path}`} 
                    alt="Snapshot" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = '<span style="font-size: 10px; opacity: 0.3">Preview Error</span>'
                    }}
                  />
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {snap.id.split('-')[0]}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.4 }}>
                    {new Date(snap.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SnapshotsPanel
