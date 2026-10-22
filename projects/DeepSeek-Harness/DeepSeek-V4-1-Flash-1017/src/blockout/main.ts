import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { getPanelMaterial } from '../scene/kit/panelTexture'

const app = document.getElementById('app')!
const scene = new THREE.Scene()
scene.background = new THREE.Color('#91a5ae')
scene.fog = new THREE.Fog('#91a5ae', 460, 1500)
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 5000)
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
app.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.maxPolarAngle = Math.PI * 0.54
controls.minDistance = 40
controls.maxDistance = 1000

scene.add(new THREE.HemisphereLight('#c9dbe4', '#27323a', 1.5))
const sun = new THREE.DirectionalLight('#ffe4c2', 3.4)
sun.position.set(-180, 260, 160)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.bias = -0.0002
scene.add(sun)
scene.add(new THREE.DirectionalLight('#7ea6bd', 0.9).translateX(200).translateY(100).translateZ(-160))

const white = getPanelMaterial('white', { repeatX: 3, repeatY: 8, metalness: 0.18, roughness: 0.82, bumpScale: 0.28 })
const pale = getPanelMaterial('white', { repeatX: 2, repeatY: 6, metalness: 0.2, roughness: 0.85, bumpScale: 0.22 })
const dark = getPanelMaterial('dark', { repeatX: 3, repeatY: 6, metalness: 0.58, roughness: 0.62, bumpScale: 0.24 })
const steel = getPanelMaterial('steel', { repeatX: 3, repeatY: 6, metalness: 0.62, roughness: 0.55, bumpScale: 0.2 })
const black = new THREE.MeshStandardMaterial({ color: '#11191f', roughness: 0.72, metalness: 0.38 })
const gold = new THREE.MeshStandardMaterial({ color: '#9d8458', roughness: 0.38, metalness: 0.7 })
const warm = new THREE.MeshBasicMaterial({ color: '#ffc17a' })
const water = new THREE.MeshStandardMaterial({ color: '#3d5964', roughness: 0.3, metalness: 0.18 })
const ground = getPanelMaterial('floor', { repeatX: 7, repeatY: 2, metalness: 0.25, roughness: 0.78, bumpScale: 0.2 })

const add = (p: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry
  m.castShadow = true; m.receiveShadow = true; p.add(m); return m
}
const box = (p: THREE.Object3D, sx: number, sy: number, sz: number, x: number, y: number, z: number, mat: THREE.Material, ry = 0) =>
  add(p, new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, ry)
const cyl = (p: THREE.Object3D, rt: number, rb: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 12) =>
  add(p, new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z)
const beam = (p: THREE.Object3D, a: [number, number, number], b: [number, number, number], r: number, mat: THREE.Material) => {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start)
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 5), mat)
  m.position.copy(start.add(end).multiplyScalar(0.5))
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  m.castShadow = true; p.add(m); return m
}
const ring = (p: THREE.Object3D, r: number, t: number, y: number, mat: THREE.Material, seg = 96) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 5, seg), mat)
  m.rotation.x = Math.PI / 2; m.position.y = y; m.castShadow = true; p.add(m); return m
}

function loft(width: number, depth: number, levels: { y: number; scale: number }[], cut = 0.22) {
  const hw = width / 2, hd = depth / 2, c = Math.min(cut, hw * 0.2, hd * 0.2)
  const outline: [number, number][] = [
    [-hw + c, -hd], [hw - c, -hd], [hw, -hd + c], [hw, hd - c],
    [hw - c, hd], [-hw + c, hd], [-hw, hd - c], [-hw, -hd + c],
  ]
  const pos: number[] = [], idx: number[] = [], uv: number[] = []
  levels.forEach((l) => outline.forEach(([x, z], i) => {
    pos.push(x * l.scale, l.y, z * l.scale); uv.push(i / outline.length, (l.y + 90) / 180)
  }))
  for (let j = 0; j < levels.length - 1; j++) for (let i = 0; i < outline.length; i++) {
    const a = j * 8 + i, b = j * 8 + (i + 1) % 8
    idx.push(a, a + 8, b, b, a + 8, b + 8)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx); g.computeVertexNormals(); return g
}

const base = new THREE.Group(), cabin = new THREE.Group()
scene.add(base, cabin)

