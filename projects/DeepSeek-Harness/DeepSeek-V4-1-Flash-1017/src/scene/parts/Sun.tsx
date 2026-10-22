import * as THREE from 'three'
import { getGlowTexture } from '../kit/textures'

type SunProps = {
  position: [number, number, number]
  scale?: number
  color?: string
  opacity?: number
}

export function Sun({ position, scale = 18, color = '#fff0d3', opacity = 0.95 }: SunProps) {
  return (
    <group position={position}>
      <sprite scale={[scale, scale, 1]}>
        <spriteMaterial
          map={getGlowTexture()}
          color={color}
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <sprite scale={[scale * 0.32, scale * 0.32, 1]}>
        <spriteMaterial
          map={getGlowTexture()}
          color="#ffffff"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}
