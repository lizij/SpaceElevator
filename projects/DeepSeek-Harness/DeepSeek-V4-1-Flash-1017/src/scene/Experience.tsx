import { Suspense, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { CameraRig } from './CameraRig'
import { SceneContent } from './SceneContent'
import { Effects } from './Effects'
import { useSceneStore } from '../state/useSceneStore'
import { asset } from './kit/textures'

const PRELOAD = [
  asset('textures/earth_atmos_2048.jpg'),
  asset('textures/earth_lights_2048.png'),
  asset('textures/earth_clouds_1024.png'),
  asset('textures/earth_normal_2048.jpg'),
  asset('textures/earth_specular_2048.jpg'),
  asset('textures/waternormals.jpg'),
]

export function Experience() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const mode = useSceneStore((state) => state.mode)

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl])

  useEffect(() => {
    gl.toneMappingExposure = mode === 'film' ? 1.08 : 0.98
  }, [gl, mode])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#273646')
    gradient.addColorStop(0.46, '#bfd0dd')
    gradient.addColorStop(0.55, '#dbe5ec')
    gradient.addColorStop(0.72, '#6d7d89')
    gradient.addColorStop(1, '#1a232b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 256)
    const glow = ctx.createRadialGradient(360, 100, 4, 360, 100, 90)
    glow.addColorStop(0, 'rgba(255,239,210,0.95)')
    glow.addColorStop(1, 'rgba(255,239,210,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 512, 256)

    const texture = new THREE.CanvasTexture(canvas)
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.colorSpace = THREE.SRGBColorSpace

    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromEquirectangular(texture).texture
    scene.environment = env
    scene.environmentIntensity = 0.42

    texture.dispose()
    pmrem.dispose()

    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [gl, scene])

  return (
    <>
      <CameraRig />
      <FogController />
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
      <Suspense fallback={null}>
        <PreloadTextures />
      </Suspense>
      <Effects />
    </>
  )
}

function FogController() {
  const scene = useThree((state) => state.scene)
  const view = useSceneStore((state) => state.view)
  const mode = useSceneStore((state) => state.mode)

  useEffect(() => {
    if (view !== 'base') {
      scene.fog = null
      return
    }
    scene.fog = new THREE.FogExp2(
      mode === 'film' ? '#6e7e89' : '#151d24',
      mode === 'film' ? 0.00068 : 0.00004,
    )
    return () => {
      scene.fog = null
    }
  }, [mode, scene, view])

  return null
}

function PreloadTextures() {
  useTexture(PRELOAD)
  return null
}
