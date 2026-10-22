import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GodRaysPass } from './three/godRays'

import './style.css'
import {
  EARTH_RADIUS,
  HOME,
  CAMERA_LIMITS,
  TOWER_HEIGHT,
  STATION_HEIGHT,
  COUNTERWEIGHT_HEIGHT
} from './config'
import { SUN_DIR } from './three/world'
import { createWorld } from './three/world'
import { createElevator } from './three/elevator'
import { createCameraRig } from './three/cameraRig'
import { createHotspotLayer, type HotspotDef } from './ui/hotspots'

/** 黄昏天空：天顶深蓝 → 地平线暖橙（CanvasTexture 作为等距背景） */
function makeSkyTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 512
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#070d1c')
  g.addColorStop(0.45, '#1b2c46')
  g.addColorStop(0.72, '#5a4a44')
  g.addColorStop(0.88, '#b07a4e')
  g.addColorStop(1, '#e0a866')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 16, 512)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const DETAILS: Record<string, { title: string; text: string }> = {
  base: {
    title: '赤道海上基地',
    text: '设定直径 3 公里、高 2 公里的巨型海上平台：圆形人工岛 + 水下阻尼浮筒，中央三根格构主塔交汇锚固 216 根碳纳米缆绳，周围均分三组、共十二组发射塔，用硬连杆像抛石机一样为轿厢叠加初速度。'
  },
  cable: {
    title: '碳纳米缆绳束',
    text: '9 部轿厢由 216 根粗细不等的碳纳米缆绳垂直牵引，从海面三塔汇交点直抵近地轨道，穿过方舟空间站后继续延伸至 9 万公里外的末端配重。真实长度无法同屏展示，此处为艺术化压缩。'
  },
  cabin: {
    title: '爬升轿厢',
    text: '视觉原型是建筑工地的垂直施工升降机：白色方箱货舱、橙色警示涂装、导向滚轮抱缆，底部四台发动机喷出白蓝色尾焰，单舱运力为现役最大火箭的 4 倍。点击后镜头跟随其位置聚焦。'
  },
  station: {
    title: '方舟空间站',
    text: '位于 3.6 万公里地球同步轨道，模块化工业旋转环通过离心力模拟重力，缆绳从核心舱中心穿过，环上设对接臂与太阳能翼。它是人员物资前往月球的中转停泊点。'
  },
  counterweight: {
    title: '末端配重',
    text: '电梯在距地表约 9 万公里处设置的配重段，借助地球自转的离心力把整根缆绳绷直，维持太空电梯的轨道平衡。'
  }
}

