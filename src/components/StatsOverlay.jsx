import { formatBitrate, formatFps, getBitrateColor, getFpsColor } from '../utils/formatters'

export default function StatsOverlay({ stats }) {
  if (!stats) return null
  return (
    <div className="stats-overlay">
      <div className="stats-row">
        <span className="stats-label">FPS</span>
        <span className="stats-value font-mono" style={{ color: getFpsColor(stats.fps) }}>
          {formatFps(stats.fps)}
        </span>
      </div>
      <div className="stats-row">
        <span className="stats-label">BIT</span>
        <span className="stats-value font-mono" style={{ color: getBitrateColor(stats.bitrate) }}>
          {formatBitrate(stats.bitrate)}
        </span>
      </div>
      {stats.dropped > 0 && (
        <div className="stats-row">
          <span className="stats-label">DROP</span>
          <span className="stats-value font-mono" style={{ color: 'var(--color-danger)' }}>
            {stats.dropped}
          </span>
        </div>
      )}
    </div>
  )
}
