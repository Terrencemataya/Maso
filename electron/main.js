const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const { initDatabase, dbGet, dbAll, dbRun } = require('./db')
const FFmpegManager = require('./ffmpegManager')
const RecordingManager = require('./recordingManager')
const SnapshotManager = require('./snapshotManager')
const OnvifDiscovery = require('./onvifDiscovery')

const isDev = process.env.NODE_ENV === 'development'
let mainWindow = null
let splashWindow = null
const ffmpegManager = new FFmpegManager()
const recordingManager = new RecordingManager()
const snapshotManager = new SnapshotManager()

// ─── Splash Window ────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 800,
    height: 520,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  const splashPath = path.join(__dirname, '../assets/sp.png')
  let splashImageBase64 = ''
  try {
    const bitmap = fs.readFileSync(splashPath)
    splashImageBase64 = `data:image/png;base64,${bitmap.toString('base64')}`
  } catch (err) {
    console.error('Failed to load splash image:', err)
  }

  const splashHtml = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; overflow: hidden; background: transparent; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #080c14; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 60px rgba(0,0,0,0.8);">
          <img src="${splashImageBase64}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.85; filter: brightness(0.7);">
          
          <div style="position: absolute; bottom: 40px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div class="spinner"></div>
            <span style="color: white; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 4px; opacity: 0.9; text-shadow: 0 2px 10px rgba(0,0,0,0.8);">Initializing Maso Systems</span>
          </div>
        </div>
        <style>
          .spinner {
            width: 24px;
            height: 24px;
            border: 2px solid rgba(0, 212, 255, 0.2);
            border-top: 2px solid #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </body>
    </html>
  `
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`)
  splashWindow.on('closed', () => { splashWindow = null })
}

// ─── Window Creation ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false, // Don't show yet
    titleBarStyle: 'hidden',
    backgroundColor: '#080c14',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    // Wait at least 2.5 seconds to show the beautiful splash screen
    setTimeout(() => {
      if (splashWindow) splashWindow.close()
      mainWindow.show()
    }, 2500)
  })

  mainWindow.on('closed', () => { mainWindow = null })
  Menu.setApplicationMenu(null)
}

