import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { asset } from '../kit/textures'

const EARTH_RADIUS = 6.371

export function Earth() {
  const [day, night, normal, specular, clouds] = useTexture([
    asset('textures/earth_atmos_2048.jpg'),
    asset('textures/earth_lights_2048.png'),
    asset('textures/earth_normal_2048.jpg'),
    asset('textures/earth_specular_2048.jpg'),
    asset('textures/earth_clouds_1024.png'),
  ])

  const cloudRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace
    night.colorSpace = THREE.SRGBColorSpace
    clouds.colorSpace = THREE.SRGBColorSpace
    ;[day, night, normal, specular, clouds].forEach((texture) => {
      texture.anisotropy = 8
      texture.needsUpdate = true
    })
  }, [day, night, normal, specular, clouds])

  useFrame((_, delta) => {
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.0035
  })

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.6);
            vec3 color = mix(vec3(0.12, 0.36, 0.72), vec3(0.52, 0.78, 1.0), rim);
            gl_FragColor = vec4(color, rim * 0.9);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  )

  return (
    <group position={[0, -EARTH_RADIUS, 0]}>
      <group rotation={[0.12, 1.7, -0.08]}>
        <mesh>
          <sphereGeometry args={[EARTH_RADIUS, 128, 96]} />
          <meshStandardMaterial
            map={day}
            normalMap={normal}
            normalScale={new THREE.Vector2(0.42, 0.42)}
            roughness={0.74}
            metalness={0.05}
            emissiveMap={night}
            emissive="#ffc37a"
            emissiveIntensity={0.78}
          />
        </mesh>

        <mesh ref={cloudRef}>
          <sphereGeometry args={[EARTH_RADIUS * 1.006, 96, 64]} />
          <meshStandardMaterial
            map={clouds}
            transparent
            opacity={0.38}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </group>

      <mesh scale={1.045}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </group>
  )
}
