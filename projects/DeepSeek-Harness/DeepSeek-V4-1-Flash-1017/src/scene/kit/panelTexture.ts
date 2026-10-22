import * as THREE from 'three'

export type PanelTone = 'white' | 'dark' | 'steel' | 'floor' | 'station'

const TONES: Record<PanelTone, { base: string; line: string; stain: string; accent: string }> = {
  white: { base: '#c7d0d9', line: '#6f7c87', stain: 'rgba(40,48,56,0.22)', accent: '#b88742' },
  dark: { base: '#4a555f', line: '#1d252c', stain: 'rgba(10,14,18,0.32)', accent: '#c58a45' },
  steel: { base: '#8b96a1', line: '#4a5661', stain: 'rgba(30,38,45,0.25)', accent: '#c58a45' },
  floor: { base: '#414b54', line: '#20282e', stain: 'rgba(8,12,16,0.38)', accent: '#a87a3e' },
  station: { base: '#b3bdc7', line: '#65727e', stain: 'rgba(30,40,48,0.22)', accent: '#c58a45' },
}

const textureCache = new Map<PanelTone, THREE.CanvasTexture>()
const normalCache = new Map<PanelTone, THREE.CanvasTexture>()
const roughnessCache = new Map<PanelTone, THREE.CanvasTexture>()
const materialCache = new Map<string, THREE.MeshStandardMaterial>()

