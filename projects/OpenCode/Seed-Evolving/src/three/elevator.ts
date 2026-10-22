import * as THREE from 'three'
import {
  EARTH_RADIUS,
  PLATFORM_RADIUS,
  SHAFT_RADIUS,
  GANTRY_RADIUS,
  TOWER_RADIUS,
  TOWER_HEIGHT,
  GANTRY_LEVELS,
  GANTRY_HEIGHT,
  CABIN_CLEAR_R,
  CABIN_INNER_R,
  RAIL_R,
  STATION_HEIGHT,
  COUNTERWEIGHT_HEIGHT,
  OCEAN_RADIUS,
  BRIDGE_LENGTH,
  ISLAND_RADIUS,
  CABIN_TRIP_SECONDS
} from '../config'
import { createCabin, updateCabin } from './cabin'
import { MAT, uegSignTexture, decal } from './materials'
import { rbox, beamGeo, merge } from './geometry'
import { buildFleet, buildAircraft, buildBridgeTraffic } from './props'

export interface Elevator {
  group: THREE.Group
  cabin: THREE.Group
  cabins: THREE.Group[]
  triggerLaunch: () => void
  update: (elapsed: number) => void
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/* ============================================================
 * 海上基地：多层圆盘 + 中央发射竖井 + 三蒙皮高塔 + 长桥人工岛
 * ============================================================ */
function buildBase(): THREE.Group {
  const g = new THREE.Group()

  /* 水下阻尼浮筒 */
  const centralPontoon = new THREE.Mesh(new THREE.CylinderGeometry(96, 118, 30, 48), MAT.concrete)
  centralPontoon.position.y = -10
  g.add(centralPontoon)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const p = new THREE.Mesh(new THREE.CylinderGeometry(12, 16, 20, 18), MAT.concrete)
    p.position.set(Math.cos(a) * 96, -6, Math.sin(a) * 96)
    g.add(p)
  }

  /* 三层递减圆盘 */
  const tiers: Array<[number, number, number]> = [
    [PLATFORM_RADIUS, 14, 0],
    [PLATFORM_RADIUS * 0.86, 10, 12],
    [PLATFORM_RADIUS * 0.7, 8, 21]
  ]
  tiers.forEach(([r, h, y], i) => {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, h, 72), i === 0 ? MAT.steelDark : MAT.steel)
    tier.position.y = y
    g.add(tier)
    // 层间橙色细环
    const trim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.7, 8, 96), MAT.orange)
    trim.rotation.x = Math.PI / 2
    trim.position.y = y + h / 2
    g.add(trim)
  })
  // 顶层甲板（环形：中央留出半径 SHAFT_RADIUS 的发射井，供轿厢垂直穿越）
  const topR = PLATFORM_RADIUS * 0.7
  const deckShape = new THREE.Shape()
  deckShape.absarc(0, 0, topR, 0, Math.PI * 2, false)
  const deckHole = new THREE.Path()
  deckHole.absarc(0, 0, SHAFT_RADIUS, 0, Math.PI * 2, true)
  deckShape.holes.push(deckHole)
  const deckGeo = new THREE.ShapeGeometry(deckShape, 80)
  deckGeo.rotateX(-Math.PI / 2)
  const deckTop = new THREE.Mesh(deckGeo, MAT.deckTop)
  deckTop.position.y = 25.2
  g.add(deckTop)

  /* 中央发射竖井（开放井壁 + 危险涂装圈） */
  const shaftWall = new THREE.Mesh(
    new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, 34, 40, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x14181d, metalness: 0.6, roughness: 0.7, side: THREE.DoubleSide })
  )
  shaftWall.position.y = 14
  g.add(shaftWall)
  const shaftRing = new THREE.Mesh(new THREE.TorusGeometry(SHAFT_RADIUS + 1.5, 2, 10, 48), MAT.hazard)
  shaftRing.rotation.x = Math.PI / 2
  shaftRing.position.y = 26
  g.add(shaftRing)
  // 井口八盏探照灯
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), MAT.warmLamp)
    lamp.position.set(Math.cos(a) * (SHAFT_RADIUS + 3), 28, Math.sin(a) * (SHAFT_RADIUS + 3))
    g.add(lamp)
  }

  /* 外围防波堤环 + 灯塔 */
  const breakwater = new THREE.Mesh(new THREE.TorusGeometry(PLATFORM_RADIUS + 10, 8, 10, 110), MAT.concrete)
  breakwater.rotation.x = Math.PI / 2
  breakwater.position.y = 4
  g.add(breakwater)
  // 防波堤密集灯带（实例化）
  const lampGeo = new THREE.SphereGeometry(0.8, 8, 8)
  const rimLamps = new THREE.InstancedMesh(lampGeo, MAT.deckLamp, 72)
  const dLamp = new THREE.Object3D()
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2
    dLamp.position.set(Math.cos(a) * (PLATFORM_RADIUS + 10), 14, Math.sin(a) * (PLATFORM_RADIUS + 10))
    dLamp.updateMatrix()
    rimLamps.setMatrixAt(i, dLamp.matrix)
  }
  rimLamps.instanceMatrix.needsUpdate = true
  g.add(rimLamps)

  /* 圆盘外缘船坞式巨型斜撑（12 组） */
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13
    const buttress = new THREE.Mesh(rbox(16, 3, 34, 0.8), MAT.concrete)
    buttress.position.set(Math.cos(a) * (PLATFORM_RADIUS - 6), 6, Math.sin(a) * (PLATFORM_RADIUS - 6))
    buttress.rotation.y = -a
    g.add(buttress)
    // 斜向支撑梁（从圆盘腰部斜插到外圈）
    g.add(
      new THREE.Mesh(
        beamGeo(
          V(Math.cos(a) * (PLATFORM_RADIUS - 30), 18, Math.sin(a) * (PLATFORM_RADIUS - 30)),
          V(Math.cos(a) * (PLATFORM_RADIUS + 4), 2, Math.sin(a) * (PLATFORM_RADIUS + 4)),
          2.4,
          10
        ),
        MAT.steelDark
      )
    )
  }

  /* 三条入海长桥 + 人工岛 */
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a))
    const buildBridgeIsland = () => {
      // 桥面（分段，沿径向）+ 密集桥墩
      const segN = 12
      const segL = BRIDGE_LENGTH / segN
      const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a))
      for (let s = 0; s < segN; s++) {
        const r = PLATFORM_RADIUS + segL * (s + 0.5)
        const seg = new THREE.Mesh(rbox(22, 2.8, segL * 0.96, 0.5), MAT.concrete)
        seg.position.set(dir.x * r, 6, dir.z * r)
        seg.rotation.y = a
        g.add(seg)
        // 每段一个桥墩（贴海，柱身高）
        const pier = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 18, 10), MAT.concrete)
        pier.position.set(dir.x * r, -4, dir.z * r)
        g.add(pier)
        // 两侧护栏 + 路灯
        for (const off of [-1, 1]) {
          const rail = new THREE.Mesh(rbox(0.6, 1.4, segL * 0.9, 0.2), MAT.steelDark)
          rail.position.set(
            dir.x * r + side.x * 10.4 * off,
            8.2,
            dir.z * r + side.z * 10.4 * off
          )
          rail.rotation.y = a
          g.add(rail)
        }
        if (s % 2 === 0) {
          for (const off of [-1, 1]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), MAT.steelDark)
            post.position.set(dir.x * r + side.x * 9.6 * off, 11.5, dir.z * r + side.z * 9.6 * off)
            g.add(post)
            const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), MAT.deckLamp)
            lamp.position.set(dir.x * r + side.x * 9.6 * off, 15.2, dir.z * r + side.z * 9.6 * off)
            g.add(lamp)
          }
        }
      }
      // 双车道线
      for (const off of [-5, 5]) {
        const lane = new THREE.Mesh(rbox(0.6, 0.3, BRIDGE_LENGTH * 0.9, 0.2), MAT.white)
        const r = PLATFORM_RADIUS + BRIDGE_LENGTH / 2
        const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(off)
        lane.position.set(dir.x * r + side.x, 7.6, dir.z * r + side.z)
        lane.rotation.y = a
        g.add(lane)
      }
      // 人工岛（椭圆陆地 + 小环形码头）
      const ir = PLATFORM_RADIUS + BRIDGE_LENGTH + ISLAND_RADIUS * 0.4
      const island = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS * 1.05, 6, 40), MAT.concrete)
      island.position.set(dir.x * ir, -1, dir.z * ir)
      island.scale.set(1.5, 1, 1)
      g.add(island)
      const dock = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_RADIUS + 10, 5, 8, 48), MAT.concrete)
      dock.rotation.x = Math.PI / 2
      dock.scale.set(1.5, 1, 1)
      dock.position.set(dir.x * ir, 2, dir.z * ir)
      g.add(dock)
    }
    buildBridgeIsland()
  }

  g.add(buildTowers())
  g.add(buildLaunchGantries())
  g.add(buildDeckFacilities())
  g.add(buildStayCables())

  return g
}

