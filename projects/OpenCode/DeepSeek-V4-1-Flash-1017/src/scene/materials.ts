import * as THREE from 'three';
import { hazardMaterial } from './util';

/* ── shared PBR palette ───────────────────────────────────────── */

const std = (params: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial({ envMapIntensity: 0.85, ...params });

export const MATS = {
  hull: std({ name: 'hull', color: 0xd8dbd8, metalness: 0.42, roughness: 0.46 }),
  hullShade: std({ name: 'hullShade', color: 0xaeb5b5, metalness: 0.5, roughness: 0.42 }),
  hullDark: std({ name: 'hullDark', color: 0x7a8281, metalness: 0.55, roughness: 0.4 }),
  steel: std({ name: 'steel', color: 0x2f373b, metalness: 0.85, roughness: 0.36 }),
  steelLight: std({ name: 'steelLight', color: 0x98a2a4, metalness: 0.78, roughness: 0.3 }),
  steelBlue: std({ name: 'steelBlue', color: 0x3f505a, metalness: 0.72, roughness: 0.38 }),
  concrete: std({ name: 'concrete', color: 0x8d9594, metalness: 0.02, roughness: 0.94 }),
  concreteDark: std({ name: 'concreteDark', color: 0x555e5f, metalness: 0.04, roughness: 0.9 }),
  deck: std({ name: 'deck', color: 0x6d7676, metalness: 0.08, roughness: 0.86 }),
  glass: std({
    name: 'glass',
    color: 0x0b1b24,
    metalness: 0.92,
    roughness: 0.08,
    envMapIntensity: 1.35,
  }),
  glassWarm: std({
    name: 'glassWarm',
    color: 0x24180e,
    emissive: 0xffb268,
    emissiveIntensity: 0.85,
    metalness: 0.7,
    roughness: 0.18,
  }),
  orange: std({ name: 'orange', color: 0xd4571e, metalness: 0.35, roughness: 0.55 }),
  yellow: std({ name: 'yellow', color: 0xd8a91f, metalness: 0.3, roughness: 0.6 }),
  rubber: std({ name: 'rubber', color: 0x15181b, metalness: 0.1, roughness: 0.92 }),
  cable: std({
    name: 'cable',
    color: 0x7e8b95,
    metalness: 0.75,
    roughness: 0.42,
    emissive: 0x0a1820,
    emissiveIntensity: 0.45,
  }),
  lamp: new THREE.MeshBasicMaterial({ name: 'lamp', color: 0xfff3d8, toneMapped: false }),
  lampWarm: new THREE.MeshBasicMaterial({ name: 'lampWarm', color: 0xffb066, toneMapped: false }),
  lampCyan: new THREE.MeshBasicMaterial({ name: 'lampCyan', color: 0x9fe8ff, toneMapped: false }),
  lampRed: new THREE.MeshStandardMaterial({
    name: 'lampRed',
    color: 0x2a0502,
    emissive: 0xff2d14,
    emissiveIntensity: 3.2,
    toneMapped: false,
  }),
  lampGreen: new THREE.MeshBasicMaterial({ name: 'lampGreen', color: 0x7dffb0, toneMapped: false }),
  strip: new THREE.MeshBasicMaterial({ name: 'strip', color: 0xffb066, toneMapped: false }),
  hazard: hazardMaterial(),
  dark: std({ name: 'dark', color: 0x1b2024, metalness: 0.5, roughness: 0.7 }),
} as const;

export type MaterialKey = keyof typeof MATS;

/* ── time-of-day themes ───────────────────────────────────────── */

export type ThemeName = 'dawn' | 'night';

export interface Theme {
  name: ThemeName;
  label: string;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  fillColor: THREE.Color;
  fillIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  ambient: number;
  skyZenith: THREE.Color;
  skyHorizon: THREE.Color;
  skyGround: THREE.Color;
  skySun: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  oceanDeep: THREE.Color;
  oceanShallow: THREE.Color;
  oceanSky: THREE.Color;
  foam: THREE.Color;
  exposure: number;
  starOpacity: number;
  cloudColor: THREE.Color;
  cloudOpacity: number;
  envIntensity: number;
}

const theme = (name: ThemeName, data: Omit<Theme, 'name'>): Theme => ({ name, ...data });

export const THEMES: Record<ThemeName, Theme> = {
  dawn: theme('dawn', {
    label: '晨昏',
    sunDir: new THREE.Vector3(0.32, 0.3, -0.9).normalize(),
    sunColor: new THREE.Color(0xffc48c),
    sunIntensity: 2.6,
    fillColor: new THREE.Color(0x86b4d4),
    fillIntensity: 0.7,
    hemiSky: new THREE.Color(0x8fb6d8),
    hemiGround: new THREE.Color(0x3a342c),
    hemiIntensity: 0.6,
    ambient: 0.16,
    skyZenith: new THREE.Color(0x08263f),
    skyHorizon: new THREE.Color(0xc08a6a),
    skyGround: new THREE.Color(0x07141c),
    skySun: new THREE.Color(0xffd2a6),
    fogColor: new THREE.Color(0xbf987f),
    fogDensity: 0.00003,
    oceanDeep: new THREE.Color(0x031e24),
    oceanShallow: new THREE.Color(0x0f5254),
    oceanSky: new THREE.Color(0xbf987f),
    foam: new THREE.Color(0xc2d2d2),
    exposure: 0.94,
    starOpacity: 0.12,
    cloudColor: new THREE.Color(0xeadbd0),
    cloudOpacity: 0.36,
    envIntensity: 0.85,
  }),
  night: theme('night', {
    label: '深夜',
    sunDir: new THREE.Vector3(0.4, 0.55, 0.62).normalize(),
    sunColor: new THREE.Color(0xa8c6ff),
    sunIntensity: 0.6,
    fillColor: new THREE.Color(0x3d6484),
    fillIntensity: 0.4,
    hemiSky: new THREE.Color(0x1c3348),
    hemiGround: new THREE.Color(0x05080a),
    hemiIntensity: 0.42,
    ambient: 0.14,
    skyZenith: new THREE.Color(0x01040b),
    skyHorizon: new THREE.Color(0x0c1a27),
    skyGround: new THREE.Color(0x010409),
    skySun: new THREE.Color(0xd7e6ff),
    fogColor: new THREE.Color(0x061019),
    fogDensity: 0.00006,
    oceanDeep: new THREE.Color(0x01060a),
    oceanShallow: new THREE.Color(0x071822),
    oceanSky: new THREE.Color(0x24455e),
    foam: new THREE.Color(0x536a74),
    exposure: 1.02,
    starOpacity: 0.95,
    cloudColor: new THREE.Color(0x1d2c3a),
    cloudOpacity: 0.32,
    envIntensity: 0.5,
  }),
};

/* ── environment map ──────────────────────────────────────────── */

/** Builds a tiny equirectangular sky panorama and prefilters it for PBR reflections. */
export function createEnvMap(renderer: THREE.WebGLRenderer, t: Theme): THREE.Texture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.52);
  skyGrad.addColorStop(0, `#${t.skyZenith.getHexString()}`);
  skyGrad.addColorStop(0.62, `#${t.skyHorizon.getHexString()}`);
  skyGrad.addColorStop(1, `#${t.skyHorizon.getHexString()}`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.52);

  const seaGrad = ctx.createLinearGradient(0, h * 0.52, 0, h);
  seaGrad.addColorStop(0, `#${t.oceanShallow.getHexString()}`);
  seaGrad.addColorStop(0.35, `#${t.oceanDeep.getHexString()}`);
  seaGrad.addColorStop(1, '#010305');
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, h * 0.52, w, h * 0.48);

  // Sun glow, approximate equirectangular projection of the sun direction.
  const sunU = (Math.atan2(t.sunDir.z, t.sunDir.x) / (Math.PI * 2) + 0.5) * w;
  const sunV = (Math.acos(THREE.MathUtils.clamp(t.sunDir.y, -1, 1)) / Math.PI) * h;
  const glow = ctx.createRadialGradient(sunU, sunV, 0, sunU, sunV, w * 0.3);
  glow.addColorStop(0, `rgba(${Math.round(t.skySun.r * 255)},${Math.round(t.skySun.g * 255)},${Math.round(t.skySun.b * 255)},1)`);
  glow.addColorStop(0.03, 'rgba(255,236,204,0.95)');
  glow.addColorStop(0.16, 'rgba(255,196,140,0.24)');
  glow.addColorStop(0.55, 'rgba(255,160,110,0.05)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}
