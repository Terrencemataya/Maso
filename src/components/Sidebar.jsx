import { useState } from 'react'
import useAppStore from '../store/useAppStore'

const PlusIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const EditIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const TrashIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
const PlayIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const SearchIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const ScanIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3H3v2"/><path d="M21 3h-2v2"/><path d="M5 21H3v-2"/><path d="M21 21h-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>

export default function Sidebar() {
  const {
    sidebarOpen, streamProfiles, activeStreams,
    openAddStreamModal, openEditStreamModal, removeStreamProfile,
    getNextEmptySlot, assignStreamToSlot, setStreamActive,
    removeActiveStream, notify,
  } = useAppStore()

  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const filtered = streamProfiles.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.url.toLowerCase().includes(search.toLowerCase())
  )

  const getStreamStatus = (id) => activeStreams[id]?.status ?? 'idle'

  const handleConnect = async (profile) => {
    if (!window.maso) return
    const existing = activeStreams[profile.id]
    if (existing) {
      notify(`${profile.name} already active`, 'info')
      return
    }

    const slot = getNextEmptySlot()
    if (slot === -1) {
      notify('No empty grid slot. Close a stream first.', 'warning')
      return
    }

    setStreamActive(profile.id, { id: profile.id, name: profile.name, url: profile.url, status: 'connecting' })
    assignStreamToSlot(slot, profile.id)

    const result = await window.maso.stream.start({
      id: profile.id,
      url: profile.url,
      username: profile.username,
      password: profile.password,
      transport: profile.transport,
      bufferMode: profile.buffer_mode || profile.bufferMode || 'low_latency',
    })

    if (result.success) {
      setStreamActive(profile.id, { wsPort: result.wsPort, status: 'connecting' })
      window.maso.stream.onConnected(profile.id, () => {
        setStreamActive(profile.id, { status: 'connected' })
        notify(`${profile.name} connected`, 'success')
      })
      window.maso.stream.onError(profile.id, () => {
        setStreamActive(profile.id, { status: 'error' })
      })
      window.maso.stream.onReconnect(profile.id, ({ attempt }) => {
        setStreamActive(profile.id, { status: 'reconnecting', reconnectAttempt: attempt })
      })
    } else {
      removeActiveStream(profile.id)
      notify(`Failed to connect: ${result.error}`, 'error')
    }
  }

  const handleDisconnect = async (id, name) => {
    if (!window.maso) return
    await window.maso.stream.stop(id)
    removeActiveStream(id)
    notify(`${name} disconnected`, 'info')
  }

  const handleDelete = async (id) => {
    if (!window.maso) return
    await window.maso.db.streams.delete(id)
    removeStreamProfile(id)
    setDeletingId(null)
  }

  const handleONVIF = async () => {
    if (!window.maso) return
    notify('Scanning for ONVIF devices…', 'info')
    const devices = await window.maso.onvif.discover()
    if (devices.length === 0) {
      notify('No ONVIF devices found on network', 'warning')
    } else {
      notify(`Found ${devices.length} ONVIF device(s)`, 'success')
    }
  }

  return (
    <div className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
      {/* Search + Add */}
      <div className="sidebar-header">
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <SearchIcon />
          </span>
          <input
            className="sidebar-search"
            style={{ paddingLeft: 26 }}
            placeholder="Search streams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={openAddStreamModal} title="Add Stream">
          <PlusIcon />
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Saved Streams ({filtered.length})</div>

        {filtered.length === 0 && (
          <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
            {search ? 'No results' : 'No saved streams yet'}
          </div>
        )}

        {filtered.map((profile) => {
          const status = getStreamStatus(profile.id)
          const isActive = status !== 'idle'
          const isDeleting = deletingId === profile.id

          return (
            <div key={profile.id} className={`stream-item${isActive ? ' active' : ''}`}>
              <span className={`stream-item-dot${status === 'connected' ? ' live' : status === 'reconnecting' ? ' reconnecting' : status === 'error' ? ' error' : ''}`} />
              <div className="stream-item-info" onClick={() => isActive ? handleDisconnect(profile.id, profile.name) : handleConnect(profile)}>
                <div className="stream-item-name">{profile.name}</div>
                <div className="stream-item-url">{profile.url.replace(/rtsp?:\/\/[^@]+@/, 'rtsp://')}</div>
              </div>
              {isDeleting ? (
                <div style={{ display: 'flex', gap: 3 }}>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(profile.id)} title="Confirm delete">✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDeletingId(null)} title="Cancel">✕</button>
                </div>
              ) : (
                <div className="stream-item-actions">
                  {!isActive && (
                    <button className="cell-btn" onClick={() => handleConnect(profile)} title="Connect">
                      <PlayIcon />
                    </button>
                  )}
                  <button className="cell-btn" onClick={() => openEditStreamModal(profile)} title="Edit">
                    <EditIcon />
                  </button>
                  <button className="cell-btn danger" onClick={() => setDeletingId(profile.id)} title="Delete">
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <hr className="divider" />

      {/* ONVIF Discovery */}
      <div style={{ padding: '10px 12px' }}>
        <button className="btn btn-ghost w-full btn-sm" onClick={handleONVIF} style={{ justifyContent: 'flex-start', gap: 8 }}>
          <ScanIcon /> Scan ONVIF Devices
        </button>
      </div>
    </div>
  )
}
