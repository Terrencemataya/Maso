const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

const { initDatabase, dbGet, dbAll, dbRun } = require('./db')
const FFmpegManager = require('./ffmpegManager')
const RecordingManager = require('./recordingManager')
const SnapshotManager = require('./snapshotManager')
const OnvifDiscovery = require('./onvifDiscovery')

const isDev = process.env.NODE_ENV === 'development'
let mainWindow = null
const ffmpegManager = new FFmpegManager()
const recordingManager = new RecordingManager()
const snapshotManager = new SnapshotManager()

// ─── Window Creation ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#080c14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
  Menu.setApplicationMenu(null)
}

app.whenReady().then(async () => {
  await initDatabase(app.getPath('userData'))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
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
