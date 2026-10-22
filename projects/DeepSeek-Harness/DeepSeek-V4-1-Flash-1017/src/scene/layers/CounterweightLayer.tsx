import React from 'react'
import { Line, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../../state/useSceneStore'
import { HOTSPOTS } from '../../data/specs'
import { Hotspot } from '../parts/Hotspot'
import { SpaceBackdrop } from '../parts/SpaceBackdrop'
import { Sun } from '../parts/Sun'
import { asset } from '../kit/textures'
import { BeamInstances, type Beam } from '../kit/BeamInstances'
import { getPanelMaterial } from '../kit/panelTexture'
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
} from '../kit/materials'

const counterweightPanelMaterial = getPanelMaterial('station', { repeatX: 3, repeatY: 1, bumpScale: 0.2 })
const counterweightDarkPanelMaterial = getPanelMaterial('dark', { repeatX: 3, repeatY: 1, bumpScale: 0.2 })

export function CounterweightLayer() {
  const mode = useSceneStore((s) => s.mode)
  const earth = useTexture(asset('textures/earth_atmos_2048.jpg'))
  earth.colorSpace = THREE.SRGBColorSpace

  return (
    <group>
      <color attach="background" args={['#02050a']} />
      <SpaceBackdrop starRadius={9000} starCount={4200} earth={false} />
      <Sun position={[-1600, 1200, -2200]} scale={70} color="#fff0d8" opacity={0.95} />

      <group position={[0, 0, 0]}>
        <Counterweight />
      </group>

      {/* small Earth in the distance */}
      <group position={[-900, -900, -3600]}>
        <mesh>
          <sphereGeometry args={[220, 48, 32]} />
          <meshBasicMaterial map={earth} color="#8fb9d9" />
        </mesh>
        <mesh scale={1.04}>
          <sphereGeometry args={[220, 32, 24]} />
          <meshBasicMaterial color="#4b9ad8" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
        </mesh>
      </group>

      <ambientLight intensity={mode === 'film' ? 0.1 : 0.38} />
      <directionalLight position={[-2200, 2400, -2600]} intensity={mode === 'film' ? 3 : 2.2} color="#fff6e8" />
      <directionalLight position={[1400, -900, 1800]} intensity={0.55} color="#4b8cc5" />
      <pointLight position={[0, 0, 0]} intensity={55} distance={1600} color="#ffd2a0" />

      {HOTSPOTS.filter((spot) => spot.view === 'counterweight').map((spot) => (
        <Hotspot key={spot.id} spot={spot} />
      ))}
    </group>
  )
}

