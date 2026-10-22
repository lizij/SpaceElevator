import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BeamInstances, type Beam } from '../../kit/BeamInstances'
import { darkMaterial, gantryMaterial, goldMaterial, lightMaterial, orangeEmissive, redMaterial, steelMaterial, whiteMaterial } from '../../kit/materials'
import { getGlowTexture } from '../../kit/textures'
import { useSceneStore } from '../../../state/useSceneStore'

export const GANTRY_ANGLES = [0, 20, 40, 60, 120, 140, 160, 180, 240, 260, 280, 300]
export const GANTRY_RADIUS = 40
export const GANTRY_RADII = [22, 30, 23, 31, 22, 30, 23, 31, 22, 30, 23, 31]
export const GANTRY_POSITIONS = GANTRY_ANGLES.map((angle, i) => {
  const rad = (angle * Math.PI) / 180
  const radius = GANTRY_RADII[i] ?? GANTRY_RADIUS
  return { angle, px: Math.cos(rad) * radius, pz: Math.sin(rad) * radius, radius }
})
const TOWER_HEIGHT = 150
const TOWER_HALF = 8
const TOWER_WIDTH = 2.6

type GantryPoint = (x: number, y: number, z: number) => [number, number, number]

export function LaunchGantries() {
  const launchActive = useSceneStore((s) => s.launchActive)
  const { beams, gantries } = useMemo(() => {
    const list: Beam[] = []
    const data = GANTRY_ANGLES.map((angle, index) => {
      const rad = (angle * Math.PI) / 180
      const radius = GANTRY_RADII[index] ?? GANTRY_RADIUS
      const px = Math.cos(rad) * radius
      const pz = Math.sin(rad) * radius
      const point: GantryPoint = (x, y, z) => [
        px + x * Math.cos(rad) - z * Math.sin(rad),
        y,
        pz + x * Math.sin(rad) + z * Math.cos(rad),
      ]

      for (const side of [-1, 1]) {
        const cx = side * TOWER_HALF
        const corners: [number, number][] = [
          [cx - TOWER_WIDTH, -TOWER_WIDTH],
          [cx + TOWER_WIDTH, -TOWER_WIDTH],
          [cx - TOWER_WIDTH, TOWER_WIDTH],
          [cx + TOWER_WIDTH, TOWER_WIDTH],
        ]

        for (const [x, z] of corners) {
          list.push({ a: point(x, 0, z), b: point(x, TOWER_HEIGHT, z), r: 0.45 })
        }

        for (let y = 0; y <= TOWER_HEIGHT; y += 12) {
          list.push({ a: point(cx - TOWER_WIDTH, y, -TOWER_WIDTH), b: point(cx + TOWER_WIDTH, y, -TOWER_WIDTH), r: 0.28 })
          list.push({ a: point(cx - TOWER_WIDTH, y, TOWER_WIDTH), b: point(cx + TOWER_WIDTH, y, TOWER_WIDTH), r: 0.28 })
          list.push({ a: point(cx - TOWER_WIDTH, y, -TOWER_WIDTH), b: point(cx - TOWER_WIDTH, y, TOWER_WIDTH), r: 0.28 })
          list.push({ a: point(cx + TOWER_WIDTH, y, -TOWER_WIDTH), b: point(cx + TOWER_WIDTH, y, TOWER_WIDTH), r: 0.28 })
        }

        for (let y = 0; y < TOWER_HEIGHT; y += 12) {
          const next = Math.min(y + 12, TOWER_HEIGHT)
          list.push({
            a: point(cx - TOWER_WIDTH, y, -TOWER_WIDTH),
            b: point(cx + TOWER_WIDTH, next, -TOWER_WIDTH),
            r: 0.2,
          })
          list.push({
            a: point(cx + TOWER_WIDTH, y, TOWER_WIDTH),
            b: point(cx - TOWER_WIDTH, next, TOWER_WIDTH),
            r: 0.2,
          })
        }
      }

      // cross beams between the twin towers
      for (const y of [36, 68, 92, TOWER_HEIGHT]) {
        list.push({ a: point(-TOWER_HALF, y, 0), b: point(TOWER_HALF, y, 0), r: 0.5 })
      }
      // hard-link arms toward the cabin
      list.push({ a: point(-TOWER_HALF, 82, 0), b: point(0, 82, 0), r: 0.7 })
      list.push({ a: point(TOWER_HALF, 82, 0), b: point(0, 82, 0), r: 0.7 })
      list.push({ a: point(-TOWER_HALF, 48, 0), b: point(0, 48, 0), r: 0.55 })
      list.push({ a: point(TOWER_HALF, 48, 0), b: point(0, 48, 0), r: 0.55 })

      return { angle, px, pz, radius, point, index }
    })

    return { beams: list, gantries: data }
  }, [])

  return (
    <group>
      <BeamInstances beams={beams} material={gantryMaterial} radius={0.4} />

      {gantries.map(({ angle, px, pz, point, index }) => {
        const rad = (angle * Math.PI) / 180
        const hasCabin = index % 3 !== 2 && !(index === 0 && launchActive)
        return (
          <group key={angle}>
            <mesh
              position={[px, 2.4, pz]}
              rotation={[0, -rad, 0]}
              material={steelMaterial}
              receiveShadow
            >
              <boxGeometry args={[13, 1.8, 9]} />
            </mesh>
            <mesh
              position={[px, 1.1, pz]}
              rotation={[0, -rad, 0]}
              material={darkMaterial}
            >
              <boxGeometry args={[15, 1.0, 11]} />
            </mesh>
            <mesh position={[px, 3.5, pz]} rotation={[Math.PI / 2, 0, 0]} material={orangeEmissive}>
              <torusGeometry args={[5.2, 0.36, 6, 28]} />
            </mesh>
            <group position={[px, 0, pz]} rotation={[0, -rad, 0]}>
              {/* heavy launch plinth and sloped buttresses */}
              <mesh position={[0, 3.2, 0]} material={darkMaterial} castShadow receiveShadow>
                <boxGeometry args={[21, 3.4, 15]} />
              </mesh>
              <mesh position={[0, 5.0, 0]} material={steelMaterial}>
                <boxGeometry args={[18, 0.7, 12]} />
              </mesh>
              {[-1, 1].map((side) => (
                <group key={`slope-${side}`}>
                  <mesh position={[side * 12, 16, 0]} rotation={[0, 0, side * 0.5]} material={steelMaterial} castShadow>
                    <boxGeometry args={[4, 34, 7]} />
                  </mesh>
                  <mesh position={[side * 10, 8, 4]} rotation={[0.35, 0, 0]} material={darkMaterial}>
                    <boxGeometry args={[5, 22, 3]} />
                  </mesh>
                  {/* white launch tower cladding */}
                  <mesh position={[side * 8, 98, 0]} material={whiteMaterial} castShadow>
                    <boxGeometry args={[4.4, 86, 7]} />
                  </mesh>
                  <mesh position={[side * 8, 98, 3.8]} material={darkMaterial}>
                    <boxGeometry args={[2.4, 78, 0.6]} />
                  </mesh>
                  {/* hydraulic arms toward the cabin */}
                  <mesh position={[side * 4.2, 58, 0]} rotation={[0, 0, side * 1.15]} material={goldMaterial}>
                    <cylinderGeometry args={[1.0, 1.3, 11, 8]} />
                  </mesh>
                  <mesh position={[side * 4.0, 82, 0]} rotation={[0, 0, side * 1.05]} material={goldMaterial}>
                    <cylinderGeometry args={[0.8, 1.0, 9, 8]} />
                  </mesh>
                </group>
              ))}
              <mesh position={[0, 152, 0]} material={darkMaterial}>
                <boxGeometry args={[20, 3, 8]} />
              </mesh>
              <mesh position={[0, 156, 0]} material={steelMaterial}>
                <boxGeometry args={[8, 3, 6]} />
              </mesh>
              {/* service ladders on the outboard face */}
              {[-1, 1].map((side) => (
                <group key={`ladder-${side}`} position={[side * 15, 42, 0]}>
                  {Array.from({ length: 9 }).map((_, k) => (
                    <mesh key={k} position={[0, k * 5, 0]} material={steelMaterial}>
                      <boxGeometry args={[1.8, 0.22, 0.22]} />
                    </mesh>
                  ))}
                  <mesh position={[0, 20, -0.5]} material={darkMaterial}>
                    <boxGeometry args={[0.3, 44, 0.3]} />
                  </mesh>
                </group>
              ))}
            </group>
            <mesh position={[px, TOWER_HEIGHT + 1.5, pz]} material={redMaterial}>
              <sphereGeometry args={[1.1, 8, 6]} />
            </mesh>

            {hasCabin && (
              <group position={[px, 7.0, pz]} rotation={[0, -rad, 0]}>
                <MiniCabin />
              </group>
            )}

            {[0, 6].includes(index) && <LaunchFlames position={[px, 4.6, pz]} rotation={-rad} />}
          </group>
        )
      })}
    </group>
  )
}

