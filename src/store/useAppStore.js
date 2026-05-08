import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // ─── Authentication ───────────────────────────────────────────────
  user: null,
  isAuthenticated: false,

  // ─── Stream Profiles (saved in DB) ───────────────────────────────
  streamProfiles: [],

  // ─── Active Streams ───────────────────────────────────────────────
  // id → { id, name, url, wsPort, status, stats, recording, recordingId }
  activeStreams: {},

  // ─── Grid Layout ──────────────────────────────────────────────────
  layout: '2x2',  // '1x1' | '2x2' | '3x3' | '4x4'
  gridSlots: [],  // array of stream IDs (or null for empty)

  // ─── UI State ─────────────────────────────────────────────────────
  sidebarOpen: true,
  activePanel: null,     // 'recordings' | 'diagnostics' | 'settings' | 'ptz' | null
  ptzTargetStreamId: null,
  selectedStreamId: null,

  // ─── Modals ───────────────────────────────────────────────────────
  addStreamModalOpen: false,
  editingStream: null,

  // ─── Recordings & Snapshots ───────────────────────────────────────
  recordings: [],
  snapshots: [],

  // ─── Notifications ────────────────────────────────────────────────
  notifications: [],

  // ─── Settings ────────────────────────────────────────────────────
  settings: {
    bufferMode: 'low_latency',
    transport: 'tcp',
    maxReconnectAttempts: 10,
    showStatsOverlay: true,
    gridGap: 4,
  },

  // ═══ Actions ═════════════════════════════════════════════════════

  // Layout
  setLayout: (layout) => {
    const sizes = { '1x1': 1, '2x2': 4, '3x3': 9, '4x4': 16 }
    const count = sizes[layout] || 4
    const current = get().gridSlots
    const newSlots = Array(count).fill(null).map((_, i) => current[i] ?? null)
    set({ layout, gridSlots: newSlots })
  },

  initGridSlots: () => {
    const { layout } = get()
    const sizes = { '1x1': 1, '2x2': 4, '3x3': 9, '4x4': 16 }
    const count = sizes[layout] || 4
    set({ gridSlots: Array(count).fill(null) })
  },

  // Stream Profiles
  setStreamProfiles: (profiles) => set({ streamProfiles: profiles }),

  addStreamProfile: (profile) =>
    set((s) => ({ streamProfiles: [profile, ...s.streamProfiles] })),

  updateStreamProfile: (id, updates) =>
    set((s) => ({
      streamProfiles: s.streamProfiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  removeStreamProfile: (id) =>
    set((s) => ({ streamProfiles: s.streamProfiles.filter((p) => p.id !== id) })),

  // Active Streams
  setStreamActive: (id, data) =>
    set((s) => ({ activeStreams: { ...s.activeStreams, [id]: { ...s.activeStreams[id], ...data } } })),

  removeActiveStream: (id) =>
    set((s) => {
      const next = { ...s.activeStreams }
      delete next[id]
      const gridSlots = s.gridSlots.map((sid) => (sid === id ? null : sid))
      return { activeStreams: next, gridSlots }
    }),

  updateStreamStats: (id, stats) =>
    set((s) => ({
      activeStreams: {
        ...s.activeStreams,
        [id]: { ...s.activeStreams[id], stats },
      },
    })),

  updateStreamTelemetry: (id, telemetry) =>
    set((s) => ({
      activeStreams: {
        ...s.activeStreams,
        [id]: { ...s.activeStreams[id], telemetry: { ...s.activeStreams[id]?.telemetry, ...telemetry } },
      },
    })),

  // Grid Slots
  assignStreamToSlot: (slotIndex, streamId) =>
    set((s) => {
      const slots = [...s.gridSlots]
      slots[slotIndex] = streamId
      return { gridSlots: slots }
    }),

  removeStreamFromSlot: (slotIndex) =>
    set((s) => {
      const slots = [...s.gridSlots]
      slots[slotIndex] = null
      return { gridSlots: slots }
    }),

  getNextEmptySlot: () => {
    const slots = get().gridSlots
    return slots.findIndex((s) => s === null)
  },

  // UI
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedStream: (id) => set({ selectedStreamId: id }),
  openAddStreamModal: () => set({ addStreamModalOpen: true, editingStream: null }),
  openEditStreamModal: (stream) => set({ addStreamModalOpen: true, editingStream: stream }),
  closeAddStreamModal: () => set({ addStreamModalOpen: false, editingStream: null }),
  openPTZ: (streamId) => set({ activePanel: 'ptz', ptzTargetStreamId: streamId }),

  // Recordings & Snapshots
  setRecordings: (recordings) => set({ recordings }),
  setSnapshots: (snapshots) => set({ snapshots }),
  addRecording: (rec) => set((s) => ({ recordings: [rec, ...s.recordings] })),
  addSnapshot: (snap) => set((s) => ({ snapshots: [snap, ...s.snapshots] })),

  // Notifications
  notify: (message, type = 'info') => {
    const id = crypto.randomUUID()
    set((s) => ({ notifications: [...s.notifications, { id, message, type, ts: Date.now() }] }))
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }))
    }, 4000)
  },
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  // Settings
  updateSettings: (updates) =>
    set((s) => ({ settings: { ...s.settings, ...updates } })),

  // Auth
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))

export default useAppStore