function Counterweight() {
  const ladders = React.useMemo<Beam[]>(() => {
    const list: Beam[] = []
    const x = 84
    const z = 62
    list.push({ a: [x, -430, z], b: [x, 430, z], r: 0.3 })
    list.push({ a: [x, -430, z + 5], b: [x, 430, z + 5], r: 0.3 })
    for (let y = -420; y < 430; y += 12) {
      list.push({ a: [x, y, z], b: [x, y, z + 5], r: 0.18 })
    }
    return list
  }, [])
  return (
    <group>
      <Exoskeleton />

      {/* long vertical spine */}
      <mesh position={[0, -10, 0]} material={darkMaterial} castShadow>
        <boxGeometry args={[152, 940, 152]} />
      </mesh>
      <mesh position={[0, -10, 0]} material={steelMaterial}>
        <boxGeometry args={[104, 960, 104]} />
      </mesh>

      <BeamInstances beams={ladders} material={steelMaterial} radius={0.24} />

      {/* dark vertical channels and cross ties */}
      {[-1, 1].map((side) => (
        <group key={`channel-${side}`}>
          <mesh position={[side * 58, -10, 58]} material={darkMaterial}>
            <boxGeometry args={[9, 900, 9]} />
          </mesh>
          <mesh position={[side * 58, -10, -58]} material={darkMaterial}>
            <boxGeometry args={[9, 900, 9]} />
          </mesh>
          <mesh position={[side * 58, -10, 0]} material={goldMaterial}>
            <cylinderGeometry args={[2.2, 2.2, 780, 7]} />
          </mesh>
        </group>
      ))}
      {[-380, -280, -180, -80, 20, 120, 220, 320].map((y) => (
        <group key={`tie-${y}`} position={[0, y, 0]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 64, 0, 0]} rotation={[0, 0, side * 0.5]} material={steelMaterial}>
              <boxGeometry args={[8, 130, 5]} />
            </mesh>
          ))}
          <mesh position={[0, 0, 64]} rotation={[0.5, 0, 0]} material={steelMaterial}>
            <boxGeometry args={[5, 130, 8]} />
          </mesh>
          <mesh position={[0, 0, -64]} rotation={[-0.5, 0, 0]} material={steelMaterial}>
            <boxGeometry args={[5, 130, 8]} />
          </mesh>
        </group>
      ))}

      {/* vertical spine ribs and pipe runs */}
      {[-1, 1].map((side) => (
        <group key={`rib-${side}`}>
          <mesh position={[side * 78, -10, 0]} material={steelMaterial}>
            <boxGeometry args={[7, 900, 8]} />
          </mesh>
          <mesh position={[0, -10, side * 78]} material={steelMaterial}>
            <boxGeometry args={[8, 900, 7]} />
          </mesh>
          <mesh position={[side * 92, -180, 28]} material={goldMaterial}>
            <cylinderGeometry args={[3.4, 3.4, 440, 8]} />
          </mesh>
          <mesh position={[side * 92, 160, -28]} material={darkMaterial}>
            <cylinderGeometry args={[2.6, 2.6, 300, 8]} />
          </mesh>
        </group>
      ))}

      {/* service collars along the spine */}
      {[-390, -240, -90, 60, 210, 355].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh material={y === 60 ? counterweightPanelMaterial : counterweightDarkPanelMaterial}>
            <boxGeometry args={[230, 42, 230]} />
          </mesh>
          <mesh position={[0, 0, 118]} material={warmEmissive}>
            <boxGeometry args={[150, 5, 1.5]} />
          </mesh>
          <mesh position={[0, 0, -118]} material={warmEmissive}>
            <boxGeometry args={[150, 5, 1.5]} />
          </mesh>
        </group>
      ))}

      {/* four outer exoskeleton pylons and radiator wings */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={`pylon-${i}`} rotation={[0, -a, 0]}>
            <mesh position={[250, -10, 0]} material={darkMaterial} castShadow>
              <boxGeometry args={[26, 760, 26]} />
            </mesh>
            <mesh position={[250, -10, 0]} material={steelMaterial}>
              <boxGeometry args={[14, 740, 14]} />
            </mesh>
            <mesh position={[250, 370, 0]} material={counterweightDarkPanelMaterial}>
              <boxGeometry args={[44, 80, 44]} />
            </mesh>
            <mesh position={[250, -390, 0]} material={counterweightDarkPanelMaterial}>
              <boxGeometry args={[44, 80, 44]} />
            </mesh>
            {[-300, -150, 0, 150, 300].map((y) => (
              <mesh key={y} position={[168, y, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMaterial}>
                <cylinderGeometry args={[4.2, 4.2, 170, 8]} />
              </mesh>
            ))}
            {/* vertical radiator fin */}
            <mesh position={[300, -10, 0]} material={i % 2 ? radiatorMaterial : panelMaterial} castShadow>
              <boxGeometry args={[8, 560, 150]} />
            </mesh>
            <mesh position={[300, -10, 0]} material={goldMaterial}>
              <boxGeometry args={[10, 500, 4]} />
            </mesh>
            <mesh position={[300, 285, 0]} material={darkMaterial}>
              <boxGeometry args={[18, 24, 160]} />
            </mesh>
            <mesh position={[300, -305, 0]} material={darkMaterial}>
              <boxGeometry args={[18, 24, 160]} />
            </mesh>
          </group>
        )
      })}

      {/* upper radial propellant / service tanks */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <mesh position={[192, 250, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMaterial}>
              <cylinderGeometry args={[46, 46, 260, 14]} />
            </mesh>
            {[-80, 0, 80].map((x) => (
              <mesh key={x} position={[192 + x, 250, 0]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
                <torusGeometry args={[48, 2.4, 6, 20]} />
              </mesh>
            ))}
            <mesh position={[92, 250, 0]} material={darkMaterial}>
              <boxGeometry args={[80, 24, 28]} />
            </mesh>
            <mesh position={[60, 250, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMaterial}>
              <cylinderGeometry args={[8, 8, 100, 8]} />
            </mesh>
            <mesh position={[192, 250, 0]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
              <torusGeometry args={[50, 2, 8, 20]} />
            </mesh>
          </group>
        )
      })}

      {/* lower equipment pods, cylindrical rather than cube rosette */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.2
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <mesh position={[220, -225, 0]} rotation={[0, 0, Math.PI / 2]} material={i % 2 ? counterweightPanelMaterial : steelMaterial}>
              <cylinderGeometry args={[64, 74, 250, 12]} />
            </mesh>
            <mesh position={[220, -225, 0]} material={darkMaterial}>
              <boxGeometry args={[110, 54, 96]} />
            </mesh>
            <mesh position={[320, -198, 0]} material={warmEmissive}>
              <boxGeometry args={[60, 5, 54]} />
            </mesh>
            <mesh position={[150, -225, 0]} material={steelMaterial}>
              <boxGeometry args={[80, 18, 24]} />
            </mesh>
          </group>
        )
      })}

      {/* angled radiator / solar panels */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={i} position={[Math.cos(a) * 320, 130, Math.sin(a) * 320]} rotation={[0, -a, i % 2 ? 0.42 : -0.42]}>
            <mesh material={i % 2 ? panelMaterial : radiatorMaterial}>
              <boxGeometry args={[330, 7, 154]} />
            </mesh>
            <mesh material={steelMaterial}>
              <boxGeometry args={[170, 11, 11]} />
            </mesh>
            {[-110, -55, 0, 55, 110].map((x) => (
              <mesh key={x} position={[x, 0.5, 0]} material={panelLineMaterial}>
                <boxGeometry args={[1.2, 1, 150]} />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* lower solar wings */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={`low-${i}`} position={[Math.cos(a) * 300, -340, Math.sin(a) * 300]} rotation={[0, -a, i % 2 ? 0.28 : -0.28]}>
            <mesh material={panelMaterial}>
              <boxGeometry args={[260, 6, 108]} />
            </mesh>
          </group>
        )
      })}

      {/* spine panel seams */}
      {[-430, -350, -270, -190, -110, -30, 50, 130, 210, 290, 370, 430].map((y) => (
        <mesh key={`spine-band-${y}`} position={[0, y, 0]} material={y % 160 === 50 ? goldMaterial : darkMaterial}>
          <boxGeometry args={[168, 7, 168]} />
        </mesh>
      ))}

      {/* top platform and machinery */}
      <mesh position={[0, 486, 0]} material={lightMaterial}>
        <boxGeometry args={[380, 18, 380]} />
      </mesh>
      <mesh position={[0, 500, 0]} material={darkMaterial}>
        <boxGeometry args={[300, 10, 300]} />
      </mesh>
      {[-170, 170].map((x) =>
        [-170, 170].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 492, z]} material={goldMaterial}>
            <cylinderGeometry args={[7, 7, 26, 8]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 520, 0]} material={steelMaterial}>
        <cylinderGeometry args={[16, 24, 38, 10]} />
      </mesh>
      <mesh position={[0, 542, 0]} material={redMaterial}>
        <sphereGeometry args={[5, 8, 6]} />
      </mesh>
      <mesh position={[120, 508, -80]} material={darkMaterial}>
        <cylinderGeometry args={[12, 18, 18, 8]} />
      </mesh>
      {[-110, 110].map((x) =>
        [-110, 110].map((z) => (
          <mesh key={`top-box-${x}-${z}`} position={[x, 516, z]} material={darkMaterial}>
            <boxGeometry args={[36, 16, 28]} />
          </mesh>
        )),
      )}
      <mesh position={[120, 526, -80]} rotation={[0.2, 0.5, 0]} material={lightMaterial}>
        <sphereGeometry args={[46, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2
        return (
          <mesh key={`rail-${i}`} position={[Math.cos(a) * 190, 504, Math.sin(a) * 190]} material={steelMaterial}>
            <boxGeometry args={[0.3, 10, 0.3]} />
          </mesh>
        )
      })}

      {/* tether termination */}
      <Line points={[new THREE.Vector3(0, -980, 0), new THREE.Vector3(0, 620, 0)]} color="#d7e8ff" lineWidth={2.2} transparent opacity={0.8} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <Line
            key={i}
            points={[
              new THREE.Vector3(Math.cos(a) * 30, -980, Math.sin(a) * 30),
              new THREE.Vector3(Math.cos(a) * 30, 620, Math.sin(a) * 30),
            ]}
            color="#0b1118"
            lineWidth={1.2}
            transparent
            opacity={0.9}
          />
        )
      })}

      {/* warning lights around the platform and lower modules */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 196, 478, Math.sin(a) * 196]} material={i % 3 === 0 ? redMaterial : warmEmissive}>
            <sphereGeometry args={[6, 8, 6]} />
          </mesh>
        )
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={`low-${i}`} position={[Math.cos(a) * 360, -420, Math.sin(a) * 360]} material={i % 3 === 0 ? redMaterial : blueEmissive}>
            <sphereGeometry args={[6, 8, 6]} />
          </mesh>
        )
      })}
    </group>
  )
}

