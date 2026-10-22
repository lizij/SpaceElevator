import * as THREE from 'three'
import { EARTH_RADIUS, OCEAN_RADIUS, PLATFORM_RADIUS } from '../config'

export interface World {
  group: THREE.Group
  earth: THREE.Mesh
  clouds: THREE.Mesh
  update: (elapsed: number) => void
}

/** 世界光照共用的黄昏太阳方向（main 的体积光束需要）。
 *  位于默认视野中电梯后方低空：逆光剪影 + 光柱，并靠冷色补光保留结构细节。 */
export const SUN_DIR = new THREE.Vector3(-0.62, 0.13, -0.34).normalize()

let fbmGlobal: ((x: number, y: number) => number) | null = null

/** 程序化生成地表纹理：深蓝灰海洋 + 噪声大陆（旧化冷色调，贴近电影质感） */
function makeEarthTexture(): THREE.CanvasTexture {
  const w = 2048
  const h = 1024
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const ocean = ctx.createLinearGradient(0, 0, 0, h)
  ocean.addColorStop(0, '#081527')
  ocean.addColorStop(0.5, '#0e2742')
  ocean.addColorStop(1, '#081527')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, w, h)

  // 值噪声 / fbm
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  let seed = 20230122
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const fade = (t: number) => t * t * (3 - 2 * t)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const grad = (hsh: number, x: number, y: number) => {
    const u = hsh % 2 ? x : -x
    const v = hsh % 4 < 2 ? y : -y
    return u + v
  }
  const noise2 = (x: number, y: number) => {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    const u = fade(x)
    const v = fade(y)
    const a = perm[X] + Y
    const b = perm[X + 1] + Y
    return lerp(
      lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
      lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u),
      v
    )
  }
  const fbm = (x: number, y: number) => {
    let val = 0
    let amp = 0.55
    let freq = 2.2
    for (let o = 0; o < 5; o++) {
      val += amp * noise2(x * freq, y * freq)
      freq *= 2
      amp *= 0.5
    }
    return val
  }
  fbmGlobal = fbm

  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  // 基地固定在北极，强制在北极球冠（约 37°）内为开阔海洋，与海面球冠对齐
  const polarOcean = 0.66
  for (let y = 0; y < h; y++) {
    const lat = y / h
    const theta = lat * Math.PI // 0=北极
    const polar = Math.abs(lat - 0.5) * 2
    const forceOcean = theta < polarOcean
    // 边界带做海岸线混合
    const blend = forceOcean ? THREE.MathUtils.smoothstep(theta, polarOcean - 0.08, polarOcean) : 1
    for (let x = 0; x < w; x++) {
      const n = fbm(x / w, y / h)
      const land = n > 0.08 - polar * 0.02
      const i = (y * w + x) * 4
      const ocean = [10, 26, 54 + Math.floor(n * 34)] as const
      if (land && blend > 0.05) {
        const coast = Math.min(1, (n - 0.02) * 4)
        let lr: number, lg: number, lb: number
        if (polar > 0.82) {
          lr = 190; lg = 208; lb = 224
        } else {
          lr = 34 + 26 * coast * (1 - polar * 0.5)
          lg = 46 + 46 * coast * (1 - polar * 0.5)
          lb = 44 + 30 * coast
        }
        d[i] = ocean[0] * (1 - blend) + lr * blend
        d[i + 1] = ocean[1] * (1 - blend) + lg * blend
        d[i + 2] = ocean[2] * (1 - blend) + lb * blend
      } else {
        d[i] = ocean[0]
        d[i + 1] = ocean[1]
        d[i + 2] = ocean[2]
      }
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function makeCloudTexture(): THREE.CanvasTexture {
  const s = 1024
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s / 2
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, s, s / 2)
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * s
    // 严格限制在赤道带（约纬度 ±54° 以内），保证北极基地球冠（36°）上空无云
    const y = (0.36 + Math.random() * 0.28) * (s / 2)
    const r = 10 + Math.random() * 30
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  return new THREE.CanvasTexture(canvas)
}

function makeStars(): THREE.Points {
  const count = 4500
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const r = EARTH_RADIUS * (3.2 + Math.random() * 2.6)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi)
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    const warm = Math.random()
    colors[i * 3] = 0.8 + warm * 0.2
    colors[i * 3 + 1] = 0.85 + warm * 0.15
    colors[i * 3 + 2] = 1.0
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 2.6,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    })
  )
}

/** 基地周边海面/夜半球灯火（船只、沿岸城市） */
function makeCityLights(): THREE.Points {
  const count = 1500
  const positions = new Float32Array(count * 3)
  const R = EARTH_RADIUS + 1.0
  for (let i = 0; i < count; i++) {
    const ang = Math.acos(1 - Math.pow(Math.random(), 2) * 0.06)
    const az = Math.random() * Math.PI * 2
    const y = R * Math.cos(ang)
    const ring = R * Math.sin(ang)
    positions[i * 3] = ring * Math.cos(az)
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = ring * Math.sin(az)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffcf88,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  )
}

