import { useEffect, useCallback } from 'react'
import useAppStore from './store/useAppStore'
import TopToolbar from './components/TopToolbar'
import Sidebar from './components/Sidebar'
import StreamGrid from './components/StreamGrid'
import AddStreamModal from './components/AddStreamModal'
import RecordingPanel from './components/RecordingPanel'
import DiagnosticsPanel from './components/DiagnosticsPanel'
import SettingsPanel from './components/SettingsPanel'
import PTZControls from './components/PTZControls'
import Notifications from './components/Notifications'

export default function App() {
  const {
    sidebarOpen, activePanel, addStreamModalOpen,
    initGridSlots, setStreamProfiles, setRecordings,
    notify,
  } = useAppStore()

  // Initialize on mount
  useEffect(() => {
    initGridSlots()
    if (!window.maso) return

    // Load saved stream profiles
    window.maso.db.streams.getAll().then((rows) => {
      if (rows) setStreamProfiles(rows.map(r => ({
        ...r,
        bufferMode: r.buffer_mode,
      })))
    })

    // Load recordings history
    window.maso.db.recordings.getAll().then((rows) => {
      if (rows) setRecordings(rows)
    })
  }, [])

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    const store = useAppStore.getState()
    switch (e.key) {
      case 'b': store.toggleSidebar(); break
      case 'r': store.setActivePanel(store.activePanel === 'recordings' ? null : 'recordings'); break
      case 'd': store.setActivePanel(store.activePanel === 'diagnostics' ? null : 'diagnostics'); break
      case ',': store.setActivePanel(store.activePanel === 'settings' ? null : 'settings'); break
      case 'n': store.openAddStreamModal(); break
      case '1': store.setLayout('1x1'); break
      case '2': store.setLayout('2x2'); break
      case '3': store.setLayout('3x3'); break
      case '4': store.setLayout('4x4'); break
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const renderPanel = () => {
    switch (activePanel) {
      case 'recordings':   return <RecordingPanel />
      case 'diagnostics':  return <DiagnosticsPanel />
      case 'settings':     return <SettingsPanel />
      case 'ptz':          return <PTZControls />
      default:             return null
    }
  }

  return (
    <div className="app-shell">
      <TopToolbar />
      <div className="app-body">
        <Sidebar />
        <div className="app-main">
          <StreamGrid />
        </div>
        {renderPanel()}
      </div>
      {addStreamModalOpen && <AddStreamModal />}
      <Notifications />
    </div>
  )
}