function Exoskeleton() {
  const beams = React.useMemo<Beam[]>(() => {
    const list: Beam[] = []
    const radius = 92
    const levels = [-470, -360, -250, -140, -30, 80, 190, 300, 410]
    for (const [x, z] of [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]]) {
      list.push({ a: [x, -470, z], b: [x, 460, z], r: 5 })
    }
    for (const y of levels) {
      list.push({ a: [-radius, y, -radius], b: [radius, y, -radius], r: 3.2 })
      list.push({ a: [radius, y, -radius], b: [radius, y, radius], r: 3.2 })
      list.push({ a: [radius, y, radius], b: [-radius, y, radius], r: 3.2 })
      list.push({ a: [-radius, y, radius], b: [-radius, y, -radius], r: 3.2 })
    }
    for (let i = 0; i < levels.length - 1; i++) {
      const y0 = levels[i]
      const y1 = levels[i + 1]
      list.push({ a: [-radius, y0, -radius], b: [radius, y1, -radius], r: 1.8 })
      list.push({ a: [radius, y0, radius], b: [-radius, y1, radius], r: 1.8 })
      list.push({ a: [-radius, y0, radius], b: [-radius, y1, -radius], r: 1.8 })
      list.push({ a: [radius, y0, -radius], b: [radius, y1, radius], r: 1.8 })
    }
    return list
  }, [])
  return <BeamInstances beams={beams} material={steelMaterial} radius={4} />
}

const radiatorMaterial = new THREE.MeshStandardMaterial({ color: '#c7d1da', roughness: 0.72, metalness: 0.12 })

const panelMaterial = new THREE.MeshStandardMaterial({
  color: '#1b3448',
  emissive: '#0a1824',
  emissiveIntensity: 0.45,
  metalness: 0.55,
  roughness: 0.3,
})