app.whenReady().then(async () => {
  createSplashWindow()
  await initDatabase(app.getPath('userData'))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // ─── Telemetry Engine ────────────────────────────────────────────────────────
  const activeStreamsStartTimes = new Map() // streamId -> timestamp
  const telemetryStates = new Map() // streamId -> state object
  const MAVLINK_PORT = 14550
  const dgram = require('dgram')
  const udpServer = dgram.createSocket('udp4')

  // Handle incoming MAVLink or custom telemetry via UDP
  udpServer.on('message', (msg, rinfo) => {
    // Basic MAVLink detection: v1 starts with 0xFE, v2 with 0xFD
    if (msg[0] === 0xFE || msg[0] === 0xFD) {
      // In a real app, we'd use a mavlink library here.
      // For now, we'll just log that we see real data.
      // And we could try to bind this to a stream based on IP.
      console.log(`[Telemetry] Received MAVLink packet from ${rinfo.address}`)
    }
  })

  try { udpServer.bind(MAVLINK_PORT) } catch (e) { console.error('[Telemetry] UDP Bind failed', e) }

  setInterval(() => {
    const activeIds = ffmpegManager.getActiveStreams()
    activeIds.forEach(id => {
      if (!activeStreamsStartTimes.has(id)) activeStreamsStartTimes.set(id, Date.now())
      
      let state = telemetryStates.get(id)
      if (!state) {
        state = {
          lat: 34.0522 + (Math.random() - 0.5) * 0.01,
          lng: -118.2437 + (Math.random() - 0.5) * 0.01,
          alt: 100 + Math.random() * 50,
          heading: Math.floor(Math.random() * 360),
          battery: 95 + Math.random() * 5,
          speed: 10 + Math.random() * 10,
          model: `Drone-${id.slice(0, 4).toUpperCase()}`
        }
        telemetryStates.set(id, state)
      }

      // Update state realistically (smooth movement)
      const speedMs = state.speed / 3.6 // km/h to m/s roughly
      const headingRad = (state.heading * Math.PI) / 180
      state.lat += (Math.cos(headingRad) * speedMs * 0.00001) // 1m is approx 0.00001 degrees
      state.lng += (Math.sin(headingRad) * speedMs * 0.00001)
      state.alt += (Math.random() - 0.5) * 0.5
      state.battery -= 0.01 + Math.random() * 0.02
      state.heading = (state.heading + (Math.random() - 0.5) * 2 + 360) % 360
      if (state.battery < 0) state.battery = 0

      mainWindow?.webContents.send(`stream:telemetry:${id}`, {
        source: "SIMULATED", // Clearly indicate source
        model: state.model,
        flightMode: state.battery < 20 ? "RTL" : "POSITION",
        armed: true,
        battery: {
          percentage: Math.round(state.battery),
          voltage: (14.8 + (state.battery / 100) * 2.1).toFixed(1),
          current: (8 + Math.random() * 12).toFixed(1),
        },
        gps: {
          lat: state.lat.toFixed(6),
          lng: state.lng.toFixed(6),
          satellites: 15,
          fixType: "3D Lock"
        },
        vfr: {
          altRelative: state.alt.toFixed(1),
          altMSL: (state.alt + 50).toFixed(1),
          groundSpeed: state.speed.toFixed(1),
          climbRate: ((Math.random() - 0.5) * 0.4).toFixed(1),
          heading: Math.floor(state.heading)
        },
        attitude: {
          pitch: Math.floor((Math.random() - 0.5) * 6),
          roll: Math.floor((Math.random() - 0.5) * 4),
          yaw: Math.floor(state.heading)
        },
        gimbal: {
          pitch: -45,
          yaw: 0,
          roll: 0
        },
        signal: {
          quality: 98,
          rssi: -52
        },
        flightTime: Math.floor((Date.now() - activeStreamsStartTimes.get(id)) / 1000),
        timestamp: new Date().toISOString()
      })
    })
  }, 1000) // Update faster (1Hz)
})

app.on('window-all-closed', () => {
  ffmpegManager.stopAll()
  if (process.platform !== 'darwin') app.quit()
})

// ─── Window Controls IPC ─────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())

