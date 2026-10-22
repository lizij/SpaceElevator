import { useMemo } from 'react'
import { useSceneStore } from '../../state/useSceneStore'
import { useIsMobile } from '../../hooks/useMedia'
import { HOTSPOTS } from '../../data/specs'
import { Hotspot } from '../parts/Hotspot'
import { CableStay } from '../kit/CableStay'
import { BeamInstances, type Beam } from '../kit/BeamInstances'
import { darkMaterial, orangeEmissive, redMaterial, steelMaterial, warmEmissive, whiteMaterial } from '../kit/materials'
import { getDeckMaterial } from '../kit/deckTexture'
import { TrussRing } from '../kit/TrussRing'
import { MainTower } from '../parts/base/MainTower'
import { LaunchGantries } from '../parts/base/LaunchGantries'
import { CentralShaft } from '../parts/base/CentralShaft'
import { Harbor } from '../parts/base/Harbor'
import { Ocean } from '../parts/Ocean'
import { SkyDome } from '../parts/SkyDome'
import { Sun } from '../parts/Sun'
import { LaunchSequence } from '../LaunchSequence'

const TOWER_ANGLES = [90, 210, 330]
const TOWER_RADIUS = 45
const RING_RADIUS = 48

export function BaseLayer() {
  const mode = useSceneStore((s) => s.mode)
  const mobile = useIsMobile()

  const towers = useMemo(
    () =>
      TOWER_ANGLES.map((angle) => {
        const rad = (angle * Math.PI) / 180
        return {
          angle,
          position: [Math.cos(rad) * TOWER_RADIUS, 0, Math.sin(rad) * TOWER_RADIUS] as [number, number, number],
          rotationY: Math.PI / 2 - rad,
        }
      }),
    [],
  )

  const stays = useMemo(() => {
    const list: { start: [number, number, number]; end: [number, number, number]; sag: number }[] = []
    for (const tower of towers) {
      const rad = (tower.angle * Math.PI) / 180
      for (const offset of [-22, -11, 0, 11, 22]) {
        const a = rad + (offset * Math.PI) / 180
        list.push({
          start: [tower.position[0], offset === 0 ? 198 : 190, tower.position[2]],
          end: [Math.cos(a) * 164, 2, Math.sin(a) * 164],
          sag: 22 + Math.abs(offset) * 0.12,
        })
      }
      list.push({
        start: [tower.position[0], 184, tower.position[2]],
        end: [0, 112, 0],
        sag: 5,
      })
    }
    return list
  }, [towers])

  return (
    <group>
      <SkyDome radius={2400} top="#22313f" horizon="#a5b1b7" bottom="#43515a" />
      <Sun position={[-480, 135, -690]} scale={54} color="#ffd6a3" opacity={0.9} />
      <Ocean />
      <Harbor />

      {towers.map((tower) => (
        <MainTower key={tower.angle} position={tower.position} rotationY={tower.rotationY} seed={tower.angle} />
      ))}

      <RingBand />
      <TrussRing radius={RING_RADIUS} y={34} height={9} segments={48} tube={1.0} beamRadius={0.4} color="steel" />
      <RingDeck />
      <RingSupports />

      <LaunchGantries />
      <CentralShaft />
      <LaunchSequence />

      {stays.map((stay, i) => (
        <CableStay
          key={i}
          start={stay.start}
          end={stay.end}
          sag={stay.sag}
          width={i % 3 === 0 ? 1.35 : 0.9}
          color="#111820"
          opacity={0.92}
        />
      ))}

      {mode === 'engineering' && (
        <gridHelper args={[260, 32, '#5b7186', '#2a3a48']} position={[0, 0.9, 0]} />
      )}

      <hemisphereLight args={['#c6dbea', '#25333d', mode === 'film' ? 1.25 : 1.35]} />
      <ambientLight intensity={mode === 'film' ? 0.38 : 0.68} />
      <directionalLight
        position={[-310, 460, -300]}
        intensity={mode === 'film' ? 3.1 : 2.0}
        color="#ffe0b8"
        castShadow
        shadow-mapSize={[mobile ? 1024 : 2048, mobile ? 1024 : 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={260}
        shadow-camera-bottom={-80}
        shadow-camera-near={10}
        shadow-camera-far={1400}
      />
      <pointLight position={[0, 26, 30]} intensity={42} distance={120} color="#ffa15a" />
      <pointLight position={[70, 58, -30]} intensity={55} distance={150} color="#ffc08a" />
      <pointLight position={[-65, 48, 46]} intensity={45} distance={140} color="#ffd0a0" />
      <directionalLight position={[360, 260, 420]} intensity={mode === 'film' ? 1.15 : 0.8} color="#b7d5ea" />
      <pointLight position={[58, 48, 18]} intensity={30} distance={120} color="#ffb579" />
      <pointLight position={[-48, 40, -48]} intensity={26} distance={110} color="#8fc5ff" />
      <pointLight position={[0, 15, 0]} intensity={18} distance={80} color="#88c8ff" />

      {HOTSPOTS.filter((spot) => spot.view === 'base').map((spot) => (
        <Hotspot key={spot.id} spot={spot} />
      ))}
    </group>
  )
}

function RingBand() {
  const { light, dark, panels } = useMemo(() => {
    const lightBeams: Beam[] = []
    const darkBeams: Beam[] = []
    const panelList: { a: number; y: number; w: number; h: number }[] = []
    const segments = 32
    const rOuter = 56
    const rInner = 32
    const yTop = 66
    const yBottom = 36
    const point = (radius: number, angle: number, y: number): [number, number, number] => [
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius,
    ]
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2
      const a1 = ((i + 1) / segments) * Math.PI * 2
      const mid = (a0 + a1) / 2
      for (const radius of [rOuter, rInner]) {
        lightBeams.push({ a: point(radius, a0, yBottom), b: point(radius, a0, yTop), r: 0.62 })
        lightBeams.push({ a: point(radius, a0, yTop), b: point(radius, a1, yTop), r: 0.72 })
        lightBeams.push({ a: point(radius, a0, yBottom), b: point(radius, a1, yBottom), r: 0.72 })
        darkBeams.push({ a: point(radius, a0, yBottom), b: point(radius, a1, yTop), r: 0.32 })
        darkBeams.push({ a: point(radius, a0, yTop), b: point(radius, a1, yBottom), r: 0.32 })
      }
      for (const y of [yTop, yBottom]) {
        lightBeams.push({ a: point(rInner, a0, y), b: point(rOuter, a0, y), r: 0.55 })
        darkBeams.push({ a: point(rInner, a0, yTop), b: point(rOuter, a1, yBottom), r: 0.3 })
        darkBeams.push({ a: point(rInner, a0, yBottom), b: point(rOuter, a1, yTop), r: 0.3 })
      }
      if (i % 4 === 0) {
        panelList.push({ a: mid, y: 51, w: 7.2, h: 22 })
      }
    }
    return { light: lightBeams, dark: darkBeams, panels: panelList }
  }, [])

  return (
    <group>
      <BeamInstances beams={light} material={whiteMaterial} radius={0.55} castShadow />
      <BeamInstances beams={dark} material={steelMaterial} radius={0.3} />
      {panels.map(({ a, y, w, h }, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 53.5, y, Math.sin(a) * 53.5]}
          rotation={[0, -a, 0]}
          material={darkMaterial}
        >
          <boxGeometry args={[w, h, 1.2]} />
        </mesh>
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <group key={`module-${i}`} position={[Math.cos(a) * 52, 42, Math.sin(a) * 52]} rotation={[0, -a, 0]}>
            <mesh material={whiteMaterial}>
              <boxGeometry args={[8, 4, 7]} />
            </mesh>
            <mesh position={[0, 2.5, 0]} material={warmEmissive}>
              <boxGeometry args={[4.5, 0.35, 0.6]} />
            </mesh>
          </group>
        )
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 66, 0]} material={steelMaterial}>
        <torusGeometry args={[56, 0.8, 5, 96]} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2
        return (
          <group key={`ring-bldg-${i}`} position={[Math.cos(a) * 50, 68.5, Math.sin(a) * 50]} rotation={[0, -a, 0]}>
            <mesh material={i % 2 ? whiteMaterial : steelMaterial} castShadow>
              <boxGeometry args={[8, 6.5, 6]} />
            </mesh>
            <mesh position={[0, 3.7, 0]} material={darkMaterial}>
              <boxGeometry args={[8.6, 0.5, 6.6]} />
            </mesh>
            <mesh position={[0, 0.6, 3.2]} material={warmEmissive}>
              <boxGeometry args={[4.8, 0.2, 0.3]} />
            </mesh>
            {i % 3 === 0 && (
              <mesh position={[3, 7.5, 0]} material={steelMaterial}>
                <cylinderGeometry args={[0.25, 0.4, 16, 6]} />
              </mesh>
            )}
          </group>
        )
      })}
      {Array.from({ length: 32 }).map((_, i) => {
        const a = (i / 32) * Math.PI * 2
        return (
          <mesh key={`rail-${i}`} position={[Math.cos(a) * 58, 68.4, Math.sin(a) * 58]} material={steelMaterial}>
            <boxGeometry args={[0.22, 4.8, 0.22]} />
          </mesh>
        )
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 70.5, 0]} material={steelMaterial}>
        <torusGeometry args={[58, 0.2, 4, 96]} />
      </mesh>
      {Array.from({ length: 18 }).map((_, i) => {
        const start = (i / 18) * Math.PI * 2 + 0.025
        const length = (Math.PI * 2) / 18 - 0.05
        return (
          <mesh key={`band-deck-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 66.4, 0]} material={i % 4 === 0 ? darkMaterial : steelMaterial}>
            <ringGeometry args={[30, 56, 16, 1, start, length]} />
          </mesh>
        )
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.08
        return (
          <mesh key={`deck-cut-${i}`} position={[Math.cos(a) * 46, 66.8, Math.sin(a) * 46]} rotation={[0, -a, 0]} material={i % 3 === 0 ? steelMaterial : darkMaterial}>
            <boxGeometry args={[11, 0.35, 7]} />
          </mesh>
        )
      })}
      {Array.from({ length: 18 }).map((_, i) => {
        const a = ((i + 0.5) / 18) * Math.PI * 2
        return (
          <group key={`deck-module-${i}`} position={[Math.cos(a) * 68, 69, Math.sin(a) * 68]} rotation={[0, -a, 0]}>
            <mesh material={i % 4 === 0 ? darkMaterial : steelMaterial}>
              <boxGeometry args={[7, 4, 5]} />
            </mesh>
            <mesh position={[0, 2.2, 0]} material={warmEmissive}>
              <boxGeometry args={[3.6, 0.25, 0.4]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function RingSupports() {
  const supports = useMemo<Beam[]>(() => {
    const list: Beam[] = []
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const b = ((i + 0.5) / 24) * Math.PI * 2
      list.push({ a: [Math.cos(a) * 54, 34, Math.sin(a) * 54], b: [Math.cos(b) * 30, 8, Math.sin(b) * 30], r: 0.48 })
      list.push({ a: [Math.cos(a) * 54, 34, Math.sin(a) * 54], b: [Math.cos(a) * 42, 18, Math.sin(a) * 42], r: 0.26 })
    }
    return list
  }, [])
  return (
    <group>
      <BeamInstances beams={supports} material={steelMaterial} radius={0.45} castShadow />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.15
        return (
          <group key={`under-${i}`} position={[Math.cos(a) * 46, 28, Math.sin(a) * 46]} rotation={[0, -a, 0]}>
            <mesh material={darkMaterial}>
              <boxGeometry args={[9, 5, 7]} />
            </mesh>
            <mesh position={[0, 2.8, 0]} material={warmEmissive}>
              <boxGeometry args={[5.5, 0.3, 0.4]} />
            </mesh>
          </group>
        )
      })}
      {[20, 110, 200, 290].map((angle) => {
        const a = (angle * Math.PI) / 180
        return (
          <group key={`crane-${angle}`} position={[Math.cos(a) * 51, 68, Math.sin(a) * 51]} rotation={[0, -a + 0.4, 0]}>
            <mesh position={[0, 8, 0]} material={steelMaterial} castShadow>
              <cylinderGeometry args={[0.55, 0.85, 16, 6]} />
            </mesh>
            <mesh position={[6, 16, 0]} material={orangeEmissive}>
              <boxGeometry args={[16, 0.7, 0.7]} />
            </mesh>
            <mesh position={[-4, 16, 0]} material={darkMaterial}>
              <boxGeometry args={[6, 0.8, 0.8]} />
            </mesh>
            <mesh position={[12, 12, 0]} material={darkMaterial}>
              <boxGeometry args={[0.15, 9, 0.15]} />
            </mesh>
            <mesh position={[12, 7, 0]} material={redMaterial}>
              <boxGeometry args={[1.2, 0.6, 0.6]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

const ringDeckMaterial = getDeckMaterial(12, 2)

function RingDeck() {
  const radial = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2
        return {
          a,
          x: Math.cos(a) * 47.5,
          z: Math.sin(a) * 47.5,
        }
      }),
    [],
  )
  return (
    <group position={[0, 36.5, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={ringDeckMaterial}>
        <ringGeometry args={[42, 78, 96]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.2, 0]} material={steelMaterial}>
        <torusGeometry args={[28.4, 0.28, 4, 96]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.2, 0]} material={steelMaterial}>
        <torusGeometry args={[77.6, 0.28, 4, 96]} />
      </mesh>
      {radial.map(({ a }, i) => (
        <mesh key={i} position={[Math.cos(a) * 42, 0.4, Math.sin(a) * 42]} rotation={[0, -a, 0]} material={steelMaterial}>
          <boxGeometry args={[26, 1.6, 1.1]} />
        </mesh>
      ))}
      {Array.from({ length: 32 }).map((_, i) => {
        const a = (i / 32) * Math.PI * 2
        return (
          <group key={`post-${i}`}>
            <mesh position={[Math.cos(a) * 55, 3.0, Math.sin(a) * 55]} material={steelMaterial}>
              <boxGeometry args={[0.24, 3.2, 0.24]} />
            </mesh>
            <mesh position={[Math.cos(a) * 55, 4.5, Math.sin(a) * 55]} material={steelMaterial}>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
            </mesh>
          </group>
        )
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={`light-${i}`} position={[Math.cos(a) * 42, 0.9, Math.sin(a) * 42]} material={warmEmissive}>
            <boxGeometry args={[2.4, 0.3, 1.1]} />
          </mesh>
        )
      })}
    </group>
  )
}

function RingWalkway() {
  return (
    <group position={[0, 67, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={darkMaterial}>
        <ringGeometry args={[94, 108, 96]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.4, 0]} material={steelMaterial}>
        <torusGeometry args={[107, 0.35, 4, 96]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.7, 0]} material={steelMaterial}>
        <torusGeometry args={[107, 0.28, 4, 96]} />
      </mesh>
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 107, 1.4, Math.sin(a) * 107]} material={steelMaterial}>
            <boxGeometry args={[0.35, 3.2, 0.35]} />
          </mesh>
        )
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 101, 0.8, Math.sin(a) * 101]} material={warmEmissive}>
            <boxGeometry args={[2.2, 0.3, 1.1]} />
          </mesh>
        )
      })}
    </group>
  )
}
