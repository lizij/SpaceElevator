import { useEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA_PRESETS } from '../data/specs'
import { useSceneStore } from '../state/useSceneStore'
import { getCameraControls } from './cameraControls'
import { getGlowTexture } from './kit/textures'
import { GANTRY_POSITIONS, MiniCabin } from './parts/base/LaunchGantries'

const PAD = GANTRY_POSITIONS[0]
const DURATION = 12

export function LaunchSequence() {
  const active = useSceneStore((s) => s.launchActive)
  const startedAt = useSceneStore((s) => s.launchStartedAt)
  const setLaunchPhase = useSceneStore((s) => s.setLaunchPhase)
  const endLaunch = useSceneStore((s) => s.endLaunch)

  const camera = useThree((state) => state.camera)
  const cabinRef = useRef<THREE.Group>(null)
  const plumeRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const steamRefs = useRef<THREE.Sprite[]>([])
  const phaseRef = useRef('')
  const finishedRef = useRef(false)

  const steam = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        x: PAD.px + Math.cos(i * 1.7) * (12 + (i % 3) * 7),
        z: PAD.pz + Math.sin(i * 1.7) * (12 + (i % 3) * 7),
        offset: i * 0.14,
      })),
    [],
  )

  useEffect(() => {
    if (!active) {
      finishedRef.current = false
      return
    }
    const controls = getCameraControls()
    if (controls) controls.enabled = false
    phaseRef.current = 'ignition'
    setLaunchPhase('ignition')
    if (cabinRef.current) cabinRef.current.visible = true
    return () => {
      const next = getCameraControls()
      if (next) next.enabled = true
      if (!finishedRef.current) {
        const base = CAMERA_PRESETS.base
        camera.position.set(base.position[0], base.position[1], base.position[2])
        camera.lookAt(base.target[0], base.target[1], base.target[2])
        const c = getCameraControls()
        if (c) c.setLookAt(base.position[0], base.position[1], base.position[2], base.target[0], base.target[1], base.target[2], false)
      }
    }
  }, [active, camera, setLaunchPhase])

  useFrame(() => {
    if (!active || finishedRef.current) return
    const t = (performance.now() - startedAt) / 1000
    const phase = t < 2.2 ? 'ignition' : t < 8.4 ? 'climb' : 'complete'
    if (phase !== phaseRef.current) {
      phaseRef.current = phase
      setLaunchPhase(phase)
    }

    const rise = Math.max(0, t - 2)
    const cabinY = 8 + Math.pow(Math.min(rise, 6.4), 1.38) * 14
    if (cabinRef.current) cabinRef.current.position.y = cabinY

    const power = t < 0.8 ? 0 : t < 1.6 ? (t - 0.8) / 0.8 : t < 7.2 ? 1 - (t - 1.6) * 0.07 : 0
    if (plumeRef.current) {
      plumeRef.current.visible = power > 0.02
      plumeRef.current.scale.set(1, Math.max(0.05, power), 1)
    }
    if (lightRef.current) lightRef.current.intensity = 55 * Math.max(0, power)

    steamRefs.current.forEach((sprite, i) => {
      if (!sprite) return
      const s = (t * 0.22 + steam[i].offset) % 1
      sprite.position.y = 3 + s * 50
      sprite.scale.setScalar(20 + s * 38)
      const material = sprite.material as THREE.SpriteMaterial
      material.opacity = Math.max(0, 0.12 * (1 - s)) * Math.min(1, t)
    })

    const targetY = cabinY + 8
    const follow = {
      p: [PAD.px + 78 + cabinY * 0.18, cabinY + 72, PAD.pz + 138 + cabinY * 0.16] as [number, number, number],
      q: [PAD.px, targetY + 6, PAD.pz] as [number, number, number],
    }
    const wide = { p: [350, 220, 430] as [number, number, number], q: [0, 100, 0] as [number, number, number] }
    const blend = Math.min(1, Math.max(0, (t - 8.8) / 2.2))
    const k = blend * blend * (3 - 2 * blend)
    const px = follow.p[0] + (wide.p[0] - follow.p[0]) * k
    const py = follow.p[1] + (wide.p[1] - follow.p[1]) * k
    const pz = follow.p[2] + (wide.p[2] - follow.p[2]) * k
    const qx = follow.q[0] + (wide.q[0] - follow.q[0]) * k
    const qy = follow.q[1] + (wide.q[1] - follow.q[1]) * k
    const qz = follow.q[2] + (wide.q[2] - follow.q[2]) * k
    camera.position.set(px, py, pz)
    camera.lookAt(qx, qy, qz)
    camera.updateMatrixWorld()

    if (t > DURATION) {
      finishedRef.current = true
      const base = CAMERA_PRESETS.base
      camera.position.set(base.position[0], base.position[1], base.position[2])
      camera.lookAt(base.target[0], base.target[1], base.target[2])
      const controls = getCameraControls()
      if (controls) {
        controls.enabled = true
        controls.setLookAt(base.position[0], base.position[1], base.position[2], base.target[0], base.target[1], base.target[2], false)
      }
      endLaunch()
    }
  }, 10)

  if (!active) return null

  return (
    <group>
      <group ref={cabinRef} position={[PAD.px, 8, PAD.pz]} rotation={[0, (-PAD.angle * Math.PI) / 180, 0]}>
        <MiniCabin scale={2.05} launching />
        <group ref={plumeRef} position={[0, -1.5, 0]}>
          {[
            [-7.3, -5.4],
            [7.3, -5.4],
            [-7.3, 5.4],
            [7.3, 5.4],
          ].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh rotation={[Math.PI, 0, 0]} material={new THREE.MeshBasicMaterial({ color: '#ffd2a0' })}>
                <coneGeometry args={[1.7, 9, 10]} />
              </mesh>
              <sprite position={[0, -6, 0]} scale={[13, 13, 1]}>
                <spriteMaterial
                  map={getGlowTexture()}
                  color="#ffb168"
                  transparent
                  opacity={0.9}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </sprite>
            </group>
          ))}
          <pointLight ref={lightRef} position={[0, -4, 0]} intensity={55} distance={120} color="#ff9a4d" />
        </group>
      </group>

      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <Line
            key={i}
            points={[
              new THREE.Vector3(PAD.px + Math.cos(a) * 8, 2, PAD.pz + Math.sin(a) * 8),
              new THREE.Vector3(PAD.px + Math.cos(a) * 8, 200, PAD.pz + Math.sin(a) * 8),
            ]}
            color="#aebdca"
            lineWidth={0.7}
            transparent
            opacity={0.3}
          />
        )
      })}

      {steam.map((puff, i) => (
        <sprite
          key={i}
          ref={(el) => {
            if (el) steamRefs.current[i] = el
          }}
          position={[puff.x, 3, puff.z]}
          scale={[22, 22, 1]}
        >
          <spriteMaterial
            map={getGlowTexture()}
            color="#c9d5df"
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  )
}