// Harbor / sea
const sea = new THREE.Mesh(new THREE.CircleGeometry(620, 128), water)
sea.rotation.x = -Math.PI / 2; sea.position.y = -1.2; sea.receiveShadow = true; base.add(sea)
const deck = new THREE.Mesh(new THREE.RingGeometry(110, 150, 128), ground)
deck.rotation.x = -Math.PI / 2; deck.position.y = 0.4; deck.receiveShadow = true; base.add(deck)
ring(base, 150, 1.1, 1.1, pale); ring(base, 110, 1, 1.1, steel); ring(base, 149, 0.25, 4.2, warm)
for (let i = 0; i < 48; i++) {
  const a = (i / 48) * Math.PI * 2
  const g = new THREE.Group(); g.position.set(Math.cos(a) * 135, 2.4, Math.sin(a) * 135); g.rotation.y = -a; base.add(g)
  box(g, 4.2, 0.12, 0.5, 0, 0, 0, warm)
}
const island = new THREE.Mesh(new THREE.CircleGeometry(62, 96), ground)
island.rotation.x = -Math.PI / 2; island.position.y = 0.5; island.receiveShadow = true; base.add(island)
ring(base, 62, 1.3, 1.4, pale); ring(base, 48, 0.55, 2.2, warm)
for (let i = 0; i < 6; i++) {
  const a = i / 6 * Math.PI * 2, g = new THREE.Group()
  g.position.set(Math.cos(a) * 84, 1.2, Math.sin(a) * 84); g.rotation.y = -a; base.add(g)
  box(g, 48, 1.3, 9, 0, 0, 0, ground)
  box(g, 48, 0.16, 0.2, 0, 0.8, 4.2, warm); box(g, 48, 0.16, 0.2, 0, 0.8, -4.2, warm)
}
for (let i = 0; i < 24; i++) {
  const a = i / 24 * Math.PI * 2, r = 130 + (i % 3) * 4, g = new THREE.Group()
  g.position.set(Math.cos(a) * r, 3, Math.sin(a) * r); g.rotation.y = -a; base.add(g)
  box(g, 7, 5, 9, 0, 0, 0, i % 4 === 0 ? steel : ground)
  box(g, 5.6, 1.1, 8.4, 0, 3, 0, i % 5 === 0 ? gold : dark)
}
for (const a of [0.4, 2.2, 4.4]) {
  const g = new THREE.Group(); g.position.set(Math.cos(a) * 119, 0, Math.sin(a) * 119); base.add(g)
  cyl(g, 0.8, 1.2, 36, 0, 18, 0, steel, 6); box(g, 25, 1.1, 1.1, 10, 36, 0, gold); beam(g, [22, 36, 0], [22, 12, 0], 0.14, dark)
}

// Central shaft
cyl(base, 5.4, 6.6, 252, 0, 126, 0, dark, 20)
for (let i = 0; i < 8; i++) {
  const a = i / 8 * Math.PI * 2
  beam(base, [Math.cos(a) * 5.8, 3, Math.sin(a) * 5.8], [Math.cos(a) * 3.2, 250, Math.sin(a) * 3.2], 0.09, black)
}
for (const y of [42, 82, 124, 166, 208]) ring(base, 6.5, 0.35, y, steel, 24)

