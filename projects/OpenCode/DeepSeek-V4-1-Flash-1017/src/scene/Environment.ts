import * as THREE from 'three';
import { cloudTexture, Rng } from './util';
import { createEnvMap, type Theme } from './materials';

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const SKY_FRAG = /* glsl */ `
varying vec3 vDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform vec3 uSunDir;

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float mixT = pow(clamp(h * 3.0, 0.0, 1.0), 0.45);
  vec3 col = mix(uHorizon, uZenith, mixT);

  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * pow(s, 2400.0) * 0.65;
  col += uSunColor * pow(s, 34.0) * 0.09;
  col += uSunColor * pow(s, 4.0) * 0.015;

  col = mix(col, uGround, smoothstep(0.015, -0.14, h));
  col += uHorizon * pow(1.0 - clamp(h, 0.0, 1.0), 9.0) * 0.14;

  gl_FragColor = vec4(col, 1.0);
}
`;

const OCEAN_VERT = /* glsl */ `
varying vec3 vWorldPos;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const OCEAN_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uFoamColor;
uniform vec3 uBase;
uniform float uFoamRadius;

varying vec3 vWorldPos;

#include <fog_pars_fragment>

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void addWave(vec2 p, vec2 dir, float freq, float amp, float speed, inout vec2 grad) {
  float phase = dot(p, dir) * freq + uTime * speed;
  grad += dir * (amp * freq * cos(phase));
}

void main() {
  vec2 p = vWorldPos.xz;
  vec2 grad = vec2(0.0);

  addWave(p, normalize(vec2(1.0, 0.42)), 0.0085, 1.5, 0.55, grad);
  addWave(p, normalize(vec2(-0.55, 1.0)), 0.016, 0.72, 0.82, grad);
  addWave(p, normalize(vec2(0.85, -0.62)), 0.043, 0.24, 1.45, grad);
  addWave(p, normalize(vec2(-0.92, -0.31)), 0.095, 0.085, 2.15, grad);
  addWave(p, normalize(vec2(0.31, 0.95)), 0.22, 0.032, 3.3, grad);

  float ripple = noise21(p * 0.55 + uTime * 0.22) - 0.5;
  grad += vec2(
    ripple,
    noise21(p * 0.55 - vec2(3.1, 1.7) + uTime * 0.19) - 0.5
  ) * 0.06;

  vec3 normal = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 4.2);
  fresnel = mix(0.035, 1.0, fresnel);

  float tone = 0.38 + 0.24 * noise21(p * 0.018 + uTime * 0.015) - grad.y * 1.6;
  vec3 water = mix(uDeep, uShallow, clamp(tone, 0.0, 1.0));
  vec3 col = mix(water, uSky, fresnel * 0.42);

  vec3 refl = reflect(-viewDir, normal);
  float ndl = max(dot(refl, uSunDir), 0.0);
  float spec = pow(ndl, 900.0);
  float glint = pow(ndl, 120.0) * 0.03;
  col += uSunColor * (spec * 0.45 + glint * 0.5);

  float sparkle = step(0.9986, hash21(floor(p * 0.7) + floor(uTime * 3.0))) * spec * 1.6;
  col += uSunColor * sparkle;

  // Foam belt around the base and along the radial piers.
  float r = length(p - uBase.xz);
  float band = smoothstep(uFoamRadius + 55.0, uFoamRadius + 4.0, r)
             * smoothstep(uFoamRadius - 170.0, uFoamRadius - 24.0, r);
  float fn = noise21(p * 0.022 + vec2(uTime * 0.05, -uTime * 0.03));
  float foam = band * smoothstep(0.46, 0.78, fn);
  foam += smoothstep(0.8, 1.0, noise21(vec2(p.x * 0.011, p.y * 0.035) + uTime * 0.04)) * 0.035;
  col = mix(col, uFoamColor, clamp(foam, 0.0, 1.0) * 0.16);

  // Atmospheric haze toward the horizon.
  float dist = length(cameraPosition - vWorldPos);
  col = mix(col, uSky, smoothstep(14000.0, 42000.0, dist) * 0.8);

  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}
`;

export class BaseEnvironment {
  readonly group = new THREE.Group();
  readonly sky: THREE.Mesh;
  readonly ocean: THREE.Mesh;
  readonly sunLight: THREE.DirectionalLight;
  readonly fillLight: THREE.DirectionalLight;
  readonly hemiLight: THREE.HemisphereLight;
  readonly ambient: THREE.AmbientLight;
  readonly stars: THREE.Points;
  readonly nightLights: THREE.PointLight[] = [];

