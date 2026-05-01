import useAppStore from '../store/useAppStore'

const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
const COLORS = {
  success: 'var(--color-success)',
  error:   'var(--color-danger)',
  warning: 'var(--color-warning)',
  info:    'var(--accent)',
}

export default function Notifications() {
  const { notifications, dismissNotification } = useAppStore()
  return (
    <div className="notif-stack">
      {notifications.map((n) => (
        <div key={n.id} className={`notif ${n.type}`} onClick={() => dismissNotification(n.id)}>
          <span style={{ color: COLORS[n.type] || COLORS.info, fontWeight: 700, fontSize: 13 }}>
            {ICONS[n.type] || ICONS.info}
          </span>
          <span style={{ color: 'var(--text-primary)', flex: 1 }}>{n.message}</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      ))}
    </div>
  )
}
