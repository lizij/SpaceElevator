import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { asset } from '../kit/textures'

export function Ocean() {
  const normalMap = useTexture(asset('textures/waternormals.jpg'))
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(9, 9)

  useFrame((_, delta) => {
    normalMap.offset.x += delta * 0.004
    normalMap.offset.y += delta * 0.0025
    if (materialRef.current) {
      materialRef.current.normalScale.set(0.18, 0.18)
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
      <planeGeometry args={[9000, 9000, 1, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#183441"
        roughness={0.34}
        metalness={0.24}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.18, 0.18)}
        envMapIntensity={0.9}
      />
    </mesh>
  )
}