/* 门式发射塔（依据官方基座模型 深化设计_0800 / 发射效果图_张璐）：
   3 对垂直巨柱（左/中/右三组门式）立于圆盘，柱身垂直、柱脚略扩；
   约 55% 高度处一对【宽大中空环形平台】连接各柱，平台外缘终止于柱内侧面
   （内孔半径大于轿厢包络，柱从平台外侧经过，绝不穿模）；
   柱顶设备舱与三层缆绳冠；外圈扇形斜拉索。 */
function buildTowers(): THREE.Group {
  const g = new THREE.Group()
  const baseY = 25
  const H = TOWER_HEIGHT
  const colW = 9

  // 3 对柱：每对两柱沿切向分开。柱立在圆盘外圈（r≈70），
  // 与轿厢导轨（r=14、外沿≈27）和平台井孔（r=40）保持绝对间距，杜绝穿模
  const clusterR = 72
  const pairSep = 12
  interface Col { x: number; z: number; a: number }
  const cols: Col[] = []
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6
    const nx = Math.cos(a)
    const nz = Math.sin(a)
    const tx = -Math.sin(a)
    const tz = Math.cos(a)
    for (const s of [-1, 1]) {
      cols.push({
        x: nx * clusterR + tx * s * pairSep * 0.5,
        z: nz * clusterR + tz * s * pairSep * 0.5,
        a
      })
    }
  }

  const steel: THREE.BufferGeometry[] = []
  const dark: THREE.BufferGeometry[] = []

  /* 垂直巨柱（蒙皮方柱 + 浅色角筋 + 水平分段 + 柱脚扩座） */
  cols.forEach((c) => {
    const mm = new THREE.Matrix4().makeRotationY(-c.a).multiply(
      new THREE.Matrix4().makeTranslation(c.x, 0, c.z)
    )
    // 主柱
    steel.push(rbox(colW, H, colW, 0.9, 2).translate(0, H / 2, 0).applyMatrix4(mm))
    // 四条角筋
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        steel.push(
          rbox(0.9, H - 4, 0.9, 0.2)
            .translate(sx * (colW / 2 - 0.2), H / 2, sz * (colW / 2 - 0.2))
            .applyMatrix4(mm)
        )
      }
    }
    // 水平分段箍
    for (let s = 1; s < 9; s++) {
      dark.push(rbox(colW + 0.6, 1.2, colW + 0.6, 0.2).translate(0, (s / 9) * H, 0).applyMatrix4(mm))
    }
    // 柱脚扩座（局部外撇三角块，4 面）
    for (let f = 0; f < 4; f++) {
      const fa = (f / 4) * Math.PI * 2 + Math.PI / 4
      const foot = rbox(colW + 4, 16, 4, 1)
        .translate(Math.cos(fa) * 2.2, 8, Math.sin(fa) * 2.2)
        .applyMatrix4(mm)
      dark.push(foot)
    }
  })

  /* 同对柱之间的多层门式横梁 + X 撑（3 对，朝切向） */
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6
    const nx = Math.cos(a)
    const nz = Math.sin(a)
    const tx = -Math.sin(a)
    const tz = Math.cos(a)
    const cx = nx * clusterR
    const cz = nz * clusterR
    const pair: Array<[number, number, number]> = [
      [cx + tx * pairSep * 0.5, 0, cz + tz * pairSep * 0.5],
      [cx - tx * pairSep * 0.5, 0, cz - tz * pairSep * 0.5]
    ]
    for (const frac of [0.32, 0.6, 0.85]) {
      const y = baseY + H * frac
      // 顶梁（沿切向连接两柱）
      steel.push(
        rbox(3.6, 3.6, pairSep + colW, 0.6)
          .applyMatrix4(new THREE.Matrix4().makeRotationY(-a).setPosition(cx, y, cz))
      )
      // X 斜撑
      steel.push(beamGeo(V(pair[0][0], y - H * 0.12, pair[0][2]), V(pair[1][0], y + H * 0.04, pair[1][2]), 0.7, 8))
      steel.push(beamGeo(V(pair[1][0], y - H * 0.12, pair[1][2]), V(pair[0][0], y + H * 0.04, pair[0][2]), 0.7, 8))
    }
  }

  const towerSteel = new THREE.Mesh(merge(steel), MAT.steel)
  towerSteel.name = 'towerSteel'
  const towerDark = new THREE.Mesh(merge(dark), MAT.steelDark)
  towerDark.name = 'towerDark'
  g.add(towerSteel, towerDark)

  /* 单层宽大中空环形平台（0800 模型约 52% 高度）。
     柱立在 r=72 圆盘外圈，平台外缘 r=66 收在柱内侧，内孔 r=40 > 轿厢外沿 27，
     因此平台与柱、与轿厢都不相交（无需开孔）。 */
  const ringLevels = [0.52]
  const R_OUT = 66
  const R_IN = SHAFT_RADIUS + 2

  const platformGeo = (): THREE.ShapeGeometry => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, R_OUT, 0, Math.PI * 2, false)
    const inner = new THREE.Path()
    inner.absarc(0, 0, R_IN, 0, Math.PI * 2, true)
    shape.holes.push(inner)
    const geo = new THREE.ShapeGeometry(shape, 80)
    geo.rotateX(-Math.PI / 2)
    return geo
  }
  ringLevels.forEach((lv) => {
    const y = baseY + H * lv
    // 宽环地板（6 柱位带缺口）
    const deck = new THREE.Mesh(platformGeo(), MAT.grating)
    deck.position.y = y
    g.add(deck)
    // 板厚裙边（外圈 + 内井圈，用不闭合圆柱会被缺口切断，改用细 torus 表达边缘）
    for (const rr of [R_IN, R_OUT]) {
      const lip = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.9, 8, 96), MAT.steelDark)
      lip.rotation.x = Math.PI / 2
      lip.position.y = y
      g.add(lip)
    }
    // 内外护栏
    for (const rr of [R_IN, R_OUT]) {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.5, 8, 96), MAT.steelLight)
      rail.rotation.x = Math.PI / 2
      rail.position.y = y + 5
      g.add(rail)
    }
    // 外护栏柱（均匀，柱在 r72 平台外 r66，无需避让）
    for (let i = 0; i < 56; i++) {
      const aa = (i / 56) * Math.PI * 2
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 6, 6), MAT.steelLight)
      post.position.set(Math.cos(aa) * R_OUT, y + 3, Math.sin(aa) * R_OUT)
      g.add(post)
    }
    // 柱内侧伸出短走道连接平台外缘到柱（视觉搭接，不穿柱）
    cols.forEach((c) => {
      const dir = new THREE.Vector3(c.x, 0, c.z).normalize()
      const p0 = V(dir.x * R_OUT, y - 0.6, dir.z * R_OUT)
      const p1 = V(dir.x * (clusterR - colW / 2 - 0.5), y - 0.6, dir.z * (clusterR - colW / 2 - 0.5))
      g.add(new THREE.Mesh(rbox(clusterR - colW / 2 - R_OUT, 1, 4, 0.4), MAT.steelDark))
      const cat = g.children[g.children.length - 1] as THREE.Mesh
      cat.position.copy(p0).lerp(p1, 0.5)
      cat.rotation.y = -Math.atan2(dir.z, dir.x)
    })
  })

  /* 柱顶设备舱 + 红灯 */
  cols.forEach((c, i) => {
    const top = V(c.x, baseY + H, c.z)
    const cap = new THREE.Mesh(rbox(colW + 2, 9, colW + 2, 0.8), MAT.steelLight)
    cap.position.copy(top).add(V(0, 4.5, 0))
    g.add(cap)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 18, 8), MAT.steelDark)
    mast.position.copy(top).add(V(0, 17, 0))
    g.add(mast)
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), MAT.redLamp)
    beacon.position.copy(top).add(V(0, 28, 0))
    beacon.name = 'towerBeacon'
    g.add(beacon)
    // 朝外 UEG 编号贴花
    const nrm = new THREE.Vector3(c.x, 0, c.z).normalize()
    const d = decal(i % 2 === 0 ? 'UEG' : `UEG-0${(i % 3) + 1}`, 6, 2.2, {
      color: '#1c232c',
      bg: 'rgba(214,220,226,0.92)',
      font: 92
    })
    d.position.set(c.x, baseY + H * 0.5, c.z).addScaledVector(nrm, colW / 2 + 0.3)
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm)
    g.add(d)
  })

  /* 顶部缆绳冠：连接 6 柱顶并向中心收束缆绳。
     所有环/梁都在轿厢安全走廊（CABIN_CLEAR_R）之外，轿厢可从中心穿过。 */
  const crownY = baseY + H + 16
  const crownR = CABIN_CLEAR_R + 4 // 最内环仍在轿厢外沿之外
  for (const [rr, hh] of [
    [crownR + 18, 3.4],
    [crownR + 8, 2.8],
    [crownR, 2.2]
  ] as Array<[number, number]>) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, hh, 10, 64), rr === crownR ? MAT.orange : MAT.steelDark)
    ring.rotation.x = Math.PI / 2
    ring.position.y = crownY
    g.add(ring)
  }
  cols.forEach((c) => {
    const nrm = new THREE.Vector3(c.x, 0, c.z).normalize()
    g.add(
      new THREE.Mesh(
        beamGeo(V(c.x, baseY + H + 4, c.z), V(nrm.x * crownR, crownY, nrm.z * crownR), 1.3, 8),
        MAT.steel
      )
    )
  })

  return g
}