function rand(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function createPanelTexture(tone: PanelTone): THREE.CanvasTexture {
  const config = TONES[tone]
  const size = 768
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const random = rand(tone.length * 991 + 17)

  ctx.fillStyle = config.base
  ctx.fillRect(0, 0, size, size)

  // subtle directional weathering
  const wash = ctx.createLinearGradient(0, 0, 0, size)
  wash.addColorStop(0, 'rgba(255,255,255,0.06)')
  wash.addColorStop(0.55, 'rgba(255,255,255,0)')
  wash.addColorStop(1, 'rgba(0,0,0,0.12)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, size, size)

  const cols = 6
  const rows = 10
  const cw = size / cols
  const ch = size / rows

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + (random() - 0.5) * 2
      const y = row * ch + (random() - 0.5) * 2
      const inset = 1.5
      if (random() > 0.72) {
        ctx.fillStyle = `rgba(255,255,255,${0.025 + random() * 0.04})`
        ctx.fillRect(x + inset, y + inset, cw - inset * 2, ch - inset * 2)
      }
      if (random() > 0.84) {
        ctx.strokeStyle = config.line
        ctx.lineWidth = 0.7
        ctx.strokeRect(x + 7, y + 7, cw - 14, ch - 14)
      }
      // rivets
      ctx.fillStyle = config.line
      const rivet = 1.35
      const corners = [
        [x + 5, y + 5],
        [x + cw - 7, y + 5],
        [x + 5, y + ch - 7],
        [x + cw - 7, y + ch - 7],
      ]
      for (const [rx, ry] of corners) {
        if (random() > 0.4) {
          ctx.beginPath()
          ctx.arc(rx, ry, rivet, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  // panel seams
  ctx.strokeStyle = config.line
  ctx.lineWidth = 1.8
  for (let col = 0; col <= cols; col++) {
    ctx.beginPath()
    ctx.moveTo(col * cw, 0)
    ctx.lineTo(col * cw, size)
    ctx.stroke()
  }
  for (let row = 0; row <= rows; row++) {
    ctx.beginPath()
    ctx.moveTo(0, row * ch)
    ctx.lineTo(size, row * ch)
    ctx.stroke()
  }

  // vents
  for (let i = 0; i < 4; i++) {
    const x = 28 + random() * (size - 120)
    const y = 24 + random() * (size - 100)
    const w = 34 + random() * 44
    const h = 10 + random() * 14
    ctx.fillStyle = 'rgba(18,24,30,0.5)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = config.line
    ctx.lineWidth = 0.7
    for (let k = 3; k < h; k += 4) {
      ctx.beginPath()
      ctx.moveTo(x + 4, y + k)
      ctx.lineTo(x + w - 4, y + k)
      ctx.stroke()
    }
  }

  // hazard stripe patch
  if (tone === 'white' || tone === 'dark') {
    const x = 360 + random() * 40
    const y = 430
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, 96, 18)
    ctx.clip()
    ctx.fillStyle = config.accent
    ctx.fillRect(x, y, 96, 18)
    ctx.fillStyle = 'rgba(16,20,24,0.85)'
    for (let k = -30; k < 130; k += 18) {
      ctx.save()
      ctx.translate(x + k, y)
      ctx.rotate(-0.65)
      ctx.fillRect(0, -10, 8, 40)
      ctx.restore()
    }
    ctx.restore()
  }

  // grime streaks
  for (let i = 0; i < 14; i++) {
    const x = random() * size
    const y = random() * size * 0.7
    const h = 12 + random() * 80
    const gradient = ctx.createLinearGradient(0, y, 0, y + h)
    gradient.addColorStop(0, config.stain)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, 1 + random() * 3, h)
  }

  // scratches and chipped paint
  ctx.save()
  for (let i = 0; i < 22; i++) {
    const x = random() * size
    const y = random() * size
    const len = 8 + random() * 54
    ctx.strokeStyle = random() > 0.5 ? 'rgba(235,241,247,0.16)' : 'rgba(20,28,36,0.2)'
    ctx.lineWidth = 0.6 + random() * 0.9
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len * (0.5 + random()), y + (random() - 0.5) * 8)
    ctx.stroke()
  }
  for (let i = 0; i < 10; i++) {
    const x = random() * size
    const y = random() * size
    ctx.fillStyle = `rgba(28,34,40,${0.08 + random() * 0.12})`
    ctx.beginPath()
    ctx.ellipse(x, y, 2 + random() * 9, 1 + random() * 4, random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // rust streaks
  for (let i = 0; i < 5; i++) {
    const x = random() * size
    const y = random() * size * 0.65
    const h = 20 + random() * 70
    const rust = ctx.createLinearGradient(0, y, 0, y + h)
    rust.addColorStop(0, 'rgba(126,72,38,0.2)')
    rust.addColorStop(1, 'rgba(126,72,38,0)')
    ctx.fillStyle = rust
    ctx.fillRect(x, y, 2 + random() * 3, h)
  }

  // paint chips around panel edges
  for (let i = 0; i < 26; i++) {
    const x = random() * size
    const y = random() * size
    const r = 1.5 + random() * 7
    ctx.fillStyle = random() > 0.5 ? 'rgba(225,232,238,0.25)' : 'rgba(24,31,38,0.35)'
    ctx.beginPath()
    ctx.moveTo(x - r, y)
    ctx.lineTo(x - r * 0.2, y - r * 0.8)
    ctx.lineTo(x + r * 0.8, y - r * 0.2)
    ctx.lineTo(x + r * 0.4, y + r * 0.7)
    ctx.lineTo(x - r * 0.5, y + r * 0.5)
    ctx.closePath()
    ctx.fill()
  }

  // oil stains and edge wear
  for (let i = 0; i < 7; i++) {
    const x = random() * size
    const y = random() * size
    const r = 12 + random() * 34
    const oil = ctx.createRadialGradient(x, y, 0, x, y, r)
    oil.addColorStop(0, 'rgba(18,24,30,0.16)')
    oil.addColorStop(1, 'rgba(18,24,30,0)')
    ctx.fillStyle = oil
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.save()
  ctx.globalAlpha = 0.22
  for (let col = 0; col <= cols; col++) {
    for (let i = 0; i < 8; i++) {
      const y = random() * size
      ctx.fillStyle = 'rgba(235,241,247,0.8)'
      ctx.fillRect(col * cw - 0.6, y, 1.2, 4 + random() * 18)
    }
  }
  ctx.restore()

  // tiny stencil labels
  ctx.fillStyle = 'rgba(20,28,34,0.55)'
  ctx.font = '8px monospace'
  ctx.fillText(`UEG-${tone.toUpperCase()} / ${Math.floor(random() * 90 + 10)}`, 18, size - 14)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

export function getPanelTexture(tone: PanelTone) {
  const cached = textureCache.get(tone)
  if (cached) return cached
  const texture = createPanelTexture(tone)
  textureCache.set(tone, texture)
  return texture
}

function createNormalTexture(tone: PanelTone): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const random = rand(tone.length * 733 + 71)

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  const cols = 6
  const rows = 10
  const cw = size / cols
  const ch = size / rows

  // recessed panel seams
  ctx.strokeStyle = '#4b4b4b'
  ctx.lineWidth = 2.2
  for (let col = 0; col <= cols; col++) {
    ctx.beginPath()
    ctx.moveTo(col * cw, 0)
    ctx.lineTo(col * cw, size)
    ctx.stroke()
  }
  for (let row = 0; row <= rows; row++) {
    ctx.beginPath()
    ctx.moveTo(0, row * ch)
    ctx.lineTo(size, row * ch)
    ctx.stroke()
  }

  // raised rivets and vent recesses
  for (let i = 0; i < 80; i++) {
    const x = random() * size
    const y = random() * size
    ctx.fillStyle = random() > 0.5 ? '#a8a8a8' : '#626262'
    ctx.beginPath()
    ctx.arc(x, y, 1.4 + random() * 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 5; i++) {
    const x = 20 + random() * (size - 100)
    const y = 20 + random() * (size - 80)
    ctx.fillStyle = '#565656'
    ctx.fillRect(x, y, 30 + random() * 40, 8 + random() * 10)
  }

  const source = ctx.getImageData(0, 0, size, size)
  const height = new Float32Array(size * size)
  for (let i = 0; i < source.data.length; i += 4) {
    height[i / 4] = source.data[i] / 255
  }
  const out = ctx.createImageData(size, size)
  const strength = 2.4
  const get = (x: number, y: number) => {
    const xx = (x + size) % size
    const yy = (y + size) % size
    return height[yy * size + xx]
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = get(x + 1, y) - get(x - 1, y)
      const dy = get(x, y + 1) - get(x, y - 1)
      let nx = -dx * strength
      let ny = -dy * strength
      let nz = 1
      const len = Math.hypot(nx, ny, nz)
      nx /= len
      ny /= len
      nz /= len
      const idx = (y * size + x) * 4
      out.data[idx] = Math.round((nx * 0.5 + 0.5) * 255)
      out.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      out.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255)
      out.data[idx + 3] = 255
    }
  }
  ctx.putImageData(out, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function createRoughnessTexture(tone: PanelTone): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const random = rand(tone.length * 613 + 29)
  const base = tone === 'white' || tone === 'station' ? 188 : tone === 'steel' ? 148 : 162
  ctx.fillStyle = `rgb(${base},${base},${base})`
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(base + (random() - 0.5) * 42)
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`
    ctx.fillRect(random() * size, random() * size, 1 + random() * 3, 1 + random() * 3)
  }
  for (let i = 0; i < 22; i++) {
    const x = random() * size
    const y = random() * size
    const h = 20 + random() * 90
    const grad = ctx.createLinearGradient(0, y, 0, y + h)
    grad.addColorStop(0, 'rgba(80,80,80,0.28)')
    grad.addColorStop(1, 'rgba(80,80,80,0)')
    ctx.fillStyle = grad
    ctx.fillRect(x, y, 2 + random() * 4, h)
  }
  for (let i = 0; i < 18; i++) {
    const x = random() * size
    const y = random() * size
    ctx.strokeStyle = random() > 0.5 ? 'rgba(250,250,250,0.28)' : 'rgba(60,60,60,0.3)'
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 8 + random() * 40, y + (random() - 0.5) * 5)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function getRoughnessTexture(tone: PanelTone) {
  const cached = roughnessCache.get(tone)
  if (cached) return cached
  const texture = createRoughnessTexture(tone)
  roughnessCache.set(tone, texture)
  return texture
}

function getNormalTexture(tone: PanelTone) {
  const cached = normalCache.get(tone)
  if (cached) return cached
  const texture = createNormalTexture(tone)
  normalCache.set(tone, texture)
  return texture
}

export type PanelMaterialOptions = {
  repeatX?: number
  repeatY?: number
  metalness?: number
  roughness?: number
  bumpScale?: number
}

export function getPanelMaterial(
  tone: PanelTone,
  { repeatX = 3, repeatY = 5, metalness = 0.32, roughness = 0.58, bumpScale = 0.18 }: PanelMaterialOptions = {},
) {
  const key = `${tone}-${repeatX}-${repeatY}-${metalness}-${roughness}-${bumpScale}`
  const cached = materialCache.get(key)
  if (cached) return cached

  const map = getPanelTexture(tone).clone()
  map.needsUpdate = true
  map.repeat.set(repeatX, repeatY)

  const normalMap = getNormalTexture(tone).clone()
  normalMap.needsUpdate = true
  normalMap.repeat.set(repeatX, repeatY)

  const roughnessMap = getRoughnessTexture(tone).clone()
  roughnessMap.needsUpdate = true
  roughnessMap.repeat.set(repeatX, repeatY)

  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(bumpScale * 3.2, bumpScale * 3.2),
    roughnessMap,
    roughness: 1.0,
    metalness,
    color: '#ffffff',
  })
  materialCache.set(key, material)
  return material
}