// Towers
for (const angle of [90, 210, 330]) {
  const a = angle * Math.PI / 180, g = new THREE.Group()
  g.position.set(Math.cos(a) * 45, 0, Math.sin(a) * 45); g.rotation.y = Math.PI / 2 - a; base.add(g)
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(8, 27, 30, 4, 1), pale)
  foot.position.y = 15; foot.rotation.y = Math.PI / 4; foot.castShadow = true; foot.receiveShadow = true; g.add(foot)
  const buttress = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 15.5, 26, 4, 1), white)
  buttress.position.y = 39; buttress.rotation.y = Math.PI / 4; buttress.castShadow = true; buttress.receiveShadow = true; g.add(buttress)
  for (const side of [-1, 1]) {
    box(g, 8, 30, 34, side * 14, 16, 0, white)
    box(g, 7, 1.4, 35, side * 14, 31, 0, steel)
    beam(g, [side * 22, 4, -12], [side * 9, 54, -6], 0.35, steel)
    beam(g, [side * 22, 4, 12], [side * 9, 54, 6], 0.35, steel)
  }
  add(g, loft(17, 17, [{ y: 24, scale: 1.0 }, { y: 58, scale: 0.97 }, { y: 150, scale: 0.92 }, { y: 200, scale: 0.86 }], 2.2), white)
  for (const face of [-1, 1]) {
    box(g, 5.4, 148, 1.2, 0, 108, face * 7.2, dark)
    box(g, 1.2, 148, 5.4, face * 7.2, 108, 0, dark)
  }
  for (const y of [34, 72, 112, 152, 184]) {
    box(g, 23, 1.1, 23, 0, y, 0, steel)
    for (const s of [-1, 1]) {
      box(g, 0.7, 2, 22, s * 11, y + 1.4, 0, pale)
      box(g, 22, 2, 0.7, 0, y + 1.4, s * 11, pale)
    }
  }
  for (const [x, z] of [[-7.4, -7.4], [7.4, -7.4], [-7.4, 7.4], [7.4, 7.4]]) beam(g, [x, 26, z], [x * 0.88, 198, z * 0.88], 0.3, steel)
  for (const face of [-1, 1]) {
    box(g, 1.0, 150, 1.0, face * 8.3, 110, 5.2, pale)
    box(g, 1.0, 150, 1.0, face * 8.3, 110, -5.2, pale)
    box(g, 5.0, 1.0, 1.0, 0, 46, face * 8.3, pale)
  }
  for (const s of [-1, 1]) {
    cyl(g, 0.32, 0.32, 160, s * 8.3, 110, 3.6, gold, 6)
    cyl(g, 0.42, 0.42, 160, s * 8.3, 110, -3.6, steel, 6)
  }
  box(g, 24, 4, 24, 0, 204, 0, dark); box(g, 20, 7, 20, 0, 210, 0, pale)
  box(g, 17, 3, 17, 0, 215, 0, steel); cyl(g, 1.5, 2.1, 12, 0, 223, 0, steel, 8)
  box(g, 3, 3, 3, 0, 231, 0, gold)
  box(g, 42, 1.4, 1.8, 18, 207, 0, steel); beam(g, [38, 206, 0], [38, 188, 0], 0.12, dark)
  for (const z of [-13, 13]) { box(g, 3.3, 2.2, 24, 0, 62, z, pale); box(g, 3.3, 2.2, 24, 0, 124, z, pale) }
}

// Open mid ring
const ringY = 72
for (const y of [ringY - 12, ringY + 12]) ring(base, 51, 0.9, y, pale)
for (let i = 0; i < 24; i++) {
  const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2
  const p = (ang: number, y: number): [number, number, number] => [Math.cos(ang) * 51, y, Math.sin(ang) * 51]
  beam(base, p(a, ringY - 12), p(a, ringY + 12), 0.28, steel)
  beam(base, p(a, ringY - 12), p(b, ringY + 12), 0.18, dark)
  beam(base, p(a, ringY + 12), p(b, ringY - 12), 0.18, dark)
  if (i % 2 === 0) {
    const g = new THREE.Group(); g.position.set(Math.cos(a) * 51, ringY + 14, Math.sin(a) * 51); g.rotation.y = -a; base.add(g)
    box(g, 6, 4.5, 5, 0, 0, 0, dark); box(g, 3.4, 0.2, 0.5, 0, 2.3, 0, warm)
  }
}
for (let i = 0; i < 6; i++) {
  const a = i / 6 * Math.PI * 2
  beam(base, [Math.cos(a) * 51, ringY - 12, Math.sin(a) * 51], [Math.cos(a) * 62, 3, Math.sin(a) * 62], 0.22, steel)
}

// Launchers
for (let group = 0; group < 3; group++) {
  const center = group / 3 * Math.PI * 2 + Math.PI / 6
  for (let k = 0; k < 4; k++) {
    const a = center + (k - 1.5) * 0.17, r = 24 + (k % 2) * 5
    const g = new THREE.Group(); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.rotation.y = -a; base.add(g)
    box(g, 12, 1.2, 9, 0, 2, 0, dark); box(g, 4, 1, 10, 0, 2.4, 0, gold)
    for (const side of [-1, 1]) {
      const cx = side * 3.6
      for (const dx of [-1.2, 1.2]) beam(g, [cx + dx, 5, -1.8], [cx + dx, 150, -1.8], 0.22, dark)
      for (let y = 8; y < 150; y += 12) {
        beam(g, [cx - 1.2, y, -1.8], [cx + 1.2, y + 12, -1.8], 0.14, steel)
        beam(g, [cx + 1.2, y, -1.8], [cx - 1.2, y + 12, -1.8], 0.14, steel)
        box(g, 3.3, 0.18, 3.8, cx, y, 0, steel)
      }
    }
    box(g, 12, 2, 5, 0, 151, 0, dark)
  }
}
for (const angle of [90, 210, 330]) {
  const a = angle * Math.PI / 180
  for (const off of [-0.22, -0.1, 0.1, 0.22]) beam(base, [Math.cos(a) * 45, 198, Math.sin(a) * 45], [Math.cos(a + off) * 150, 2, Math.sin(a + off) * 150], 0.12, black)
}

