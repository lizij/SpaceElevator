import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshBuilder, clamp, easeInOutCubic, glowTexture, ringPoint } from '../scene/util';

export type OrbitalPreset = 'system' | 'earth' | 'station' | 'counterweight';

interface EarthTextures {
  day: THREE.Texture;
  night: THREE.Texture;
  spec: THREE.Texture;
  clouds: THREE.Texture;
}

const R = 1; // earth radius
const GEO_ALT = 36000 / 6371;
const TOP_ALT = 90000 / 6371;
const STATION_X = R + GEO_ALT;
const TOP_X = R + TOP_ALT;
const SUN_DIR = new THREE.Vector3(0.95, 0.3, 0.15).normalize();

const PRESETS: Record<OrbitalPreset, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  system: {
    position: new THREE.Vector3(8.5, 6.0, 22.5),
    target: new THREE.Vector3(7.0, 0, 0),
  },
  earth: {
    position: new THREE.Vector3(2.6, 1.3, 2.9),
    target: new THREE.Vector3(0.2, 0, 0),
  },
  station: {
    position: new THREE.Vector3(7.3, 0.42, 0.95),
    target: new THREE.Vector3(STATION_X, 0, 0),
  },
  counterweight: {
    position: new THREE.Vector3(15.55, 0.4, 1.05),
    target: new THREE.Vector3(TOP_X, 0, 0),
  },
};

/* Portrait screens rotate the tether upright: Earth at the bottom, counterweight at the top. */
const PORTRAIT_PRESETS: Record<OrbitalPreset, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  system: {
    position: new THREE.Vector3(-6.0, 7.8, 30.0),
    target: new THREE.Vector3(0, 5.6, 0),
  },
  earth: {
    position: new THREE.Vector3(2.6, 1.3, 2.9),
    target: new THREE.Vector3(0.2, 0, 0),
  },
  station: {
    position: new THREE.Vector3(-1.15, 7.35, 1.2),
    target: new THREE.Vector3(0, 6.65, 0),
  },
  counterweight: {
    position: new THREE.Vector3(-0.85, 15.5, 1.05),
    target: new THREE.Vector3(0, 15.13, 0),
  },
};

const EARTH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const EARTH_FRAG = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uSpec;
uniform vec3 uSunDir;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndl = dot(N, uSunDir);
  float day = smoothstep(-0.12, 0.22, ndl);

  vec3 dayCol = texture2D(uDay, vUv).rgb;
  vec3 nightCol = texture2D(uNight, vUv).rgb;
  float specMask = texture2D(uSpec, vUv).r;

  vec3 col = mix(nightCol * 3.4, dayCol * (0.55 + 0.62 * max(ndl, 0.0)), day);

  vec3 refl = reflect(-V, N);
  float glint = pow(max(dot(refl, uSunDir), 0.0), 900.0) * specMask * 0.008 * day;
  col += vec3(1.0, 0.87, 0.68) * glint;

  float rim = pow(1.0 - abs(dot(N, V)), 3.6);
  col += vec3(0.14, 0.34, 0.68) * rim * day * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;

