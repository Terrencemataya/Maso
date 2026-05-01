import useAppStore from '../store/useAppStore'
import StreamPlayer from './StreamPlayer'

const VideoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

export default function StreamGrid() {
  const { layout, gridSlots, openAddStreamModal } = useAppStore()

  return (
    <div className={`stream-grid layout-${layout}`}>
      {gridSlots.map((streamId, idx) => (
        streamId
          ? <StreamPlayer key={streamId} slotIndex={idx} streamId={streamId} />
          : (
            <div key={idx} className="stream-cell empty" onClick={openAddStreamModal}>
              <div className="stream-cell-empty-content">
                <VideoIcon />
                <span>Click to add stream</span>
                <PlusIcon />
              </div>
            </div>
          )
      ))}
    </div>
  )
}
