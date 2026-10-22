import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface Tween {
  start: number
  duration: number
  fromPos: THREE.Vector3
  toPos: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
}

export interface CameraRig {
  /** 平滑聚焦到指定目标；相机沿当前方向停在 distance 处 */
  focus: (target: THREE.Vector3, distance: number) => void
  /** 复位到初始视角 */
  reset: () => void
  /** 进入/退出跟随模式：进入时平滑过渡到目标 */
  follow: (target: THREE.Vector3 | null, distance: number) => void
  /** 跟随目标（每帧更新） */
  updateFollowTarget: (world: THREE.Vector3 | null) => void
  isFollowing: () => boolean
  update: () => void
  isMoving: () => boolean
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  homePos: THREE.Vector3,
  homeTarget: THREE.Vector3
): CameraRig {
  let tween: Tween | null = null
  let following: THREE.Vector3 | null = null // 跟随目标世界坐标（每帧更新）
  const duration = 1400

  const run = (toTarget: THREE.Vector3, distance: number, fromHome?: boolean) => {
    const dir = camera.position.clone().sub(controls.target)
    if (dir.lengthSq() < 1e-4) dir.set(1, 0.6, 1)
    dir.normalize()
    const toPos = toTarget.clone().addScaledVector(dir, distance)
    tween = {
      start: performance.now(),
      duration: fromHome ? 1600 : duration,
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls.target.clone(),
      toTarget: toTarget.clone()
    }
  }

  const focus = (target: THREE.Vector3, distance: number) => {
    controls.autoRotate = false
    following = null
    run(target, distance)
  }

  const follow = (target: THREE.Vector3 | null, distance: number) => {
    if (!target) {
      following = null
      return
    }
    following = target.clone()
    controls.autoRotate = false
    run(target, distance)
  }

  const updateFollowTarget = (world: THREE.Vector3 | null) => {
    if (!following || !world) return
    // 保持当前相机相对目标的偏移，平滑跟随
    const offset = camera.position.clone().sub(controls.target)
    const k = 0.12
    following.lerp(world, k)
    controls.target.lerp(world, k)
    camera.position.copy(controls.target).add(offset)
  }

  const isFollowing = () => following !== null
  const reset = () => {
    following = null
    run(homeTarget, homePos.distanceTo(homeTarget), true)
    if (tween) tween.toPos.copy(homePos)
  }

  const update = () => {
    if (!tween) return
    const t = Math.min(1, (performance.now() - tween.start) / tween.duration)
    const k = easeInOut(t)
    camera.position.lerpVectors(tween.fromPos, tween.toPos, k)
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k)
    if (t >= 1) tween = null
  }

  const isMoving = () => tween !== null

  // 用户一旦手动拖拽/缩放，立即取消镜头动画
  const cancel = () => {
    if (tween) tween = null
  }
  controls.addEventListener('start', cancel)

  return { focus, reset, follow, updateFollowTarget, isFollowing, update, isMoving }
}
