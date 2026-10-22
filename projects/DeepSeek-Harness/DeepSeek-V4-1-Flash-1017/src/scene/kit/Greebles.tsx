import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { darkMaterial, orangeEmissive, redMaterial, steelMaterial } from './materials'

type BoxGreeble = {
  p: [number, number, number]
  s: [number, number, number]
  r?: [number, number, number]
}

function seedRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function GreebleBoxes({ items, material }: { items: BoxGreeble[]; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const euler = new THREE.Euler()

    items.forEach((item, index) => {
      position.set(...item.p)
      euler.set(...(item.r ?? [0, 0, 0]))
      quaternion.setFromEuler(euler)
      scale.set(...item.s)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  return (
    <instancedMesh ref={ref} args={[undefined, material, Math.max(items.length, 1)]}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

export function TowerGreebles({ seed = 1 }: { seed?: number }) {
  const { dark, light, pipes, reds } = useMemo(() => {
    const random = seedRandom(seed)
    const dark: BoxGreeble[] = []
    const light: BoxGreeble[] = []
    const pipes: BoxGreeble[] = []
    const reds: BoxGreeble[] = []
    const half = 8

    for (let i = 0; i < 42; i++) {
      const face = Math.floor(random() * 4)
      const y = 8 + random() * 180
      const offset = (random() - 0.5) * 12
      const width = 1 + random() * 3.5
      const height = 1 + random() * 4.5
      const depth = 0.5 + random() * 1.4
      const target = random() > 0.45 ? dark : light
      if (face === 0) target.push({ p: [half + 0.45, y, offset], s: [depth, height, width] })
      if (face === 1) target.push({ p: [-half - 0.45, y, offset], s: [depth, height, width] })
      if (face === 2) target.push({ p: [offset, y, half + 0.45], s: [width, height, depth] })
      if (face === 3) target.push({ p: [offset, y, -half - 0.45], s: [width, height, depth] })
      if (i % 9 === 0) reds.push({ p: [half + 0.6, y + 2, offset], s: [0.8, 0.8, 0.8] })
    }

    for (let i = 0; i < 8; i++) {
      const y = 14 + random() * 170
      const length = 8 + random() * 28
      pipes.push({
        p: [i % 2 === 0 ? half + 0.9 : -half - 0.9, y, i < 4 ? 5.8 : -5.8],
        s: [0.9, length, 0.9],
      })
    }

    return { dark, light, pipes, reds }
  }, [seed])

  return (
    <group>
      <GreebleBoxes items={dark} material={darkMaterial} />
      <GreebleBoxes items={light} material={steelMaterial} />
      <GreebleBoxes items={pipes} material={darkMaterial} />
      <GreebleBoxes items={reds} material={redMaterial} />
    </group>
  )
}

export function CabinGreebles() {
  const { dark, light, pipes, lights } = useMemo(() => {
    const random = seedRandom(33)
    const dark: BoxGreeble[] = []
    const light: BoxGreeble[] = []
    const pipes: BoxGreeble[] = []
    const lights: BoxGreeble[] = []

    // side equipment pods
    for (let i = 0; i < 52; i++) {
      const side = random() > 0.5 ? 1 : -1
      const y = -58 + random() * 122
      const z = -108 + random() * 216
      const w = 3 + random() * 10
      const h = 2 + random() * 7
      const d = 1 + random() * 4
      const item: BoxGreeble = {
        p: [side * 222.2, y, z],
        s: [d, h, w],
      }
      if (random() > 0.5) dark.push(item)
      else light.push(item)
      if (i % 7 === 0) lights.push({ p: [side * 224, y + 2, z], s: [0.9, 0.9, 3.2] })
    }

    // front / rear equipment
    for (let i = 0; i < 28; i++) {
      const side = random() > 0.5 ? 1 : -1
      const x = -180 + random() * 360
      const y = -56 + random() * 118
      const item: BoxGreeble = {
        p: [x, y, side * 152.3],
        s: [3 + random() * 12, 2 + random() * 6, 1 + random() * 3],
      }
      if (random() > 0.5) dark.push(item)
      else light.push(item)
    }

    // vertical pipe runs
    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? 1 : -1
      pipes.push({
        p: [side * 226, -45 + random() * 95, -100 + i * 18],
        s: [1.4, 18 + random() * 42, 1.4],
      })
    }

    return { dark, light, pipes, lights }
  }, [])

  return (
    <group>
      <GreebleBoxes items={dark} material={darkMaterial} />
      <GreebleBoxes items={light} material={steelMaterial} />
      <GreebleBoxes items={pipes} material={steelMaterial} />
      <GreebleBoxes items={lights} material={orangeEmissive} />
    </group>
  )
}

const containerBlue = new THREE.MeshStandardMaterial({ color: '#2f5c78', roughness: 0.65, metalness: 0.35 })
const containerOrange = new THREE.MeshStandardMaterial({ color: '#9c5a2e', roughness: 0.7, metalness: 0.3 })
const containerGray = new THREE.MeshStandardMaterial({ color: '#59636b', roughness: 0.72, metalness: 0.3 })

export function HarborGreebles() {
  const { blue, orange, gray, tanks } = useMemo(() => {
    const random = seedRandom(88)
    const blue: BoxGreeble[] = []
    const orange: BoxGreeble[] = []
    const gray: BoxGreeble[] = []
    const tanks: BoxGreeble[] = []
    const angles = [14, 34, 54, 74, 94, 114, 134, 154, 174, 194, 214, 234, 254, 274, 294, 314, 334, 354]

    angles.forEach((degrees, index) => {
      const rad = (degrees * Math.PI) / 180
      const baseRadius = 120 + (index % 3) * 6
      for (let stack = 0; stack < 2; stack++) {
        const r = baseRadius
        const item: BoxGreeble = {
          p: [Math.cos(rad) * r, 4 + stack * 4.2, Math.sin(rad) * r],
          s: [9, 4, 4.2],
          r: [0, -rad + Math.PI / 2, 0],
        }
        const n = random()
        if (n < 0.34) blue.push(item)
        else if (n < 0.68) orange.push(item)
        else gray.push(item)
      }
    })

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4
      tanks.push({
        p: [Math.cos(a) * 126, 8, Math.sin(a) * 126],
        s: [7, 16, 7],
        r: [0, -a, 0],
      })
    }

    return { blue, orange, gray, tanks }
  }, [])

  return (
    <group>
      <GreebleBoxes items={blue} material={containerBlue} />
      <GreebleBoxes items={orange} material={containerOrange} />
      <GreebleBoxes items={gray} material={containerGray} />
      <GreebleBoxes items={tanks} material={steelMaterial} />
    </group>
  )
}

export function StationGreebles() {
  const { dark, light, lights } = useMemo(() => {
    const random = seedRandom(404)
    const dark: BoxGreeble[] = []
    const light: BoxGreeble[] = []
    const lights: BoxGreeble[] = []
    for (let i = 0; i < 42; i++) {
      const a = random() * Math.PI * 2
      const radius = 1340 + random() * 180
      const y = -60 + random() * 120
      const item: BoxGreeble = {
        p: [Math.cos(a) * radius, y, Math.sin(a) * radius],
        s: [6 + random() * 22, 4 + random() * 18, 4 + random() * 16],
        r: [0, -a, 0],
      }
      if (random() > 0.5) dark.push(item)
      else light.push(item)
      if (i % 6 === 0) lights.push({ p: [Math.cos(a) * (radius + 8), y + 8, Math.sin(a) * (radius + 8)], s: [2.5, 2.5, 2.5] })
    }
    return { dark, light, lights }
  }, [])

  return (
    <group>
      <GreebleBoxes items={dark} material={darkMaterial} />
      <GreebleBoxes items={light} material={steelMaterial} />
      <GreebleBoxes items={lights} material={orangeEmissive} />
    </group>
  )
}
