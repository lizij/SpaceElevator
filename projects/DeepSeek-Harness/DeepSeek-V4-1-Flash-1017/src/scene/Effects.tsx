import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, Noise, SSAO, Vignette } from '@react-three/postprocessing'
import { useSceneStore } from '../state/useSceneStore'
import { useIsMobile } from '../hooks/useMedia'

export function Effects() {
  const mode = useSceneStore((state) => state.mode)
  const view = useSceneStore((state) => state.view)
  const mobile = useIsMobile()
  const film = mode === 'film'

  if (mobile && !film) return null

  const ao = {
    base: { radius: 10, world: 18, falloff: 8, prox: 10, proxFall: 5 },
    cabin: { radius: 36, world: 80, falloff: 30, prox: 40, proxFall: 20 },
    station: { radius: 160, world: 420, falloff: 160, prox: 260, proxFall: 120 },
    counterweight: { radius: 130, world: 360, falloff: 140, prox: 220, proxFall: 100 },
    interior: { radius: 3.2, world: 8, falloff: 4, prox: 5, proxFall: 2 },
    orbit: { radius: 0.25, world: 0.8, falloff: 0.4, prox: 0.5, proxFall: 0.2 },
  }[view]

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={film ? 0.72 : 0.22}
        luminanceThreshold={film ? 0.62 : 0.8}
        luminanceSmoothing={0.22}
        mipmapBlur
        radius={0.72}
      />
      {!mobile && film ? <BrightnessContrast brightness={0.015} contrast={0.14} /> : <></>}
      {!mobile && film ? <HueSaturation hue={0} saturation={-0.07} /> : <></>}
      {!mobile ? (
        <SSAO
          intensity={film ? 20 : 12}
          radius={ao.radius}
          luminanceInfluence={0.55}
          worldDistanceThreshold={ao.world}
          worldDistanceFalloff={ao.falloff}
          worldProximityThreshold={ao.prox}
          worldProximityFalloff={ao.proxFall}
          distanceScaling
          depthAwareUpsampling
          samples={16}
          rings={5}
        />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.1} darkness={film ? 0.78 : 0.35} />
      {!mobile && film ? <Noise opacity={0.022} /> : <></>}
    </EffectComposer>
  )
}
