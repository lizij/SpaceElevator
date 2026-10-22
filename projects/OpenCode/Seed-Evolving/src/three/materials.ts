import * as THREE from 'three'

/** 通用金属/涂装材质 + 程序化纹理（无外部资产） */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function toTexture(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 8
  return t
}

/** 金属蒙皮：底色 + 板缝 + 铆钉 + 随机旧化污渍 */
function metalPanelTexture(base: string, seam: string, repeat = 1): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 512, 512)
  // 旧化污渍
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = 6 + Math.random() * 40
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const dark = Math.random() > 0.5
    g.addColorStop(0, dark ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.05)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // 板缝线
  ctx.strokeStyle = seam
  ctx.lineWidth = 2
  for (let p = 0; p <= 512; p += 64) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke()
  }
  // 铆钉
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  for (let x = 16; x < 512; x += 32) {
    for (let y = 16; y < 512; y += 32) {
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill()
    }
  }
  return toTexture(c, repeat)
}

/** 橙黑斜纹危险涂装 */
function hazardTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 256)
  ctx.fillStyle = '#d0631e'
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = '#1c1410'
  for (let i = -256; i < 512; i += 56) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 28, 0)
    ctx.lineTo(i + 28 + 256, 256)
    ctx.lineTo(i + 256, 256)
    ctx.closePath()
    ctx.fill()
  }
  return toTexture(c, 1)
}

/** 太阳能电池板：深蓝底 + 栅线 + 高光 */
function solarTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512)
  const grad = ctx.createLinearGradient(0, 0, 512, 512)
  grad.addColorStop(0, '#0c2140')
  grad.addColorStop(0.5, '#123a6b')
  grad.addColorStop(1, '#0a1c38')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = 'rgba(150,200,255,0.5)'
  ctx.lineWidth = 2
  for (let p = 0; p <= 512; p += 64) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(180,220,255,0.18)'
  ctx.lineWidth = 1
  for (let p = 32; p <= 512; p += 32) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke()
  }
  return toTexture(c, 1)
}

/** 发射甲板顶面：同心圆跑道 + 辐射缝 */
function deckTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 1024)
  const cx = 512
  ctx.fillStyle = '#2b313a'
  ctx.fillRect(0, 0, 1024, 1024)
  // 径向渐变磨损
  const g = ctx.createRadialGradient(cx, cx, 40, cx, cx, 512)
  g.addColorStop(0, 'rgba(255,255,255,0.10)')
  g.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1024, 1024)
  // 同心圆跑道
  ctx.strokeStyle = 'rgba(160,175,190,0.55)'
  for (let r = 64; r < 512; r += 46) {
    ctx.lineWidth = r % 138 === 64 ? 3 : 1.5
    ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke()
  }
  // 辐射板缝
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 2
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
    ctx.beginPath(); ctx.moveTo(cx, cx); ctx.lineTo(cx + Math.cos(a) * 512, cx + Math.sin(a) * 512); ctx.stroke()
  }
  // 污渍
  for (let i = 0; i < 180; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * 500
    const x = cx + Math.cos(a) * r
    const y = cx + Math.sin(a) * r
    const rr = 4 + Math.random() * 26
    const gg = ctx.createRadialGradient(x, y, 0, x, y, rr)
    gg.addColorStop(0, 'rgba(0,0,0,0.12)')
    gg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gg
    ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill()
  }
  return toTexture(c, 1)
}

/** 高塔蒙皮：竖向分块板缝 + 水平分段 + 轻微污渍（贴合三主塔的浅色蒙皮） */
function towerPanelTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 1024)
  ctx.fillStyle = '#c9d0d8'
  ctx.fillRect(0, 0, 256, 1024)
  // 垂直蒙皮板缝
  ctx.strokeStyle = 'rgba(40,48,58,0.55)'
  ctx.lineWidth = 3
  for (let p = 0; p <= 256; p += 42) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 1024); ctx.stroke()
  }
  // 水平分段
  ctx.strokeStyle = 'rgba(40,48,58,0.35)'
  ctx.lineWidth = 2
  for (let p = 0; p <= 1024; p += 128) {
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke()
  }
  // 污渍流挂
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 1024
    const h = 20 + Math.random() * 120
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, 'rgba(0,0,0,0.10)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x, y, 3, h)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, 1)
  t.anisotropy = 8
  return t
}