/* 地面发射工位：成排白色"门框"龙门架（环绕中圈） */
function buildLaunchGantries(): THREE.Group {
  const g = new THREE.Group()
  const white: THREE.BufferGeometry[] = []
  const dark: THREE.BufferGeometry[] = []
  const n = 9
  const radius = PLATFORM_RADIUS * 0.62
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2
    // 在塔所在方位让位
    let nearTower = false
    for (let k = 0; k < 3; k++) {
      const ta = (k / 3) * Math.PI * 2 + Math.PI / 6
      if (Math.abs(Math.sin(a - ta)) < 0.18) nearTower = true
    }
    if (nearTower) continue

    const W = 13
    const localWhite: THREE.BufferGeometry[] = []
    const localDark: THREE.BufferGeometry[] = []
    // 两立柱（外侧设备箱堆叠感）
    localWhite.push(rbox(2.6, GANTRY_HEIGHT, 3.4, 0.5).translate(-W / 2, GANTRY_HEIGHT / 2, 0))
    localWhite.push(rbox(2.6, GANTRY_HEIGHT, 3.4, 0.5).translate(W / 2, GANTRY_HEIGHT / 2, 0))
    // 顶梁 + 顶部设备箱
    localWhite.push(rbox(W + 3, 3, 4.2, 0.6).translate(0, GANTRY_HEIGHT + 1.5, 0))
    localWhite.push(rbox(5, 3.4, 4.6, 0.6).translate(0, GANTRY_HEIGHT + 4.6, 0))
    // 立柱上的竖向设备盒（深色）
    for (const sx of [-1, 1]) {
      for (let y = 8; y < GANTRY_HEIGHT - 4; y += 9) {
        localDark.push(rbox(1.0, 4, 1.0, 0.3).translate(sx * (W / 2 + 1.4), y, 0))
      }
    }
    // 底座
    localDark.push(rbox(4.4, 1.4, 5, 0.3).translate(-W / 2, 0.7, 0))
    localDark.push(rbox(4.4, 1.4, 5, 0.3).translate(W / 2, 0.7, 0))
    const mm = new THREE.Matrix4().makeRotationY(-a).multiply(
      new THREE.Matrix4().makeTranslation(Math.cos(a) * radius, 25, Math.sin(a) * radius)
    )
    localWhite.forEach((geo) => white.push(geo.applyMatrix4(mm)))
    localDark.forEach((geo) => dark.push(geo.applyMatrix4(mm)))
  }
  g.add(new THREE.Mesh(merge(white), MAT.white))
  g.add(new THREE.Mesh(merge(dark), MAT.steelDark))
  return g
}

