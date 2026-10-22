import * as THREE from 'three'

const cache = new Map<string, THREE.MeshStandardMaterial>()

function rand(seed: number) {
  let v = seed
  return () => {
    v = (v * 1664525 + 1013904223) % 4294967296
    return v / 4294967296
  }
}

function normalFromHeight(height: Float32Array, size: number, strength: number) {
  const out = new Uint8ClampedArray(size * size * 4)
  const get = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = get(x + 1, y) - get(x - 1, y)
      const dy = get(x, y + 1) - get(x, y - 1)
      let nx = -dx * strength
      let ny = -dy * strength
      let nz = 1
      const l = Math.hypot(nx, ny, nz)
      nx /= l; ny /= l; nz /= l
      const i = (y * size + x) * 4
      out[i] = (nx * 0.5 + 0.5) * 255
      out[i + 1] = (ny * 0.5 + 0.5) * 255
      out[i + 2] = (nz * 0.5 + 0.5) * 255
      out[i + 3] = 255
    }
  }
  return out
}

function makeDeckMaps() {
  const size = 1024
  const color = document.createElement('canvas')
  color.width = color.height = size
  const ctx = color.getContext('2d')!
  const random = rand(9182)
  ctx.fillStyle = '#343d40'
  ctx.fillRect(0, 0, size, size)
  // subtle plate variation
  for (let i = 0; i < 130; i++) {
    const x = random() * size, y = random() * size
    const w = 30 + random() * 180, h = 20 + random() * 120
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.045)'
    ctx.fillRect(x, y, w, h)
  }
  // plate seams
  ctx.strokeStyle = 'rgba(10,15,18,0.75)'
  ctx.lineWidth = 3
  for (let x = 0; x <= size; x += 128) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke()
  }
  for (let y = 0; y <= size; y += 128) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
  }
  // rivets
  for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 8; gy++) {
    for (const [ox, oy] of [[12, 12], [116, 12], [12, 116], [116, 116]]) {
      const x = gx * 128 + ox, y = gy * 128 + oy
      ctx.fillStyle = 'rgba(15,20,23,0.8)'
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(230,235,235,0.16)'
      ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.2, 0, Math.PI * 2); ctx.fill()
    }
  }
  // hazard / lane markings
  ctx.fillStyle = 'rgba(205,168,80,0.85)'
  for (let x = 24; x < size; x += 128) ctx.fillRect(x, 482, 62, 8)
  ctx.fillStyle = 'rgba(220,226,226,0.6)'
  ctx.fillRect(0, 510, size, 3)
  ctx.fillRect(0, 462, size, 3)
  // grime and oil
  for (let i = 0; i < 42; i++) {
    const x = random() * size, y = random() * size
    const w = 20 + random() * 160, h = 10 + random() * 80
    const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) / 2)
    grad.addColorStop(0, 'rgba(8,12,15,0.16)')
    grad.addColorStop(1, 'rgba(8,12,15,0)')
    ctx.fillStyle = grad
    ctx.fillRect(x - w / 2, y - h / 2, w, h)
  }
  // vents
  for (let i = 0; i < 12; i++) {
    const x = 20 + random() * (size - 180), y = 20 + random() * (size - 80)
    const w = 80 + random() * 100, h = 22
    ctx.fillStyle = 'rgba(8,13,16,0.8)'
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(140,152,156,0.28)'
    for (let vx = x + 5; vx < x + w - 5; vx += 7) ctx.fillRect(vx, y + 3, 3, h - 6)
  }
  // scratches
  for (let i = 0; i < 42; i++) {
    const x = random() * size, y = random() * size
    ctx.strokeStyle = random() > 0.5 ? 'rgba(225,231,231,0.16)' : 'rgba(5,10,12,0.3)'
    ctx.lineWidth = 0.7 + random()
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + random() * 70, y + (random() - 0.5) * 10); ctx.stroke()
  }
  const height = document.createElement('canvas')
  height.width = height.height = 512
  const hctx = height.getContext('2d')!
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, 512, 512)
  hctx.strokeStyle = '#3c3c3c'; hctx.lineWidth = 2
  for (let x = 0; x <= 512; x += 64) { hctx.beginPath(); hctx.moveTo(x, 0); hctx.lineTo(x, 512); hctx.stroke() }
  for (let y = 0; y <= 512; y += 64) { hctx.beginPath(); hctx.moveTo(0, y); hctx.lineTo(512, y); hctx.stroke() }
  for (let i = 0; i < 250; i++) {
    const x = random() * 512, y = random() * 512
    hctx.fillStyle = 'rgba(190,190,190,0.8)'; hctx.beginPath(); hctx.arc(x, y, 1.3, 0, Math.PI * 2); hctx.fill()
  }
  const hdata = hctx.getImageData(0, 0, 512, 512)
  const harr = new Float32Array(512 * 512)
  for (let i = 0; i < harr.length; i++) harr[i] = hdata.data[i * 4] / 255
  const ncanvas = document.createElement('canvas'); ncanvas.width = ncanvas.height = 512
  ncanvas.getContext('2d')!.putImageData(new ImageData(normalFromHeight(harr, 512, 2.2), 512, 512), 0, 0)
  const roughness = document.createElement('canvas'); roughness.width = roughness.height = 512
  const rctx = roughness.getContext('2d')!
  rctx.fillStyle = '#a6a6a6'; rctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 500; i++) {
    const v = 150 + Math.floor(random() * 70)
    rctx.fillStyle = `rgba(${v},${v},${v},0.25)`
    rctx.fillRect(random() * 512, random() * 512, 2, 2)
  }
  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8
  const normal = new THREE.CanvasTexture(ncanvas)
  normal.colorSpace = THREE.NoColorSpace; normal.anisotropy = 8
  const rough = new THREE.CanvasTexture(roughness)
  rough.colorSpace = THREE.NoColorSpace; rough.anisotropy = 8
  for (const t of [map, normal, rough]) {
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping
    t.needsUpdate = true
  }
  return { map, normal, rough }
}

export function getDeckMaterial(repeatX = 6, repeatY = 1) {
  const key = `${repeatX}-${repeatY}`
  const hit = cache.get(key)
  if (hit) return hit
  const maps = makeDeckMaps()
  const map = maps.map.clone(); map.repeat.set(repeatX, repeatY); map.needsUpdate = true
  const normalMap = maps.normal.clone(); normalMap.repeat.set(repeatX, repeatY); normalMap.needsUpdate = true
  const roughnessMap = maps.rough.clone(); roughnessMap.repeat.set(repeatX, repeatY); roughnessMap.needsUpdate = true
  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    roughness: 1,
    metalness: 0.42,
    color: '#ffffff',
  })
  cache.set(key, material)
  return material
}
