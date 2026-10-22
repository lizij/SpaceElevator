import * as THREE from 'three'
import { MAT } from './materials'
import { rbox } from './geometry'

/** 一艘小型货轮：船体 + 上层建筑 + 集装箱 + 烟囱，沿 +Z 船首 */
function cargoShip(): THREE.Group {
  const g = new THREE.Group()
  const hull = new THREE.Mesh(rbox(15, 5, 40, 1.5, 3), MAT.steelDark)
  hull.position.y = 3
  g.add(hull)
  // 船头斜收
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(2, 7.5, 15, 4), MAT.steelDark)
  bow.rotation.x = Math.PI / 2
  bow.rotation.y = Math.PI / 4
  bow.position.set(0, 3, 25)
  bow.scale.set(1, 0.6, 1)
  g.add(bow)
  // 上层舰桥
  const bridge = new THREE.Mesh(rbox(9, 7, 10, 0.8), MAT.white)
  bridge.position.set(0, 9, -12)
  g.add(bridge)
  const stack = new THREE.Mesh(rbox(2.5, 4, 2.5, 0.5), MAT.orange)
  stack.position.set(0, 13.5, -15)
  g.add(stack)
  // 集装箱
  const colors = [0x8a4b36, 0x3d5a78, 0x4f6b3a]
  for (let i = 0; i < 10; i++) {
    const m = new THREE.MeshStandardMaterial({ color: colors[i % 3], roughness: 0.7, metalness: 0.4 })
    const box = new THREE.Mesh(rbox(5, 3, 8, 0.3), m)
    box.position.set((i % 2 ? 3.2 : -3.2), 7, -4 + Math.floor(i / 2) * 8)
    g.add(box)
  }
  // 桅灯
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), MAT.warmLamp)
  lamp.position.set(0, 16, -12)
  g.add(lamp)
  return g
}

/** 远处返航飞机（极小剪影 + 尾迹） */
function aircraft(): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 9, 8), MAT.white)
  body.rotation.z = Math.PI / 2
  g.add(body)
  const wing = new THREE.Mesh(rbox(2, 0.2, 9, 0.1), MAT.steel)
  g.add(wing)
  const tail = new THREE.Mesh(rbox(0.3, 2.4, 3, 0.1), MAT.steel)
  tail.position.set(-4, 1.2, 0)
  g.add(tail)
  // 尾迹（细白锥）
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0xdfe8f0,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.35, 60, 6, 1, true), trailMat)
  trail.rotation.z = Math.PI / 2
  trail.position.x = -34
  g.add(trail)
  g.scale.setScalar(1.6)
  return g
}

/** 在海面球冠内沿直线往返的货轮船队（返回后由电梯 update 驱动） */
export function buildFleet(): THREE.Group[] {
  const ships: THREE.Group[] = []
  const routes = [
    { ang: 0.6, range: 620, speed: 14, z0: 180 },
    { ang: 2.7, range: 560, speed: 10, z0: -120 },
    { ang: 4.6, range: 680, speed: 18, z0: 60 }
  ]
  routes.forEach((r0) => {
    const ship = cargoShip()
    ship.scale.setScalar(2.2)
    ship.userData.update = (elapsed: number) => {
      const t = (Math.sin(elapsed * 0.02 * (r0.speed / 14) + r0.z0) + 1) / 2
      const dist = 300 + t * (r0.range - 60)
      const x = Math.cos(r0.ang) * dist
      const z = Math.sin(r0.ang) * dist
    ship.position.set(x, -26, z)
      ship.rotation.y = -r0.ang + Math.PI / 2
      // 船首朝向运动方向（往返翻转）
      const moving = Math.cos(elapsed * 0.02 * (r0.speed / 14) + r0.z0)
      if (moving < 0) ship.rotation.y += Math.PI
    }
    ships.push(ship)
  })
  return ships
}

/** 高空绕飞的返航飞机 */
export function buildAircraft(): THREE.Group[] {
  const planes: THREE.Group[] = []
  for (let i = 0; i < 3; i++) {
    const p = aircraft()
    const radius = 620 + i * 120
    const height = 260 + i * 120
    const speed = 0.05 + i * 0.012
    const phase = (i / 3) * Math.PI * 2
    p.userData.update = (elapsed: number) => {
      const a = elapsed * speed + phase
      p.position.set(Math.cos(a) * radius, height, Math.sin(a) * radius)
      p.rotation.y = -a - Math.PI / 2
    }
    planes.push(p)
  }
  return planes
}

/** 桥上车队：在三条桥的车道上缓行的小点（合并到少量 mesh） */
export function buildBridgeTraffic(platformR: number, bridgeLen: number): THREE.Group {
  const g = new THREE.Group()
  const carGeo = rbox(2.2, 1.2, 5, 0.4)
  const mat = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.5, metalness: 0.4 })
  const N = 18
  const inst = new THREE.InstancedMesh(carGeo, mat, N)
  const d = new THREE.Object3D()
  const cars: Array<{ bridge: number; t: number; speed: number; lane: number }> = []
  for (let i = 0; i < N; i++) {
    cars.push({
      bridge: i % 3,
      t: Math.random(),
      speed: 0.02 + Math.random() * 0.02,
      lane: i % 2 ? 1 : -1
    })
  }
  g.userData.update = (elapsed: number) => {
    cars.forEach((car, i) => {
      const t = (elapsed * car.speed + car.t) % 1
      const r = platformR + 20 + t * (bridgeLen - 30)
      const a = (car.bridge / 3) * Math.PI * 2
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a))
      const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a))
      d.position.set(
        dir.x * r + side.x * 4.5 * car.lane,
        9.4,
        dir.z * r + side.z * 4.5 * car.lane
      )
      d.rotation.set(0, -a, 0)
      d.updateMatrix()
      inst.setMatrixAt(i, d.matrix)
    })
    inst.instanceMatrix.needsUpdate = true
  }
  g.add(inst)
  return g
}
