import { useEffect } from 'react'
import useAppStore from '../store/useAppStore'

export function useStreamTelemetry(streamId) {
  const { updateStreamTelemetry } = useAppStore()

  useEffect(() => {
    if (!streamId || !window.maso) return

    const unsub = window.maso.stream.onTelemetry(streamId, (data) => {
      updateStreamTelemetry(streamId, data)
    })

    return () => {
      unsub?.()
    }
  }, [streamId, updateStreamTelemetry])
}