/* 甲板设施：厂房、储罐、管廊、龙门吊、集装箱、雷达球 */
function buildDeckFacilities(): THREE.Group {
  const g = new THREE.Group()
  const topR = PLATFORM_RADIUS * 0.7
  const rng = mulberry(99)

  const place = (obj: THREE.Object3D, a: number, r: number) => {
    obj.position.set(Math.cos(a) * r, 25, Math.sin(a) * r)
    obj.rotation.y = -a + (rng() - 0.5) * 0.4
    g.add(obj)
  }
  // 所有甲板设施必须在轿厢安全走廊之外
  const MIN_R = CABIN_CLEAR_R + 8

  // 环形厂房（几栋多层建筑），其中一栋挂巨型 UEG 牌
  const signMat = new THREE.MeshStandardMaterial({ map: uegSignTexture(), roughness: 0.7, metalness: 0.3, emissive: 0x3a3a3a, emissiveIntensity: 0.4 })
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3
    const b = new THREE.Group()
    const w = 20 + rng() * 12
    const h = 10 + rng() * 10
    const body = new THREE.Mesh(
      rbox(w, h, 16, 0.8),
      i % 3 === 1 ? MAT.litBuilding : i % 2 ? MAT.steel : MAT.white
    )
    body.position.y = h / 2
    b.add(body)
    // 屋顶设备箱 + 管道
    for (let k = 0; k < 3; k++) {
      const box = new THREE.Mesh(rbox(4, 3, 4, 0.4), MAT.steelDark)
      box.position.set((rng() - 0.5) * w * 0.6, h + 1.5, (rng() - 0.5) * 8)
      b.add(box)
    }
    // 第一栋朝圆心方向挂 UEG 牌
    if (i === 0) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.42), signMat)
      sign.position.set(0, h * 0.62, 8.1)
      b.add(sign)
    }
    place(b, a, MIN_R + rng() * Math.max(1, topR - MIN_R - 4))
  }

  // 球罐 + 圆柱罐区
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.9
    const tank =
      i % 2 === 0
        ? new THREE.Mesh(new THREE.SphereGeometry(6, 20, 14), MAT.white)
        : new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 14, 18), MAT.steelLight)
    tank.position.y = i % 2 === 0 ? 8 : 7
    place(tank, a, MIN_R + 8 + rng() * Math.max(1, topR - MIN_R - 14))
  }

  // 集装箱堆（全部在安全走廊外）
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2
    const r = MIN_R + 6 + rng() * Math.max(1, topR - MIN_R - 10)
    const mat = MAT.cargo[Math.floor(rng() * MAT.cargo.length)]
    const box = new THREE.Mesh(rbox(7, 3.6, 13, 0.3), mat)
    box.position.set(Math.cos(a) * r, 26.8 + (rng() > 0.7 ? 3.6 : 0), Math.sin(a) * r)
    box.rotation.y = a + Math.PI / 2 + (rng() - 0.5) * 0.4
    g.add(box)
  }

  // 三台橙色龙门吊（沿径向的大框）
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.05
    const crane = new THREE.Group()
    const leg1 = new THREE.Mesh(rbox(1.6, 30, 1.6, 0.3), MAT.orange)
    leg1.position.set(-11, 15, 0)
    const leg2 = leg1.clone()
    leg2.position.x = 11
    const beamTop = new THREE.Mesh(rbox(25, 2, 2, 0.3), MAT.orange)
    beamTop.position.y = 30
    crane.add(leg1, leg2, beamTop)
    place(crane, a, Math.max(topR * 0.88, MIN_R + 14))
  }

  // 环形管廊（只放在安全走廊外）
  for (const r of [CABIN_CLEAR_R + 6, topR - 6]) {
    for (let k = 0; k < 3; k++) {
      const pipe = new THREE.Mesh(new THREE.TorusGeometry(r + k * 2.2, 0.5, 8, 80), MAT.pipe)
      pipe.rotation.x = Math.PI / 2
      pipe.position.y = 28
      g.add(pipe)
    }
  }

  // 雷达白球
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 1.4
    const rr = Math.max(topR - 10, CABIN_CLEAR_R + 12)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 12), MAT.white)
    dome.position.set(Math.cos(a) * rr, 31, Math.sin(a) * rr)
    g.add(dome)
  }

  return g
}

