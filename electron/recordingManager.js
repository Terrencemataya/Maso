const { spawn } = require('child_process')
const path = require('path')

class RecordingManager {
  constructor() {
    this.recordings = new Map() // id → { process, path, startTime }
    this.ffmpegPath = this._resolveFfmpegPath()
  }

  _resolveFfmpegPath() {
    try {
      const ffmpegStatic = require('ffmpeg-static')
      if (ffmpegStatic) return ffmpegStatic
    } catch (err) {}

    const resourcesPath = process.resourcesPath || path.join(__dirname, '..', 'assets')
    const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    const bundled = path.join(resourcesPath, 'ffmpeg', binaryName)
    try {
      require('fs').accessSync(bundled)
      return bundled
    } catch {
      return binaryName
    }
  }

  startRecording(id, url, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      const { username, password } = options
      let rtspUrl = url

      if (username && password) {
        try {
          const parsed = new URL(url)
          parsed.username = encodeURIComponent(username)
          parsed.password = encodeURIComponent(password)
          rtspUrl = parsed.toString()
        } catch {}
      }

      const args = [
        '-fflags', 'nobuffer',
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-c', 'copy',
        '-f', 'mp4',
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        outputPath,
      ]

      const proc = spawn(this.ffmpegPath, args, { stdio: 'pipe' })
      const startTime = Date.now()

      this.recordings.set(id, { process: proc, path: outputPath, startTime })

      proc.on('spawn', () => {
        console.log(`[Recording][${id}] Started → ${outputPath}`)
        resolve({ id, path: outputPath })
      })

      proc.on('error', (err) => {
        console.error(`[Recording][${id}] Error:`, err.message)
        reject(err)
      })
    })
  }

  stopRecording(id) {
    return new Promise((resolve) => {
      const entry = this.recordings.get(id)
      if (!entry) return resolve(0)

      const duration = (Date.now() - entry.startTime) / 1000

      entry.process.stdin?.write('q')
      setTimeout(() => {
        try { entry.process.kill('SIGTERM') } catch {}
        this.recordings.delete(id)
        console.log(`[Recording][${id}] Stopped after ${duration.toFixed(1)}s`)
        resolve(duration)
      }, 1000)
    })
  }

  getPath(id) {
    return this.recordings.get(id)?.path || ''
  }

  isRecording(id) {
    return this.recordings.has(id)
  }

  stopAll() {
    for (const id of this.recordings.keys()) {
      this.stopRecording(id)
    }
  }
}

module.exports = RecordingManager