/** 巨型 UEG 厂标牌 */
export function uegSignTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 256)
  ctx.fillStyle = '#20262d'
  ctx.fillRect(0, 0, 1024, 256)
  ctx.fillStyle = '#d8dde3'
  ctx.font = 'bold 150px "Arial Narrow", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('U E G', 460, 128)
  // 简化徽标圆
  ctx.strokeStyle = '#d8dde3'
  ctx.lineWidth = 12
  ctx.beginPath(); ctx.arc(120, 128, 64, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(80, 128); ctx.lineTo(160, 128); ctx.moveTo(120, 88); ctx.lineTo(120, 168); ctx.stroke()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** 黄昏厂房：暗墙 + 随机暖亮窗格（作为自发光贴图） */
function litWindowsTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 512, 512)
  const cols = 12
  const rows = 8
  const cw = 512 / cols
  const ch = 512 / rows
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (Math.random() > 0.45) {
        const warm = 180 + Math.random() * 70
        ctx.fillStyle = `rgba(255,${Math.floor(warm)},${Math.floor(warm * 0.55)},${0.55 + Math.random() * 0.45})`
        ctx.fillRect(x * cw + 5, y * ch + 6, cw - 10, ch - 12)
      }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** 灰度凹凸细节：板缝（凹）+ 铆钉（凸）+ 噪点 */
function detailBumpTexture(repeat = 1): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 512, 512)
  // 板缝凹线
  ctx.strokeStyle = '#5a5a5a'
  ctx.lineWidth = 3
  for (let p = 0; p <= 512; p += 64) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke()
  }
  // 铆钉凸点
  for (let x = 16; x < 512; x += 32) {
    for (let y = 16; y < 512; y += 32) {
      const g = ctx.createRadialGradient(x - 0.6, y - 0.6, 0, x, y, 2.4)
      g.addColorStop(0, '#c8c8c8')
      g.addColorStop(1, '#8a8a8a')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill()
    }
  }
  // 微噪点
  for (let i = 0; i < 4000; i++) {
    const v = 110 + Math.random() * 40
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.4, 1.4)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  return t
}