function makeAtmosphere(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(EARTH_RADIUS * 1.035, 64, 64)
  const mat = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0x4a96e8) } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.2);
        gl_FragColor = vec4(glowColor, rim * 0.85);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  })
  return new THREE.Mesh(geo, mat)
}

/**
 * 局部海面：贴在地球球面上的球冠（避免平面相对曲率悬空），
 * 自定义着色器做多方向波浪 + 太阳反光 + 平台周边泡沫环。
 */
function makeOcean(sunDir: THREE.Vector3): THREE.Mesh {
  const capAngle = OCEAN_RADIUS / EARTH_RADIUS
  const geo = new THREE.SphereGeometry(
    EARTH_RADIUS + 0.8,
    160,
    48,
    0,
    Math.PI * 2,
    0,
    capAngle
  )
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: sunDir.clone().normalize() },
      uDeep: { value: new THREE.Color(0x05101f) },
      uShallow: { value: new THREE.Color(0x123a60) },
      uPlatformR: { value: PLATFORM_RADIUS }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vWaveH;
      void main() {
        vec3 n0 = normalize(position);
        vec3 t1 = normalize(cross(n0, vec3(0.0, 0.0, 1.0)));
        vec3 t2 = normalize(cross(n0, t1));
        vec2 p = position.xz;
        float h = 0.0;
        h += sin(dot(p, vec2(0.021, 0.013)) + uTime * 0.9) * 0.9;
        h += sin(dot(p, vec2(-0.011, 0.026)) + uTime * 1.25) * 0.55;
        h += sin(dot(p, vec2(0.041, -0.022)) + uTime * 1.7) * 0.3;
        float dhx = 0.0;
        dhx += cos(dot(p, vec2(0.021, 0.013)) + uTime * 0.9) * 0.9 * 0.021;
        dhx += cos(dot(p, vec2(-0.011, 0.026)) + uTime * 1.25) * 0.55 * -0.011;
        float dhz = 0.0;
        dhz += cos(dot(p, vec2(0.021, 0.013)) + uTime * 0.9) * 0.9 * 0.013;
        dhz += cos(dot(p, vec2(-0.011, 0.026)) + uTime * 1.25) * 0.55 * 0.026;
        vec3 displaced = position + n0 * (h + 1.2);
        vNormalW = normalize(n0 - t1 * dhx - t2 * dhz);
        vWaveH = h;
        vec4 wp = modelMatrix * vec4(displaced, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform float uPlatformR;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vWaveH;
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(vNormalW, V), 0.0), 2.4);
        vec3 col = mix(uDeep, uShallow, fres * 0.6);
        float diff = max(dot(vNormalW, normalize(uSunDir)), 0.0);
        // 受光面混入黄昏暖色，背光面保持冷蓝
        vec3 warmTint = vec3(1.0, 0.72, 0.46);
        col = mix(col * (0.42 + diff * 0.35), col * (0.5 + diff * 0.6) * warmTint, diff * 0.65);
        // 金色太阳镜面反光
        vec3 H = normalize(normalize(uSunDir) + V);
        float spec = pow(max(dot(vNormalW, H), 0.0), 70.0) * 1.7;
        col += vec3(1.0, 0.78, 0.5) * spec;
        float glint = pow(max(dot(vNormalW, H), 0.0), 240.0) * 2.2;
        col += vec3(1.0, 0.92, 0.72) * glint;
        // 平台周边泡沫环 + 波峰浪花
        float rad = length(vWorld.xz);
        float ring = smoothstep(26.0, 4.0, abs(rad - uPlatformR - 2.0));
        float crest = smoothstep(1.15, 1.55, vWaveH) * 0.25;
        col += vec3(0.7, 0.82, 0.92) * (ring * 0.5 + crest);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'ocean'
  return mesh
}

/**
 * 在贴图中寻找一个中纬度、非冰盖的大洋点（陆地判定与着色一致），
 * 返回把该点旋转到 +Y（电梯正下方）所需的四元数。
 */
function oceanAlignQuaternion(): THREE.Quaternion {
  const fbm = fbmGlobal!
  let best: { u: number; v: number; score: number } | null = null
  for (let i = 0; i < 4000; i++) {
    const u = Math.random()
    const v = 0.18 + Math.random() * 0.64 // 避开两极冰盖
    const n = fbm(u, v)
    const polar = Math.abs(v - 0.5) * 2
    const land = n > 0.08 - polar * 0.02
    if (!land) {
      const score = -n // 越负代表离岸越远的深海
      if (!best || score > best.score) best = { u, v, score }
    }
  }
  const b = best ?? { u: 0.5, v: 0.5, score: 0 }
  // 球面坐标（与 earth 纹理映射一致：x=sinθ, y=cosθ, φ=2πu）
  const theta = b.v * Math.PI
  const phi = b.u * Math.PI * 2
  const normal = new THREE.Vector3(
    Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),
    Math.sin(theta) * Math.sin(phi)
  ).normalize()
  return new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0))
}