/* 从 6 根门柱向四周扇形拉出的细斜拉钢索（电影中的满屏扇形拉索） */
function buildStayCables(): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0x9aa6b2, transparent: true, opacity: 0.45 })
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2
    const top = V(Math.cos(a0) * GANTRY_RADIUS, TOWER_HEIGHT * 0.82, Math.sin(a0) * GANTRY_RADIUS)
    // 每柱向两侧扇形展开 5 根，落点在外圈不同半径/角度
    for (let f = -2; f <= 2; f++) {
      const a = a0 + f * 0.16
      const rr = PLATFORM_RADIUS + 8 - Math.abs(f) * 6
      const pts = [top, V(Math.cos(a) * rr, 26, Math.sin(a) * rr)]
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
    }
    // 一根长拉索到桥远端
    const pts = [
      V(Math.cos(a0) * GANTRY_RADIUS, TOWER_HEIGHT + 10, Math.sin(a0) * GANTRY_RADIUS),
      V(Math.cos(a0) * (PLATFORM_RADIUS + BRIDGE_LENGTH * 0.55), 34, Math.sin(a0) * (PLATFORM_RADIUS + BRIDGE_LENGTH * 0.55))
    ]
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  return g
}

/* ============================================================
 * 碳纳米缆绳束 + 主导轨
 * ============================================================ */
function buildCables(): { group: THREE.Group; railR: number } {
  const g = new THREE.Group()
  const len = COUNTERWEIGHT_HEIGHT - TOWER_HEIGHT
  const railR = RAIL_R

  // 216 根缆绳收紧在轿厢走廊内半径之内，轿厢沿外围主导轨走，互不相交
  const bundle = 216
  const geo = new THREE.CylinderGeometry(0.14, 0.18, len, 5, 4)
  const mesh = new THREE.InstancedMesh(geo, MAT.cable, bundle)
  const dummy = new THREE.Object3D()
  const up = new THREE.Vector3(0, 1, 0)
  const bundleR = CABIN_INNER_R - 1 // ≤5
  for (let i = 0; i < bundle; i++) {
    const ring = i < 72 ? 0 : i < 168 ? 1 : 2
    const a = (i / bundle) * Math.PI * 2 + ring
    const bR = bundleR * 0.2 * (0.4 + ring * 0.3)
    const tR = bundleR * (0.4 + ring * 0.3)
    const b = V(Math.cos(a) * bR, TOWER_HEIGHT, Math.sin(a) * bR)
    const t = V(Math.cos(a) * tR, COUNTERWEIGHT_HEIGHT, Math.sin(a) * tR)
    const dir = t.clone().sub(b)
    dummy.position.copy(b).addScaledVector(dir, 0.5)
    dummy.quaternion.setFromUnitVectors(up, dir.normalize())
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
  g.add(mesh)

  // 3 根主导轨（与 3 部轿厢一一对应，相隔 120°）
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, len, 8), MAT.rail)
    rail.position.set(Math.cos(a) * railR, TOWER_HEIGHT + len / 2, Math.sin(a) * railR)
    g.add(rail)
  }

  // 方舟站周边竖向缆绳走廊：内环(r40)与外舱(r86)之间，且在轿厢外沿(≈43)之外
  const corridorR = 54
  const corridorGeo = new THREE.CylinderGeometry(0.1, 0.1, 260, 5)
  const corridorN = 40
  const corridor = new THREE.InstancedMesh(corridorGeo, MAT.cable, corridorN * 2)
  const cd = new THREE.Object3D()
  let ci = 0
  for (const cy of [STATION_HEIGHT - 200, STATION_HEIGHT + 200]) {
    for (let i = 0; i < corridorN; i++) {
      const a = (i / corridorN) * Math.PI * 2
      cd.position.set(Math.cos(a) * corridorR, cy, Math.sin(a) * corridorR)
      cd.updateMatrix()
      corridor.setMatrixAt(ci++, cd.matrix)
    }
  }
  corridor.instanceMatrix.needsUpdate = true
  corridor.frustumCulled = false
  g.add(corridor)

  return { group: g, railR }
}

