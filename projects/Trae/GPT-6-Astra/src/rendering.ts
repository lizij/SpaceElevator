import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

class SolidGeometryAO extends SSAOPass {
  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean) {
    const hidden: THREE.Object3D[] = [];
    this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !object.visible) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some(material => material.transparent || material instanceof THREE.ShaderMaterial)) {
        hidden.push(object); object.visible = false;
      }
    });
    // Alpha atmosphere/plumes must not become opaque surfaces in the normal
    // pass. Restore their visibility even if the renderer throws.
    try { super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive); }
    finally { hidden.forEach(object => object.visible = true); }
  }
}

export class ExhibitionRenderer {
  private composer: EffectComposer;
  private occlusion: SSAOPass;
  private bloom: UnrealBloomPass;
  private highQuality = true;
  private cinematic = true;
  private radius = .65;

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.PerspectiveCamera) {
    // SSAOPass multiplies into the existing scene color without clearing it.
    // MSAA resolves may invalidate that color renderbuffer on tile GPUs, so
    // postprocessing uses single-sample targets and the final SMAA pass.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.occlusion = new SolidGeometryAO(scene, camera, 1, 1, 16);
    // SSAOPass defaults to a DEPTH24_STENCIL8 texture on a depth-only target.
    // Adding MSAA to it produces incompatible depth resolve attachments
    // (GL_INVALID_OPERATION) in ANGLE. Keep depth single-sampled throughout.
    const depth = this.occlusion.normalRenderTarget.depthTexture!;
    depth.format = THREE.DepthFormat;
    depth.type = THREE.UnsignedIntType;
    this.occlusion.minDistance = .000005;
    this.occlusion.maxDistance = .0007;
    this.composer.addPass(this.occlusion);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .12, .35, 1.65);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new SMAAPass());
    renderer.info.autoReset = false;
  }

  resize(width: number, height: number, highQuality: boolean) {
    this.highQuality = highQuality;
    // Composer remains allocated at a bounded size even when direct rendering
    // is selected; switching modes neither leaks nor compiles new shaders.
    this.composer.setPixelRatio(highQuality ? Math.min(this.renderer.getPixelRatio(), 1.5) : 1);
    this.composer.setSize(width, height);
    const scale = highQuality ? Math.min(this.renderer.getPixelRatio(), 1.5) : .5;
    this.occlusion.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    this.syncProjection();
  }

  setLook(cinematic: boolean, radius: number) {
    this.cinematic = cinematic;
    this.radius = radius;
    this.bloom.enabled = cinematic;
    this.syncProjection();
  }

  private syncProjection() {
    const uniforms = this.occlusion.ssaoMaterial.uniforms;
    uniforms.cameraNear.value = this.camera.near;
    uniforms.cameraFar.value = this.camera.far;
    uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix);
    uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);
    this.occlusion.kernelRadius = this.radius;
    // SSAO distance thresholds are fractions of the clip interval; keep the
    // physical thickness stable when switching to a tightly clipped interior.
    this.occlusion.minDistance = .015 / (this.camera.far - this.camera.near);
    this.occlusion.maxDistance = (this.radius * 4) / (this.camera.far - this.camera.near);
  }

  render() {
    this.renderer.info.reset();
    if (this.highQuality && this.cinematic) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}

// A procedural sky dome supplies a distant atmospheric horizon over the sea.
// It is geometry/shader code, with no downloaded background images.
export function buildHarborSky() {
  return new THREE.Mesh(new THREE.SphereGeometry(3200, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      sunDirection: { value: new THREE.Vector3(-.7, .27, -.55).normalize() },
      horizonColor: { value: new THREE.Color(0x829597) }
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      varying vec3 vDirection;
      uniform vec3 sunDirection;
      uniform vec3 horizonColor;
      void main() {
        vec3 d = normalize(vDirection);
        float elevation = max(d.y, 0.);
        vec3 horizon = horizonColor;
        vec3 zenith = vec3(.095, .17, .23);
        vec3 sky = mix(horizon, zenith, pow(elevation, .4));
        float sun = max(dot(d, sunDirection), 0.);
        sky += vec3(.38, .29, .15) * pow(sun, 12.) * .55;
        sky += vec3(1., .85, .65) * pow(sun, 1800.) * 3.;
        gl_FragColor = vec4(sky, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
}
