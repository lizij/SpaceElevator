import { useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../../state/useSceneStore'
import { HOTSPOTS } from '../../data/specs'
import { Hotspot } from '../parts/Hotspot'
import { Earth } from '../parts/Earth'
import { getGlowTexture } from '../kit/textures'

export function OrbitLayer() {
  const mode = useSceneStore((s) => s.mode)

  return (
    <group>
      <color attach="background" args={['#03060a']} />
      <Stars count={mode === 'film' ? 5200 : 3200} />
      <Earth />
      <directionalLight position={[70, 48, 110]} intensity={1.35} color="#bcd9ff" />

      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 90, 0)]}
        color="#eaf4ff"
        lineWidth={1.35}
        transparent
        opacity={0.95}
      />
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 90, 0)]}
        color="#9ed2ff"
        lineWidth={7}
        transparent
        opacity={0.1}
      />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <Line
            key={`bundle-${i}`}
            points={[
              new THREE.Vector3(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12),
              new THREE.Vector3(Math.cos(a) * 0.12, 90, Math.sin(a) * 0.12),
            ]}
            color={i % 2 ? '#b9d7f2' : '#e3f0ff'}
            lineWidth={0.45}
            transparent
            opacity={0.5}
          />
        )
      })}

      <BaseMarker />
      <StationMini />
      <CounterweightMini />
      <CabinLights />

      <ambientLight intensity={0.08} />
      <directionalLight position={[70, 50, 80]} intensity={2.8} color="#fff6e8" />
      <pointLight position={[0, -3.4, 0]} intensity={14} distance={30} color="#4f93cf" />

      {HOTSPOTS.filter((spot) => spot.view === 'orbit').map((spot) => (
        <Hotspot key={spot.id} spot={spot} />
      ))}
    </group>
  )
}

function Stars({ count }: { count: number }) {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[makeStarPositions(count), 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.42}
        color="#dbe8ff"
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function makeStarPositions(count: number) {
  const array = new Float32Array(count * 3)
  let seed = 7
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    const radius = 190 + rand() * 130
    array[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
    array[i * 3 + 1] = Math.cos(phi) * radius
    array[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
  }
  return array
}

function BaseMarker() {
  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.022, 6, 28]} />
        <meshBasicMaterial color="#ffb35f" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.018, 0.045, 0.75, 8]} />
        <meshBasicMaterial color="#ffd29b" transparent opacity={0.35} />
      </mesh>
      <sprite scale={[1.5, 1.5, 1]}>
        <spriteMaterial
          map={getGlowTexture()}
          color="#ffb35f"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}

function StationMini() {
  return (
    <group position={[0, 36, 0]} scale={2.0}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.07, 8, 48]} />
        <meshStandardMaterial color="#b7c3cf" roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.035, 6, 32]} />
        <meshStandardMaterial color="#64717e" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.12, 0.15, 2.3, 10]} />
        <meshStandardMaterial color="#d2dbe4" roughness={0.4} metalness={0.5} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.04, 0.9, 0.04]} />
              <meshStandardMaterial color="#9cabb9" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0.95, 0.1, 0]} rotation={[0, 0, 0.2]}>
              <boxGeometry args={[0.45, 0.02, 0.16]} />
              <meshStandardMaterial color="#345a7a" emissive="#122b40" emissiveIntensity={0.3} metalness={0.4} roughness={0.3} />
            </mesh>
          </group>
        )
      })}
      <sprite scale={[3.4, 3.4, 1]}>
        <spriteMaterial
          map={getGlowTexture()}
          color="#ffd8a3"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <pointLight intensity={2.8} distance={4} color="#ffd7a3" />
    </group>
  )
}

function CounterweightMini() {
  return (
    <group position={[0, 90, 0]} scale={1.9}>
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[0.42, 2.6, 0.42]} />
        <meshStandardMaterial color="#76838f" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[1.18, 0.16, 1.18]} />
        <meshStandardMaterial color="#aeb9c3" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[0.82, 0.14, 0.82]} />
        <meshStandardMaterial color="#64717e" metalness={0.7} roughness={0.4} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <mesh position={[0.52, 0.72, 0]} rotation={[0, 0, -0.55]}>
              <boxGeometry args={[0.62, 0.04, 0.22]} />
              <meshStandardMaterial color="#c7d1da" metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[0.4, -0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.15, 0.17, 0.7, 8]} />
              <meshStandardMaterial color="#9aabb9" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        )
      })}
      <sprite scale={[2.4, 2.4, 1]}>
        <spriteMaterial
          map={getGlowTexture()}
          color="#b9dcff"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <pointLight intensity={1.8} distance={3} color="#c7e5ff" />
    </group>
  )
}

function CabinLights() {
  return (
    <group>
      {Array.from({ length: 9 }).map((_, i) => (
        <CabinLight key={i} offset={i / 9} />
      ))}
    </group>
  )
}

function CabinLight({ offset }: { offset: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime * 0.012 + offset) % 1
    ref.current.position.y = 1 + t * 89
  })
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshBasicMaterial color="#ffe3bc" />
      </mesh>
      <sprite scale={[0.7, 0.7, 1]}>
        <spriteMaterial
          map={getGlowTexture()}
          color="#ffd49a"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}
