import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** 倒角方箱（避免生硬直角） */
export function rbox(w: number, h: number, d: number, r = 0.5, segments = 2): RoundedBoxGeometry {
  return new RoundedBoxGeometry(w, h, d, segments, r)
}

/** 合并几何体并释放源几何（自动统一索引模式，避免混合 indexed/non-indexed 返回 null） */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const norm = geos
    .filter((g) => g && g.getAttribute('position') && g.getAttribute('position').count > 0)
    .map((g) => (g.index ? g.toNonIndexed() : g))
  const m = mergeGeometries(norm, false)!
  m.computeVertexNormals()
  geos.forEach((g) => g.dispose())
  return m
}

const UP = new THREE.Vector3(0, 1, 0)

/** 沿两点的圆柱梁几何体 */
export function beamGeo(a: THREE.Vector3, b: THREE.Vector3, radius: number, sides = 8): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  const geo = new THREE.CylinderGeometry(radius, radius, len, sides)
  geo.applyMatrix4(
    new THREE.Matrix4()
      .makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()))
      .setPosition(a.clone().addScaledVector(dir, len / 2))
  )
  return geo
}

/** 环形排列的 InstancedMesh（用于大量重复件，如辐条、泊位、铆钉） */
export function ringInstanced<T extends THREE.BufferGeometry>(
  geo: T,
  mat: THREE.Material,
  count: number,
  radius: number,
  y: number,
  tangent = true
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const d = new THREE.Object3D()
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    d.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius)
    d.rotation.set(0, 0, 0)
    if (tangent) d.rotation.y = -a + Math.PI / 2
    d.updateMatrix()
    mesh.setMatrixAt(i, d.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}
