import * as THREE from 'three'

export interface HotspotDef {
  id: string
  label: string
  /** 世界坐标锚点（getPosition 为空时使用） */
  position?: THREE.Vector3
  /** 动态锚点（如运动中的轿厢），优先于 position */
  getPosition?: () => THREE.Vector3
  /** 点击聚焦时的相机观察目标（世界坐标），默认等于锚点 */
  focus?: THREE.Vector3
  /** 聚焦时相机相对观察目标的距离，越小越贴近 */
  focusDistance?: number
}

export interface HotspotLayer {
  update: () => void
  onClick: (cb: (id: string) => void) => void
}

/**
 * 创建 HTML 热点标注层：
 * 每帧把 3D 锚点投影到屏幕，并用深度缓冲判断是否被地球/空间站遮挡。
 */
export function createHotspotLayer(
  defs: HotspotDef[],
  camera: THREE.PerspectiveCamera,
  container: HTMLElement,
  scene: THREE.Scene
): HotspotLayer {
  const els = new Map<string, HTMLButtonElement>()
  const raycaster = new THREE.Raycaster()
  // 仅以不透明网格作为遮挡物，排除星空 Points、云层/大气/光焰等透明体
  const occluders: THREE.Object3D[] = []
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as THREE.Material | THREE.Material[]
    const transparent = Array.isArray(mat) ? mat.some((m) => m.transparent) : mat.transparent
    if (!transparent) occluders.push(mesh)
  })

  defs.forEach((def) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'hotspot'
    el.innerHTML = `<span class="dot"></span><span>${def.label}</span>`
    container.appendChild(el)
    els.set(def.id, el)
  })

  let clickCb: ((id: string) => void) | null = null
  els.forEach((el, id) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      clickCb?.(id)
    })
  })

  const v = new THREE.Vector3()
  const camDir = new THREE.Vector3()
  const toPoint = new THREE.Vector3()

  const update = () => {
    camera.getWorldDirection(camDir)
    defs.forEach((def) => {
      const el = els.get(def.id)!
      const pos = def.getPosition ? def.getPosition() : (def.position as THREE.Vector3)
      v.copy(pos).project(camera)

      const inFront = toPoint.copy(pos).sub(camera.position).dot(camDir) > 0
      if (!inFront || v.z > 1) {
        el.style.display = 'none'
        return
      }
      el.style.display = ''

      const x = (v.x * 0.5 + 0.5) * window.innerWidth
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight
      el.style.left = `${x}px`
      el.style.top = `${y}px`

      // 遮挡检测：从相机到锚点之间是否先碰到其它网格
      const origin = camera.position.clone()
      const dir = pos.clone().sub(origin)
      const dist = dir.length()
      raycaster.set(origin, dir.normalize())
      raycaster.far = dist - 4
      const hit = raycaster.intersectObjects(occluders, true).length > 0
      el.classList.toggle('occluded', hit)
    })
  }

  return {
    update,
    onClick: (cb) => (clickCb = cb)
  }
}
