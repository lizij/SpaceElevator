import { useMemo } from 'react'
import * as THREE from 'three'
import { BeamInstances, type Beam } from './BeamInstances'
import { darkMaterial, ringMaterial, whiteMaterial } from './materials'

type TrussRingProps = {
  radius: number
  y?: number
  height?: number
  segments?: number
  tube?: number
  beamRadius?: number
  color?: 'white' | 'dark' | 'steel'
  nodeScale?: number
}

export function TrussRing({
  radius,
  y = 0,
  height = 12,
  segments = 48,
  tube = 1.4,
  beamRadius = 0.42,
  color = 'dark',
  nodeScale = 0.7,
}: TrussRingProps) {
  const beams = useMemo<Beam[]>(() => {
    const list: Beam[] = []
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2
      const a1 = ((i + 1) / segments) * Math.PI * 2
      const p0: [number, number, number] = [Math.cos(a0) * radius, -height, Math.sin(a0) * radius]
      const p1: [number, number, number] = [Math.cos(a1) * radius, -height, Math.sin(a1) * radius]
      const q0: [number, number, number] = [p0[0], 0, p0[2]]
      const q1: [number, number, number] = [p1[0], 0, p1[2]]
      list.push({ a: p0, b: q0, r: beamRadius })
      list.push({ a: q0, b: q1, r: beamRadius * 0.8 })
      list.push({ a: p0, b: p1, r: beamRadius * 0.8 })
      if (i % 2 === 0) {
        list.push({ a: p0, b: q1, r: beamRadius * 0.55 })
      } else {
        list.push({ a: q0, b: p1, r: beamRadius * 0.55 })
      }
    }
    return list
  }, [radius, height, segments, beamRadius])

  const beamsMaterial = color === 'white' ? whiteMaterial : color === 'steel' ? ringMaterial : darkMaterial

  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={beamsMaterial}>
        <torusGeometry args={[radius, tube, 6, Math.max(segments, 32)]} />
      </mesh>
      <mesh position={[0, -height, 0]} rotation={[Math.PI / 2, 0, 0]} material={beamsMaterial}>
        <torusGeometry args={[radius, tube * 0.8, 6, Math.max(segments, 32)]} />
      </mesh>
      <BeamInstances beams={beams} material={beamsMaterial} radius={beamRadius} />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            material={brightNode}
          >
            <boxGeometry args={[nodeScale * 2, nodeScale * 2, nodeScale * 2]} />
          </mesh>
        )
      })}
    </group>
  )
}

const brightNode = new THREE.MeshStandardMaterial({
  color: '#f3c98b',
  emissive: '#f0a34a',
  emissiveIntensity: 1.8,
  roughness: 0.35,
})
