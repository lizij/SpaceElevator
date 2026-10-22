import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Experience } from './scene/Experience'
import { HUD } from './ui/HUD'
import { Intro } from './ui/Intro'
import { Loading } from './ui/Loading'
import { Transition } from './ui/Transition'
import { LaunchHUD } from './ui/LaunchHUD'
import { useSceneStore } from './state/useSceneStore'
import { TOUR_ORDER, VIEW_ORDER } from './data/specs'
import { useIsMobile } from './hooks/useMedia'
import './styles.css'

export default function App() {
  const mobile = useIsMobile()
  const view = useSceneStore((s) => s.view)
  const mode = useSceneStore((s) => s.mode)
  const tour = useSceneStore((s) => s.tour)
  const introDone = useSceneStore((s) => s.introDone)
  const navigate = useSceneStore((s) => s.navigate)
  const setTour = useSceneStore((s) => s.setTour)
  const toggleTour = useSceneStore((s) => s.toggleTour)
  const toggleMode = useSceneStore((s) => s.toggleMode)
  const select = useSceneStore((s) => s.select)

  useEffect(() => {
    if (!tour) return
    const index = TOUR_ORDER.indexOf(view)
    const timer = window.setTimeout(() => {
      navigate(TOUR_ORDER[(index + 1) % TOUR_ORDER.length], true)
    }, 8200)
    return () => window.clearTimeout(timer)
  }, [navigate, tour, view])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!introDone) return
      const key = event.key.toLowerCase()
      const index = Number(key)
      if (index >= 1 && index <= VIEW_ORDER.length) {
        navigate(VIEW_ORDER[index - 1])
      } else if (key === 'r') {
        navigate('base')
      } else if (key === 'm') {
        toggleMode()
      } else if (key === 'escape') {
        select(null)
      } else if (key === ' ') {
        event.preventDefault()
        toggleTour()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [introDone, navigate, select, toggleMode, toggleTour])

  return (
    <div className={`app ${mobile ? 'is-mobile' : 'is-desktop'} mode-${mode}`}>
      <div
        className="canvas-host"
        onPointerDown={() => {
          if (tour) setTour(false)
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Canvas
          shadows
          dpr={[1, mobile ? 1.4 : 2]}
          camera={{ fov: 36, near: 0.1, far: 60000, position: [332, 152, 408] }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#03060a')
          }}
          onPointerMissed={() => select(null)}
        >
          <Experience />
        </Canvas>
      </div>

      <div className="film-grain" aria-hidden />
      <div className="edge-vignette" aria-hidden />
      <HUD />
      <Transition />
      <LaunchHUD />
      <Loading />
      <Intro />
    </div>
  )
}
