import { OrbitLayer } from './layers/OrbitLayer'
import { BaseLayer } from './layers/BaseLayer'
import { CabinLayer } from './parts/cabin/Cabin'
import { StationLayer } from './parts/station/Station'
import { CounterweightLayer } from './layers/CounterweightLayer'
import { InteriorLayer } from './parts/interior/Interior'
import { useSceneStore } from '../state/useSceneStore'

export function SceneContent() {
  const view = useSceneStore((state) => state.view)

  switch (view) {
    case 'orbit':
      return <OrbitLayer />
    case 'base':
      return <BaseLayer />
    case 'cabin':
      return <CabinLayer />
    case 'station':
      return <StationLayer />
    case 'counterweight':
      return <CounterweightLayer />
    case 'interior':
      return <InteriorLayer />
    default:
      return null
  }
}
