import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../../../state/useSceneStore'
import { HOTSPOTS } from '../../../data/specs'
import { Hotspot } from '../Hotspot'
import { SpaceBackdrop } from '../SpaceBackdrop'
import { Sun } from '../Sun'
import { TrussRing } from '../../kit/TrussRing'
import { getPanelMaterial } from '../../kit/panelTexture'
import { StationGreebles } from '../../kit/Greebles'
import {
  blueEmissive,
  darkMaterial,
  goldMaterial,
  lightMaterial,
  panelLineMaterial,
  redMaterial,
  steelMaterial,
  warmEmissive,
  whiteMaterial,
  windowMaterial,
} from '../../kit/materials'

const RING_RADIUS = 1200
const RING_INNER = 960
const RING_OUTER = 1420
const stationPanelMaterial = getPanelMaterial('station', { repeatX: 3, repeatY: 2, bumpScale: 0.25 })
const stationDarkPanelMaterial = getPanelMaterial('dark', { repeatX: 3, repeatY: 2, bumpScale: 0.25 })

export function StationLayer() {
  const mode = useSceneStore((s) => s.mode)

  return (
    <group>
      <color attach="background" args={['#02050a']} />
      <SpaceBackdrop starRadius={12000} starCount={5200} earth earthY={-15000} earthZ={-7000} earthScale={1.2} />
      <Sun position={[-5200, 3600, -6200]} scale={160} color="#fff4df" opacity={0.95} />

      <group>
        <Station />
      </group>

      <ambientLight intensity={mode === 'film' ? 0.1 : 0.4} />
      <directionalLight position={[-3200, 2800, -4200]} intensity={mode === 'film' ? 1.45 : 1.1} color="#fff6e8" />
      <directionalLight position={[2400, -1800, 2200]} intensity={0.5} color="#4e91c9" />
      <pointLight position={[0, 0, 0]} intensity={34} distance={3400} color="#ffd3a0" />
      <pointLight position={[0, -680, 0]} intensity={45} distance={1300} color="#7ec5ff" />
      <pointLight position={[1800, 400, 1200]} intensity={28} distance={2800} color="#ffce9a" />

      {HOTSPOTS.filter((spot) => spot.view === 'station').map((spot) => (
        <Hotspot key={spot.id} spot={spot} />
      ))}
    </group>
  )
}

