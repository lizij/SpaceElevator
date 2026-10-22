import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ── math ─────────────────────────────────────────────────────── */

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Frame-rate independent exponential smoothing. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function dampVec3(v: THREE.Vector3, target: THREE.Vector3, lambda: number, dt: number): void {
  v.x = damp(v.x, target.x, lambda, dt);
  v.y = damp(v.y, target.y, lambda, dt);
  v.z = damp(v.z, target.z, lambda, dt);
}

/** Deterministic PRNG (mulberry32). */
export class Rng {
  private state: number;

  constructor(seed = 0x9e3779b9) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length) % items.length];
  }
}

/* ── canvas textures ──────────────────────────────────────────── */

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [canvas, ctx];
}

export function textureFromCanvas(
  canvas: HTMLCanvasElement,
  opts: { srgb?: boolean; repeat?: [number, number]; anisotropy?: number } = {},
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  tex.anisotropy = opts.anisotropy ?? 4;
  tex.needsUpdate = true;
  return tex;
}

/** Soft radial glow used for lamps and engine plumes. */
export function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,190,140,0.45)'): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.22, mid);
  g.addColorStop(0.55, 'rgba(255,140,90,0.12)');
  g.addColorStop(1, 'rgba(255,120,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return textureFromCanvas(canvas);
}

/** Diagonal black/yellow hazard stripe strip. */
export function hazardTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 64);
  ctx.fillStyle = '#d7a51c';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#12161a';
  ctx.lineWidth = 26;
  for (let x = -64; x < 320; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 52, 0);
    ctx.stroke();
  }
  return textureFromCanvas(canvas, { repeat: [10, 1] });
}

export function hazardMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: hazardTexture(),
    roughness: 0.72,
    metalness: 0.15,
  });
}

/** Transparent label/decal used on the elevator car. */
export function decalTexture(lines: string[], accent = '#ff6a2a'): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 256);
  ctx.clearRect(0, 0, 512, 256);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '700 66px "SF Mono", Menlo, monospace';
  ctx.fillText(lines[0] ?? '', 26, 96);

  ctx.fillStyle = accent;
  ctx.fillRect(26, 116, 74, 7);

  ctx.fillStyle = 'rgba(230,240,245,0.72)';
  ctx.font = '600 25px "PingFang SC", "Noto Sans SC", sans-serif';
  ctx.fillText(lines[1] ?? '', 26, 164);

  ctx.fillStyle = 'rgba(200,220,230,0.45)';
  ctx.font = '500 18px "SF Mono", Menlo, monospace';
  ctx.fillText(lines[2] ?? '', 26, 202);

  return textureFromCanvas(canvas);
}

/** Procedural cloud puff with soft radial falloff. */
export function cloudTexture(seed: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const rng = new Rng(seed);
  const grid = 16;
  const field: number[] = [];
  for (let i = 0; i < (grid + 1) * (grid + 1); i++) field.push(rng.next());
  const at = (x: number, y: number) => field[y * (grid + 1) + x];
  const noise = (x: number, y: number): number => {
    const gx = x * grid;
    const gy = y * grid;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      let v = 0;
      let amp = 0.62;
      let freq = 3;
      for (let o = 0; o < 5; o++) {
        v += noise(nx * freq + o * 0.13, ny * freq + o * 0.29) * amp;
        amp *= 0.5;
        freq *= 2;
      }
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      const radial = 1 - smoothstep(0.16, 0.5, Math.sqrt(dx * dx + dy * dy));
      const alpha = clamp((v - 0.28) * 1.6, 0, 1) * radial;
      const i = (y * size + x) * 4;
      const tone = 226 + v * 26;
      img.data[i] = tone;
      img.data[i + 1] = tone;
      img.data[i + 2] = Math.min(255, tone + 6);
      img.data[i + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return textureFromCanvas(canvas);
}

/* ── geometry builder ─────────────────────────────────────────── */

type Vec3Tuple = [number, number, number];

export class MeshBuilder {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geometry: THREE.BufferGeometry, material: THREE.Material, matrix?: THREE.Matrix4): this {
    let geo = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) geo.applyMatrix4(matrix);
    // Keep attribute sets identical so mergeGeometries never rejects the batch.
    for (const name of Object.keys(geo.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    }
    if (!geo.getAttribute('uv')) {
      const count = geo.getAttribute('position').count;
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    const list = this.buckets.get(material);
    if (list) list.push(geo);
    else this.buckets.set(material, [geo]);
    return this;
  }

  addAt(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    pos: Vec3Tuple = [0, 0, 0],
    rot: Vec3Tuple = [0, 0, 0],
    scale: Vec3Tuple = [1, 1, 1],
  ): this {
    const m = new THREE.Matrix4();
    m.compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scale),
    );
    return this.add(geometry, material, m);
  }

  box(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    pos: Vec3Tuple,
    rot: Vec3Tuple = [0, 0, 0],
  ): this {
    return this.addAt(new THREE.BoxGeometry(w, h, d), material, pos, rot);
  }

  cyl(
    rTop: number,
    rBottom: number,
    h: number,
    segments: number,
    material: THREE.Material,
    pos: Vec3Tuple,
    rot: Vec3Tuple = [0, 0, 0],
    openEnded = false,
  ): this {
    return this.addAt(new THREE.CylinderGeometry(rTop, rBottom, h, segments, 1, openEnded), material, pos, rot);
  }

  torus(
    radius: number,
    tube: number,
    material: THREE.Material,
    pos: Vec3Tuple,
    rot: Vec3Tuple = [Math.PI / 2, 0, 0],
    radialSegments = 8,
    tubularSegments = 40,
  ): this {
    return this.addAt(
      new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments),
      material,
      pos,
      rot,
    );
  }

  /** Box aligned from point a to point b (useful for trusses and cables). */
  beam(a: Vec3Tuple, b: Vec3Tuple, w: number, h: number, material: THREE.Material): this {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const dir = end.clone().sub(start);
    const len = dir.length();
    if (len < 0.001) return this;
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const m = new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(w, len, h), material, m);
  }

  /** Cylinder aligned from point a to point b. */
  tube(a: Vec3Tuple, b: Vec3Tuple, radius: number, material: THREE.Material, segments = 8): this {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const dir = end.clone().sub(start);
    const len = dir.length();
    if (len < 0.001) return this;
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const m = new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.CylinderGeometry(radius, radius, len, segments), material, m);
  }

  build(options: { castShadow?: boolean; receiveShadow?: boolean; name?: string } = {}): THREE.Group {
    const group = new THREE.Group();
    group.name = options.name ?? 'merged';
    for (const [material, geometries] of this.buckets) {
      const merged = mergeGeometries(geometries, false);
      if (!merged) {
        throw new Error(`Failed to merge geometry for material ${material.name || material.uuid}`);
      }
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = options.castShadow ?? true;
      mesh.receiveShadow = options.receiveShadow ?? true;
      group.add(mesh);
      for (const g of geometries) g.dispose();
    }
    this.buckets.clear();
    return group;
  }

  clear(): void {
    for (const geometries of this.buckets.values()) for (const g of geometries) g.dispose();
    this.buckets.clear();
  }
}

/** Points along a circle, angle in degrees. */
export function ringPoint(radius: number, angleDeg: number, y = 0): THREE.Vector3 {
  const a = angleDeg * DEG;
  return new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius);
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}