export function MiniCabin({ scale = 1, launching = false }: { scale?: number; launching?: boolean }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 4.8, 0]} material={whiteMaterial} castShadow>
        <boxGeometry args={[11, 6.4, 9]} />
      </mesh>
      <mesh position={[0, 8.25, 0]} material={darkMaterial}>
        <boxGeometry args={[9.2, 0.6, 7.4]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={darkMaterial}>
        <boxGeometry args={[10, 0.6, 8.2]} />
      </mesh>
      {[
        [-5.4, -4.1],
        [5.4, -4.1],
        [-5.4, 4.1],
        [5.4, 4.1],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 5.4, z]}>
          <mesh material={lightMaterial}>
            <boxGeometry args={[2.1, 10.5, 2.1]} />
          </mesh>
          <mesh position={[x > 0 ? -1.5 : 1.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
            <cylinderGeometry args={[0.28, 0.28, 3.2, 6]} />
          </mesh>
        </group>
      ))}
      {[
        [-4.2, -3.1],
        [4.2, -3.1],
        [-4.2, 3.1],
        [4.2, 3.1],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 1.4, z]}>
          <mesh material={steelMaterial}>
            <cylinderGeometry args={[1.8, 1.2, 2.4, 10]} />
          </mesh>
          <mesh position={[0, -1.5, 0]} material={orangeEmissive}>
            <coneGeometry args={[1.25, 2.6, 10]} />
          </mesh>
        </group>
      ))}
      {launching && (
        <mesh position={[0, -1.2, 0]} material={orangeEmissive}>
          <cylinderGeometry args={[3.4, 4.8, 2.2, 8]} />
        </mesh>
      )}
    </group>
  )
}

function LaunchFlames({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    const pulse = 0.82 + Math.sin(clock.elapsedTime * 16) * 0.12 + Math.sin(clock.elapsedTime * 37) * 0.06
    group.current.scale.setScalar(pulse)
  })
  return (
    <group ref={group} position={position} rotation={[0, rotation, 0]}>
      {[
        [-4.2, -3],
        [4.2, -3],
        [-4.2, 3],
        [4.2, 3],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh rotation={[Math.PI, 0, 0]} material={orangeEmissive}>
            <coneGeometry args={[0.55, 4.2, 8]} />
          </mesh>
          <sprite scale={[7, 7, 1]} position={[0, -1.5, 0]}>
            <spriteMaterial
              map={getGlowTexture()}
              color="#ffb26b"
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        </group>
      ))}
      <pointLight position={[0, 3, 0]} intensity={28} distance={55} color="#ff9a4d" />
    </group>
  )
}
