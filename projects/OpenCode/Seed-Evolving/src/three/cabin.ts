import * as THREE from 'three'
import { MAT, labelTexture } from './materials'
import { rbox } from './geometry'

/**
 * 电影版轿厢 SEV-03（设计_王志坚，最终定稿）：
 * 扁平"切角矩形"货运舱体——顶面为带 45° 切角的八边形；
 * 顶面大尺寸分块深色货门；4 个角是【开放式矩形抱缆框架】，
 * 每框架顶部为带碟形帽的圆柱动力舱、下方悬长稳定鳍；
 * 前侧敞开深色舱门；侧面一排小方窗 + SEV-03 编号；细颈抱缆沿轨升降。
 */

/** 切角矩形八边形（XZ 平面）挤出舱体：外轮廓顶点（逆时针） */
function chamferedPrism(rx: number, rz: number, cut: number, h: number): THREE.BufferGeometry {
  const pts: Array<[number, number]> = [
    [rx - cut, -rz], [rx, -rz + cut], [rx, rz - cut], [rx - cut, rz],
    [-rx + cut, rz], [-rx, rz - cut], [-rx, -rz + cut], [-rx + cut, -rz]
  ]
  const shape = new THREE.Shape()
  shape.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.5,
    bevelSegments: 2
  })
  geo.rotateX(-Math.PI / 2) // shape 在 XY 面（XZ），挤出沿 +Y 改为高度
  geo.center()
  geo.computeVertexNormals()
  return geo
}

/** 开放式矩形抱缆框架（角部）：两根立框 + 顶梁 + 底部半环 + 圆柱动力舱 + 碟帽 + 长鳍 */
function clampCorner(sign: 1 | -1): THREE.Group {
  const g = new THREE.Group()
  const px = sign * 23.5
  const fz = 4.2 // 框架前后
  // 两根立框
  for (const z of [-fz, fz]) {
    const post = new THREE.Mesh(rbox(1.6, 16, 1.6, 0.4), MAT.steelDark)
    post.position.set(px, 4, z)
    g.add(post)
  }
  // 顶梁（朝舱体方向）
  const top = new THREE.Mesh(rbox(1.8, 1.8, fz * 2 + 1.6, 0.4), MAT.steelDark)
  top.position.set(px, 11.5, 0)
  g.add(top)
  // 斜撑（两根立框到舱体）
  for (const z of [-fz, fz]) {
    const brace = new THREE.Mesh(rbox(1.1, 1.1, 8, 0.3), MAT.steel)
    brace.position.set(sign * 19, 6.5, z)
    brace.rotation.z = sign * 0.62
    g.add(brace)
  }
  // 圆柱动力舱（竖置）
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 8, 18), MAT.white)
  pod.position.set(px, 15.5, 0)
  g.add(pod)
  for (const yy of [12, 18.6]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 1.1, 18), yy > 17 ? MAT.orange : MAT.steelDark)
    ring.position.set(px, yy, 0)
    g.add(ring)
  }
  // 碟形帽（锥台 + 圆盘）
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.2, 1.8, 18), MAT.steelDark)
  dish.position.set(px, 20.4, 0)
  g.add(dish)
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.2, 1.2, 18), MAT.steel)
  cap.position.set(px, 21.8, 0)
  g.add(cap)
  // 下方长稳定鳍
  const fin = new THREE.Mesh(rbox(1.8, 13, 3.8, 0.5), MAT.steelDark)
  fin.position.set(px, -14, 0)
  g.add(fin)
  const finTip = new THREE.Mesh(rbox(1.4, 4, 2.8, 0.6), MAT.steel)
  finTip.position.set(px, -22, 0)
  g.add(finTip)
  return g
}

