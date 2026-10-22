import { Html } from '@react-three/drei'
import type { HotspotData } from '../../data/specs'
import { useSceneStore } from '../../state/useSceneStore'
import './Hotspot.css'

type HotspotProps = {
  spot: HotspotData
}

export function Hotspot({ spot }: HotspotProps) {
  const mode = useSceneStore((s) => s.mode)
  const selected = useSceneStore((s) => s.selected)
  const select = useSceneStore((s) => s.select)
  const visible = mode === 'engineering' || spot.important

  if (!visible) return null

  return (
    <Html
      position={spot.position}
      center
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none' }}
      wrapperClass="hotspot-wrapper"
    >
      <button
        type="button"
        className={`hotspot hotspot--${spot.accent ?? 'amber'} ${
          selected === spot.id ? 'is-selected' : ''
        } ${mode === 'film' ? 'is-film' : ''}`}
        style={{ pointerEvents: 'auto' }}
        onClick={(event) => {
          event.stopPropagation()
          select(spot.id)
        }}
        aria-label={spot.title}
      >
        <span className="hotspot__dot" />
        <span className="hotspot__label">
          <span className="hotspot__title">{spot.title}</span>
          <span className="hotspot__en">{spot.en}</span>
        </span>
      </button>
    </Html>
  )
}
