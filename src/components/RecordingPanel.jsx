import { useEffect } from 'react'
import useAppStore from '../store/useAppStore'
import { formatDuration, formatFileSize, formatDateTime } from '../utils/formatters'

const FolderIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>

export default function RecordingPanel() {
  const { recordings, setRecordings, setActivePanel } = useAppStore()

  useEffect(() => {
    window.maso?.db.recordings.getAll().then((rows) => { if (rows) setRecordings(rows) })
  }, [])

  const openFolder = async () => {
    if (!window.maso) return
    const dir = await window.maso.fs.getDocumentsPath()
    window.maso.fs.openFolder(dir + '/Recordings')
  }

  return (
    <div className="side-panel">
      <div className="panel-header">
        <span className="panel-title">Recordings</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={openFolder} title="Open folder"><FolderIcon /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActivePanel(null)}>✕</button>
        </div>
      </div>
      <div className="panel-body">
        {recordings.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 20 }}>No recordings yet</div>
        )}
        {recordings.map((rec) => (
          <div key={rec.id} className="glass-card" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{rec.filename || rec.id.slice(0, 12)}</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{formatDuration(rec.duration_secs)}</span>
              <span>{formatFileSize(rec.size_bytes)}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDateTime(rec.started_at)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
