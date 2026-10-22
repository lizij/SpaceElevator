import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uGrain: { value: 0.012 },
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
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uGrain;
    varying vec2 vUv;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 centered = vUv - 0.5;

      // subtle lens fringing toward the edges
      float fringe = dot(centered, centered) * 0.0024;
      float r = texture2D(tDiffuse, vUv + centered * fringe).r;
      float b = texture2D(tDiffuse, vUv - centered * fringe).b;
      color.r = mix(color.r, r, 0.65);
      color.b = mix(color.b, b, 0.65);

      // vignette
      float vig = smoothstep(0.98, 0.3, length(centered * vec2(1.08, 1.24)));
      color.rgb *= mix(0.8, 1.0, vig);

      // animated film grain
      float n = hash21(vUv * uResolution + fract(uTime) * 431.0);
      color.rgb += (n - 0.5) * uGrain;

      gl_FragColor = color;
    }
  `,
};

export class PostRenderer {
  readonly composer: EffectComposer;
  private renderPass: RenderPass;
  private bloom: UnrealBloomPass;
  private grain: ShaderPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.52, 0.38, 0.86);
    this.grain = new ShaderPass(GrainShader);
    const output = new OutputPass();

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.grain);
    this.composer.addPass(output);
  }

  setScene(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
  }

  setBloom(strength: number, threshold = 0.86): void {
    this.bloom.strength = strength;
    this.bloom.threshold = threshold;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    (this.grain.material.uniforms.uResolution.value as THREE.Vector2).set(width * pixelRatio, height * pixelRatio);
  }

  render(dt: number): void {
    (this.grain.material.uniforms.uTime.value as number) += dt;
    this.composer.render(dt);
  }
}