/** 透明文字/编号贴花（UEG、工位号、危险标识等） */
export function labelTexture(
  text: string,
  opts: { color?: string; bg?: string; font?: number; sub?: string } = {}
): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 256)
  if (opts.bg) {
    ctx.fillStyle = opts.bg
    ctx.fillRect(0, 0, 512, 256)
  }
  ctx.fillStyle = opts.color ?? '#e8edf2'
  ctx.font = `bold ${opts.font ?? 130}px "Arial Narrow", Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, opts.sub ? 104 : 128)
  if (opts.sub) {
    ctx.font = '46px Arial, sans-serif'
    ctx.fillStyle = opts.color ?? '#c8d0d8'
    ctx.fillText(opts.sub, 256, 200)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** 贴花平面（双面、无光照影响，朝 +Z） */
export function decal(
  text: string,
  w: number,
  h: number,
  opts?: { color?: string; bg?: string; font?: number; sub?: string }
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: labelTexture(text, opts),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  )
  return m
}

/** 统一设置：给 PBR 一点环境反射强度 */
function tune<T extends THREE.MeshStandardMaterial>(m: T, env = 0.55): T {
  m.envMapIntensity = env
  return m
}

export const MAT = {
  steel: tune(new THREE.MeshStandardMaterial({
    color: 0x5a636e,
    metalness: 0.9,
    roughness: 0.42,
    map: metalPanelTexture('#5a636e', 'rgba(20,24,30,0.5)', 2),
    bumpMap: detailBumpTexture(2),
    bumpScale: 0.6
  })),
  steelLight: tune(new THREE.MeshStandardMaterial({
    color: 0xa6b0bb,
    metalness: 0.88,
    roughness: 0.34,
    map: metalPanelTexture('#9aa4ae', 'rgba(30,36,44,0.45)', 2),
    bumpMap: detailBumpTexture(2),
    bumpScale: 0.5
  })),
  steelDark: tune(new THREE.MeshStandardMaterial({
    color: 0x2b313a,
    metalness: 0.85,
    roughness: 0.5,
    map: metalPanelTexture('#333a44', 'rgba(0,0,0,0.5)', 2),
    bumpMap: detailBumpTexture(2),
    bumpScale: 0.7
  })),
  white: tune(new THREE.MeshStandardMaterial({
    color: 0xdfe4e9,
    metalness: 0.5,
    roughness: 0.5,
    map: metalPanelTexture('#d7dce2', 'rgba(90,100,112,0.5)', 1),
    bumpMap: detailBumpTexture(1),
    bumpScale: 0.4
  })),
  tower: tune(new THREE.MeshStandardMaterial({
    color: 0xc3cbd4,
    metalness: 0.3,
    roughness: 0.62,
    map: towerPanelTexture()
  }), 0.4),
  orange: tune(new THREE.MeshStandardMaterial({ color: 0xd0631e, metalness: 0.35, roughness: 0.55 }), 0.4),
  hazard: tune(new THREE.MeshStandardMaterial({ map: hazardTexture(), metalness: 0.3, roughness: 0.6 }), 0.4),
  concrete: tune(new THREE.MeshStandardMaterial({ color: 0x4a4f56, metalness: 0.08, roughness: 0.92 }), 0.3),
  cable: tune(new THREE.MeshStandardMaterial({ color: 0x8b97a4, metalness: 0.9, roughness: 0.42 }), 0.45),
  rail: tune(new THREE.MeshStandardMaterial({
    color: 0xb9c6d2,
    emissive: 0x1d4a6e,
    emissiveIntensity: 0.28,
    metalness: 0.85,
    roughness: 0.35
  }), 0.5),
  solar: tune(new THREE.MeshStandardMaterial({
    map: solarTexture(),
    color: 0xffffff,
    metalness: 0.6,
    roughness: 0.25
  }), 0.7),
  deckTop: tune(new THREE.MeshStandardMaterial({ map: deckTexture(), metalness: 0.3, roughness: 0.85 }), 0.35),
  grating: tune(new THREE.MeshStandardMaterial({ color: 0x3a414a, metalness: 0.75, roughness: 0.55, side: THREE.DoubleSide }), 0.5),
  litBuilding: tune(
    new THREE.MeshStandardMaterial({
      color: 0x20262d,
      metalness: 0.5,
      roughness: 0.7,
      emissive: 0xffffff,
      emissiveMap: litWindowsTexture(),
      emissiveIntensity: 1.4
    }),
    0.4
  ),
  glass: new THREE.MeshStandardMaterial({
    color: 0x0a1c28,
    emissive: 0x5fc8ff,
    emissiveIntensity: 1.1,
    metalness: 0.4,
    roughness: 0.2
  }),
  warmLamp: new THREE.MeshStandardMaterial({ color: 0x3a2c10, emissive: 0xffb459, emissiveIntensity: 1.8 }),
  redLamp: new THREE.MeshStandardMaterial({ color: 0x2a0d10, emissive: 0xff3328, emissiveIntensity: 2.4 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x14181d, metalness: 0.2, roughness: 0.9 }),
  deckLamp: new THREE.MeshStandardMaterial({ color: 0x4a3518, emissive: 0xffb85e, emissiveIntensity: 2.6 }),
  pipe: tune(new THREE.MeshStandardMaterial({ color: 0x6d7680, metalness: 0.8, roughness: 0.45 })),
  cargo: [0x8a4b36, 0x3d5a78, 0x4f6b3a, 0x7a6a34].map(
    (c) => tune(new THREE.MeshStandardMaterial({ color: c, metalness: 0.45, roughness: 0.7 }), 0.4)
  )
}
