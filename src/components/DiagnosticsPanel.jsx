import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'
import useAppStore from '../store/useAppStore'
import { useStreamStats } from '../hooks/useStreamStats'
import { formatBitrate, formatFps } from '../utils/formatters'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

function StreamStatChart({ label, data, labels, color }) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [{
      label,
      data,
      fill: true,
      borderColor: color,
      backgroundColor: color.replace(')', ', 0.08)').replace('rgb', 'rgba'),
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.4,
    }],
  }), [data, labels, color, label])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { display: false },
      y: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4b5563', font: { size: 9 }, maxTicksLimit: 4 } },
    },
  }

  return (
    <div style={{ height: 60 }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

function StreamDiag({ streamId }) {
  const { activeStreams } = useAppStore()
  const { stats, history } = useStreamStats(streamId)
  const stream = activeStreams[streamId]

  return (
    <div className="glass-card" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
        <span className={`status-dot${stream?.status === 'connected' ? ' live' : ' idle'}`} />
        {stream?.name || streamId.slice(0, 10)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bitrate <span style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>{formatBitrate(stats?.bitrate)}</span></div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>FPS <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{formatFps(stats?.fps)}</span></div>
      </div>
      {history.bitrate.length > 2 && (
        <StreamStatChart label="Bitrate" data={history.bitrate} labels={history.timestamps} color="rgb(16,185,129)" />
      )}
      {history.fps.length > 2 && (
        <StreamStatChart label="FPS" data={history.fps} labels={history.timestamps} color="rgb(0,212,255)" />
      )}
    </div>
  )
}

export default function DiagnosticsPanel() {
  const { activeStreams, setActivePanel } = useAppStore()
  const streamIds = Object.keys(activeStreams)

  return (
    <div className="side-panel">
      <div className="panel-header">
        <span className="panel-title">Stream Diagnostics</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActivePanel(null)}>✕</button>
      </div>
      <div className="panel-body">
        {streamIds.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 20 }}>No active streams</div>
        )}
        {streamIds.map((id) => <StreamDiag key={id} streamId={id} />)}
      </div>
    </div>
  )
}