/** 一团软云贴图（多个圆斑聚成蓬松云块） */
function makePuffTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  for (let i = 0; i < 14; i++) {
    const x = 70 + Math.random() * 116
    const y = 96 + Math.random() * 70
    const r = 26 + Math.random() * 46
    const g = ctx.createRadialGradient(x, y, 2, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** 低空远云（两圈）+ 平台周边海面水汽，缓慢绕转（暂停即停） */
function makeSkyDetails(): { group: THREE.Group; update: (t: number) => void } {
  const group = new THREE.Group()
  const tex = makePuffTexture()

  const lowClouds = new THREE.Group()
  const cloudMat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xffd9b0,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    fog: true
  })
  const rings = [
    { r: 360, y: 120, n: 9, s: 300 },
    { r: 600, y: 180, n: 11, s: 380 }
  ]
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + ri
      const sp = new THREE.Sprite(cloudMat)
      sp.position.set(Math.cos(a) * ring.r, ring.y + Math.random() * 60, Math.sin(a) * ring.r)
      sp.scale.set(ring.s * (0.8 + Math.random() * 0.6), ring.s * 0.42, 1)
      lowClouds.add(sp)
    }
  })
  group.add(lowClouds)

  // 海面水汽（贴着平台外圈的低矮雾团）
  const mist = new THREE.Group()
  const mistMat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xd2dbe6,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    fog: true
  })
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2
    const r = 200 + Math.random() * 240
    const sp = new THREE.Sprite(mistMat)
    sp.position.set(Math.cos(a) * r, 16 + Math.random() * 22, Math.sin(a) * r)
    sp.scale.set(200 + Math.random() * 160, 70, 1)
    mist.add(sp)
  }
  group.add(mist)

  const update = (t: number) => {
    lowClouds.rotation.y = t * 0.006
    mist.rotation.y = -t * 0.012
  }
  return { group, update }
}

/** 太阳圆盘 + 辉光（Sprite，始终朝向相机） */
function makeSun(sunDir: THREE.Vector3): THREE.Group {
  const g = new THREE.Group()
  const [c, ctx] = [document.createElement('canvas'), null]
  c.width = c.height = 256
  const cx = c.getContext('2d')!
  const grad = cx.createRadialGradient(128, 128, 6, 128, 128, 124)
  grad.addColorStop(0, 'rgba(255,246,224,1)')
  grad.addColorStop(0.18, 'rgba(255,228,180,0.95)')
  grad.addColorStop(0.45, 'rgba(255,180,110,0.35)')
  grad.addColorStop(1, 'rgba(255,160,90,0)')
  cx.fillStyle = grad
  cx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }))
  sprite.scale.setScalar(520)
  g.add(sprite)
  g.position.copy(sunDir.clone().multiplyScalar(EARTH_RADIUS * 5))
  void ctx
  return g
}

export function createWorld(): World {
  const group = new THREE.Group()

  // 黄昏低角度暖阳（从相机一侧照射，暖光铺满基地与海面）
  const sunDir = SUN_DIR.clone()

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 96, 96),
    new THREE.MeshStandardMaterial({
      map: makeEarthTexture(),
      roughness: 0.94,
      metalness: 0.04,
      emissive: new THREE.Color(0x081425),
      emissiveIntensity: 0.22
    })
  )
  // 基地固定在北极，纹理已在北极球冠强制开洋，无需旋转对齐
  group.add(earth)

  // 灯火锚定在电梯基地周围（不跟随地球纹理自转）
  const lights = makeCityLights()
  group.add(lights)

  // 云层作为地球子节点继承对齐旋转，使电梯正上方（贴图顶部晴空带）无云
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 1.014, 64, 64),
    new THREE.MeshStandardMaterial({
      map: makeCloudTexture(),
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      roughness: 1
    })
  )
  earth.add(clouds)

  const ocean = makeOcean(sunDir)
  group.add(ocean)

  group.add(makeAtmosphere())
  group.add(makeStars())
  group.add(makeSun(sunDir))
  const skyDetails = makeSkyDetails()
  group.add(skyDetails.group)

  // 冷蓝天空光（逆光下强补光，保留阴影面结构）+ 暖色低角度太阳
  const hemi = new THREE.HemisphereLight(0xa6c2ee, 0x46301c, 1.15)
  const sun = new THREE.DirectionalLight(0xffc07a, 4.0)
  sun.position.copy(sunDir.clone().multiplyScalar(4000))
  group.add(hemi, sun)
  // 相机侧冷色补光（逆光时照亮迎光面细节）
  const fill = new THREE.DirectionalLight(0x6f8fc0, 1.1)
  fill.position.set(0.7, 0.4, 0.7)
  group.add(fill)
  // 基地区域一盏暖补光，模拟黄昏环境对结构的包裹
  const warmFill = new THREE.PointLight(0xffb066, 12000, 2200, 1.6)
  warmFill.position.set(700, EARTH_RADIUS + 600, 600)
  group.add(warmFill)

  const update = (elapsed: number) => {
    const mat = clouds.material as THREE.MeshStandardMaterial
    if (mat.map) mat.map.offset.x = (elapsed * 0.004) % 1
    ;(ocean.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed
    skyDetails.update(elapsed)
  }

  return { group, earth, clouds, update }
}