/* ============================================================
 * 方舟空间站：多层同心环 + 密集辐条 + 大舱段/开式桁架交替
 * ============================================================ */
function buildStation(): { root: THREE.Group; rotor: THREE.Group } {
  const root = new THREE.Group()
  root.position.y = STATION_HEIGHT
  const rotor = new THREE.Group()
  // 默认把弧段缺口（朝 -Z，即相机一侧）转向相机：ARL 中心在 +Z，
  // 让中心转到背面即可让 -Z 缺口朝前（默认相机在 +Z 偏 +X）
  rotor.rotation.y = Math.PI

  // 方舟站为约 270° 的弧形舱段（留一个缺口），夹在竖向缆绳走廊上
  const ARC = Math.PI * 1.5
  const ARC_START = -ARC / 2
  const R_OUT = 86
  const R_IN = 40

  /** 弧形环轨（按圆心角生成） */
  const arcTorus = (r: number, tube: number, y: number, mat: THREE.Material) => {
    const g = new THREE.TorusGeometry(r, tube, 10, 120, ARC)
    g.rotateZ(ARC_START)
    g.rotateX(Math.PI / 2)
    const m = new THREE.Mesh(g, mat)
    m.position.y = y
    rotor.add(m)
    return m
  }
  arcTorus(R_OUT, 3, 0, MAT.steel)
  arcTorus(R_OUT, 1.1, -11, MAT.steelDark)
  arcTorus(62, 2, 0, MAT.steelLight)
  arcTorus(R_IN, 2.4, 0, MAT.steelLight)

  // 沿弧的径向辐条（实例沿弧分布）
  const spokeN = 22
  const spokeGeo = rbox(R_OUT - R_IN, 1.5, 2.2, 0.3)
  spokeGeo.translate((R_OUT + R_IN) / 2, 0, 0)
  const spokes = new THREE.InstancedMesh(spokeGeo, MAT.steel, spokeN)
  const dd = new THREE.Object3D()
  for (let i = 0; i < spokeN; i++) {
    const a = ARC_START + (i / (spokeN - 1)) * ARC
    dd.rotation.set(0, -a, 0)
    dd.updateMatrix()
    spokes.setMatrixAt(i, dd.matrix)
  }
  spokes.instanceMatrix.needsUpdate = true
  rotor.add(spokes)

  // 弧上大舱段（切向排列）与开式桁架交替
  const segN = 12
  for (let i = 0; i < segN; i++) {
    const a = ARC_START + (i / segN) * ARC
    const R = 70
    if (i % 2 === 0) {
      const pod = new THREE.Group()
      pod.add(new THREE.Mesh(rbox(24, 13, 13, 2, 3), MAT.white))
      for (const sx of [-1, 1]) {
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 2, 16), MAT.steelDark)
        collar.rotation.z = Math.PI / 2
        collar.position.x = sx * 12
        pod.add(collar)
      }
      pod.add(new THREE.Mesh(rbox(9, 3, 8, 0.8), MAT.steel))
      pod.children[pod.children.length - 1].position.y = 7.8
      for (let w = -2; w <= 2; w++) {
        const win = new THREE.Mesh(rbox(1.8, 1.3, 0.6, 0.3), MAT.glass)
        win.position.set(w * 4, 1.8, 6.7)
        pod.add(win)
      }
      pod.position.set(Math.cos(a) * R, 0, Math.sin(a) * R)
      pod.rotation.y = -a
      rotor.add(pod)
    } else {
      const mm = new THREE.Matrix4().makeRotationY(-a)
      const truss: THREE.BufferGeometry[] = []
      const add = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, rr: number) =>
        truss.push(beamGeo(V(x1, y1, z1), V(x2, y2, z2), rr, 6).applyMatrix4(mm).translate(Math.cos(a) * R, 0, Math.sin(a) * R))
      for (const yy of [-5.5, 5.5]) {
        for (const zz of [-4.5, 4.5]) add(-12, yy, zz, 12, yy, zz, 0.5)
        add(-12, yy, -4.5, -12, yy, 4.5, 0.5)
        add(12, yy, -4.5, 12, yy, 4.5, 0.5)
      }
      for (let q = -2; q <= 2; q++) {
        const x = q * 4.8
        add(x, -5.5, -4.5, x, 5.5, 4.5, 0.4)
        add(x, -5.5, 4.5, x, 5.5, -4.5, 0.4)
      }
      rotor.add(new THREE.Mesh(merge(truss), MAT.steelDark))
    }
  }

  // 弧两端的大型端舱/对接口（缺口收口）
  for (const a of [ARC_START, ARC_START + ARC]) {
    const end = new THREE.Group()
    end.add(new THREE.Mesh(rbox(20, 18, 18, 2.4, 3), MAT.steelLight))
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 1.6, 10, 28), MAT.orange)
    ring.position.set(0, 0, 9.6)
    end.add(ring)
    end.position.set(Math.cos(a) * R_OUT, 0, Math.sin(a) * R_OUT)
    end.rotation.y = -a
    rotor.add(end)
  }

  // 内环 6 个小型居住舱
  for (let i = 0; i < 6; i++) {
    const a = ARC_START + 0.25 + (i / 6) * (ARC - 0.5)
    const pod = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 15, 14), MAT.white)
    body.rotation.z = Math.PI / 2
    pod.add(body)
    for (const sx of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 1.3, 14), MAT.steelDark)
      c.rotation.z = Math.PI / 2
      c.position.x = sx * 7.5
      pod.add(c)
    }
    pod.position.set(Math.cos(a) * 52, 5, Math.sin(a) * 52)
    pod.rotation.y = -a
    rotor.add(pod)
  }

  // 抱紧中央缆绳走廊的夹具：4 道环形卡箍（细，让缆绳穿站而过）
  for (const yy of [-34, -12, 12, 34]) {
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(R_IN - 6, 1.6, 10, 40), MAT.steelDark)
    clamp.rotation.x = Math.PI / 2
    clamp.position.y = yy
    rotor.add(clamp)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      rotor.add(
        new THREE.Mesh(
          beamGeo(
            V(Math.cos(a) * (R_IN - 6), yy, Math.sin(a) * (R_IN - 6)),
            V(Math.cos(a) * 12, yy, Math.sin(a) * 12),
            0.9,
            8
          ),
          MAT.steel
        )
      )
    }
  }

  // 4 个向外径向对接臂（仅沿弧布置）
  for (let i = 0; i < 4; i++) {
    const a = ARC_START + (0.15 + i / 3.6) * ARC
    const arm = new THREE.Group()
    arm.add(new THREE.Mesh(rbox(26, 2.4, 3.2, 0.4), MAT.steelDark).translateX(13))
    arm.add(new THREE.Mesh(rbox(9, 1.2, 12, 0.5), MAT.steel).translateX(28))
    // 停靠小飞船
    const ship = new THREE.Group()
    ship.add(new THREE.Mesh(rbox(8, 3.6, 5, 1), MAT.white))
    for (const sz of [-1, 1]) {
      const wing = new THREE.Mesh(rbox(3.6, 0.6, 6, 0.3), MAT.steel)
      wing.position.set(-1, 0, sz * 4.5)
      ship.add(wing)
    }
    ship.position.set(28, 4, 0)
    arm.add(ship)
    arm.position.set(Math.cos(a) * R_OUT, 0, Math.sin(a) * R_OUT)
    arm.rotation.y = -a
    rotor.add(arm)
  }

  // 3 片太阳能翼（沿弧外侧）
  for (let i = 0; i < 3; i++) {
    const a = ARC_START + (0.2 + i / 2.4) * ARC
    const wing = new THREE.Group()
    wing.add(new THREE.Mesh(rbox(26, 1.4, 1.4, 0.3), MAT.steelDark).translateX(13))
    wing.add(new THREE.Mesh(rbox(40, 0.8, 64, 0.3), MAT.solar).translateX(46))
    wing.position.set(Math.cos(a) * R_OUT, 4, Math.sin(a) * R_OUT)
    wing.rotation.y = -a
    rotor.add(wing)
  }

  root.add(rotor)

  /* 固定核心舱：中空环形舱壁（缆绳束从中心孔穿过，不相交） */
  const HUB_IN = 19 // 内孔半径，大于缆绳束外半径 13
  const HUB_OUT = 24
  const hubGeo = new THREE.CylinderGeometry(HUB_OUT, HUB_OUT, 96, 40, 1, true)
  const hub = new THREE.Mesh(hubGeo, MAT.steelLight)
  root.add(hub)
  // 内孔壁（深色）
  const innerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(HUB_IN, HUB_IN, 96, 40, 1, true),
    MAT.steelDark
  )
  root.add(innerWall)
  // 上下环框（环带封住舱壁厚度）
  for (const yy of [-48, 48]) {
    const annulus = new THREE.Mesh(new THREE.RingGeometry(HUB_IN, HUB_OUT, 40), MAT.steelDark)
    annulus.rotation.x = -Math.PI / 2
    annulus.position.y = yy
    root.add(annulus)
  }
  for (const yy of [-40, 0, 40]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(HUB_OUT + 0.6, 1.5, 8, 40), yy === 0 ? MAT.orange : MAT.steelDark)
    band.rotation.x = Math.PI / 2
    band.position.y = yy
    root.add(band)
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 200, 10), MAT.steelDark)
  root.add(axle)
  // 上下收口锥（环形，保持中心通透）
  for (const yy of [-56, 56]) {
    const taper = new THREE.Mesh(new THREE.CylinderGeometry(13, 22, 16, 28, 1, true), MAT.steel)
    taper.position.y = yy
    root.add(taper)
  }
  // 舷窗灯环（在舱壁外侧）
  for (const yy of [14, -14]) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      const win = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), MAT.warmLamp)
      win.position.set(Math.cos(a) * HUB_OUT + 0.4, yy, Math.sin(a) * HUB_OUT + 0.4)
      root.add(win)
    }
  }

  return { root, rotor }
}