function Station() {
  const spokes = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2
        return { a, x: Math.cos(a) * RING_RADIUS, z: Math.sin(a) * RING_RADIUS }
      }),
    [],
  )

  const modules = useMemo(
    () =>
      Array.from({ length: 48 }).map((_, i) => {
        const a = (i / 48) * Math.PI * 2 + 0.04
        return {
          a,
          x: Math.cos(a) * (RING_RADIUS + 165),
          z: Math.sin(a) * (RING_RADIUS + 165),
          w: i % 4 === 0 ? 140 : 100,
          h: i % 5 === 0 ? 120 : 90,
        }
      }),
    [],
  )

  return (
    <group>
      <StationGreebles />
      <TrussRing
        radius={RING_RADIUS}
        y={0}
        height={150}
        segments={96}
        tube={30}
        beamRadius={7}
        color="dark"
        nodeScale={5}
      />
      <mesh rotation={[Math.PI / 2, 0, 0]} material={darkMaterial}>
        <torusGeometry args={[RING_OUTER - 12, 12, 8, 96]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2, 0]} material={warmEmissive}>
        <torusGeometry args={[RING_OUTER - 12, 1.2, 4, 96]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={steelMaterial}>
        <torusGeometry args={[RING_INNER + 8, 9, 6, 96]} />
      </mesh>

      <TrussRing radius={980} y={-48} height={56} segments={72} tube={12} beamRadius={3.6} color="dark" nodeScale={2.5} />
      <TrussRing radius={1320} y={-12} height={30} segments={80} tube={8} beamRadius={2.5} color="steel" nodeScale={1.5} />
      <TrussRing radius={1080} y={-20} height={84} segments={80} tube={11} beamRadius={3.4} color="dark" nodeScale={2} />
      <TrussRing radius={1400} y={-30} height={58} segments={96} tube={9} beamRadius={2.8} color="steel" nodeScale={1.6} />

      {/* radial spokes */}
      {spokes.map(({ a }, i) => (
        <group key={i} rotation={[0, -a, 0]}>
          <mesh position={[RING_RADIUS / 2, 0, 0]} material={i % 2 ? darkMaterial : steelMaterial}>
            <boxGeometry args={[RING_RADIUS - 160, 10, 12]} />
          </mesh>
          <mesh position={[RING_RADIUS * 0.68, 34, 0]} material={lightMaterial}>
            <boxGeometry args={[RING_RADIUS * 0.5, 5, 5]} />
          </mesh>
          <mesh position={[RING_RADIUS * 0.82, -18, 0]} material={darkMaterial}>
            <boxGeometry args={[RING_RADIUS * 0.28, 8, 8]} />
          </mesh>
        </group>
      ))}

      {/* radial ring frames */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2
        return (
          <group key={`frame-${i}`} rotation={[0, -a, 0]}>
            {[58, -48].map((y) => (
              <mesh key={y} position={[(RING_INNER + RING_OUTER) / 2, y, 0]} material={steelMaterial}>
                <boxGeometry args={[RING_OUTER - RING_INNER, 5, 5]} />
              </mesh>
            ))}
            <mesh position={[RING_INNER, 4, 0]} material={darkMaterial}>
              <boxGeometry args={[5, 114, 5]} />
            </mesh>
            <mesh position={[RING_OUTER, 4, 0]} material={darkMaterial}>
              <boxGeometry args={[5, 114, 5]} />
            </mesh>
          </group>
        )
      })}

      {/* ring modules */}
      {modules.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]} rotation={[0, -m.a, 0]}>
          <mesh material={i % 6 === 0 ? stationPanelMaterial : stationDarkPanelMaterial} castShadow>
            <boxGeometry args={[m.w, m.h, 135]} />
          </mesh>
          <mesh position={[0, m.h * 0.3, 69]} material={warmEmissive}>
            <boxGeometry args={[m.w * 0.62, 3, 1]} />
          </mesh>
          <mesh position={[0, 8, 69]} material={windowMaterial}>
            <boxGeometry args={[m.w * 0.5, 6, 0.7]} />
          </mesh>
          <mesh position={[m.w * 0.32, -m.h * 0.18, 69]} material={steelMaterial}>
            <boxGeometry args={[6, 18, 2]} />
          </mesh>
          <mesh position={[0, -m.h * 0.12, 70]} material={windowMaterial}>
            <boxGeometry args={[m.w * 0.56, 5, 0.8]} />
          </mesh>
          <mesh position={[m.w * 0.43, 0, 0]} material={steelMaterial}>
            <cylinderGeometry args={[2.6, 2.6, m.h * 0.82, 6]} />
          </mesh>
          <mesh position={[-m.w * 0.36, m.h * 0.2, 0]} material={darkMaterial}>
            <boxGeometry args={[8, 12, 8]} />
          </mesh>
          {/* chamfered front frame + dark inset */}
          <mesh position={[0, 0, 69]} material={darkMaterial}>
            <boxGeometry args={[m.w * 0.86, m.h * 0.72, 4]} />
          </mesh>
          <mesh position={[0, 0, 71.5]} material={stationDarkPanelMaterial}>
            <boxGeometry args={[m.w * 0.76, m.h * 0.58, 2]} />
          </mesh>
          <mesh position={[-m.w * 0.38, 0, 67]} material={steelMaterial}>
            <boxGeometry args={[5, m.h * 0.9, 8]} />
          </mesh>
          <mesh position={[m.w * 0.38, 0, 67]} material={steelMaterial}>
            <boxGeometry args={[5, m.h * 0.9, 8]} />
          </mesh>
          {i % 3 === 0 && (
            <group position={[0, -m.h * 0.28, 74]}>
              <mesh material={warmEmissive}>
                <torusGeometry args={[14, 2, 6, 20]} />
              </mesh>
              <mesh material={darkMaterial}>
                <cylinderGeometry args={[15, 15, 8, 16]} />
              </mesh>
            </group>
          )}
          <mesh position={[0, 0, -68]} material={steelMaterial}>
            <boxGeometry args={[30, 20, 54]} />
          </mesh>
          {i % 3 === 0 && (
            <mesh position={[0, -m.h * 0.55, 0]} material={blueEmissive}>
              <cylinderGeometry args={[10, 14, 36, 8]} />
            </mesh>
          )}
        </group>
      ))}

      {/* solar / radiator panels */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2 + 0.12
        const x = Math.cos(a) * (RING_RADIUS + 310)
        const z = Math.sin(a) * (RING_RADIUS + 310)
        return (
          <group key={i} position={[x, i % 3 === 0 ? 62 : 24, z]} rotation={[0, -a, i % 2 ? 0.22 : -0.22]}>
            <mesh material={i % 2 ? panelMaterial : radiatorMaterial}>
              <boxGeometry args={[300, 7, 112]} />
            </mesh>
            <mesh position={[0, 0, 0]} material={steelMaterial}>
              <boxGeometry args={[150, 9, 9]} />
            </mesh>
            <mesh position={[0, 3, 0]} material={panelLineMaterial}>
              <boxGeometry args={[294, 1, 1]} />
            </mesh>
          </group>
        )
      })}

      {/* ring deck and rim */}
      {Array.from({ length: 12 }).map((_, i) => {
        const start = (i / 12) * Math.PI * 2 + 0.035
        const length = (Math.PI * 2) / 12 - 0.07
        return (
          <mesh key={`deck-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} material={i % 3 === 0 ? steelMaterial : darkMaterial}>
            <ringGeometry args={[RING_INNER, RING_OUTER, 16, 1, start, length]} />
          </mesh>
        )
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -8, 0]} material={steelMaterial}>
        <torusGeometry args={[RING_INNER, 9, 6, 96]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -8, 0]} material={steelMaterial}>
        <torusGeometry args={[RING_OUTER, 9, 6, 96]} />
      </mesh>

      {/* outer ring railing */}
      {Array.from({ length: 64 }).map((_, i) => {
        const a = (i / 64) * Math.PI * 2
        return (
          <mesh key={`railpost-${i}`} position={[Math.cos(a) * (RING_OUTER + 4), 8, Math.sin(a) * (RING_OUTER + 4)]} material={steelMaterial}>
            <boxGeometry args={[1.2, 24, 1.2]} />
          </mesh>
        )
      })}
      {[18, 30].map((y) => (
        <mesh key={`rail-${y}`} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]} material={steelMaterial}>
          <torusGeometry args={[RING_OUTER + 4, 0.55, 4, 128]} />
        </mesh>
      ))}

      <Dish />
      {/* central cryo tanks, external conduits and radial service bridges */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={`cryo-${i}`} position={[Math.cos(a) * 420, -80, Math.sin(a) * 420]} rotation={[0, -a, 0]}>
            <mesh material={stationPanelMaterial} castShadow>
              <cylinderGeometry args={[58, 66, 250, 16]} />
            </mesh>
            <mesh position={[0, 125, 0]} material={steelMaterial}>
              <cylinderGeometry args={[38, 58, 22, 16]} />
            </mesh>
            <mesh position={[0, -125, 0]} material={darkMaterial}>
              <cylinderGeometry args={[58, 42, 22, 16]} />
            </mesh>
            {[-70, 0, 70].map((y) => (
              <mesh key={y} position={[0, y, 60]} material={goldMaterial}>
                <torusGeometry args={[62, 3.4, 6, 22]} />
              </mesh>
            ))}
            <mesh position={[0, 0, 66]} material={warmEmissive}>
              <boxGeometry args={[4, 80, 1.6]} />
            </mesh>
            <mesh position={[0, 220, 0]} material={steelMaterial}>
              <cylinderGeometry args={[9, 9, 180, 8]} />
            </mesh>
          </group>
        )
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <group key={`conduit-${i}`} position={[Math.cos(a) * 520, 0, Math.sin(a) * 520]} rotation={[0, -a, 0]}>
            <mesh position={[0, 0, 0]} material={steelMaterial}>
              <boxGeometry args={[460, 8, 8]} />
            </mesh>
            <mesh position={[230, 0, 0]} material={darkMaterial}>
              <boxGeometry args={[8, 210, 8]} />
            </mesh>
            <mesh position={[230, 105, 0]} material={warmEmissive}>
              <boxGeometry args={[2, 2, 2]} />
            </mesh>
          </group>
        )
      })}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + 0.2
        return (
          <group key={`radial-bridge-${i}`} position={[Math.cos(a) * 560, -100, Math.sin(a) * 560]} rotation={[0, -a, 0]}>
            <mesh material={darkMaterial} castShadow receiveShadow>
              <boxGeometry args={[760, 10, 42]} />
            </mesh>
            <mesh position={[0, 7, 0]} material={lightMaterial}>
              <boxGeometry args={[760, 1, 3]} />
            </mesh>
            {Array.from({ length: 8 }).map((_, k) => (
              <mesh key={k} position={[-330 + k * 94, 9, 0]} material={warmEmissive}>
                <boxGeometry args={[4, 1.2, 1.2]} />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* inner-ring storage tanks and exposed service pipes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.15
        return (
          <group key={`tank-${i}`} position={[Math.cos(a) * 860, -120, Math.sin(a) * 860]} rotation={[0, -a, 0]}>
            <mesh material={i % 2 ? stationPanelMaterial : stationDarkPanelMaterial} castShadow>
              <cylinderGeometry args={[54, 54, 130, 14]} />
            </mesh>
            <mesh position={[0, 66, 0]} material={steelMaterial}>
              <cylinderGeometry args={[38, 54, 18, 14]} />
            </mesh>
            <mesh position={[0, 0, 54]} material={goldMaterial}>
              <torusGeometry args={[56, 3, 6, 22]} />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMaterial}>
              <cylinderGeometry args={[7, 7, 210, 8]} />
            </mesh>
            <mesh position={[0, 80, 0]} material={warmEmissive}>
              <boxGeometry args={[4, 3, 4]} />
            </mesh>
          </group>
        )
      })}

      {/* open upper and lower service trusses */}
      <TrussRing radius={1260} y={120} height={84} segments={72} tube={10} beamRadius={3.2} color="steel" nodeScale={1.8} />
      <TrussRing radius={1040} y={-118} height={70} segments={64} tube={9} beamRadius={3.0} color="dark" nodeScale={1.7} />

      {/* radial platform lobes: layered open decks around the ring */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.12
        const r = 1110
        return (
          <group key={`lobe-${i}`} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            <mesh position={[0, -4, 0]} material={darkMaterial} castShadow receiveShadow>
              <boxGeometry args={[250, 8, 130]} />
            </mesh>
            <mesh position={[72, 8, 0]} material={stationPanelMaterial} castShadow>
              <boxGeometry args={[110, 22, 96]} />
            </mesh>
            <mesh position={[72, 22, 0]} material={darkMaterial}>
              <boxGeometry args={[118, 4, 104]} />
            </mesh>
            <mesh position={[-48, 10, 0]} material={stationDarkPanelMaterial} castShadow>
              <boxGeometry args={[70, 18, 86]} />
            </mesh>
            <mesh position={[72, 21, 50]} material={windowMaterial}>
              <boxGeometry args={[86, 4, 0.8]} />
            </mesh>
            <mesh position={[126, 6, 0]} material={warmEmissive}>
              <boxGeometry args={[4, 2.4, 44]} />
            </mesh>
            {[-1, 1].map((sz) => (
              <mesh key={sz} position={[0, -14, sz * 55]} rotation={[0, 0, 0.18]} material={steelMaterial}>
                <boxGeometry args={[180, 6, 8]} />
              </mesh>
            ))}
            <mesh position={[-105, -6, 0]} material={steelMaterial}>
              <cylinderGeometry args={[8, 12, 40, 8]} />
            </mesh>
          </group>
        )
      })}

      {/* docking petals and capture arms on the outer rim */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2
        return (
          <group key={`dock-${i}`} position={[Math.cos(a) * 1510, -40, Math.sin(a) * 1510]} rotation={[0, -a, 0]}>
            <mesh material={stationPanelMaterial} castShadow>
              <boxGeometry args={[90, 16, 160]} />
            </mesh>
            <mesh position={[20, 16, 0]} material={steelMaterial}>
              <boxGeometry args={[12, 30, 100]} />
            </mesh>
            <mesh position={[52, 12, 0]} rotation={[0, 0, 0.5]} material={goldMaterial}>
              <boxGeometry args={[8, 54, 8]} />
            </mesh>
            <mesh position={[28, 38, 0]} material={warmEmissive}>
              <boxGeometry args={[3, 3, 70]} />
            </mesh>
          </group>
        )
      })}

      <TwinCore />
      <CentralHub />
      <DockingCage />
      <Shuttle position={[1450, -90, 480]} rotation={[0, -1.9, 0]} />
      <Shuttle position={[-1280, -130, -620]} rotation={[0, 0.9, 0]} />

      {/* central spine */}
      <mesh position={[0, 40, 0]} material={darkMaterial} castShadow>
        <boxGeometry args={[150, 1040, 150]} />
      </mesh>
      <mesh position={[0, 40, 0]} material={steelMaterial}>
        <boxGeometry args={[110, 1100, 110]} />
      </mesh>
      {[-420, -260, -100, 60, 220, 380].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh material={whiteMaterial}>
            <boxGeometry args={[230, 52, 230]} />
          </mesh>
          <mesh position={[0, 0, 118]} material={warmEmissive}>
            <boxGeometry args={[150, 6, 2]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 585, 0]} material={lightMaterial}>
        <cylinderGeometry args={[130, 100, 32, 12]} />
      </mesh>
      <mesh position={[0, 606, 0]} material={redMaterial}>
        <sphereGeometry args={[5, 10, 8]} />
      </mesh>

      {/* docking cradle below */}
      <group position={[0, -590, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={steelMaterial}>
          <torusGeometry args={[215, 14, 8, 48]} />
        </mesh>
        {Array.from({ length: 4 }).map((_, i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          return (
            <group key={i} rotation={[0, -a, 0]}>
              <mesh position={[270, -20, 0]} rotation={[0, 0, -0.7]} material={darkMaterial}>
                <boxGeometry args={[420, 24, 34]} />
              </mesh>
              <mesh position={[430, -95, 0]} material={warmEmissive}>
                <sphereGeometry args={[7, 8, 6]} />
              </mesh>
            </group>
          )
        })}
        <mesh position={[0, -40, 0]} material={darkMaterial}>
          <boxGeometry args={[190, 80, 190]} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={warmEmissive}>
          <torusGeometry args={[150, 3, 6, 40]} />
        </mesh>
      </group>

      {/* tether through the station */}
      <Line points={[new THREE.Vector3(0, -1200, 0), new THREE.Vector3(0, 1200, 0)]} color="#d7e8ff" lineWidth={2} transparent opacity={0.72} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <Line
            key={i}
            points={[
              new THREE.Vector3(Math.cos(a) * 34, -1200, Math.sin(a) * 34),
              new THREE.Vector3(Math.cos(a) * 34, 1200, Math.sin(a) * 34),
            ]}
            color="#0d141b"
            lineWidth={1.1}
            transparent
            opacity={0.85}
          />
        )
      })}

      {/* outer docking ports */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.1
        return (
          <group key={`port-${i}`} position={[Math.cos(a) * (RING_OUTER + 18), -10, Math.sin(a) * (RING_OUTER + 18)]} rotation={[0, -a, 0]}>
            <mesh material={darkMaterial}>
              <boxGeometry args={[26, 34, 26]} />
            </mesh>
            <mesh position={[0, 0, 14]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
              <torusGeometry args={[11, 1.8, 6, 20]} />
            </mesh>
            <mesh position={[0, 0, 15]} material={warmEmissive}>
              <boxGeometry args={[12, 2, 1]} />
            </mesh>
          </group>
        )
      })}

      {/* warning lights */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * (RING_OUTER - 8), 18, Math.sin(a) * (RING_OUTER - 8)]} material={i % 4 === 0 ? redMaterial : warmEmissive}>
            <sphereGeometry args={[6, 8, 6]} />
          </mesh>
        )
      })}
    </group>
  )
}

function TwinCore() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 310, 10, 0]}>
          <mesh material={stationPanelMaterial} castShadow>
            <boxGeometry args={[120, 950, 150]} />
          </mesh>
          <mesh position={[0, 0, 86]} material={stationDarkPanelMaterial}>
            <boxGeometry args={[82, 780, 5]} />
          </mesh>
          {[-360, -260, -160, -60, 60, 160, 260, 360].map((y) => (
            <mesh key={y} position={[0, y, 90]} material={warmEmissive}>
              <boxGeometry args={[92, 4, 1.4]} />
            </mesh>
          ))}
          <mesh position={[0, 460, 0]} material={lightMaterial}>
            <boxGeometry args={[170, 18, 190]} />
          </mesh>
          <mesh position={[0, 472, 0]} material={darkMaterial}>
            <boxGeometry args={[120, 10, 140]} />
          </mesh>
          <mesh position={[side * 67, 160, 0]} material={darkMaterial}>
            <boxGeometry args={[8, 480, 84]} />
          </mesh>
          {[-320, -220, -120, 20, 140, 260].map((y) => (
            <mesh key={`band-${y}`} position={[0, y, 0]} material={steelMaterial}>
              <boxGeometry args={[128, 7, 160]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-300, -120, 100, 300].map((y) => (
        <group key={`cross-${y}`} position={[0, y, 0]}>
          <mesh material={steelMaterial}>
            <boxGeometry args={[600, 9, 30]} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[0, 0, 0.0]} material={darkMaterial}>
            <boxGeometry args={[540, 5, 64]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 380, 0]} material={lightMaterial}>
        <boxGeometry args={[640, 22, 116]} />
      </mesh>
      <mesh position={[0, 394, 0]} material={darkMaterial}>
        <boxGeometry args={[520, 8, 80]} />
      </mesh>

      {/* central open cage between the towers */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={i} position={[Math.cos(a) * 92, 0, Math.sin(a) * 92]}>
            <mesh material={steelMaterial}>
              <boxGeometry args={[8, 920, 8]} />
            </mesh>
            {[-360, -240, -120, 0, 120, 240, 360].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={darkMaterial}>
                <boxGeometry args={[12, 5, 12]} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

function DockingCage() {
  return (
    <group position={[0, -720, 0]}>
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={i} position={[Math.cos(a) * 160, 0, Math.sin(a) * 160]}>
            <mesh material={darkMaterial}>
              <boxGeometry args={[14, 520, 14]} />
            </mesh>
            {[-220, -110, 0, 110, 220].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={steelMaterial}>
                <boxGeometry args={[26, 8, 26]} />
              </mesh>
            ))}
          </group>
        )
      })}
      {[-220, -110, 0, 110, 220].map((y) => (
        <mesh key={y} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]} material={steelMaterial}>
          <torusGeometry args={[160, 6, 6, 32]} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={`arm-${i}`} position={[Math.cos(a) * 240, -40, Math.sin(a) * 240]} rotation={[0, -a, -0.5]} material={darkMaterial}>
            <boxGeometry args={[180, 18, 26]} />
          </mesh>
        )
      })}
      <group position={[0, -360, 0]}>
        {Array.from({ length: 4 }).map((_, i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          return (
            <group key={`lower-${i}`} position={[Math.cos(a) * 150, 0, Math.sin(a) * 150]}>
              <mesh material={darkMaterial}>
                <boxGeometry args={[12, 360, 12]} />
              </mesh>
              {[-120, 0, 120].map((y) => (
                <mesh key={y} position={[0, y, 0]} material={steelMaterial}>
                  <boxGeometry args={[22, 7, 22]} />
                </mesh>
              ))}
            </group>
          )
        })}
        {[-120, 0, 120].map((y) => (
          <mesh key={y} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]} material={steelMaterial}>
            <torusGeometry args={[150, 5, 6, 32]} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          return (
            <mesh key={`lower-arm-${i}`} position={[Math.cos(a) * 230, -40, Math.sin(a) * 230]} rotation={[0, -a, -0.45]} material={darkMaterial}>
              <boxGeometry args={[160, 16, 24]} />
            </mesh>
          )
        })}
      </group>
      <pointLight position={[0, 120, 0]} intensity={35} distance={600} color="#7ec5ff" />
    </group>
  )
}

function Dish() {
  return (
    <group position={[0, 640, 0]} rotation={[0.42, 0.4, 0]}>
      <mesh material={lightMaterial}>
        <sphereGeometry args={[210, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2.9]} />
      </mesh>
      <mesh material={steelMaterial}>
        <cylinderGeometry args={[8, 12, 60, 8]} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 95, -28, Math.sin(a) * 95]}
            rotation={[0.7, -a, 0]}
            material={steelMaterial}
          >
            <cylinderGeometry args={[2.4, 2.4, 150, 6]} />
          </mesh>
        )
      })}
      <mesh position={[0, 28, 0]} material={warmEmissive}>
        <sphereGeometry args={[6, 8, 6]} />
      </mesh>
    </group>
  )
}

function Shuttle({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation} scale={1.2}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={whiteMaterial}>
        <cylinderGeometry args={[24, 34, 150, 12]} />
      </mesh>
      <mesh position={[0, 0, 46]} material={darkMaterial}>
        <boxGeometry args={[96, 8, 58]} />
      </mesh>
      <mesh position={[0, 0, -54]} material={whiteMaterial}>
        <boxGeometry args={[55, 38, 46]} />
      </mesh>
      <mesh position={[0, 0, 60]} material={warmEmissive}>
        <boxGeometry args={[36, 9, 2]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 42, -2, 0]} rotation={[0, 0, side * 0.2]} material={whiteMaterial}>
          <boxGeometry args={[10, 5, 90]} />
        </mesh>
      ))}
      <mesh position={[0, 0, -80]} material={blueEmissive}>
        <cylinderGeometry args={[8, 14, 18, 8]} />
      </mesh>
    </group>
  )
}

function CentralHub() {
  return (
    <group position={[0, -140, 0]}>
      <mesh material={stationPanelMaterial} castShadow>
        <cylinderGeometry args={[300, 340, 190, 24]} />
      </mesh>
      <mesh position={[0, 100, 0]} material={lightMaterial}>
        <cylinderGeometry args={[250, 300, 18, 24]} />
      </mesh>
      <mesh position={[0, -100, 0]} material={darkMaterial}>
        <cylinderGeometry args={[340, 300, 16, 24]} />
      </mesh>
      {[80, 30, -20, -70].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={y === 30 ? warmEmissive : blueEmissive}>
          <torusGeometry args={[y === 30 ? 304 : 298, 1.6, 5, 48]} />
        </mesh>
      ))}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <mesh position={[310, 10, 0]} material={darkMaterial}>
              <boxGeometry args={[40, 48, 64]} />
            </mesh>
            <mesh position={[332, 10, 0]} material={warmEmissive}>
              <boxGeometry args={[2, 10, 38]} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, -96, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMaterial}>
        <torusGeometry args={[220, 8, 6, 48]} />
      </mesh>
      <pointLight intensity={90} distance={900} color="#ffd2a0" />
    </group>
  )
}

const panelMaterial = new THREE.MeshStandardMaterial({
  color: '#1c3850',
  emissive: '#0b1b2a',
  emissiveIntensity: 0.4,
  metalness: 0.5,
  roughness: 0.3,
})

const radiatorMaterial = new THREE.MeshStandardMaterial({
  color: '#d4dde6',
  roughness: 0.7,
  metalness: 0.15,
})
