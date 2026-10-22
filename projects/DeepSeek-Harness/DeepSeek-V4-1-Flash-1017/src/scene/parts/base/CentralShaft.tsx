import { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { darkMaterial, lightMaterial, orangeEmissive, steelMaterial, warmEmissive } from '../../kit/materials'
import { getGlowTexture } from '../../kit/textures'
import { MiniCabin } from './LaunchGantries'

const CABLE_TOP = 250

export function CentralShaft() {
  const climbingRef = useRef<THREE.Group>(null)

  const cableLines = useMemo(() => {
    const lines: THREE.Vector3[][] = []
    const centers: [number, number][] = [
      [-3.8, -3.8],
      [3.8, -3.8],
      [-3.8, 3.8],
      [3.8, 3.8],
    ]
    for (const [cx, cz] of centers) {
      for (let i = 0; i < 2; i++) {
        const angle = (i / 2) * Math.PI * 2
        const x = cx + Math.cos(angle) * 1.1
        const z = cz + Math.sin(angle) * 1.1
        lines.push([new THREE.Vector3(x, 8, z), new THREE.Vector3(x, CABLE_TOP, z)])
      }
    }
    return lines
  }, [])

  useFrame(({ clock }) => {
    if (!climbingRef.current) return
    const t = (clock.elapsedTime * 0.018) % 1
    climbingRef.current.position.y = 20 + t * 155
  })

  return (
    <group>
      {/* launch platform ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 8.2, 0]} material={steelMaterial}>
        <ringGeometry args={[20, 36, 96]} />
      </mesh>
      <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkMaterial}>
        <torusGeometry args={[35, 2.2, 8, 96]} />
      </mesh>
      <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} material={lightMaterial}>
        <torusGeometry args={[21, 1.3, 8, 96]} />
      </mesh>

      {/* central shaft */}
      <mesh position={[0, 58, 0]} material={darkMaterial} castShadow>
        <cylinderGeometry args={[6.2, 7.4, 108, 24]} />
      </mesh>
      <mesh position={[0, 110, 0]} material={steelMaterial}>
        <cylinderGeometry args={[9.5, 7.4, 5, 24]} />
      </mesh>
      <mesh position={[0, 111, 0]} rotation={[Math.PI / 2, 0, 0]} material={orangeEmissive}>
        <torusGeometry args={[9.7, 0.45, 6, 64]} />
      </mesh>

      {/* rib details */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 7.9, 58, Math.sin(a) * 7.9]} material={steelMaterial}>
            <boxGeometry args={[0.8, 98, 0.8]} />
          </mesh>
        )
      })}

      {/* open guide rails around the shaft */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <group key={`rail-${i}`} position={[Math.cos(a) * 7.2, 58, Math.sin(a) * 7.2]}>
            <mesh material={steelMaterial}>
              <boxGeometry args={[0.55, 106, 0.55]} />
            </mesh>
            {Array.from({ length: 5 }).map((_, j) => (
              <mesh key={j} position={[0, -42 + j * 21, 0]} material={warmEmissive}>
                <boxGeometry args={[0.75, 0.35, 0.75]} />
              </mesh>
            ))}
          </group>
        )
      })}
      {[24, 46, 68, 90, 110].map((y) => (
        <group key={`brace-${y}`}>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 7.2, y, Math.sin(a) * 7.2]} rotation={[0, -a, 0]} material={steelMaterial}>
                <boxGeometry args={[2.4, 0.35, 0.35]} />
              </mesh>
            )
          })}
        </group>
      ))}

      {/* cable bundles */}
      {cableLines.map((points, i) => (
        <Line key={i} points={points} color="#1a232c" lineWidth={0.45} transparent opacity={0.55} />
      ))}
      <Line points={[new THREE.Vector3(0, 8, 0), new THREE.Vector3(0, CABLE_TOP, 0)]} color="#d7e8ff" lineWidth={0.8} transparent opacity={0.75} />
      <Line points={[new THREE.Vector3(0, 8, 0), new THREE.Vector3(0, CABLE_TOP, 0)]} color="#d7e8ff" lineWidth={4.5} transparent opacity={0.08} />

      {/* bundle clamps */}
      {[42, 86, 132, 180, 226].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={darkMaterial}>
            <torusGeometry args={[4.6, 0.5, 6, 24]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={warmEmissive}>
            <torusGeometry args={[5.1, 0.18, 4, 24]} />
          </mesh>
        </group>
      ))}

      {/* climbing cabin */}
      <group ref={climbingRef} position={[0, 20, 0]}>
        <MiniCabin scale={0.9} />
        <sprite position={[0, 2, 0]} scale={[14, 14, 1]}>
          <spriteMaterial
            map={getGlowTexture()}
            color="#77b7e8"
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      </group>

      {/* warning lights on platform */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 33, 10, Math.sin(a) * 33]} material={i % 2 ? orangeEmissive : warmEmissive}>
            <sphereGeometry args={[0.7, 8, 6]} />
          </mesh>
        )
      })}
    </group>
  )
}