/* 末端配重：多层方舱模块堆叠 */
function buildCounterweight(): THREE.Group {
  const g = new THREE.Group()
  g.position.y = COUNTERWEIGHT_HEIGHT
  const modules: Array<[number, number, number, number, number, number]> = [
    [0, 0, 0, 30, 20, 30],
    [0, 20, 0, 24, 16, 24],
    [0, 37, 0, 16, 12, 16],
    [16, -4, 8, 12, 10, 12],
    [-15, -6, -8, 10, 9, 10],
    [10, 12, -14, 9, 8, 9]
  ]
  modules.forEach(([x, y, z, w, h, d], i) => {
    const m = new THREE.Mesh(rbox(w, h, d, 1.2), i % 2 ? MAT.steelDark : MAT.steel)
    m.position.set(x, y, z)
    g.add(m)
    // 模块间橙色边条
    const trim = new THREE.Mesh(rbox(w + 0.4, 0.8, d + 0.4, 0.3), MAT.orange)
    trim.position.set(x, y + h / 2 - 1, z)
    g.add(trim)
  })
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 10), MAT.redLamp)
  beacon.position.y = 50
  g.add(beacon)
  return g
}

/* 发射井烟雾 */
function makeSmoke(): THREE.Sprite[] {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
  grad.addColorStop(0, 'rgba(205,210,216,0.5)')
  grad.addColorStop(1, 'rgba(205,210,216,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  const sprites: THREE.Sprite[] = []
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.1, depthWrite: false }))
    s.userData = {
      a: Math.random() * Math.PI * 2,
      r: SHAFT_RADIUS + 4 + Math.random() * 10,
      speed: 1.2 + Math.random() * 2,
      offset: Math.random() * 40,
      size: 26 + Math.random() * 30
    }
    sprites.push(s)
  }
  return sprites
}

