import { useCallback } from 'react'
import useAppStore from '../store/useAppStore'
import { useStreamPlayer } from '../hooks/useStreamPlayer'
import { useStreamStats } from '../hooks/useStreamStats'
import { useRecorder } from '../hooks/useRecorder'
import StatsOverlay from './StatsOverlay'
import { formatDuration } from '../utils/formatters'

const XIcon     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const RecIcon   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
const SnapIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
const MaxIcon   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
const VolumeIcon= () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
const PTZIcon   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>

export default function StreamPlayer({ streamId, slotIndex }) {
  const { activeStreams, removeActiveStream, removeStreamFromSlot, settings, openPTZ, notify, streamProfiles } = useAppStore()
  const stream = activeStreams[streamId]
  const profile = streamProfiles.find((p) => p.id === streamId)

  const wsPort = stream?.wsPort
  const { videoRef, status, toggleMute, toggleFullscreen } = useStreamPlayer(streamId, wsPort)
  const { stats } = useStreamStats(streamId)
  const { isRecording, elapsed, startRecording, stopRecording } = useRecorder(
    streamId,
    stream?.url || profile?.url,
    { username: profile?.username, password: profile?.password }
  )

  const handleClose = useCallback(async () => {
    if (isRecording) await stopRecording()
    if (window.maso) await window.maso.stream.stop(streamId)
    removeActiveStream(streamId)
    removeStreamFromSlot(slotIndex)
  }, [streamId, slotIndex, isRecording, stopRecording, removeActiveStream, removeStreamFromSlot])

  const handleSnapshot = useCallback(async () => {
    if (!window.maso || !profile) return
    const result = await window.maso.snapshot.capture({
      streamId,
      streamUrl: profile.url,
      username: profile.username,
      password: profile.password,
    })
    if (result.success) notify('Snapshot saved', 'success')
    else notify(`Snapshot failed: ${result.error}`, 'error')
  }, [streamId, profile, notify])

  const isConnecting = status === 'connecting' || stream?.status === 'connecting'
  const isReconnecting = stream?.status === 'reconnecting'
  const displayName = stream?.name || profile?.name || streamId.slice(0, 8)

  return (
    <div className={`stream-cell${isRecording ? ' recording' : ''}`} onDoubleClick={toggleFullscreen}>
      {/* Video element */}
      <video ref={videoRef} autoPlay muted playsInline />

      {/* Loading overlay */}
      {(isConnecting || isReconnecting) && (
        <div className="stream-loading">
          <div className="stream-loading-spinner" />
          <span>{isReconnecting ? `Reconnecting (${stream?.reconnectAttempt ?? ''})…` : 'Connecting…'}</span>
        </div>
      )}

      {/* HUD overlay */}
      <div className="stream-cell-overlay">
        <div className="stream-cell-top">
          {/* Stream name + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className={`status-dot${stream?.status === 'connected' ? ' live' : isReconnecting ? ' connecting' : ' idle'}`} />
            <span className="stream-name-badge">{displayName}</span>
          </div>

          {/* Stats */}
          {settings.showStatsOverlay && stats && (
            <StatsOverlay stats={stats} />
          )}
        </div>

        {/* Rec badge */}
        {isRecording && (
          <div style={{ padding: '0 8px', marginTop: 4 }}>
            <span className="rec-badge"><RecIcon /> REC {formatDuration(elapsed)}</span>
          </div>
        )}

        {/* Bottom controls (on hover) */}
        <div className="stream-cell-bottom">
          <div className="cell-controls">
            <button className="cell-btn" onClick={toggleMute} title="Toggle audio"><VolumeIcon /></button>
            <button className="cell-btn" onClick={handleSnapshot} title="Snapshot"><SnapIcon /></button>
            <button
              className={`cell-btn${isRecording ? ' active' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? 'Stop recording' : 'Start recording'}
              style={isRecording ? { color: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : {}}
            >
              <RecIcon />
            </button>
            <button className="cell-btn" onClick={() => openPTZ(streamId)} title="PTZ Controls"><PTZIcon /></button>
            <button className="cell-btn" onClick={toggleFullscreen} title="Fullscreen"><MaxIcon /></button>
          </div>
          <button className="cell-btn danger" onClick={handleClose} title="Close stream"><XIcon /></button>
        </div>
      </div>
    </div>
  )
}