const ATMO_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uSunDir;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - abs(dot(N, V)), 2.4);
  float sun = smoothstep(-0.45, 0.5, dot(N, uSunDir));
  vec3 col = mix(vec3(0.06, 0.18, 0.42), vec3(0.34, 0.62, 1.0), rim);
  float alpha = rim * (0.06 + sun * 0.5);
  gl_FragColor = vec4(col * (0.35 + sun * 1.2), alpha);
}
`;

export class OrbitalScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.01, 400);
  readonly controls: OrbitControls;
  private earth: THREE.Mesh;
  private world = new THREE.Group();
  private portrait = false;
  private engaged = false;
  private stars: THREE.Points;
  private tetherCars: THREE.Object3D[] = [];
  private labelPoints = new Map<string, THREE.Vector3>();
  private raycaster = new THREE.Raycaster();
  private sunDir = SUN_DIR.clone();
  private tween: {
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    elapsed: number;
    duration: number;
  } | null = null;
  private wantAutoRotate = false;
  private elapsed = 0;
  private stationGlow: THREE.Sprite;
  private counterweightGlow: THREE.Sprite;

  constructor(renderer: THREE.WebGLRenderer, textures: EarthTextures) {
    this.scene.background = new THREE.Color(0x000206);

    this.camera.position.copy(PRESETS.system.position);
    this.camera.lookAt(PRESETS.system.target);
    this.scene.add(this.world);

    const sun = new THREE.DirectionalLight(0xfff0da, 2.2);
    sun.position.copy(this.sunDir).multiplyScalar(30);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0x9db6cc, 0.38));
    const rim = new THREE.DirectionalLight(0x5b9bd8, 0.7);
    rim.position.set(-20, -4, -10);
    this.scene.add(rim);

    /* earth */
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        uDay: { value: textures.day },
        uNight: { value: textures.night },
        uSpec: { value: textures.spec },
        uSunDir: { value: this.sunDir },
      },
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
    });
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 80), earthMat);
    this.earth.name = 'earth';
    this.world.add(this.earth);

    /* clouds */
    const cloudMat = new THREE.MeshBasicMaterial({
      map: textures.clouds,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      color: 0xdfe8f2,
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.006, 96, 64), cloudMat);
    clouds.name = 'clouds';
    this.world.add(clouds);

    /* atmosphere halo */
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.035, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: { uSunDir: { value: this.sunDir } },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      }),
    );
    atmo.name = 'atmosphere';
    this.world.add(atmo);

    /* stars */
    const starGeo = new THREE.BufferGeometry();
    const count = 3200;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = 70;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(th) * s * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sin(th) * s * r;
      c.setHSL(0.55 + Math.random() * 0.08, 0.2, 0.72 + Math.random() * 0.28);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.13,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        fog: false,
      }),
    );
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    /* sun glow */
    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,255,255,1)', 'rgba(255,220,170,0.5)'),
        color: 0xffe1b8,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    sunGlow.position.copy(this.sunDir).multiplyScalar(48);
    sunGlow.scale.set(7, 7, 1);
    this.scene.add(sunGlow);

    /* tether */
    const tetherLen = TOP_X - R;
    const tetherMat = new THREE.MeshBasicMaterial({
      color: 0xa8cfe0,
      transparent: true,
      opacity: 0.55,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, tetherLen, 8), tetherMat);
    tether.rotation.z = -Math.PI / 2;
    tether.position.set(R + tetherLen / 2, 0, 0);
    tether.name = 'orbital-tether';
    this.world.add(tether);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4b9fc9,
      transparent: true,
      opacity: 0.045,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tetherGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, tetherLen, 8), glowMat);
    tetherGlow.rotation.z = -Math.PI / 2;
    tetherGlow.position.set(R + tetherLen / 2, 0, 0);
    this.world.add(tetherGlow);

    /* elevated cars along the tether */
    const carMat = new THREE.MeshBasicMaterial({ color: 0xffd7a8, toneMapped: false });
    for (let i = 0; i < 9; i++) {
      const car = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.012), carMat);
      car.position.set(R + 0.15 + (TOP_ALT * 0.8 * (i + 1)) / 10, 0, 0);
      car.userData.offset = R + 0.15 + (TOP_ALT * 0.8 * (i + 1)) / 10;
      car.userData.phase = i * 0.7;
      this.tetherCars.push(car);
      this.world.add(car);
    }

    /* base marker on the equator */
    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.0035, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xff8a4a, toneMapped: false }),
    );
    baseRing.position.set(R + 0.002, 0, 0);
    baseRing.rotation.y = Math.PI / 2;
    this.world.add(baseRing);
    const baseGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,190,140,1)', 'rgba(255,120,60,0.4)'),
        color: 0xff9a5c,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    baseGlow.position.set(R + 0.01, 0, 0);
    baseGlow.scale.set(0.06, 0.06, 1);
    this.world.add(baseGlow);

    /* geostationary station */
    const station = this.buildStation();
    station.position.set(STATION_X, 0, 0);
    this.world.add(station);
    this.stationGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('rgba(210,244,255,1)', 'rgba(110,190,255,0.4)'),
        color: 0xa8e6ff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    this.stationGlow.position.set(STATION_X, 0, 0);
    this.stationGlow.scale.set(0.18, 0.18, 1);
    this.world.add(this.stationGlow);

    /* counterweight at 90,000 km */
    const counterweight = this.buildCounterweight();
    counterweight.position.set(TOP_X, 0, 0);
    this.world.add(counterweight);
    this.counterweightGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,232,196,1)', 'rgba(255,150,90,0.4)'),
        color: 0xffc890,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    this.counterweightGlow.position.set(TOP_X, 0, 0);
    this.counterweightGlow.scale.set(0.15, 0.15, 1);
    this.world.add(this.counterweightGlow);

    this.labelPoints.set('base', new THREE.Vector3(R + 0.01, 0, 0));
    this.labelPoints.set('station', new THREE.Vector3(STATION_X, 0.12, 0));
    this.labelPoints.set('counterweight', new THREE.Vector3(TOP_X, 0.09, 0));

    /* controls */
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.target.copy(PRESETS.system.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.6;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 90;
    this.controls.autoRotateSpeed = 0.22;
    this.controls.update();
    this.controls.addEventListener('start', () => {
      this.tween = null;
      this.controls.autoRotate = false;
    });
    this.controls.addEventListener('end', () => {
      this.controls.autoRotate = this.wantAutoRotate && !this.tween;
    });
  }

  private buildStation(): THREE.Group {
    const b = new MeshBuilder();
    const hull = new THREE.MeshStandardMaterial({ color: 0x9ca8ab, metalness: 0.65, roughness: 0.55 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x5d6870, metalness: 0.85, roughness: 0.3 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc89b4a, metalness: 0.9, roughness: 0.25 });
    const panel = new THREE.MeshStandardMaterial({
      color: 0x101c34,
      emissive: 0x1b3f66,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.2,
    });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xd8f2ff, toneMapped: false });
    const lampWarm = new THREE.MeshBasicMaterial({ color: 0xffc386, toneMapped: false });

    // central spindle
    b.cyl(0.014, 0.014, 0.34, 16, steel, [0, 0, 0], [0, 0, Math.PI / 2], true);
    b.cyl(0.03, 0.03, 0.07, 20, hull, [0, 0, 0], [0, 0, Math.PI / 2], true);
    b.cyl(0.017, 0.017, 0.02, 20, gold, [0.06, 0, 0], [0, 0, Math.PI / 2], true);
    b.cyl(0.017, 0.017, 0.02, 20, gold, [-0.06, 0, 0], [0, 0, Math.PI / 2], true);

    // two habitation rings
    for (const [radius, tube, x] of [
      [0.095, 0.012, 0.02],
      [0.068, 0.009, -0.11],
    ]) {
      b.torus(radius, tube, hull, [x, 0, 0], [0, Math.PI / 2, 0], 10, 64);
      for (let i = 0; i < 4; i++) {
        const a = i * 90;
        const p = ringPoint(radius, a);
        const q = p.clone().multiplyScalar(0.014 / radius);
        b.beam([x, q.y, q.z], [x, p.y, p.z], 0.004, 0.004, steel);
      }
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        b.box(0.009, 0.0032, 0.024, steel, [x, Math.cos(a) * radius, Math.sin(a) * radius], [a, 0, 0]);
        if (i % 2 === 0) {
          b.box(0.0032, 0.0024, 0.004, lampWarm, [x + 0.006, Math.cos(a) * radius, Math.sin(a) * radius]);
        }
      }
      // radial ribs on the ring's outer face
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        b.box(0.012, 0.0038, 0.007, hull, [x, Math.cos(a) * (radius + tube * 0.55), Math.sin(a) * (radius + tube * 0.55)], [a, 0, 0]);
      }
    }

    // solar arrays
    for (const sz of [-1, 1]) {
      b.box(0.05, 0.0022, 0.16, panel, [0.15, 0, sz * 0.15]);
      b.box(0.048, 0.0022, 0.16, panel, [-0.15, 0, sz * 0.15]);
      b.box(0.004, 0.004, 0.24, steel, [0.15, 0, sz * 0.08]);
      b.box(0.004, 0.004, 0.24, steel, [-0.15, 0, sz * 0.08]);
      for (let i = -2; i <= 2; i++) {
        b.box(0.004, 0.006, 0.004, lamp, [0.15, 0.002, sz * (0.1 + i * 0.025)]);
      }
    }

    // solar array support truss: connects both wings across the spindle
    for (const sz of [-1, 1]) {
      b.box(0.30, 0.003, 0.003, steel, [0, -0.002, sz * 0.08]);
      b.box(0.003, 0.003, 0.08, steel, [0, -0.002, sz * 0.04]);
    }

    // docking hub + arms + antenna
    b.cyl(0.022, 0.022, 0.05, 14, hull, [0.0, 0, 0], [0, 0, Math.PI / 2], true);
    b.torus(0.024, 0.0028, gold, [0.026, 0, 0], [0, Math.PI / 2, 0], 6, 24);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      b.box(0.004, 0.004, 0.03, steel, [0.0, Math.cos(a) * 0.02, Math.sin(a) * 0.02], [a, 0, 0]);
      b.box(0.003, 0.0025, 0.003, lamp, [0.03, Math.cos(a) * 0.023, Math.sin(a) * 0.023]);
    }
    b.box(0.03, 0.008, 0.008, steel, [0.11, 0.03, 0]);
    b.box(0.004, 0.016, 0.004, steel, [0.11, 0.022, 0]);
    b.cyl(0.0015, 0.0015, 0.16, 4, steel, [0, 0.094, 0]);
    b.box(0.004, 0.004, 0.004, lamp, [0, 0.17, 0]);

    const group = b.build({ name: 'geo-station', castShadow: false, receiveShadow: false });
    return group;
  }

  private buildCounterweight(): THREE.Group {
    const b = new MeshBuilder();
    const hull = new THREE.MeshStandardMaterial({ color: 0xb8bfc0, metalness: 0.6, roughness: 0.48 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x4b565e, metalness: 0.82, roughness: 0.35 });
    const panel = new THREE.MeshStandardMaterial({
      color: 0x15202a,
      emissive: 0x233c50,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.3,
    });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xffb066, toneMapped: false });

    b.cyl(0.06, 0.06, 0.24, 20, hull, [0, 0, 0], [0, 0, Math.PI / 2], true);
    b.cyl(0.061, 0.061, 0.04, 20, steel, [0.05, 0, 0], [0, 0, Math.PI / 2], true);
    b.cyl(0.061, 0.061, 0.04, 20, steel, [-0.05, 0, 0], [0, 0, Math.PI / 2], true);
    for (const s of [-1, 1]) {
      b.box(0.008, 0.008, 0.28, steel, [0, 0, s * 0.20]);
      b.box(0.018, 0.0025, 0.12, panel, [0, 0.0055, s * 0.30]);
      b.box(0.004, 0.004, 0.004, lamp, [0, 0.006, s * 0.24]);
    }
    for (const s of [-1, 1]) {
      b.box(0.006, 0.11, 0.006, steel, [0, s * 0.115, 0]);
      b.box(0.02, 0.0025, 0.1, panel, [0, s * 0.17, 0]);
    }
    for (const x of [-0.1, 0, 0.1]) {
      b.torus(0.061, 0.0032, steel, [x, 0, 0], [0, Math.PI / 2, 0], 6, 32);
    }
    // end-cap machinery, radiators and windows
    b.cyl(0.03, 0.045, 0.02, 16, steel, [0.13, 0, 0], [0, 0, Math.PI / 2]);
    b.torus(0.045, 0.004, steel, [0.14, 0, 0], [0, Math.PI / 2, 0], 8, 32);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.box(0.004, 0.0042, 0.0042, lamp, [0.136, Math.cos(a) * 0.034, Math.sin(a) * 0.034]);
    }
    for (const s of [-1, 1]) {
      b.box(0.05, 0.004, 0.025, panel, [0.04, s * 0.075, 0]);
      b.box(0.05, 0.004, 0.025, panel, [-0.04, s * 0.075, 0]);
      b.box(0.006, 0.028, 0.006, steel, [0.04, s * 0.06, 0]);
      b.box(0.006, 0.028, 0.006, steel, [-0.04, s * 0.06, 0]);
    }
    b.box(0.004, 0.004, 0.004, lamp, [0.11, 0.061, 0]);
    return b.build({ name: 'counterweight', castShadow: false, receiveShadow: false });
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const portrait = width / height < 0.82;
    if (portrait !== this.portrait) {
      this.portrait = portrait;
      this.world.rotation.z = portrait ? Math.PI / 2 : 0;
      this.world.updateMatrixWorld(true);
      if (!this.engaged) {
        const pose = this.adjustedPose('system');
        this.camera.position.copy(pose.position);
        this.controls.target.copy(pose.target);
        this.camera.lookAt(pose.target);
      }
    }
  }

  setAutoRotate(enabled: boolean): void {
    this.wantAutoRotate = enabled;
    this.controls.autoRotate = enabled && !this.tween;
  }

  get autoRotate(): boolean {
    return this.wantAutoRotate;
  }

  private adjustedPose(name: OrbitalPreset): { position: THREE.Vector3; target: THREE.Vector3 } {
    return this.camera.aspect < 0.82 ? PORTRAIT_PRESETS[name] : PRESETS[name];
  }

  goToPreset(name: OrbitalPreset, immediate = false): void {
    this.engaged = true;
    const pose = this.adjustedPose(name);
    if (immediate) {
      this.tween = null;
      this.camera.position.copy(pose.position);
      this.controls.target.copy(pose.target);
      this.controls.update();
      return;
    }
    this.controls.autoRotate = false;
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos: pose.position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: pose.target.clone(),
      elapsed: 0,
      duration: 2.2,
    };
  }

  update(dt: number): void {
    this.elapsed += dt;
    const t = this.elapsed;

    if (this.tween) {
      this.tween.elapsed += dt;
      const raw = clamp(this.tween.elapsed / this.tween.duration, 0, 1);
      const k = easeInOutCubic(raw);
      this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, k);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, k);
      if (raw >= 1) {
        this.tween = null;
        this.controls.autoRotate = this.wantAutoRotate;
      }
    }

    for (const car of this.tetherCars) {
      const offset = car.userData.offset as number;
      const phase = car.userData.phase as number;
      const travel = 14 * 0.5;
      car.position.x = R + 0.12 + ((offset - R + t * 0.08 + phase) % travel);
    }

    this.stationGlow.material.opacity = 0.45 + Math.sin(t * 1.8) * 0.08;
    this.counterweightGlow.material.opacity = 0.35 + Math.sin(t * 1.3 + 2) * 0.07;
    this.stars.rotation.y = t * 0.0015;
    const clouds = this.scene.getObjectByName('clouds');
    if (clouds) clouds.rotation.y = t * 0.004;
    this.controls.update();
  }

  /** Screen-space positions for the HUD labels, with earth occlusion. */
  getLabelScreenPositions(width: number, height: number): Array<{ key: string; x: number; y: number; visible: boolean }> {
    const out: Array<{ key: string; x: number; y: number; visible: boolean }> = [];
    const camPos = this.camera.position;
    this.world.updateMatrixWorld();
    for (const [key, local] of this.labelPoints) {
      const point = local.clone().applyMatrix4(this.world.matrixWorld);
      const projected = point.clone().project(this.camera);
      const x = ((projected.x + 1) / 2) * width;
      const y = ((1 - projected.y) / 2) * height;

      const dir = point.clone().sub(camPos);
      const dist = dir.length();
      this.raycaster.set(camPos, dir.normalize());
      const hits = this.raycaster.intersectObject(this.earth, false);
      const occluded = hits.length > 0 && hits[0].distance < dist - 0.01;

      const onScreen = projected.z < 1 && x > -80 && x < width + 80 && y > -60 && y < height + 60;
      out.push({ key, x, y, visible: onScreen && !occluded });
    }
    return out;
  }

  get cameraDistance(): number {
    return this.camera.position.distanceTo(this.controls.target);
  }

  get stationX(): number {
    return STATION_X;
  }

  get topX(): number {
    return TOP_X;
  }
}