function bootstrap() {
  const app = document.getElementById('app')!

  // 渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  app.appendChild(renderer.domElement)

  // 场景与相机
  const scene = new THREE.Scene()
  // 黄昏天空渐变背景（地平线暖橙 → 天顶深蓝）
  const sky = makeSkyTexture()
  scene.background = sky
  scene.fog = new THREE.FogExp2(0x24201c, 0.00009)

  // 环境反射：给金属与白蒙皮提供 PBR 高光（不显示背景）
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    1,
    EARTH_RADIUS * 20
  )
  // 开发期可用 ?cam=x,y,z&look=x,y,z 覆盖初始机位
  const sp = new URLSearchParams(location.search).get('cam')?.split(',').map(Number)
  const lk = new URLSearchParams(location.search).get('look')?.split(',').map(Number)
  camera.position.set(...((sp && sp.length === 3 ? (sp as [number, number, number]) : HOME.position)))

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(...((lk && lk.length === 3 ? (lk as [number, number, number]) : HOME.target)))
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.minDistance = CAMERA_LIMITS.minDistance
  controls.maxDistance = CAMERA_LIMITS.maxDistance
  controls.minPolarAngle = CAMERA_LIMITS.minPolar
  controls.maxPolarAngle = CAMERA_LIMITS.maxPolar
  controls.autoRotateSpeed = 0.5
  controls.update()

  // 场景内容
  const world = createWorld()
  scene.add(world.group)
  const elevator = createElevator()
  scene.add(elevator.group)


  // 后期：辉光
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, // 强度
    0.55, // 半径
    0.82 // 阈值（暖光舷窗/尾焰发光）
  )
  composer.addPass(bloom)

  // 屏幕空间太阳光束（放在 Bloom 之后、Output 之前）
  const sunWorld = SUN_DIR.clone().multiplyScalar(EARTH_RADIUS * 5)
  const godRays = new GodRaysPass(camera, sunWorld)
  godRays.setSize(window.innerWidth, window.innerHeight)
  composer.addPass(godRays)

  composer.addPass(new OutputPass())

  // 太阳是否被地球遮挡（射线检测地球球心距离）
  const earthCenter = new THREE.Vector3(0, EARTH_RADIUS, 0)
  const sunOccludedRaycaster = new THREE.Raycaster()
  const sunOccluded = (): boolean => {
    const oc = camera.position.clone().sub(earthCenter)
    const sd = sunWorld.clone().sub(camera.position).normalize()
    const proj = oc.dot(sd)
    const closest = oc.clone().sub(sd.clone().multiplyScalar(proj)).length()
    return closest < EARTH_RADIUS * 1.02 && proj > 0
  }
  void sunOccludedRaycaster

  // 镜头编排
  const homePos = new THREE.Vector3(...HOME.position)
  const homeTarget = new THREE.Vector3(...HOME.target)
  const rig = createCameraRig(camera, controls, homePos, homeTarget)

  // 热点标注
  const worldPos = (local: THREE.Vector3) =>
    local.clone().add(new THREE.Vector3(0, EARTH_RADIUS, 0))
  const defs: HotspotDef[] = [
    {
      id: 'base',
      label: '海上基地',
      position: worldPos(new THREE.Vector3(150, 30, 60)),
      focus: worldPos(new THREE.Vector3(0, 120, 0)),
      focusDistance: 420
    },
    {
      id: 'cable',
      label: '碳纳米缆绳束',
      position: worldPos(new THREE.Vector3(0, (TOWER_HEIGHT + STATION_HEIGHT) / 2, 0)),
      focus: worldPos(new THREE.Vector3(0, (TOWER_HEIGHT + STATION_HEIGHT) / 2, 0)),
      focusDistance: 240
    },
    {
      id: 'cabin',
      label: '爬升轿厢',
      getPosition: () => elevator.cabin.getWorldPosition(new THREE.Vector3()),
      focusDistance: 70
    },
    {
      id: 'station',
      label: '方舟空间站',
      position: worldPos(new THREE.Vector3(0, STATION_HEIGHT, 0)),
      focus: worldPos(new THREE.Vector3(0, STATION_HEIGHT, 0)),
      focusDistance: 260
    },
    {
      id: 'counterweight',
      label: '末端配重',
      position: worldPos(new THREE.Vector3(0, COUNTERWEIGHT_HEIGHT, 0)),
      focus: worldPos(new THREE.Vector3(0, COUNTERWEIGHT_HEIGHT, 0)),
      focusDistance: 220
    }
  ]
  const hotspotLayer = createHotspotLayer(
    defs,
    camera,
    document.getElementById('hotspots')!,
    scene
  )

  // 详情卡片
  const detailEl = document.getElementById('detail')!
  const detailTitle = document.getElementById('detail-title')!
  const detailText = document.getElementById('detail-text')!
  const showDetail = (id: string) => {
    const d = DETAILS[id]
    if (!d) return
    detailTitle.textContent = d.title
    detailText.textContent = d.text
    detailEl.classList.remove('hidden')
  }
  document.getElementById('detail-close')!.addEventListener('click', () => {
    detailEl.classList.add('hidden')
  })

  // 点击热点：镜头聚焦 + 弹卡片
  hotspotLayer.onClick((id) => {
    const def = defs.find((d) => d.id === id)!
    const target = def.getPosition
      ? elevator.cabin.getWorldPosition(new THREE.Vector3())
      : (def.focus ?? def.position!)
    rig.focus(target, def.focusDistance ?? 200)
    showDetail(id)
  })

  // 工具栏
  const btnReset = document.getElementById('btn-reset')!
  const btnAuto = document.getElementById('btn-auto')!
  const btnPause = document.getElementById('btn-pause')!
  let paused = false
  let autoOn = false
  const setPaused = (v: boolean) => {
    paused = v
    btnPause.textContent = v ? '▶ 播放' : '⏸ 暂停'
    btnPause.classList.toggle('active', v)
    btnPause.setAttribute('aria-pressed', String(v))
    controls.autoRotate = autoOn && !v
  }
  btnPause.addEventListener('click', () => setPaused(!paused))
  // 轿厢跟随视角
  const btnFollow = document.getElementById('btn-follow')!
  btnFollow.addEventListener('click', () => {
    if (rig.isFollowing()) {
      rig.follow(null, 0)
      btnFollow.classList.remove('active')
      rig.reset()
    } else {
      rig.follow(elevator.cabin.getWorldPosition(new THREE.Vector3()), 150)
      btnFollow.classList.add('active')
    }
  })
  // 手动操作或点复位/热点时退出跟随
  controls.addEventListener('start', () => {
    if (rig.isFollowing()) {
      rig.follow(null, 0)
      btnFollow.classList.remove('active')
    }
  })
  // 发射演出
  document.getElementById('btn-launch')!.addEventListener('click', () => {
    elevator.triggerLaunch()
    const flash = document.getElementById('launch-flash')!
    flash.classList.remove('go')
    void flash.offsetWidth
    flash.classList.add('go')
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') setPaused(!paused)
  })
  btnReset.addEventListener('click', () => rig.reset())
  btnAuto.addEventListener('click', () => {
    autoOn = !autoOn
    controls.autoRotate = autoOn && !paused
    btnAuto.classList.toggle('active', autoOn)
  })

  // 自适应
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    composer.setSize(window.innerWidth, window.innerHeight)
    godRays.setSize(window.innerWidth, window.innerHeight)
  })

  // 渲染循环（simTime 在暂停时冻结，相机仍可手动操控）
  const clock = new THREE.Clock()
  let simTime = 0
  let firstFrame = true
  const animate = () => {
    requestAnimationFrame(animate)
    const dt = clock.getDelta()
    if (!paused) simTime += dt
    elevator.update(simTime)
    world.update(simTime)
    rig.update()
    if (rig.isFollowing()) {
      rig.updateFollowTarget(elevator.cabin.getWorldPosition(new THREE.Vector3()))
    }
    controls.update()
    hotspotLayer.update()
    godRays.update(sunOccluded())
    composer.render()

    if (firstFrame) {
      firstFrame = false
      const loader = document.getElementById('loader')
      loader?.classList.add('gone')
      setTimeout(() => loader?.remove(), 700)
    }
  }
  animate()
}

bootstrap()