// ─── Stream IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('stream:start', async (event, streamConfig) => {
  try {
    const { id, url, username, password, transport, bufferMode } = streamConfig
    const result = await ffmpegManager.startStream(id, url, {
      username, password, transport, bufferMode,
      onStats: (stats) => mainWindow?.webContents.send(`stream:stats:${id}`, stats),
      onError:  (err)  => mainWindow?.webContents.send(`stream:error:${id}`, err),
      onReconnect: (attempt) => mainWindow?.webContents.send(`stream:reconnect:${id}`, { attempt }),
      onConnected: () => mainWindow?.webContents.send(`stream:connected:${id}`),
    })
    return { success: true, wsPort: result.wsPort }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('stream:stop', async (event, { id }) => {
  ffmpegManager.stopStream(id)
  return { success: true }
})

ipcMain.handle('stream:stopAll', async () => {
  ffmpegManager.stopAll()
  return { success: true }
})

// ─── Recording IPC ────────────────────────────────────────────────────────────
ipcMain.handle('recording:start', async (event, { streamId, streamUrl, username, password }) => {
  try {
    const recordingsDir = path.join(app.getPath('documents'), 'Maso', 'Recordings')
    fs.mkdirSync(recordingsDir, { recursive: true })
    const id = crypto.randomUUID()
    const filename = `rec_${streamId.slice(0, 8)}_${Date.now()}.mp4`
    const filePath = path.join(recordingsDir, filename)

    await recordingManager.startRecording(id, streamUrl, filePath, { username, password })
    dbRun(
      'INSERT INTO recordings (id, stream_id, filename, path, started_at) VALUES (?, ?, ?, ?, ?)',
      [id, streamId, filename, filePath, new Date().toISOString()]
    )
    return { success: true, id, path: filePath }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('recording:stop', async (event, { id }) => {
  try {
    const duration = await recordingManager.stopRecording(id)
    const recPath = recordingManager.getPath(id)
    const size = recPath && fs.existsSync(recPath) ? fs.statSync(recPath).size : 0
    dbRun(
      'UPDATE recordings SET ended_at=?, duration_secs=?, size_bytes=? WHERE id=?',
      [new Date().toISOString(), duration, size, id]
    )
    return { success: true, duration }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ─── Snapshot IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('snapshot:capture', async (event, { streamId, streamUrl, username, password }) => {
  try {
    const dir = path.join(app.getPath('documents'), 'Maso', 'Snapshots')
    fs.mkdirSync(dir, { recursive: true })
    const id = crypto.randomUUID()
    const filename = `snap_${streamId.slice(0, 8)}_${Date.now()}.jpg`
    const filePath = path.join(dir, filename)

    await snapshotManager.capture(streamUrl, filePath, { username, password })
    dbRun(
      'INSERT INTO snapshots (id, stream_id, path, captured_at) VALUES (?, ?, ?, ?)',
      [id, streamId, filePath, new Date().toISOString()]
    )
    return { success: true, id, path: filePath }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ─── Database IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('db:streams:getAll', () => dbAll('SELECT * FROM streams ORDER BY created_at DESC'))
ipcMain.handle('db:streams:add', (e, s) => {
  const id = crypto.randomUUID()
  dbRun(
    'INSERT INTO streams (id, name, url, username, password, transport, buffer_mode) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, s.name, s.url, s.username || '', s.password || '', s.transport || 'tcp', s.bufferMode || 'low_latency']
  )
  return { success: true, id }
})
ipcMain.handle('db:streams:update', (e, s) => {
  dbRun(
    'UPDATE streams SET name=?, url=?, username=?, password=?, transport=?, buffer_mode=? WHERE id=?',
    [s.name, s.url, s.username || '', s.password || '', s.transport || 'tcp', s.bufferMode || 'low_latency', s.id]
  )
  return { success: true }
})
ipcMain.handle('db:streams:delete', (e, { id }) => {
  dbRun('DELETE FROM streams WHERE id=?', [id])
  return { success: true }
})
ipcMain.handle('db:recordings:getAll', () => dbAll('SELECT * FROM recordings ORDER BY started_at DESC'))
ipcMain.handle('db:snapshots:getAll', () => dbAll('SELECT * FROM snapshots ORDER BY captured_at DESC'))

// ─── Authentication IPC ───────────────────────────────────────────────────────
ipcMain.handle('auth:login', async (event, { username, password }) => {
  const user = dbGet('SELECT id, username, role FROM users WHERE username=? AND password=?', [username, password])
  if (user) {
    return { success: true, user }
  } else {
    return { success: false, error: 'Invalid username or password' }
  }
})

// ─── Settings IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('settings:get', (e, key) => {
  const row = dbGet('SELECT value FROM settings WHERE key=?', [key])
  return row ? JSON.parse(row.value) : null
})
ipcMain.handle('settings:set', (e, key, value) => {
  dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)])
  return { success: true }
})

// ─── ONVIF IPC ────────────────────────────────────────────────────────────────
ipcMain.handle('onvif:discover', async () => OnvifDiscovery.discover())

// ─── File System IPC ──────────────────────────────────────────────────────────
ipcMain.handle('fs:openFolder', (e, p) => shell.openPath(p))
ipcMain.handle('fs:getDocumentsPath', () => path.join(app.getPath('documents'), 'Maso'))
ipcMain.handle('fs:showSaveDialog', async (e, opts) => dialog.showSaveDialog(mainWindow, opts))
