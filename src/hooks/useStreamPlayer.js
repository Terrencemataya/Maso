import { useEffect, useRef, useCallback, useState } from 'react'

export function useStreamPlayer(streamId, wsPort) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const destroy = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pause()
        playerRef.current.unload()
        playerRef.current.detachMediaElement()
        playerRef.current.destroy()
      } catch {}
      playerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!wsPort || !videoRef.current) return
    if (!window.mpegts || !window.mpegts.isSupported()) {
      setError('MSE not supported')
      setStatus('error')
      return
    }

    destroy()
    setStatus('connecting')
    setError(null)

    const player = window.mpegts.createPlayer(
      {
        type: 'flv',
        url: `ws://localhost:${wsPort}`,
        isLive: true,
        hasAudio: false,
        hasVideo: true,
      },
      {
        enableWorker: false,
        lazyLoadMaxDuration: 3 * 60,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1.2,
        liveBufferLatencyMinRemain: 0.15,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 10,
        autoCleanupMinBackwardDuration: 5,
      }
    )

    player.attachMediaElement(videoRef.current)
    player.load()

    player.on(window.mpegts.Events.ERROR, (errType, errDetail) => {
      console.error(`[Player][${streamId}] Error:`, errType, errDetail)
      setError(`${errType}`)
      setStatus('error')
    })

    player.on(window.mpegts.Events.MEDIA_INFO, () => {
      setStatus('connected')
    })

    player.play().catch(() => {})
    playerRef.current = player

    return () => destroy()
  }, [wsPort, streamId, destroy])

  const toggleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return
    if (document.fullscreenElement) document.exitFullscreen()
    else videoRef.current.closest('.stream-cell')?.requestFullscreen?.()
  }, [])

  return { videoRef, status, error, toggleMute, toggleFullscreen }
}
