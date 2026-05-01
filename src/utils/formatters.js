export function formatBitrate(kbps) {
  if (kbps == null) return '—'
  if (kbps < 1000) return `${kbps.toFixed(0)} kbps`
  return `${(kbps / 1000).toFixed(2)} Mbps`
}

export function formatFps(fps) {
  if (fps == null) return '—'
  return `${fps.toFixed(1)} fps`
}

export function formatLatency(ms) {
  if (ms == null) return '—'
  return `${ms.toFixed(0)} ms`
}

export function formatFileSize(bytes) {
  if (bytes == null || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, exp)).toFixed(1)} ${units[exp]}`
}

export function formatDuration(seconds) {
  if (seconds == null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDateTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const delta = (Date.now() - new Date(isoString).getTime()) / 1000
  if (delta < 60) return 'just now'
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  return `${Math.floor(delta / 86400)}d ago`
}

export function getStatusColor(status) {
  switch (status) {
    case 'connected': return 'var(--color-success)'
    case 'connecting': return 'var(--color-warning)'
    case 'reconnecting': return 'var(--color-warning)'
    case 'error': return 'var(--color-danger)'
    case 'stopped': return 'var(--color-text-muted)'
    default: return 'var(--color-text-muted)'
  }
}

export function getBitrateColor(kbps) {
  if (kbps == null) return 'var(--color-text-muted)'
  if (kbps > 4000) return 'var(--color-success)'
  if (kbps > 1000) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export function getFpsColor(fps) {
  if (fps == null) return 'var(--color-text-muted)'
  if (fps >= 25) return 'var(--color-success)'
  if (fps >= 15) return 'var(--color-warning)'
  return 'var(--color-danger)'
}
