const { spawn } = require('child_process')
const path = require('path')

class SnapshotManager {
  constructor() {
    this.ffmpegPath = this._resolveFfmpegPath()
  }

  _resolveFfmpegPath() {
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

  capture(url, outputPath, options = {}) {
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
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-vframes', '1',
        '-q:v', '2',
        '-f', 'image2',
        outputPath,
        '-y',
      ]

      const proc = spawn(this.ffmpegPath, args, { stdio: 'pipe' })

      const timeout = setTimeout(() => {
        proc.kill()
        reject(new Error('Snapshot capture timed out'))
      }, 15000)

      proc.on('close', (code) => {
        clearTimeout(timeout)
        if (code === 0) {
          console.log(`[Snapshot] Saved to ${outputPath}`)
          resolve(outputPath)
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`))
        }
      })

      proc.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  }
}

module.exports = SnapshotManager