  private skyUniforms: Record<string, THREE.IUniform>;
  private oceanUniforms: Record<string, THREE.IUniform>;
  private cloudMaterials: THREE.SpriteMaterial[] = [];
  private clouds: THREE.Sprite[] = [];
  private rng = new Rng(20230214);
  private theme: Theme;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, theme: Theme) {
    this.theme = theme;
    this.group.name = 'environment';
    scene.add(this.group);

    /* sky dome */
    this.skyUniforms = {
      uZenith: { value: theme.skyZenith.clone() },
      uHorizon: { value: theme.skyHorizon.clone() },
      uGround: { value: theme.skyGround.clone() },
      uSunColor: { value: theme.skySun.clone() },
      uSunDir: { value: theme.sunDir.clone() },
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(80000, 48, 24),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.sky.name = 'sky';
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -100;
    this.group.add(this.sky);

    /* ocean */
    this.oceanUniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: theme.oceanDeep.clone() },
        uShallow: { value: theme.oceanShallow.clone() },
        uSky: { value: theme.oceanSky.clone() },
        uSunDir: { value: theme.sunDir.clone() },
        uSunColor: { value: theme.sunColor.clone() },
        uFoamColor: { value: theme.foam.clone() },
        uBase: { value: new THREE.Vector3(0, 0, 0) },
        uFoamRadius: { value: 1560 },
      },
    ]);
    const oceanMat = new THREE.ShaderMaterial({
      uniforms: this.oceanUniforms,
      vertexShader: OCEAN_VERT,
      fragmentShader: OCEAN_FRAG,
      fog: true,
      depthWrite: true,
    });
    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(160000, 160000, 1, 1), oceanMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -2;
    this.ocean.name = 'ocean';
    this.ocean.receiveShadow = false;
    this.ocean.renderOrder = -10;
    this.group.add(this.ocean);

    /* stars */
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1400;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const color = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      const u = this.rng.next() * 2 - 1;
      const theta = this.rng.next() * Math.PI * 2;
      const r = 60000;
      const s = Math.sqrt(1 - u * u);
      positions[i * 3] = Math.cos(theta) * s * r;
      positions[i * 3 + 1] = u * r;
      positions[i * 3 + 2] = Math.sin(theta) * s * r;
      color.setHSL(0.55 + this.rng.next() * 0.08, 0.25, 0.72 + this.rng.next() * 0.28);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 130,
        sizeAttenuation: true,
        transparent: true,
        opacity: theme.starOpacity,
        depthWrite: false,
        vertexColors: true,
        fog: false,
      }),
    );
    this.stars.name = 'stars';
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -90;
    this.group.add(this.stars);

    /* clouds */
    const variants = [cloudTexture(11), cloudTexture(47)];
    variants.forEach((tex, index) => {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: theme.cloudOpacity * (index === 0 ? 1 : 0.8),
        color: theme.cloudColor.clone(),
        fog: false,
      });
      this.cloudMaterials.push(mat);
    });

    for (let i = 0; i < 30; i++) {
      const angle = this.rng.range(0, Math.PI * 2);
      const radius = this.rng.range(2600, 11000);
      const sprite = new THREE.Sprite(this.cloudMaterials[i % 2]);
      sprite.position.set(
        Math.cos(angle) * radius,
        this.rng.range(320, 2400),
        Math.sin(angle) * radius,
      );
      const s = this.rng.range(1800, 5600);
      sprite.scale.set(s, s * this.rng.range(0.32, 0.5), 1);
      sprite.userData.speed = this.rng.range(4, 12);
      sprite.userData.phase = this.rng.range(0, Math.PI * 2);
      sprite.renderOrder = -20;
      this.clouds.push(sprite);
      this.group.add(sprite);
    }

    /* lights */
    this.sunLight = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
    this.sunLight.position.copy(theme.sunDir).multiplyScalar(9000);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -3200;
    this.sunLight.shadow.camera.right = 3200;
    this.sunLight.shadow.camera.top = 3200;
    this.sunLight.shadow.camera.bottom = -3200;
    this.sunLight.shadow.camera.near = 4000;
    this.sunLight.shadow.camera.far = 16000;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 4;
    this.sunLight.target.position.set(0, 500, 0);
    this.group.add(this.sunLight, this.sunLight.target);

    this.fillLight = new THREE.DirectionalLight(theme.fillColor, theme.fillIntensity);
    this.fillLight.position.set(6500, 3200, 5200);
    this.fillLight.target.position.set(0, 600, 0);
    this.group.add(this.fillLight, this.fillLight.target);

    this.hemiLight = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiIntensity);
    this.group.add(this.hemiLight);

    this.ambient = new THREE.AmbientLight(0xffffff, theme.ambient);
    this.group.add(this.ambient);

    // Warm work lights that only switch on at night.
    const nightSpecs: Array<[number, number, number, number, number]> = [
      [0, 380, 0, 90000, 900],
      [980, 260, 240, 300000, 2400],
      [-620, 240, -860, 240000, 2200],
      [250, 190, 1150, 200000, 2000],
      [1180, 250, -260, 190000, 2100],
      [-980, 240, 620, 170000, 2000],
    ];
    for (const [x, y, z, intensity, distance] of nightSpecs) {
      const light = new THREE.PointLight(0xffb27a, 0, distance, 2);
      light.position.set(x, y, z);
      light.userData.dayIntensity = intensity;
      this.nightLights.push(light);
      this.group.add(light);
    }

    this.applyTheme(theme, renderer);
  }

  setTheme(theme: Theme, renderer: THREE.WebGLRenderer): void {
    this.theme = theme;
    this.applyTheme(theme, renderer);
  }

  private applyTheme(theme: Theme, renderer: THREE.WebGLRenderer): void {
    (this.skyUniforms.uZenith.value as THREE.Color).copy(theme.skyZenith);
    (this.skyUniforms.uHorizon.value as THREE.Color).copy(theme.skyHorizon);
    (this.skyUniforms.uGround.value as THREE.Color).copy(theme.skyGround);
    (this.skyUniforms.uSunColor.value as THREE.Color).copy(theme.skySun);
    (this.skyUniforms.uSunDir.value as THREE.Vector3).copy(theme.sunDir);

    (this.oceanUniforms.uDeep.value as THREE.Color).copy(theme.oceanDeep);
    (this.oceanUniforms.uShallow.value as THREE.Color).copy(theme.oceanShallow);
    (this.oceanUniforms.uSky.value as THREE.Color).copy(theme.oceanSky);
    (this.oceanUniforms.uSunDir.value as THREE.Vector3).copy(theme.sunDir);
    (this.oceanUniforms.uSunColor.value as THREE.Color).copy(theme.sunColor);
    (this.oceanUniforms.uFoamColor.value as THREE.Color).copy(theme.foam);

    this.sunLight.color.copy(theme.sunColor);
    this.sunLight.intensity = theme.sunIntensity;
    this.sunLight.position.copy(theme.sunDir).multiplyScalar(9000);

    this.fillLight.color.copy(theme.fillColor);
    this.fillLight.intensity = theme.fillIntensity;

    this.hemiLight.color.copy(theme.hemiSky);
    this.hemiLight.groundColor.copy(theme.hemiGround);
    this.hemiLight.intensity = theme.hemiIntensity;

    this.ambient.intensity = theme.ambient;

    const nightOn = theme.name === 'night';
    for (const light of this.nightLights) {
      light.intensity = nightOn ? (light.userData.dayIntensity as number) : 0;
    }

    (this.stars.material as THREE.PointsMaterial).opacity = theme.starOpacity;

    for (const [i, mat] of this.cloudMaterials.entries()) {
      mat.color.copy(theme.cloudColor);
      mat.opacity = theme.cloudOpacity * (i === 0 ? 1 : 0.8);
    }

    renderer.toneMappingExposure = theme.exposure;
  }

  /** Creates and installs the PMREM environment map for this theme. */
  updateEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
    const previous = scene.environment;
    const env = createEnvMap(renderer, this.theme);
    scene.environment = env;
    scene.environmentIntensity = this.theme.envIntensity;
    previous?.dispose();
  }

  update(elapsed: number, dt: number): void {
    (this.oceanUniforms.uTime as THREE.IUniform<number>).value = elapsed;

    for (const cloud of this.clouds) {
      cloud.position.x += (cloud.userData.speed as number) * dt;
      cloud.position.z += (cloud.userData.speed as number) * 0.32 * dt;
      const limit = 12000;
      if (cloud.position.x > limit) cloud.position.x = -limit;
      if (cloud.position.z > limit) cloud.position.z = -limit;
    }

    this.stars.rotation.y += dt * 0.0012;
    this.sky.position.set(0, 0, 0);
  }
}
