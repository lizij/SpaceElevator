import * as THREE from 'three'

export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

let glowTexture: THREE.Texture | undefined

export function getGlowTexture() {
  if (glowTexture) return glowTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.12, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.35, 'rgba(255,230,190,0.34)')
  gradient.addColorStop(1, 'rgba(255,210,150,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  glowTexture = new THREE.CanvasTexture(canvas)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  return glowTexture
}

export type TextTextureOptions = {
  width?: number
  height?: number
  color?: string
  background?: string
  border?: string
  fontSize?: number
  align?: CanvasTextAlign
  lineHeight?: number
}

export function makeTextTexture(
  lines: string[],
  {
    width = 1024,
    height = 512,
    color = '#e8f1ff',
    background = 'rgba(5,10,16,0.9)',
    border = 'rgba(240,163,74,0.65)',
    fontSize = 64,
    align = 'left',
    lineHeight = 1.25,
  }: TextTextureOptions = {},
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)
  if (border) {
    ctx.strokeStyle = border
    ctx.lineWidth = 4
    ctx.strokeRect(6, 6, width - 12, height - 12)
  }
  ctx.fillStyle = color
  ctx.font = `600 ${fontSize}px "PingFang SC", "Noto Sans SC", ui-sans-serif, sans-serif`
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  const x = align === 'center' ? width / 2 : 48
  lines.forEach((line, i) => {
    ctx.fillText(line, x, 46 + i * fontSize * lineHeight)
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export type DecalOptions = {
  width?: number
  height?: number
  color?: string
  fontSize?: number
  align?: CanvasTextAlign
  lineHeight?: number
}

export function makeDecalTexture(
  lines: string[],
  { width = 768, height = 320, color = '#162029', fontSize = 54, align = 'left', lineHeight = 1.15 }: DecalOptions = {},
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = color
  ctx.font = `700 ${fontSize}px "PingFang SC", "Noto Sans SC", ui-sans-serif, sans-serif`
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  const x = align === 'center' ? width / 2 : 18
  lines.forEach((line, i) => {
    ctx.fillText(line, x, 18 + i * fontSize * lineHeight)
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

let windowTexture: THREE.Texture | undefined

export function getWindowTexture() {
  if (windowTexture) return windowTexture
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const space = ctx.createLinearGradient(0, 0, 0, height)
  space.addColorStop(0, '#06101c')
  space.addColorStop(0.55, '#0b2237')
  space.addColorStop(1, '#2b6e9e')
  ctx.fillStyle = space
  ctx.fillRect(0, 0, width, height)
  // deterministic stars
  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  for (let i = 0; i < 180; i++) {
    const x = rand() * width
    const y = rand() * height * 0.75
    const r = rand() * 2.0 + 0.35
    ctx.fillStyle = `rgba(230,244,255,${0.55 + rand() * 0.45})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // earth limb
  const earth = ctx.createRadialGradient(width / 2, height + 70, 14, width / 2, height + 70, 300)
  earth.addColorStop(0, '#b9e5ff')
  earth.addColorStop(0.42, '#3a9ed8')
  earth.addColorStop(1, '#05121f')
  ctx.fillStyle = earth
  ctx.beginPath()
  ctx.arc(width / 2, height + 70, 300, 0, Math.PI * 2)
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  windowTexture = texture
  return texture
}