export function createCabin(): THREE.Group {
  const g = new THREE.Group()
  const RX = 21
  const RZ = 15
  const H = 10
  const BY = -14 // 舱体中心高度（原点=抱缆导轨）

  /* 主舱：切角矩形扁舱 */
  const hull = new THREE.Mesh(chamferedPrism(RX, RZ, 5, H), MAT.white)
  hull.position.y = BY
  g.add(hull)
  // 下沿深色裙边
  const skirt = new THREE.Mesh(chamferedPrism(RX + 0.4, RZ + 0.4, 5.4, 2), MAT.steelDark)
  skirt.position.y = BY - H / 2 - 0.4
  g.add(skirt)
  // 上沿浅色唇口
  const lip = new THREE.Mesh(chamferedPrism(RX + 0.2, RZ + 0.2, 5.2, 1.2), MAT.steelLight)
  lip.position.y = BY + H / 2 - 0.2
  g.add(lip)

  /* 顶面分块大货门（深色，带板缝） */
  const door = new THREE.Mesh(rbox(RX * 1.45, 0.6, RZ * 1.35, 0.4), MAT.steelDark)
  door.position.y = BY + H / 2 + 0.4
  g.add(door)
  for (let i = -1; i <= 1; i++) {
    const seamX = new THREE.Mesh(rbox(0.4, 0.2, RZ * 1.32, 0.1), MAT.rubber)
    seamX.position.set(i * (RX * 0.48), BY + H / 2 + 0.75, 0)
    g.add(seamX)
  }
  for (let j = -1; j <= 1; j++) {
    const seamZ = new THREE.Mesh(rbox(RX * 1.42, 0.2, 0.4, 0.1), MAT.rubber)
    seamZ.position.set(0, BY + H / 2 + 0.75, j * (RZ * 0.45))
    g.add(seamZ)
  }
  // 货门周边小检修盖
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const hatch = new THREE.Mesh(rbox(3.4, 0.3, 2.2, 0.3), MAT.steel)
      hatch.position.set(sx * (RX - 5), BY + H / 2 + 0.7, sz * (RZ - 3))
      g.add(hatch)
    }
  }

  /* 4 个角抱缆框架 */
  for (const sx of [-1, 1] as Array<1 | -1>) {
    for (const sz of [-1, 1] as Array<1 | -1>) {
      const c = clampCorner(sx)
      c.position.z = sz * 11
      g.add(c)
    }
  }

  /* 侧面细节：一排小方窗 + 编号 + 散热栅 + 检修板（沿长边两条） */
  const winMat = MAT.glass
  const winGeo = new THREE.BoxGeometry(1.5, 1.1, 0.3)
  const addSideWindows = (z: number) => {
    for (let k = -3; k <= 3; k++) {
      const w = new THREE.Mesh(winGeo, winMat)
      w.position.set(k * 4.2, BY + 0.5, z)
      w.rotation.y = z > 0 ? 0 : Math.PI
      g.add(w)
    }
  }
  addSideWindows(RZ + 0.35)
  addSideWindows(-RZ - 0.35)
  // 端侧（短边，切角处各 2 窗）
  for (const sx of [-1, 1]) {
    for (const z of [-4.5, 4.5]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 1.5), winMat)
      w.position.set(sx * (RX + 0.35), BY + 0.5, z)
      g.add(w)
    }
  }

  /* 前侧敞开深色舱门（在 -Z 短边中央，嵌黑开口 + 门框） */
  const hatchDark = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 0.4), MAT.rubber)
  hatchDark.position.set(0, BY - 0.5, -RZ - 0.4)
  g.add(hatchDark)
  for (const sx of [-1, 1]) {
    const frame = new THREE.Mesh(rbox(0.5, 5.6, 0.7, 0.2), MAT.steel)
    frame.position.set(sx * 3.2, BY - 0.5, -RZ - 0.5)
    g.add(frame)
  }
  const frameTop = new THREE.Mesh(rbox(7, 0.5, 0.7, 0.2), MAT.steel)
  frameTop.position.set(0, BY + 2.4, -RZ - 0.5)
  g.add(frameTop)

  /* SEV-03 编号牌（两侧） */
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTexture('SEV-03', { color: '#22282f', font: 84 }),
    roughness: 0.5,
    metalness: 0.3,
    transparent: true,
    envMapIntensity: 0.5
  })
  for (const z of [RZ + 0.5, -RZ - 0.5]) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(7, 2), labelMat)
    label.position.set(7, BY - 3.2, z)
    label.rotation.y = z > 0 ? 0 : Math.PI
    g.add(label)
  }

  /* 表面 greeble：侧板检修盒、管线、圆形小舱口 */
  for (const z of [RZ + 0.3, -RZ - 0.3]) {
    for (let k = 0; k < 5; k++) {
      const x = -12 + k * 6
      if (Math.abs(x) < 3) continue
      const panel = new THREE.Mesh(rbox(3.6, 2.2, 0.3, 0.25), k % 2 ? MAT.steel : MAT.steelLight)
      panel.position.set(x, BY - 3, z)
      g.add(panel)
    }
    // 散热栅
    for (let k = -1; k <= 1; k++) {
      const vent = new THREE.Mesh(rbox(0.4, 0.4, 4.4, 0.15), MAT.rubber)
      vent.position.set(-8, BY + 3.2, z)
      vent.position.x = -8 + k * 1.6
      g.add(vent)
    }
  }
  // 顶面四角圆柱小设备
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const unit = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 12), MAT.steelDark)
      unit.position.set(sx * (RX - 7), BY + H / 2 + 2, sz * (RZ - 5))
      g.add(unit)
    }
  }

  /* 细颈抱缆（从舱顶收窄到原点导轨）+ 滚轮 */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(2, 4.6, 9, 10), MAT.steelLight)
  neck.position.y = 1
  g.add(neck)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 2.8, 3, 12), MAT.steelDark)
  collar.position.y = -3.6
  g.add(collar)
  const wheelGeo = new THREE.CylinderGeometry(1.7, 1.7, 1.4, 18)
  wheelGeo.rotateZ(Math.PI / 2)
  for (const y of [2, 8]) {
    for (const z of [-2.8, 2.8]) {
      const wheel = new THREE.Mesh(wheelGeo, MAT.steelDark)
      wheel.position.set(0, y, z)
      g.add(wheel)
    }
    const cross = new THREE.Mesh(rbox(2, 2, 7, 0.5), MAT.steelDark)
    cross.position.y = y
    g.add(cross)
  }
  // 天线 + 红灯
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 7, 6), MAT.steelDark)
  ant.position.set(2, 16, 0)
  g.add(ant)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), MAT.redLamp)
  beacon.position.set(2, 20, 0)
  beacon.name = 'cabinBeacon'
  g.add(beacon)

  /* 底部 4 台发动机（切角内侧）+ 白蓝尾焰 */
  const plumes: THREE.Mesh[] = []
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xa6dcff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  const nozzles: Array<[number, number]> = [
    [12, 9], [-12, 9], [12, -9], [-12, -9]
  ]
  nozzles.forEach(([x, z], i) => {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.5, 3.6, 18, 1, true), MAT.steelDark)
    bell.position.set(x, BY - H / 2 - 2, z)
    g.add(bell)
    const plume = new THREE.Mesh(new THREE.ConeGeometry(2.2, 16, 18, 1, true), plumeMat)
    plume.rotation.x = Math.PI
    plume.position.set(x, BY - H / 2 - 11, z)
    plume.name = 'plume'
    g.add(plume)
    plumes.push(plume)
    if (i % 2 === 0) {
      const pipe = new THREE.Mesh(rbox(14, 0.6, 0.6, 0.2), MAT.pipe)
      pipe.position.set(0, BY - H / 2 - 1, z)
      g.add(pipe)
    }
  })
  const engineLight = new THREE.PointLight(0x9fd6ff, 70, 180, 1.8)
  engineLight.position.set(0, BY - H / 2 - 8, 0)
  engineLight.name = 'engineLight'
  g.add(engineLight)

  // 整体缩放（抱缆点仍在本地原点，便于贴导轨），保证 4 角包络在井孔安全半径内
  const CABIN_SCALE = 0.72
  g.scale.setScalar(CABIN_SCALE)

  g.userData.plumes = plumes
  return g
}

/** 每帧：尾焰闪烁 + 轻微姿态抖动；active=false 时熄火 */
export function updateCabin(group: THREE.Group, elapsed: number, active = true): void {
  const plumes = (group.userData.plumes as THREE.Mesh[]) ?? []
  plumes.forEach((p) => (p.visible = active))
  if (active) {
    plumes.forEach((p, i) => {
      const flicker = 0.82 + Math.sin(elapsed * 26 + i * 1.7) * 0.14 + Math.random() * 0.08
      p.scale.set(flicker, 0.8 + Math.random() * 0.45, flicker)
    })
  }
  const light = group.getObjectByName('engineLight') as THREE.PointLight | null
  if (light) light.intensity = active ? 60 + Math.sin(elapsed * 24) * 14 : 0
  const beacon = group.getObjectByName('cabinBeacon') as THREE.Mesh | null
  if (beacon) beacon.visible = Math.sin(elapsed * 5) > -0.3
  group.rotation.z = active ? Math.sin(elapsed * 0.8) * 0.008 : 0
}
