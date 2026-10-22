import './style.css';
import * as THREE from 'three';
import { BaseScene, type LaunchState } from './scene/BaseScene';
import { OrbitalScene, type OrbitalPreset } from './scene/OrbitalScene';
import { PostRenderer } from './scene/Post';
import { Hud, type BasePreset, type ViewMode } from './ui/Hud';
import { AmbientAudio } from './core/AmbientAudio';

const canvas = document.getElementById('webgl') as HTMLCanvasElement;
const hud = new Hud({
  onBasePreset: (preset) => {
    if (!base) return;
    base.goToPreset(preset);
    hud.setBasePreset(preset);
    hud.toast(preset === 'overview' ? '全景视角' : preset === 'base' ? '基座视角 · 三主塔' : '轿厢特写 · SE-02');
  },
  onOrbitPreset: (preset) => {
    if (!orbital) return;
    orbital.goToPreset(preset);
    hud.setOrbitPreset(preset);
    hud.toast(preset === 'system' ? '轨道系统全貌' : preset === 'earth' ? '地球 · 赤道锚点' : preset === 'station' ? '同步轨道空间站 · 36,000 km' : '配重 · 90,000 km');
  },
  onLaunch: () => {
    if (!base) return;
    const info = base.launchInfo;
    if (info.state === 'topped') {
      base.resetLaunch();
      hud.setLaunchState('idle');
      hud.toast('轿厢回收 · 返回海上基座');
      return;
    }
    base.launch();
    hud.setLaunchState('climbing');
    hud.toast('点火 · 轿厢开始沿缆索爬升', 3200);
  },
  onOrbitToggle: () => {
    setMode(mode === 'base' ? 'orbit' : 'base');
  },
  onTheme: () => {
    if (mode !== 'base' || !base) {
      hud.toast('行星尺度使用固定轨道光照');
      return;
    }
    const next = base.theme === 'dawn' ? 'night' : 'dawn';
    base.setTheme(next);
    hud.setThemeLabel(next === 'night' ? '深夜' : '晨昏');
    hud.toast(next === 'night' ? '夜间模式 · 基座照明已开启' : '晨昏模式 · 低角度日照');
  },
  onSound: () => {
    void audio.toggle().then((on) => hud.setSoundLabel(on));
  },
  onFullscreen: () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => hud.toast('当前浏览器不支持全屏'));
  },
  onAutoRotate: () => {
    autoRotate = !autoRotate;
    hud.setAutoRotate(autoRotate);
    const active = mode === 'base' ? base : orbital;
    active?.setAutoRotate(autoRotate);
  },
});

const audio = new AmbientAudio();

let renderer: THREE.WebGLRenderer;
let base: BaseScene | null = null;
let orbital: OrbitalScene | null = null;
let post: PostRenderer | null = null;
let mode: ViewMode = 'base';
let autoRotate = false;
let ready = false;
let lastLaunchState: LaunchState = 'idle';
let hudTimer = 0;
let lastTime = performance.now();
let startTime = 0;
let qualityChecked = false;
let resolutionScale = 1;

const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2) * resolutionScale;

const BASE_PRESET_LABEL: Record<BasePreset, string> = {
  overview: '全景',
  base: '基座',
  car: '轿厢',
};
const ORBIT_PRESET_LABEL: Record<OrbitalPreset, string> = {
  system: '全貌',
  earth: '地球',
  station: '空间站',
  counterweight: '配重',
};

