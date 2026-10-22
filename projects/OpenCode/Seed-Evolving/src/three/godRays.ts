import * as THREE from 'three'
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

/**
 * 屏幕空间体积光束（径向散射近似）：
 * 从太阳屏幕坐标向画面中心反方向做径向模糊，仅累积亮像素，
 * 得到夕阳穿过结构时的光柱效果。需要逐帧更新太阳屏幕坐标与强度。
 */
export class GodRaysPass extends Pass {
  private fsQuad: FullScreenQuad
  private material: THREE.ShaderMaterial
  private sunWorld: THREE.Vector3
  private camera: THREE.PerspectiveCamera

  constructor(camera: THREE.PerspectiveCamera, sunWorld: THREE.Vector3) {
    super()
    this.camera = camera
    this.sunWorld = sunWorld
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
        uSun: { value: new THREE.Vector2(0.5, 0.5) },
        uIntensity: { value: 0 },
        uDecay: { value: 0.93 },
        uDensity: { value: 0.72 },
        uWeight: { value: 0.11 },
        uSamples: { value: 56.0 },
        uAspect: { value: 1.0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec2 uSun;
        uniform float uIntensity;
        uniform float uDecay;
        uniform float uDensity;
        uniform float uWeight;
        uniform float uSamples;
        uniform float uAspect;
        varying vec2 vUv;
        void main() {
          vec4 base = texture2D(tDiffuse, vUv);
          if (uIntensity <= 0.001) { gl_FragColor = base; return; }

          vec2 coord = vUv;
          vec2 delta = (coord - uSun) * (uDensity / uSamples);
          // 还原方形采样
          delta.x *= uAspect;
          float illum = 1.0;
          vec3 rays = vec3(0.0);
          for (float i = 0.0; i < 64.0; i++) {
            if (i >= uSamples) break;
            coord -= delta;
            vec2 sc = vec2(coord.x / uAspect, coord.y);
            if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0) {
              illum *= uDecay;
              continue;
            }
            vec3 s = texture2D(tDiffuse, sc).rgb;
            // 只让偏亮、偏暖的像素参与光柱
            float lum = max(max(s.r, s.g), s.b);
            float warm = clamp(s.r * 1.2 - s.b * 0.6, 0.0, 1.0);
            s *= smoothstep(0.45, 1.0, lum) * (0.5 + warm);
            rays += s * illum * uWeight;
            illum *= uDecay;
          }
          // 太阳越接近画面中心方向，光束越自然；屏幕外淡出
          vec2 d = vUv - uSun;
          d.x *= uAspect;
          float dist = length(d);
          // 仅在太阳周围有限半径内产生光柱，避免正对太阳时横贯整屏
          float mask = 1.0 - smoothstep(0.32, 0.95, dist);
          vec3 tint = vec3(1.0, 0.82, 0.62);
          gl_FragColor = base + vec4(rays * tint * uIntensity * mask, 0.0);
        }
      `
    })
    this.fsQuad = new FullScreenQuad(this.material)
  }

  setSize(width: number, height: number) {
    this.material.uniforms.uAspect.value = width / height
  }

  /** 每帧：根据太阳相对相机的可见性更新强度 */
  update(occluded: boolean) {
    const v = this.sunWorld.clone().project(this.camera)
    const u = this.material.uniforms
    u.uSun.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
    // 太阳在相机前方且未被完全遮挡才有光束；接近地平线时最强
    const inFront = v.z < 1
    const screenEdge = Math.hypot(v.x, v.y)
    const edgeFade = 1.0 - THREE.MathUtils.clamp((screenEdge - 0.6) / 0.9, 0, 1)
    const target = inFront ? (occluded ? 0.1 : 0.38) * edgeFade : 0
    u.uIntensity.value += (target * 0.34 - u.uIntensity.value) * 0.08
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.material.uniforms.tDiffuse.value = readBuffer.texture
    if (this.renderToScreen) renderer.setRenderTarget(null)
    else renderer.setRenderTarget(writeBuffer)
    this.fsQuad.render(renderer)
  }

  dispose() {
    this.material.dispose()
    this.fsQuad.dispose()
  }
}
