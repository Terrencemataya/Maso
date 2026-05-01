import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { validateRtspUrl, RTSP_EXAMPLES } from '../utils/rtspUrl'

const BUFFER_MODES = [
  { value: 'low_latency', label: 'Low Latency', desc: 'Drones, live monitoring' },
  { value: 'balanced',    label: 'Balanced',    desc: 'IP cameras, CCTV' },
  { value: 'stable',      label: 'Stable',      desc: 'Recordings, NVR' },
]
const TRANSPORTS = ['tcp', 'udp', 'http']

export default function AddStreamModal() {
  const { editingStream, closeAddStreamModal, addStreamProfile, updateStreamProfile, notify } = useAppStore()

  const [form, setForm] = useState({
    name:       editingStream?.name        || '',
    url:        editingStream?.url         || '',
    username:   editingStream?.username    || '',
    password:   editingStream?.password    || '',
    transport:  editingStream?.transport   || 'tcp',
    bufferMode: editingStream?.buffer_mode || editingStream?.bufferMode || 'low_latency',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    const urlCheck = validateRtspUrl(form.url)
    if (!urlCheck.valid) e.url = urlCheck.error
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)

    const payload = { ...form, id: editingStream?.id }
    try {
      if (editingStream) {
        await window.maso?.db.streams.update(payload)
        updateStreamProfile(editingStream.id, payload)
        notify('Stream updated', 'success')
      } else {
        const result = await window.maso?.db.streams.add(payload)
        addStreamProfile({ ...payload, id: result?.id || crypto.randomUUID() })
        notify('Stream saved', 'success')
      }
      closeAddStreamModal()
    } catch (err) {
      notify(`Save failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeAddStreamModal()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{editingStream ? 'Edit Stream' : 'Add RTSP Stream'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={closeAddStreamModal}>✕</button>
        </div>

        <div className="modal-body">
          {/* Name */}
          <div className="field">
            <label className="field-label">Stream Name *</label>
            <input id="stream-name" className={`field-input${errors.name ? ' error' : ''}`} placeholder="e.g. Front Entrance Camera" value={form.name} onChange={(e) => set('name', e.target.value)} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          {/* URL */}
          <div className="field">
            <label className="field-label">RTSP URL *</label>
            <input id="stream-url" className={`field-input${errors.url ? ' error' : ''}`} placeholder="rtsp://192.168.1.100:554/stream" value={form.url} onChange={(e) => set('url', e.target.value)} spellCheck={false} />
            {errors.url && <span className="field-error">{errors.url}</span>}
            {!form.url && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {RTSP_EXAMPLES.map((ex) => (
                  <button key={ex} className="btn btn-ghost btn-sm" onClick={() => set('url', ex)} style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                    {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Credentials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label className="field-label">Username</label>
              <input className="field-input" placeholder="admin" value={form.username} onChange={(e) => set('username', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="field-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={(e) => set('password', e.target.value)} style={{ paddingRight: 36 }} />
                <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }} onClick={() => setShowPass((s) => !s)}>
                  {showPass ? 'hide' : 'show'}
                </button>
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="field">
            <label className="field-label">Transport</label>
            <select className="field-input field-select" value={form.transport} onChange={(e) => set('transport', e.target.value)}>
              {TRANSPORTS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>

          {/* Buffer Mode */}
          <div className="field">
            <label className="field-label">Buffer Mode</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {BUFFER_MODES.map((m) => (
                <button
                  key={m.value}
                  className={`btn btn-ghost btn-sm${form.bufferMode === m.value ? ' active' : ''}`}
                  style={{ flex: 1, flexDirection: 'column', gap: 2, height: 'auto', padding: '8px 4px',
                    ...(form.bufferMode === m.value ? { borderColor: 'var(--border-accent)', background: 'var(--accent-dim)', color: 'var(--accent)' } : {}) }}
                  onClick={() => set('bufferMode', m.value)}
                >
                  <span style={{ fontWeight: 600 }}>{m.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={closeAddStreamModal}>Cancel</button>
          <button id="btn-save-stream" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editingStream ? 'Update Stream' : 'Save Stream'}
          </button>
        </div>
      </div>
    </div>
  )
}
