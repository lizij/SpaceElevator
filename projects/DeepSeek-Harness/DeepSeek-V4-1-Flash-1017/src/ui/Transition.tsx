import { useSceneStore } from '../state/useSceneStore'

export function Transition() {
  const transitioning = useSceneStore((s) => s.transitioning)
  return (
    <div className={`transition ${transitioning ? 'is-active' : ''}`} aria-hidden>
      <div className="transition__line" />
      <div className="transition__text">SHIFTING SCALE</div>
    </div>
  )
}