async function boot(): Promise<void> {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    });
  } catch (error) {
    hud.showFatal(`WebGL 初始化失败：${(error as Error).message}`);
    return;
  }

  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x05090d, 1);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  hud.setLoading(0.03, '加载地球观测数据…');

  /* earth textures, bundled through Vite so they survive static hosting */
  const manager = new THREE.LoadingManager();
  const loader = new THREE.TextureLoader(manager);
  const urls = {
    day: new URL('./assets/textures/earth_atmos_2048.jpg', import.meta.url).href,
    night: new URL('./assets/textures/earth_lights_2048.png', import.meta.url).href,
    spec: new URL('./assets/textures/earth_specular_2048.jpg', import.meta.url).href,
    clouds: new URL('./assets/textures/earth_clouds_1024.png', import.meta.url).href,
  };

  manager.onProgress = (_url, loaded, total) => {
    hud.setLoading(0.05 + (loaded / Math.max(total, 1)) * 0.62, `加载地球观测数据 ${loaded}/${total}`);
  };

  const texturesPromise = new Promise<{
    day: THREE.Texture;
    night: THREE.Texture;
    spec: THREE.Texture;
    clouds: THREE.Texture;
  }>((resolve, reject) => {
    manager.onLoad = () => {
      day.colorSpace = THREE.SRGBColorSpace;
      night.colorSpace = THREE.SRGBColorSpace;
      clouds.colorSpace = THREE.SRGBColorSpace;
      spec.colorSpace = THREE.NoColorSpace;
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      for (const tex of [day, night, spec, clouds]) tex.anisotropy = Math.min(8, maxAniso);
      resolve({ day, night, spec, clouds });
    };
    manager.onError = (url) => reject(new Error(`纹理加载失败：${url}`));
  });

  const day = loader.load(urls.day);
  const night = loader.load(urls.night);
  const spec = loader.load(urls.spec);
  const clouds = loader.load(urls.clouds);
  const textures = await texturesPromise;

  hud.setLoading(0.7, '构建海上基座与三根主塔…');
  await nextFrame();

  base = new BaseScene(renderer, 'dawn');
  hud.setLoading(0.86, '张拉 216 根碳纳米缆索…');
  await nextFrame();

  orbital = new OrbitalScene(renderer, textures);
  hud.setLoading(0.94, '建立同步轨道链接…');
  await nextFrame();

  post = new PostRenderer(renderer, base.scene, base.camera);
  resize();
  post.setScene(base.scene, base.camera);
  post.setBloom(0.26, 0.94);

  base.controls.enabled = true;
  orbital.controls.enabled = false;
  hud.setMode('base');
  hud.setLaunchState('idle');
  hud.setAutoRotate(false);

  ready = true;
  hud.finishLoading();
  startTime = performance.now();
  requestAnimationFrame(frame);

  window.setTimeout(() => {
    base?.cinematicIntro();
    
  }, 900);

  window.setTimeout(() => checkQuality(), 8000);
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(w, h);
  base?.setSize(w, h);
  orbital?.setSize(w, h);
  post?.setSize(w, h, renderer.getPixelRatio());
}

function setMode(next: ViewMode): void {
  if (next === mode || !base || !orbital || !post) return;
  const fade = document.getElementById('scene-fade') as HTMLElement;
  fade.classList.add('on');
  window.setTimeout(() => {
    mode = next;
    base!.controls.enabled = next === 'base';
    orbital!.controls.enabled = next === 'orbit';
    if (next === 'orbit') {
      orbital!.goToPreset(hud.currentOrbitPreset);
      orbital!.setAutoRotate(autoRotate);
      base!.setAutoRotate(false);
      post!.setBloom(0.24, 0.94);
      post!.setScene(orbital!.scene, orbital!.camera);
    } else {
      base!.goToPreset(hud.currentBasePreset);
      base!.setAutoRotate(autoRotate);
      orbital!.setAutoRotate(false);
      post!.setBloom(0.26, 0.94);
      post!.setScene(base!.scene, base!.camera);
    }
    hud.setMode(next);
    hud.setAutoRotate(autoRotate);
    resize();
    fade.classList.remove('on');
    hud.toast(next === 'orbit' ? '行星尺度 · 90,000 km 轨道电梯系统' : '返回地面 · 赤道海上基座');
  }, 240);
}

