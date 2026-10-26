import * as THREE from 'three';

export function createSurfaceTexture(seed, tiles = 4) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let value = seed;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      const seam = x % (size / tiles) < 1 || y % (size / tiles) < 1;
      const streak = Math.sin(x * .38) * Math.sin(y * .013 + x * .02);
      const shade = Math.round((seam ? 115 : 213) + (value / 4294967296 - .5) * 15 + streak * 10);
      const index = (y * size + x) * 4;
      data.set([shade, shade, shade, 255], index);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function applySurfaces(materials) {
  for (const [name, seed, kind] of [['panel', 37, 'paint'], ['steel', 19, 'metal'], ['concrete', 43, 'concrete'], ['white', 73, 'ceramic'], ['dark', 101, 'metal'], ['yellow', 59, 'paint']]) {
    const maps = createPBRSurface(seed, kind, name === 'white' ? 1024 : 512);
    Object.assign(materials[name], maps);
    materials[name].normalScale = new THREE.Vector2(kind === 'concrete' ? .42 : .18, kind === 'concrete' ? .42 : .18);
    materials[name].envMapIntensity = name === 'white' ? .55 : .65;
  }
}

function dataTexture(data, size, color = false) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createPBRSurface(seed, kind = 'metal', size = 512) {
  const albedo = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(albedo.length);
  const packed = new Uint8Array(albedo.length);
  const heights = new Float32Array(size * size);
  let random = seed;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const grain = random / 4294967296;
    const u = x / size;
    const v = y / size;
    const mottling = Math.sin(u * Math.PI * 8 + Math.cos(v * Math.PI * 6)) * Math.sin(v * Math.PI * 10 + seed);
    const brushed = Math.sin(u * Math.PI * 310) * Math.sin(v * Math.PI * 2);
    const edge = Math.pow(Math.abs(Math.cos(u * Math.PI)), 55) + Math.pow(Math.abs(Math.cos(v * Math.PI)), 55);
    const scratch = grain > .997 && kind !== 'concrete' ? .16 : 0;
    const grime = edge * (kind === 'ceramic' ? .025 : .055) + Math.max(0, mottling) * .015;
    const height = kind === 'concrete' ? (grain - .5) * .055 + mottling * .045 : brushed * .001 + (grain - .5) * .002 - scratch * .035;
    heights[y * size + x] = height;
    const brightness = Math.min(1, Math.max(.45, .94 - grime + (grain - .5) * .024 + scratch));
    const base = Math.round(brightness * 255);
    const i = (y * size + x) * 4;
    albedo.set([base, Math.round(base * .997), Math.round(base * .98), 255], i);
    const rough = kind === 'ceramic' ? .58 : kind === 'concrete' ? .96 : kind === 'paint' ? .76 : .69;
    packed.set([Math.round((1 - grime) * 255), Math.round(Math.min(1, rough + grime + (grain - .5) * .09) * 255), Math.round((kind === 'metal' ? .94 : kind === 'concrete' ? .02 : .6) * 255), 255], i);
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = heights[y * size + (x + 1) % size] - heights[y * size + (x + size - 1) % size];
    const dy = heights[((y + 1) % size) * size + x] - heights[((y + size - 1) % size) * size + x];
    const n = new THREE.Vector3(-dx * 6, -dy * 6, 1).normalize();
    normal.set([Math.round((n.x * .5 + .5) * 255), Math.round((n.y * .5 + .5) * 255), Math.round((n.z * .5 + .5) * 255), 255], (y * size + x) * 4);
  }
  const packedMap = dataTexture(packed, size);
  return { map: dataTexture(albedo, size, true), normalMap: dataTexture(normal, size), roughnessMap: packedMap, metalnessMap: packedMap };
}

export function createGraphicTexture(type = 'sign') {
  if (typeof document === 'undefined') return createSurfaceTexture(43, 4);
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = type === 'screen' ? 512 : 256;
  const context = canvas.getContext('2d');
  context.fillStyle = type === 'screen' ? '#0b1b21' : '#b7bdb7';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (type === 'screen') {
    context.strokeStyle = '#38565c';
    for (let x = 24; x < 1024; x += 48) { context.beginPath(); context.moveTo(x, 64); context.lineTo(x, 450); context.stroke(); }
    for (let y = 64; y < 460; y += 48) { context.beginPath(); context.moveTo(24, y); context.lineTo(1000, y); context.stroke(); }
    context.strokeStyle = '#a7d2c6';
    context.lineWidth = 3;
    context.beginPath();
    for (let x = 30; x < 740; x += 4) context.lineTo(x, 320 - Math.sin(x * .015) * 50 - Math.cos(x * .023) * 14);
    context.stroke();
    context.fillStyle = '#c3dad1';
    context.font = '22px monospace';
    context.fillText('SPACE ELEVATOR / GUIDANCE & TELEMETRY', 28, 38);
    context.fillText('SYSTEM NOMINAL', 28, 486);
    context.fillStyle = '#dfb16d';
    for (let i = 0; i < 8; i++) context.fillRect(790, 94 + i * 35, 50 + i * 17, 12);
    context.font = '46px monospace';
    context.fillText('SE-03', 54, 127);
  } else {
    context.fillStyle = '#28393d';
    context.font = 'bold 82px monospace';
    context.fillText('UEG / SE-03', 45, 105);
    context.font = '28px monospace';
    context.fillText('SPACE ELEVATOR  |  SERVICE ACCESS', 48, 170);
    context.fillStyle = '#9e8358';
    for (let i = 0; i < 20; i++) context.fillRect(45 + i * 46, 207, 28, 17);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
