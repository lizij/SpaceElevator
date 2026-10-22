import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BaseEnvironment } from '../scene/Environment';
import { MATS, THEMES, type ThemeName } from '../scene/materials';
import { clamp, damp, easeInOutCubic, lerp } from '../scene/util';
import { createSpaceElevatorBase, type BaseModel } from '../model/SpaceElevatorBase';

type PresetName = 'overview' | 'base' | 'car';

interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const PRESETS: Record<PresetName, CameraPose> = {
  overview: {
    position: new THREE.Vector3(2750, 1650, 3350),
    target: new THREE.Vector3(0, 980, 0),
  },
  base: {
    position: new THREE.Vector3(1120, 540, 1220),
    target: new THREE.Vector3(0, 500, 0),
  },
  car: {
    position: new THREE.Vector3(205, 752, 252),
    target: new THREE.Vector3(0, 704, 0),
  },
};

const LAUNCH_POSE: CameraPose = {
  position: new THREE.Vector3(470, 1000, 570),
  target: new THREE.Vector3(0, 760, 0),
};

const HERO_BASE_Y = 700;
const LAUNCH_TOP_Y = 5200;
const LAUNCH_DURATION = 20;

export type LaunchState = 'idle' | 'climbing' | 'topped';

export class BaseScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(46, 1, 1, 160000);
  readonly controls: OrbitControls;
  readonly env: BaseEnvironment;
  readonly model: BaseModel;

  private renderer: THREE.WebGLRenderer;
  private themeName: ThemeName;
  private tween: {
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    elapsed: number;
    duration: number;
  } | null = null;
  private wantAutoRotate = false;
  private launchTime = 0;
  private launchState: LaunchState = 'idle';
  private engineLight: THREE.PointLight;
  private elapsed = 0;
  private drones: THREE.Sprite[] = [];

  constructor(renderer: THREE.WebGLRenderer, themeName: ThemeName = 'dawn') {
    this.renderer = renderer;
    this.themeName = themeName;
    const theme = THEMES[themeName];

    this.scene.fog = new THREE.FogExp2(theme.fogColor.clone(), theme.fogDensity);
    this.camera.position.copy(PRESETS.overview.position);
    this.camera.lookAt(PRESETS.overview.target);

    this.env = new BaseEnvironment(this.scene, renderer, theme);
    this.env.updateEnvironment(this.scene, renderer);

    this.model = createSpaceElevatorBase();
    this.scene.add(this.model.group);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.target.copy(PRESETS.overview.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.75;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.minDistance = 95;
    this.controls.maxDistance = 14000;
    this.controls.minPolarAngle = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.497;
    this.controls.autoRotateSpeed = 0.28;
    this.controls.screenSpacePanning = false;
    this.controls.update();

    // Engine light for the climbing car
    this.engineLight = new THREE.PointLight(0x8fe0ff, 0, 1400, 2);
    this.engineLight.position.set(0, -110, 0);
    this.model.hero.group.add(this.engineLight);

    const droneGroup = this.model.group.getObjectByName('drones');
    if (droneGroup) this.drones = droneGroup.children as THREE.Sprite[];

    this.controls.addEventListener('start', () => {
      this.tween = null;
      this.controls.autoRotate = false;
    });
    this.controls.addEventListener('end', () => {
      this.controls.autoRotate = this.wantAutoRotate && !this.tween;
    });

    this.applyThemeVisuals(themeName);
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setTheme(name: ThemeName): void {
    if (name === this.themeName) return;
    this.themeName = name;
    this.env.setTheme(THEMES[name], this.renderer);
    this.env.updateEnvironment(this.scene, this.renderer);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(THEMES[name].fogColor);
    fog.density = THEMES[name].fogDensity;
    this.applyThemeVisuals(name);
  }

  get theme(): ThemeName {
    return this.themeName;
  }

  setAutoRotate(enabled: boolean): void {
    this.wantAutoRotate = enabled;
    this.controls.autoRotate = enabled && !this.tween && this.launchState !== 'climbing';
  }

  get autoRotate(): boolean {
    return this.wantAutoRotate;
  }

  /** Pull the camera back on portrait screens so the wide base still fits. */
  private adjustedPose(name: PresetName): CameraPose {
    const pose = PRESETS[name];
    const aspect = this.camera.aspect;
    const factor = aspect < 0.82 ? (name === 'overview' ? 1.95 : name === 'base' ? 1.5 : 1.6) : 1;
    if (factor === 1) return pose;
    return {
      position: pose.target.clone().add(pose.position.clone().sub(pose.target).multiplyScalar(factor)),
      target: pose.target.clone(),
    };
  }

  goToPreset(name: PresetName, immediate = false, duration = 2.2): void {
    const pose = this.adjustedPose(name);
    if (immediate) {
      this.tween = null;
      this.camera.position.copy(pose.position);
      this.controls.target.copy(pose.target);
      this.controls.update();
      return;
    }
    this.startTween(pose, duration);
  }

  /** Wide establishing shot that eases into the overview. */
  cinematicIntro(): void {
    this.camera.position.set(6200, 3100, 7400);
    this.controls.target.set(0, 900, 0);
    this.controls.update();
    this.startTween(this.adjustedPose('overview'), 5.2);
  }

  private startTween(pose: CameraPose, duration: number): void {
    this.controls.autoRotate = false;
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos: pose.position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: pose.target.clone(),
      elapsed: 0,
      duration,
    };
  }

  launch(): void {
    if (this.launchState === 'climbing') return;
    if (this.launchState === 'topped') {
      this.resetLaunch();
      return;
    }
    this.launchState = 'climbing';
    this.launchTime = 0;
    this.startTween(LAUNCH_POSE, 2.4);
    for (const engine of this.model.hero.engines) engine.visible = true;
  }

  resetLaunch(): void {
    this.launchState = 'idle';
    this.launchTime = 0;
    this.model.hero.group.position.y = HERO_BASE_Y;
    this.engineLight.intensity = 0;
    for (const engine of this.model.hero.engines) {
      engine.visible = false;
      engine.material.opacity = 0;
    }
    this.goToPreset('overview');
  }

  get launchInfo(): { state: LaunchState; altitude: number; speed: number; progress: number } {
    const y = this.model.hero.group.position.y;
    const p = clamp(this.launchTime / LAUNCH_DURATION, 0, 1);
    const speed = this.launchState === 'climbing' ? 175 * Math.sin(Math.PI * p) + 18 : 0;
    return { state: this.launchState, altitude: y, speed, progress: p };
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
        this.controls.autoRotate = this.wantAutoRotate && this.launchState !== 'climbing';
      }
    }

    // The car climbs independently of the camera tween, so launch starts immediately.
    if (this.launchState === 'climbing') {
      const p = clamp(this.launchTime / LAUNCH_DURATION, 0, 1);
      const y = lerp(HERO_BASE_Y, LAUNCH_TOP_Y, easeInOutCubic(p));
      this.model.hero.group.position.y = y;
      if (!this.tween) {
        this.controls.target.y = damp(this.controls.target.y, y + 40, 1.6, dt);
        this.camera.position.y = damp(this.camera.position.y, y + 300, 1.3, dt);
      }
    }

    if (this.launchState === 'climbing') {
      this.launchTime += dt;
      if (this.launchTime >= LAUNCH_DURATION) {
        this.launchTime = LAUNCH_DURATION;
        this.launchState = 'topped';
        this.engineLight.intensity = 0;
        for (const engine of this.model.hero.engines) {
          engine.visible = false;
          engine.material.opacity = 0;
        }
      }
    }

    // engine plume flicker
    if (this.launchState === 'climbing') {
      const p = clamp(this.launchTime / LAUNCH_DURATION, 0, 1);
      const flicker = 0.68 + Math.random() * 0.32;
      const intensity = (0.55 + Math.sin(p * 22) * 0.08) * flicker;
      for (const engine of this.model.hero.engines) {
        engine.material.opacity = intensity;
        engine.scale.set(34 * (0.85 + flicker * 0.3), 74 * (0.8 + flicker * 0.45), 1);
      }
      this.engineLight.intensity = 3200 * intensity;
    }

    // aviation beacons
    MATS.lampRed.emissiveIntensity = 1.6 + Math.pow(Math.max(0, Math.sin(t * 2.3)), 10) * 3.4;

    // drones
    for (const drone of this.drones) {
      const radius = drone.userData.radius as number;
      const speed = drone.userData.speed as number;
      const phase = drone.userData.phase as number;
      const height = drone.userData.height as number;
      const a = t * speed + phase;
      drone.position.set(Math.cos(a) * radius, height + Math.sin(t * 0.45 + phase) * 26, Math.sin(a) * radius);
    }

    const tether = this.model.group.getObjectByName('tether-glow');
    if (tether) {
      const mat = (tether as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(t * 0.7) * 0.06;
    }

    this.controls.update();
    this.env.update(t, dt);
  }

  private applyThemeVisuals(name: ThemeName): void {
    const isNight = name === 'night';
    for (const sprite of this.model.lightSprites) {
      (sprite.material as THREE.SpriteMaterial).opacity = isNight ? 1 : 0.55;
    }
  }

  /** Approximate camera distance to the base centre, for the HUD. */
  get cameraDistance(): number {
    return this.camera.position.distanceTo(this.controls.target);
  }
}
