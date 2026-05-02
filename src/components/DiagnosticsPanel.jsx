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
      
      {stream?.telemetry && (
        <div className="telemetry-panel" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
          {/* Source Indicator */}
          <div style={{ fontSize: 9, color: stream.telemetry.source === 'SIMULATED' ? 'var(--color-warning)' : 'var(--color-success)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.05em' }}>
            ● {stream.telemetry.source === 'SIMULATED' ? 'MOCK TELEMETRY (NO SOURCE)' : 'LIVE TELEMETRY (MAVLINK)'}
          </div>
          {/* Header row: Mode & Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className={`telemetry-badge mode-${stream.telemetry.flightMode.toLowerCase()}`}>{stream.telemetry.flightMode}</div>
            <div className={`telemetry-badge status-${stream.telemetry.armed ? 'armed' : 'disarmed'}`}>{stream.telemetry.armed ? 'ARMED' : 'DISARMED'}</div>
          </div>

          <div className="telemetry-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
            <TelemetryRow label="Model" value={stream.telemetry.model} />
            <TelemetryRow label="Signal" value={`${stream.telemetry.signal.quality}% (${stream.telemetry.signal.rssi}dBm)`} />
            
            <TelemetryRow label="GPS" value={`${stream.telemetry.gps.lat}, ${stream.telemetry.gps.lng}`} colSpan={2} subValue={`${stream.telemetry.gps.satellites} Sats • ${stream.telemetry.gps.fixType}`} />
            
            <TelemetryRow label="Alt (Rel)" value={`${stream.telemetry.vfr.altRelative}m`} />
            <TelemetryRow label="Alt (MSL)" value={`${stream.telemetry.vfr.altMSL}m`} />
            
            <TelemetryRow label="Ground Speed" value={`${stream.telemetry.vfr.groundSpeed} m/s`} />
            <TelemetryRow label="Climb Rate" value={`${stream.telemetry.vfr.climbRate} m/s`} />
            
            <TelemetryRow label="Heading" value={`${stream.telemetry.vfr.heading}°`} />
            <TelemetryRow label="Flight Time" value={`${Math.floor(stream.telemetry.flightTime / 60)}m ${stream.telemetry.flightTime % 60}s`} />
            
            <TelemetryRow label="Power" value={`${stream.telemetry.battery.percentage}%`} subValue={`${stream.telemetry.battery.voltage}V • ${stream.telemetry.battery.current}A`} />
            <TelemetryRow label="Attitude" value={`P:${stream.telemetry.attitude.pitch}° R:${stream.telemetry.attitude.roll}°`} subValue={`Yaw: ${stream.telemetry.attitude.yaw}°`} />
            
            <TelemetryRow label="Gimbal" value={`P: ${stream.telemetry.gimbal.pitch}° Y: ${stream.telemetry.gimbal.yaw}°`} colSpan={2} />
          </div>

          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 12, opacity: 0.6 }}>
            UPTIME: {new Date(stream.telemetry.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {history.bitrate.length > 2 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Bitrate History</div>
          <StreamStatChart label="Bitrate" data={history.bitrate} labels={history.timestamps} color="rgb(16,185,129)" />
        </div>
      )}
    </div>
  )
}

function TelemetryRow({ label, value, subValue, colSpan = 1 }) {
  return (
    <div style={{ gridColumn: `span ${colSpan}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {subValue && <div style={{ fontSize: 9, color: 'var(--accent)', fontFamily: 'var(--font-mono)', opacity: 0.8 }}>{subValue}</div>}
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