// Cabin
add(cabin, loft(44, 30, [{ y: -7.5, scale: 0.8 }, { y: -6, scale: 1 }, { y: 4, scale: 1 }, { y: 7, scale: 0.86 }, { y: 7.6, scale: 0.78 }], 3.2), white)
box(cabin, 39, 0.7, 25, 0, 7.8, 0, black); box(cabin, 34, 0.2, 21, 0, 8.15, 0, steel)
box(cabin, 41, 1.2, 27, 0, -7.3, 0, dark)
for (const z of [-1, 1]) {
  box(cabin, 30, 0.7, 0.16, 0, 1.2, z * 15.1, dark)
  for (const x of [-10, 0, 10]) box(cabin, 7.5, 0.5, 0.12, x, 1.5, z * 15.25, steel)
  box(cabin, 28, 0.12, 0.12, 0, -4.4, z * 15, gold)
  box(cabin, 32, 0.8, 0.2, 0, 6.5, z * 15, black)
}
ring(cabin, 5.8, 0.45, 8.5, steel, 32)
box(cabin, 2.2, 10, 2.2, 15, 13, -7, steel); box(cabin, 13, 1, 1.2, 19, 17, -7, gold)
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const g = new THREE.Group(); g.position.set(sx * 24, 0, sz * 15.4); g.rotation.y = sx * sz > 0 ? Math.PI / 4 : -Math.PI / 4; cabin.add(g)
  box(g, 6.4, 9.5, 6.4, 0, 0, 0, pale); box(g, 6.8, 1.3, 6.8, 0, -5.4, 0, dark); box(g, 6.8, 1.3, 6.8, 0, 5.4, 0, dark)
  for (const y of [-3.8, 3.8]) {
    box(g, 10.5, 0.9, 1.6, -6.5, y, 0, steel)
    box(g, 1.1, 0.9, 5.2, -1.2, y, -2.8, steel)
  }
  cyl(g, 0.5, 0.5, 11, 0, 0, 0, gold, 8)
  for (const y of [-2.8, 0, 2.8]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.3, 6, 18), dark); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t)
  }
  cyl(g, 0.6, 0.6, 190, 0, 0, 0, black, 8)
}
for (let i = 0; i < 4; i++) {
  const a = i / 4 * Math.PI * 2 + Math.PI / 4, pivot = new THREE.Group()
  pivot.position.set(Math.cos(a) * 7, -9.2, Math.sin(a) * 7); pivot.rotation.y = -a; cabin.add(pivot)
  const wing = new THREE.Group(); wing.rotation.x = -0.22; pivot.add(wing)
  const shape = new THREE.Shape()
  shape.moveTo(-2.6, 0); shape.lineTo(2.6, 0); shape.lineTo(11.5, 12.5); shape.lineTo(6.5, 15.0)
  shape.lineTo(-6.5, 15.0); shape.lineTo(-11.5, 12.5); shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false }); geo.rotateX(-Math.PI / 2)
  add(wing, geo, dark)
  for (const x of [-4.8, 4.8]) beam(wing, [x, 0.3, 2], [x * 1.25, 0.3, 11.5], 0.15, steel)
  for (let j = 0; j < 3; j++) box(wing, 12 - j * 1.8, 0.2, 0.25, 0, 0.4, 4 + j * 2.5, steel)
}
cyl(cabin, 3.2, 4, 3, 0, -10, 0, dark, 16)

function setView(view: 'base' | 'cabin') {
  base.visible = view === 'base'; cabin.visible = view === 'cabin'
  if (view === 'base') {
    camera.position.set(60, 100, 380); controls.target.set(0, 92, 0); camera.fov = 45
    scene.fog = new THREE.Fog('#91a5ae', 460, 1500)
    sun.shadow.camera.left = -220; sun.shadow.camera.right = 220; sun.shadow.camera.top = 240; sun.shadow.camera.bottom = -80
  } else {
    camera.position.set(90, 42, 122); controls.target.set(0, -2, 0); camera.fov = 40
    scene.fog = new THREE.Fog('#91a5ae', 220, 600)
    sun.shadow.camera.left = -55; sun.shadow.camera.right = 55; sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55
  }
  camera.updateProjectionMatrix(); sun.shadow.camera.updateProjectionMatrix(); controls.update()
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('is-active', (b as HTMLElement).dataset.view === view))
}
setView('base')
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => setView((b as HTMLElement).dataset.view as 'base' | 'cabin')))
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera) })
