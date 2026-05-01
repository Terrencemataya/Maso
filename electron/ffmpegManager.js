const { spawn } = require('child_process')
const path = require('path')
const { app } = require('electron')
const WsStreamServer = require('./wsServer')

const BUFFER_MODES = {
  low_latency: [
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-analyzeduration', '0',
    '-probesize', '32',
    '-avioflags', 'direct',
  ],
  balanced: [
    '-fflags', '+genpts',
    '-analyzeduration', '1000000',
    '-probesize', '1000000',
  ],
  stable: [
    '-fflags', '+genpts',
    '-analyzeduration', '5000000',
    '-probesize', '5000000',
    '-max_delay', '5000000',
  ],
}

class FFmpegManager {
  constructor() {
    this.streams = new Map() // streamId → { process, wsServer, reconnectTimer, stopped }
    this.ffmpegPath = this._resolveFfmpegPath()
  }

  _resolveFfmpegPath() {
    try {
      const ffmpegStatic = require('ffmpeg-static')
      if (ffmpegStatic) return ffmpegStatic
    } catch (err) {}

    // 1. Bundled binary in app resources
    const resourcesPath = process.resourcesPath || path.join(__dirname, '..', 'assets')
    const platform = process.platform
    const binaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    const bundled = path.join(resourcesPath, 'ffmpeg', binaryName)

    try {
      require('fs').accessSync(bundled)
      return bundled
    } catch {
      // Fall back to system FFmpeg
      return platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    }
  }

  _buildArgs(url, options = {}) {
    const { username, password, transport = 'tcp', bufferMode = 'low_latency' } = options
    const bufferFlags = BUFFER_MODES[bufferMode] || BUFFER_MODES.low_latency

    let rtspUrl = url
    if (username && password) {
      try {
        const parsed = new URL(url)
        parsed.username = encodeURIComponent(username)
        parsed.password = encodeURIComponent(password)
        rtspUrl = parsed.toString()
      } catch {}
    }

    return [
      ...bufferFlags,
      '-rtsp_transport', transport,
      '-i', rtspUrl,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p',
      '-g', '30', // Ensure frequent keyframes so playback starts instantly
      '-an',
      '-f', 'flv',
      '-'
    ]
  }

  async startStream(id, url, options = {}) {
    // Stop existing stream if any
    if (this.streams.has(id)) {
      this.stopStream(id)
      await new Promise(r => setTimeout(r, 500))
    }

    const wsServer = new WsStreamServer()
    const wsPort = await wsServer.start()

    const entry = { wsServer, process: null, stopped: false, reconnectAttempt: 0, url, options }
    this.streams.set(id, entry)

    this._spawnProcess(id)

    return { wsPort }
  }

  _spawnProcess(id) {
    const entry = this.streams.get(id)
    if (!entry || entry.stopped) return

    const { url, options } = entry
    const args = this._buildArgs(url, options)

    console.log(`[FFmpeg][${id}] Spawning: ${this.ffmpegPath} ${args.join(' ')}`)

    const proc = spawn(this.ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    entry.process = proc

    // Pipe stdout → WebSocket server
    proc.stdout.on('data', (chunk) => {
      entry.wsServer.broadcast(chunk)
    })

    // Parse stats from stderr
    let statsBuffer = ''
    proc.stderr.on('data', (data) => {
      statsBuffer += data.toString()
      const lines = statsBuffer.split('\r')
      statsBuffer = lines.pop() || ''
      for (const line of lines) {
        const stats = this._parseStats(line)
        if (stats) options.onStats?.(stats)
      }
    })

    proc.on('spawn', () => {
      entry.reconnectAttempt = 0
      options.onConnected?.()
      console.log(`[FFmpeg][${id}] Connected`)
    })

    proc.on('close', (code) => {
      if (entry.stopped) return
      console.warn(`[FFmpeg][${id}] Process exited with code ${code}, scheduling reconnect...`)
      this._scheduleReconnect(id)
    })

    proc.on('error', (err) => {
      console.error(`[FFmpeg][${id}] Error:`, err.message)
      options.onError?.({ message: err.message })
    })
  }

  _scheduleReconnect(id) {
    const entry = this.streams.get(id)
    if (!entry || entry.stopped) return

    const maxAttempts = 10
    if (entry.reconnectAttempt >= maxAttempts) {
      console.error(`[FFmpeg][${id}] Max reconnect attempts reached`)
      entry.options.onError?.({ message: 'Max reconnect attempts reached' })
      return
    }

    entry.reconnectAttempt++
    const delay = Math.min(1000 * Math.pow(1.5, entry.reconnectAttempt), 30000)
    entry.options.onReconnect?.(entry.reconnectAttempt)

    console.log(`[FFmpeg][${id}] Reconnect attempt ${entry.reconnectAttempt} in ${delay}ms`)
    entry.reconnectTimer = setTimeout(() => this._spawnProcess(id), delay)
  }

  _parseStats(line) {
    const fpsMatch = line.match(/fps=\s*([0-9.]+)/)
    const bitrateMatch = line.match(/bitrate=\s*([0-9.]+)kbits\/s/)
    const sizeMatch = line.match(/size=\s*([0-9]+)kB/)
    const timeMatch = line.match(/time=([0-9:]+\.[0-9]+)/)
    const dropMatch = line.match(/drop=\s*([0-9]+)/)

    if (!fpsMatch && !bitrateMatch) return null

    return {
      fps: fpsMatch ? parseFloat(fpsMatch[1]) : null,
      bitrate: bitrateMatch ? parseFloat(bitrateMatch[1]) : null,
      size: sizeMatch ? parseInt(sizeMatch[1]) : null,
      time: timeMatch ? timeMatch[1] : null,
      dropped: dropMatch ? parseInt(dropMatch[1]) : 0,
      timestamp: Date.now(),
    }
  }

  stopStream(id) {
    const entry = this.streams.get(id)
    if (!entry) return

    entry.stopped = true
    clearTimeout(entry.reconnectTimer)

    if (entry.process) {
      try {
        entry.process.kill('SIGKILL')
      } catch {}
      entry.process = null
    }

    entry.wsServer.stop()
    this.streams.delete(id)
    console.log(`[FFmpeg][${id}] Stream stopped`)
  }

  stopAll() {
    for (const id of this.streams.keys()) {
      this.stopStream(id)
    }
  }

  getActiveStreams() {
    return Array.from(this.streams.keys())
  }
}

module.exports = FFmpegManager
