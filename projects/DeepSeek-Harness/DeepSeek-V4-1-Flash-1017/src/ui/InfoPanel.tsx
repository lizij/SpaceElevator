import type { HotspotData } from '../data/specs'

type InfoPanelProps = {
  spot: HotspotData
  onClose: () => void
}

export function InfoPanel({ spot, onClose }: InfoPanelProps) {
  return (
    <section className={`info-panel info-panel--${spot.accent ?? 'amber'}`} aria-label={spot.title}>
      <div className="info-panel__head">
        <div>
          <div className="info-panel__kicker">{spot.kicker}</div>
          <h2>{spot.title}</h2>
          <div className="info-panel__en">{spot.en}</div>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>

      <p className="info-panel__body">{spot.body}</p>

      <dl className="info-panel__specs">
        {spot.specs.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="info-panel__foot">
        <span>UEG / SPACE ELEVATOR</span>
        <span>STRUCTURAL RECORD</span>
      </div>
    </section>
  )
}