function updateTelemetry(): void {
  if (!base) return;
  if (mode === 'orbit') {
    hud.updateTelemetry({
      mode,
      altitude: 0,
      launchState: 'idle',
      launchProgress: 0,
      presetLabel: ORBIT_PRESET_LABEL[hud.currentOrbitPreset],
      orbitPreset: hud.currentOrbitPreset,
      altitudeUnit: 'km',
    });
  } else {
    const info = base.launchInfo;
    hud.updateTelemetry({
      mode,
      altitude: info.altitude,
      launchState: info.state,
      launchProgress: info.progress,
      presetLabel: BASE_PRESET_LABEL[hud.currentBasePreset],
      orbitPreset: 'system',
      altitudeUnit: 'm',
    });
    if (info.state !== lastLaunchState) {
      lastLaunchState = info.state;
      hud.setLaunchState(info.state);
      if (info.state === 'topped') {
        hud.toast('已到达 5,200 m · 轿厢进入匀速爬升段', 4200);
      }
    }
  }
}

function checkQuality(): void {
  if (qualityChecked || !renderer || !post) return;
  qualityChecked = true;
  const elapsed = performance.now() - startTime;
  if (elapsed > 30000) return;
  // Low-end / high-DPI devices: drop internal resolution and bloom cost.
  if (window.devicePixelRatio > 1.5 && window.innerWidth < 1200) {
    resolutionScale = 0.75;
    post.setBloom(0.34, 0.92);
    resize();
  }
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (!ready || !base || !orbital || !post) return;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (mode === 'base') base.update(dt);
  else orbital.update(dt);

  post.render(dt);

  if (mode === 'orbit') {
    hud.updateLabels(orbital.getLabelScreenPositions(window.innerWidth, window.innerHeight));
  }

  hudTimer += dt;
  if (hudTimer >= 0.12) {
    hudTimer = 0;
    updateTelemetry();
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/* expose a small state surface for automated smoke tests */
Object.defineProperty(window, '__spaceElevator', {
  value: {
    get ready() {
      return ready;
    },
    get mode() {
      return mode;
    },
    get theme() {
      return base?.theme;
    },
    get camera() {
      const active = mode === 'base' ? base : orbital;
      return active ? active.camera.position.toArray() : null;
    },
    get target() {
      const active = mode === 'base' ? base : orbital;
      return active ? active.controls.target.toArray() : null;
    },
    get launch() {
      return base?.launchInfo ?? null;
    },
    get calls() {
      return renderer?.info.render.calls ?? 0;
    },
    get triangles() {
      return renderer?.info.render.triangles ?? 0;
    },
    setMode,
    setBasePreset(preset: BasePreset, immediate = false) {
      base?.goToPreset(preset, immediate);
      hud.setBasePreset(preset);
    },
    setOrbitPreset(preset: OrbitalPreset, immediate = false) {
      orbital?.goToPreset(preset, immediate);
      hud.setOrbitPreset(preset);
    },
    setBaseCamera(position: [number, number, number], target: [number, number, number]) {
      if (!base) return;
      base.camera.position.fromArray(position);
      base.controls.target.fromArray(target);
      base.controls.update();
    },
    setOrbitCamera(position: [number, number, number], target: [number, number, number]) {
      if (!orbital) return;
      orbital.camera.position.fromArray(position);
      orbital.controls.target.fromArray(target);
      orbital.controls.update();
    },
    startLaunch() {
      base?.launch();
      hud.setLaunchState('climbing');
    },
    toggleTheme() {
      if (!base) return;
      const next = base.theme === 'dawn' ? 'night' : 'dawn';
      base.setTheme(next);
      hud.setThemeLabel(next === 'night' ? '深夜' : '晨昏');
    },
  },
  configurable: true,
});

window.addEventListener('resize', () => {
  if (renderer) resize();
});
window.addEventListener('orientationchange', () => {
  window.setTimeout(() => {
    if (renderer) resize();
  }, 260);
});

boot().catch((error: unknown) => {
  console.error(error);
  hud.showFatal((error as Error).message ?? String(error));
});
