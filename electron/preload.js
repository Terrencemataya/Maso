const { contextBridge, ipcRenderer } = require('electron')

// Expose safe, well-scoped APIs to the renderer via window.maso
contextBridge.exposeInMainWorld('maso', {
  // ─── Window Controls ────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // ─── Stream Management ──────────────────────────────────────────
  stream: {
    start: (config) => ipcRenderer.invoke('stream:start', config),
    stop: (id) => ipcRenderer.invoke('stream:stop', { id }),
    stopAll: () => ipcRenderer.invoke('stream:stopAll'),
    onStats: (id, cb) => {
      const handler = (_, stats) => cb(stats)
      ipcRenderer.on(`stream:stats:${id}`, handler)
      return () => ipcRenderer.removeListener(`stream:stats:${id}`, handler)
    },
    onError: (id, cb) => {
      const handler = (_, err) => cb(err)
      ipcRenderer.on(`stream:error:${id}`, handler)
      return () => ipcRenderer.removeListener(`stream:error:${id}`, handler)
    },
    onReconnect: (id, cb) => {
      const handler = (_, data) => cb(data)
      ipcRenderer.on(`stream:reconnect:${id}`, handler)
      return () => ipcRenderer.removeListener(`stream:reconnect:${id}`, handler)
    },
    onConnected: (id, cb) => {
      const handler = () => cb()
      ipcRenderer.on(`stream:connected:${id}`, handler)
      return () => ipcRenderer.removeListener(`stream:connected:${id}`, handler)
    },
    onTelemetry: (id, cb) => {
      const handler = (_, data) => cb(data)
      ipcRenderer.on(`stream:telemetry:${id}`, handler)
      return () => ipcRenderer.removeListener(`stream:telemetry:${id}`, handler)
    },
  },

  // ─── Recording ──────────────────────────────────────────────────
  recording: {
    start: (opts) => ipcRenderer.invoke('recording:start', opts),
    stop: (id) => ipcRenderer.invoke('recording:stop', { id }),
  },

  // ─── Snapshots ──────────────────────────────────────────────────
  snapshot: {
    capture: (opts) => ipcRenderer.invoke('snapshot:capture', opts),
  },

  // ─── Database / Stream Profiles ─────────────────────────────────
  db: {
    streams: {
      getAll: () => ipcRenderer.invoke('db:streams:getAll'),
      add: (s) => ipcRenderer.invoke('db:streams:add', s),
      update: (s) => ipcRenderer.invoke('db:streams:update', s),
      delete: (id) => ipcRenderer.invoke('db:streams:delete', { id }),
    },
    recordings: {
      getAll: () => ipcRenderer.invoke('db:recordings:getAll'),
    },
    snapshots: {
      getAll: () => ipcRenderer.invoke('db:snapshots:getAll'),
    },
  },

  // ─── Settings ───────────────────────────────────────────────────
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },

  // ─── ONVIF ──────────────────────────────────────────────────────
  onvif: {
    discover: () => ipcRenderer.invoke('onvif:discover'),
  },

  // ─── File System ────────────────────────────────────────────────
  fs: {
    openFolder: (p) => ipcRenderer.invoke('fs:openFolder', p),
    getDocumentsPath: () => ipcRenderer.invoke('fs:getDocumentsPath'),
    showSaveDialog: (opts) => ipcRenderer.invoke('fs:showSaveDialog', opts),
  },
})
