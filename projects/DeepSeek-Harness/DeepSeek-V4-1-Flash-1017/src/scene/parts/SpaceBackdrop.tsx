import { useTexture } from '@react-three/drei'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { asset } from '../kit/textures'

type SpaceBackdropProps = {
  starRadius?: number
  starCount?: number
  earth?: boolean
  earthY?: number
  earthZ?: number
  earthScale?: number
}

export function SpaceBackdrop({
  starRadius = 6000,
  starCount = 5000,
  earth = true,
  earthY = -9600,
  earthZ = -3800,
  earthScale = 1,
}: SpaceBackdropProps) {
  const day = useTexture(asset('textures/earth_atmos_2048.jpg'))
  day.colorSpace = THREE.SRGBColorSpace

  return (
    <group>
      <Stars
        radius={starRadius}
        depth={1400}
        count={starCount}
        factor={8}
        saturation={0}
        fade
        speed={0.25}
      />

      {earth && (
        <group position={[0, earthY, earthZ]} scale={earthScale}>
          <mesh>
            <sphereGeometry args={[9000, 96, 64]} />
            <meshBasicMaterial map={day} color="#6f92ad" />
          </mesh>
          <mesh scale={1.012}>
            <sphereGeometry args={[9000, 64, 48]} />
            <meshBasicMaterial
              color="#4b9ad8"
              transparent
              opacity={0.1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.BackSide}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}
