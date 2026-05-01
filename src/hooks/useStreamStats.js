import { useEffect, useRef, useState, useCallback } from 'react'

const MAX_HISTORY = 60 // Keep 60 data points

export function useStreamStats(streamId) {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState({
    fps: [],
    bitrate: [],
    timestamps: [],
  })
  const unsubRef = useRef(null)

  useEffect(() => {
    if (!streamId || !window.maso) return

    const unsub = window.maso.stream.onStats(streamId, (incoming) => {
      setStats(incoming)
      setHistory((prev) => {
        const ts = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        const fps = [...prev.fps, incoming.fps ?? 0].slice(-MAX_HISTORY)
        const bitrate = [...prev.bitrate, incoming.bitrate ?? 0].slice(-MAX_HISTORY)
        const timestamps = [...prev.timestamps, ts].slice(-MAX_HISTORY)
        return { fps, bitrate, timestamps }
      })
    })

    unsubRef.current = unsub
    return () => { unsub?.() }
  }, [streamId])

  const clearHistory = useCallback(() => {
    setHistory({ fps: [], bitrate: [], timestamps: [] })
  }, [])

  return { stats, history, clearHistory }
}
