/**
 * RTSP URL utilities
 */

export function parseRtspUrl(url) {
  try {
    const parsed = new URL(url)
    return {
      protocol: parsed.protocol,
      host: parsed.hostname,
      port: parsed.port || '554',
      path: parsed.pathname,
      username: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      isValid: parsed.protocol === 'rtsp:' || parsed.protocol === 'rtsps:',
    }
  } catch {
    return { isValid: false }
  }
}

export function validateRtspUrl(url) {
  if (!url || !url.trim()) return { valid: false, error: 'URL is required' }
  const info = parseRtspUrl(url)
  if (!info.isValid) return { valid: false, error: 'Must be a valid rtsp:// or rtsps:// URL' }
  return { valid: true }
}

export function sanitizeRtspUrl(url) {
  try {
    const parsed = new URL(url)
    parsed.username = ''
    parsed.password = ''
    return parsed.toString()
  } catch {
    return url
  }
}

export function buildRtspUrl(base, username, password) {
  if (!username && !password) return base
  try {
    const parsed = new URL(base)
    parsed.username = encodeURIComponent(username || '')
    parsed.password = encodeURIComponent(password || '')
    return parsed.toString()
  } catch {
    return base
  }
}

export const COMMON_RTSP_PORTS = ['554', '8554', '10554']

export const RTSP_EXAMPLES = [
  'rtsp://admin:password@192.168.1.100:554/stream',
  'rtsp://192.168.0.50/live/ch00_0',
  'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4',
]
