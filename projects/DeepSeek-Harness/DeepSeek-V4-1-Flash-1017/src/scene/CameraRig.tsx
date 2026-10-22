import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { CAMERA_PRESETS } from '../data/specs'
import { useSceneStore } from '../state/useSceneStore'
import { setCameraControls } from './cameraControls'

const NEAR_FAR: Record<string, [number, number]> = {
  orbit: [0.01, 800],
  base: [0.5, 5000],
  cabin: [0.5, 40000],
  station: [4, 90000],
  counterweight: [2, 45000],
  interior: [0.05, 900],
}

export function CameraRig() {
  const controlsRef = useRef<any>(null)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const view = useSceneStore((state) => state.view)

  useEffect(() => {
    let frame = 0
    const apply = () => {
      const controls = controlsRef.current
      if (!controls) {
        frame = requestAnimationFrame(apply)
        return
      }

      const preset = CAMERA_PRESETS[view]
      const [near, far] = NEAR_FAR[view] ?? [0.1, 10000]
      const aspect = size.width / Math.max(size.height, 1)
      const portrait = aspect < 0.85
      const distanceScale = portrait ? (view === 'interior' ? 1.12 : 1.38) : 1
      const fittedFov = preset.fov + (portrait ? (view === 'interior' ? 8 : 7) : 0)
      const fittedDistance = Math.hypot(
        preset.position[0] - preset.target[0],
        preset.position[1] - preset.target[1],
        preset.position[2] - preset.target[2],
      ) * distanceScale
      const fittedPosition: [number, number, number] = [
        preset.target[0] + (preset.position[0] - preset.target[0]) * distanceScale,
        preset.target[1] + (preset.position[1] - preset.target[1]) * distanceScale,
        preset.target[2] + (preset.position[2] - preset.target[2]) * distanceScale,
      ]

      camera.near = near
      camera.far = far
      if ('fov' in camera) {
        ;(camera as any).fov = fittedFov
      }
      camera.updateProjectionMatrix()

      controls.minDistance = preset.min
      controls.maxDistance = Math.max(preset.max, fittedDistance * 1.35)
      controls.smoothTime = 0.92
      controls.draggingSmoothTime = 0.12
      controls.dollySpeed = 0.72
      controls.truckSpeed = 0.55
      controls.azimuthRotateSpeed = 0.72
      controls.polarRotateSpeed = 0.7

      if (view === 'base') {
        controls.minPolarAngle = 0.12
        controls.maxPolarAngle = Math.PI * 0.48
      } else if (view === 'interior') {
        controls.minPolarAngle = 0.25
        controls.maxPolarAngle = Math.PI * 0.78
      } else {
        controls.minPolarAngle = 0.05
        controls.maxPolarAngle = Math.PI * 0.95
      }

      setCameraControls(controls)

      controls.setLookAt(
        fittedPosition[0],
        fittedPosition[1],
        fittedPosition[2],
        preset.target[0],
        preset.target[1],
        preset.target[2],
        false,
      )
      controls.update(0)
    }

    frame = requestAnimationFrame(apply)
    return () => cancelAnimationFrame(frame)
  }, [camera, size.height, size.width, view])

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      dollyToCursor={false}
      minDistance={20}
      maxDistance={20000}
    />
  )
}
