import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type SkyDomeProps = {
  radius?: number
  top?: string
  horizon?: string
  bottom?: string
}

export function SkyDome({
  radius = 2200,
  top = '#1d2c3a',
  horizon = '#9ba8b0',
  bottom = '#41505a',
}: SkyDomeProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uHorizon: { value: new THREE.Color(horizon) },
          uBottom: { value: new THREE.Color(bottom) },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec3 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          uniform float uTime;
          varying vec3 vWorld;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 5; i++) {
              value += amplitude * noise(p);
              p *= 2.03;
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            vec3 dir = normalize(vWorld);
            float h = dir.y;
            vec3 low = mix(uBottom, uHorizon, smoothstep(-0.25, 0.04, h));
            vec3 col = mix(low, uTop, smoothstep(0.0, 0.72, h));

            vec2 cloudUv = dir.xz * (2.6 + max(h, 0.0) * 2.2) + vec2(uTime * 0.004, uTime * 0.0015);
            float cloud = smoothstep(0.43, 0.63, fbm(cloudUv * 1.6));
            cloud *= smoothstep(-0.02, 0.28, h) * (1.0 - smoothstep(0.62, 0.95, h));
            vec3 cloudColor = mix(vec3(0.48, 0.52, 0.55), vec3(0.88, 0.84, 0.78), smoothstep(0.0, 0.6, h));
            col = mix(col, cloudColor, cloud * 0.58);

            float sunGlow = pow(max(dot(dir, normalize(vec3(-0.55, 0.10, -0.82))), 0.0), 12.0);
            col += vec3(0.52, 0.31, 0.16) * sunGlow * 0.35;

            float haze = smoothstep(0.18, -0.05, h) * 0.18;
            col += vec3(0.32, 0.30, 0.25) * haze;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [top, horizon, bottom],
  )

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh material={material} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 24]} />
    </mesh>
  )
}
