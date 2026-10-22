import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type Beam = {
  a: [number, number, number]
  b: [number, number, number]
  r?: number
}

type BeamInstancesProps = {
  beams: Beam[]
  material: THREE.Material
  radius?: number
  castShadow?: boolean
}

export function BeamInstances({ beams, material, radius = 0.35, castShadow = false }: BeamInstancesProps) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const from = new THREE.Vector3()
    const to = new THREE.Vector3()
    const direction = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)

    beams.forEach((beam, index) => {
      from.set(...beam.a)
      to.set(...beam.b)
      direction.subVectors(to, from)
      const length = direction.length()
      if (length < 0.0001) {
        matrix.makeScale(0, 0, 0)
      } else {
        position.addVectors(from, to).multiplyScalar(0.5)
        quaternion.setFromUnitVectors(up, direction.normalize())
        const thickness = beam.r ?? radius
        scale.set(thickness, length, thickness)
        matrix.compose(position, quaternion, scale)
      }
      mesh.setMatrixAt(index, matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [beams, radius])

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, Math.max(beams.length, 1)]}
      castShadow={castShadow}
      receiveShadow={false}
      frustumCulled
    />
  )
}
