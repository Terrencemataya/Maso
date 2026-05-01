import { useState, useRef, useCallback } from 'react'
import useAppStore from '../store/useAppStore'

export function useRecorder(streamId, streamUrl, credentials) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingId, setRecordingId] = useState(null)
  const [recordingPath, setRecordingPath] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)
  const notify = useAppStore((s) => s.notify)
  const addRecording = useAppStore((s) => s.addRecording)

  const startRecording = useCallback(async () => {
    if (!window.maso || isRecording) return
    try {
      const result = await window.maso.recording.start({
        streamId,
        streamUrl,
        username: credentials?.username,
        password: credentials?.password,
      })
      if (result.success) {
        setIsRecording(true)
        setRecordingId(result.id)
        setRecordingPath(result.path)
        setElapsed(0)
        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
        notify('Recording started', 'success')
      } else {
        notify(`Recording failed: ${result.error}`, 'error')
      }
    } catch (err) {
      notify(`Recording error: ${err.message}`, 'error')
    }
  }, [streamId, streamUrl, credentials, isRecording, notify])

  const stopRecording = useCallback(async () => {
    if (!window.maso || !isRecording || !recordingId) return
    clearInterval(timerRef.current)
    try {
      const result = await window.maso.recording.stop(recordingId)
      setIsRecording(false)
      if (result.success) {
        addRecording({ id: recordingId, path: recordingPath, duration: result.duration })
        notify('Recording saved', 'success')
      }
    } catch (err) {
      notify(`Stop recording error: ${err.message}`, 'error')
    }
    setRecordingId(null)
    setRecordingPath(null)
  }, [isRecording, recordingId, recordingPath, addRecording, notify])

  return { isRecording, elapsed, recordingPath, startRecording, stopRecording }
}