/* 确定性随机 */
function mulberry(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ============================================================ */
export function createElevator(): Elevator {
  const group = new THREE.Group()
  group.position.y = EARTH_RADIUS

  group.add(buildBase())
  const { group: cables, railR } = buildCables()
  group.add(cables)

  const station = buildStation()
  group.add(station.root)
  group.add(buildCounterweight())

  const smokes = makeSmoke()
  smokes.forEach((s) => group.add(s))

  // 尺度参照物：货轮、返航飞机、桥上车队
  const fleet = buildFleet()
  fleet.forEach((s) => group.add(s))
  const planes = buildAircraft()
  planes.forEach((p) => group.add(p))
  const traffic = buildBridgeTraffic(PLATFORM_RADIUS, BRIDGE_LENGTH)
  group.add(traffic)

  // 发射演出：井内强光 + 扩散冲击波环
  const launchLight = new THREE.PointLight(0xbfe2ff, 0, 1600, 1.8)
  launchLight.position.set(0, 60, 0)
  group.add(launchLight)
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0x9fd0ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  const shock = new THREE.Mesh(new THREE.TorusGeometry(8, 2.2, 12, 64), shockMat)
  shock.rotation.x = Math.PI / 2
  shock.position.y = 40
  shock.userData.update = (elapsed: number, t0: number) => {
    if (t0 < 0) return
    const dt = elapsed - t0
    if (dt < 0 || dt > 3) {
      shockMat.opacity = 0
      return
    }
    const k = dt / 3
    shock.scale.setScalar(1 + k * 16)
    shockMat.opacity = 0.8 * (1 - k)
  }
  group.add(shock)

  // 3 部轿厢：相隔 120°，对应 3 根主导轨；同高度时中心间距 2·RAIL_R·sin60≈45 > 2×角舱17
  const cabinDefs = [
    { ang: 0, phase: 0, label: 'ARK-07' },
    { ang: (Math.PI * 2) / 3, phase: 0.34, label: 'ARK-03' },
    { ang: (Math.PI * 4) / 3, phase: 0.68, label: 'ARK-12' }
  ]
  const cabins = cabinDefs.map((def) => {
    const cab = createCabin()
    cab.rotation.y = -def.ang
    group.add(cab)
    return cab
  })
  const cabin = cabins[0] // 热点跟随主轿厢

  const low = 40
  const high = STATION_HEIGHT - 130
  const dwell = 5
  const period = CABIN_TRIP_SECONDS * 2 + dwell * 2

  // 发射演出状态（以模拟时钟计时）
  let launchAt = -1
  let lastSim = 0

  const beacons: THREE.Mesh[] = []
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.name === 'towerBeacon') beacons.push(o as THREE.Mesh)
  })

  const update = (elapsed: number) => {
    lastSim = elapsed
    cabins.forEach((cab, i) => {
      const def = cabinDefs[i]
      let c = (elapsed / period + def.phase) % 1
      if (c < 0) c += 1
      c *= period
      const trip = CABIN_TRIP_SECONDS
      let t: number
      let active = true
      if (c < trip) t = c / trip
      else if (c < trip + dwell) { t = 1; active = false }
      else if (c < trip * 2 + dwell) t = 1 - (c - trip - dwell) / trip
      else { t = 0; active = false }
      const ease = t * t * (3 - 2 * t)
      cab.position.set(
        Math.cos(def.ang) * railR,
        low + (high - low) * ease,
        Math.sin(def.ang) * railR
      )
      cab.rotation.y = -def.ang
      // 发射后的短暂强推
      if (launchAt >= 0 && elapsed - launchAt < 3 && i === 0) active = true
      updateCabin(cab, elapsed, active)
    })

    station.rotor.rotation.y = Math.PI + elapsed * 0.03

    beacons.forEach((b, i) => {
      b.visible = Math.sin(elapsed * 4 + i) > -0.2
    })

    smokes.forEach((s) => {
      const u = (elapsed * s.userData.speed + s.userData.offset) % 40
      s.position.set(
        Math.cos(s.userData.a) * (s.userData.r + u * 0.5),
        30 + u,
        Math.sin(s.userData.a) * (s.userData.r + u * 0.5)
      )
      const k = s.userData.size * (0.7 + u / 40)
      s.scale.set(k, k, k)
      let op = 0.07 * (1 - u / 42)
      // 发射时喷发
      if (launchAt >= 0 && elapsed - launchAt < 4) op += 0.5 * (1 - (elapsed - launchAt) / 4)
      ;(s.material as THREE.SpriteMaterial).opacity = op
    })
    // 发射光强
    launchLight.intensity = launchAt >= 0
      ? Math.max(0, 60000 * (1 - (elapsed - launchAt) / 3))
      : 0
    shock.userData.update?.(elapsed, launchAt)
    fleet.forEach((f) => f.userData.update?.(elapsed))
    planes.forEach((p) => p.userData.update?.(elapsed))
    traffic.userData.update?.(elapsed)
  }

  const triggerLaunch = () => {
    launchAt = lastSim
  }

  return { group, cabin, cabins, triggerLaunch, update }
}
