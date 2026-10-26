import * as THREE from 'three';
import { taperedBox, chamferedBox } from './geometry.js';
import { buildClimber as buildDetailedClimber } from './climber.js';
import { applySurfaces, createGraphicTexture } from './surfaces.js';
import { buildIndustrialDetails } from './details.js';
import { buildLaunchRig, LAUNCH } from './launch.js';

export const DIMENSIONS = Object.freeze({ radius: 75, towerRadius: 25, towerHeight: 100, mainTowers: 3, launchGroups: 12, cableChannels: 9, cablesPerChannel: 24 });

export function seededRandom(seed = 42) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function radialPoint(radius, angle, y = 0) {
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}

export function buildElevator() {
  const root = new THREE.Group();
  root.name = 'space-elevator';
  const random = seededRandom();
  const materials = {
    steel: new THREE.MeshStandardMaterial({ color: 0x536065, roughness: .68, metalness: .65 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x263338, roughness: .85, metalness: .45 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x9ca6a3, roughness: .73, metalness: .4 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x626b68, roughness: .97, metalness: .08 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xbba16b, roughness: .64, metalness: .45 }),
    white: new THREE.MeshPhysicalMaterial({ color: 0xd8dcd2, roughness: .63, metalness: .22, clearcoat: .3, clearcoatRoughness: .35 }),
    window: new THREE.MeshPhysicalMaterial({ color: 0x253f48, roughness: .12, metalness: .35, clearcoat: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xaab7b7, roughness: .25, metalness: .94 }),
    sign: new THREE.MeshStandardMaterial({ color: 0xffffff, map: createGraphicTexture(), roughness: .8 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xffc67d, emissive: 0xffa94e, emissiveIntensity: 1.7, roughness: .4 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x74c3d1, emissive: 0x5baab8, emissiveIntensity: 1.2 }),
    red: new THREE.MeshStandardMaterial({ color: 0xdc6044, emissive: 0xd93719, emissiveIntensity: 1.8 }),
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  applySurfaces(materials);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const batches = new Map();
  const temp = new THREE.Object3D();
  function part(geometry, material, position, scale, rotation = null) {
    const key = `${geometry.uuid}/${material.uuid}`;
    if (!batches.has(key)) batches.set(key, { geometry, material, matrices: [] });
    temp.position.copy(position);
    temp.scale.set(...scale);
    temp.quaternion.identity();
    if (rotation instanceof THREE.Quaternion) temp.quaternion.copy(rotation);
    else if (rotation) temp.rotation.set(...rotation);
    temp.updateMatrix();
    batches.get(key).matrices.push(temp.matrix.clone());
  }
  function box(x, y, z, sx, sy, sz, material = materials.steel, angle = 0) {
    part(cube, material, new THREE.Vector3(x, y, z), [sx, sy, sz], [0, angle, 0]);
  }
  function beam(a, b, width = .35, material = materials.steel, depth = width) {
    const direction = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    part(cube, material, a.clone().add(b).multiplyScalar(.5), [width, direction.length(), depth], q);
  }
  function round(radius, height, y, material, x = 0, z = 0) {
    const edge = Math.min(.16, height * .15);
    const profile = [[0, -height / 2], [radius - edge, -height / 2], [radius, -height / 2 + edge], [radius, height / 2 - edge], [radius - edge, height / 2], [0, height / 2]].map(([r, h]) => new THREE.Vector2(r, h));
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  }
  function ring(radius, thickness, y, material, tube = .28) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 144), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = y;
    root.add(mesh);
    if (thickness) {
      const deck = new THREE.Mesh(new THREE.RingGeometry(radius - thickness / 2, radius + thickness / 2, 144), material);
      deck.rotation.x = -Math.PI / 2;
      deck.position.y = y;
      deck.receiveShadow = true;
      root.add(deck);
    }
  }

  round(75, 3.1, 1.1, materials.dark);
  round(74.7, .65, 3, materials.concrete);
  round(48, 2.6, 4.5, materials.dark);
  round(45.5, .4, 6, materials.steel);
  round(24, 2, 7, materials.dark);
  round(22, .45, 8.2, materials.steel);
  round(13.5, .35, 8.6, materials.concrete);
  ring(74.5, 0, 3.8, materials.panel, .38);
  ring(68, 0, 3.38, materials.yellow, .13);
  ring(60, 0, 3.38, materials.panel, .12);
  ring(48, 0, 6.3, materials.panel, .4);
  ring(42, 0, 6.4, materials.yellow, .15);
  ring(24, 0, 8.5, materials.yellow, .17);
  const skirt = taperedBox(8.2, 5.4, 8, 13);
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI * 2 / 36;
    const p = radialPoint(53, a, 6.9);
    part(skirt, i % 3 === 0 ? materials.dark : materials.panel, p, [1, 1, 1], [0, -a + Math.PI / 2, -.42]);
    const top = radialPoint(47, a, 11);
    const bottom = radialPoint(60, a, 3.7);
    beam(top, bottom, .5, materials.steel);
    box(top.x, 11.5, top.z, 3.8, .9, 4, materials.dark, -a);
  }
  ring(46, 4.5, 11.4, materials.steel, .55);
  for (let i = 0; i < 72; i++) {
    const a = i * Math.PI * 2 / 72;
    const b = (i + 1) * Math.PI * 2 / 72;
    beam(radialPoint(72, a, .2), radialPoint(72, b, 3.1), .28);
    beam(radialPoint(47, a, 8), radialPoint(47, b, 11.4), .25);
  }
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2;
    const p = radialPoint(72.8, a, 2);
    box(p.x, p.y, p.z, 3, 4.5, 1.5, materials.dark, -a);
    const lip = radialPoint(74.9, a, 4.2);
    box(lip.x, lip.y, lip.z, .17, 1.5, .17, materials.panel);
    const road = radialPoint(64, a, 3.36);
    box(road.x, road.y, road.z, 1.3, .035, .14, materials.yellow, -a + Math.PI / 2);
    if (i % 3 === 0) {
      const lamp = radialPoint(71.5, a, 4.7);
      box(lamp.x, lamp.y, lamp.z, .2, 2.5, .2, materials.steel);
      box(lamp.x, 6, lamp.z, .35, .18, .35, materials.glow);
    }
    const under = radialPoint(73, a, .3);
    const inner = radialPoint(65, a, 2.4);
    beam(under, inner, .4);
  }
  const towerShell = chamferedBox(2.4, 69.2, 7.3, .14, 2);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + Math.PI / 6;
    const p = radialPoint(DIMENSIONS.towerRadius, a);
    const radial = radialPoint(1, a);
    const tangent = radialPoint(1, a + Math.PI / 2);
    const local = (u, y, v) => p.clone().addScaledVector(radial, u).addScaledVector(tangent, v).setY(y);
    const pedestal = taperedBox(14, 9.5, 17, 12);
    part(pedestal, materials.panel, local(0, 17, 0), [1, 1, 1], [0, -a, 0]);
    box(p.x, 27, p.z, 9.7, 22, 10.1, materials.dark, -a);
    for (const side of [-1, 1]) {
      const shell = local(side * 3.1, 67.3, 0);
      part(towerShell, materials.panel, shell, [1, 1, 1], [0, -a, 0]);
      const darkStrip = local(side * 4.35, 67.3, .4);
      box(darkStrip.x, darkStrip.y, darkStrip.z, .12, 68.8, 2.2, materials.dark, -a);
      beam(local(side * 4.5, 35, -3.9), local(side * 4.5, 101.5, -3.9), .36, materials.steel);
      beam(local(side * 4.5, 35, 3.9), local(side * 4.5, 101.5, 3.9), .36, materials.steel);
    }
    for (const u of [-3.6, 3.6]) {
      for (const v of [-3.6, 3.6]) beam(local(u, 10, v), local(u * .72, 103, v * .72), .8, materials.steel);
    }
    for (let level = 0; level < 14; level++) {
      const y = 13 + level * 6.35;
      const factor = 1 - level * .02;
      const w = 3.5 * factor;
      for (const side of [-1, 1]) {
        beam(local(-w, y, side * w), local(w, y + 6.2, side * w), .32, materials.steel);
        beam(local(w, y, side * w), local(-w, y + 6.2, side * w), .32, materials.steel);
        beam(local(side * w, y, -w), local(side * w, y + 6.2, w), .3, materials.steel);
        const panel = local(0, y + 2.9, side * 3.8);
        box(panel.x, panel.y, panel.z, 2.8, 5.8, .25, materials.steel, -a);
      }
      const floor = local(0, y, 0);
      box(floor.x, floor.y, floor.z, w * 2 + 1.1, .5, w * 2 + 1.1, materials.dark, -a);
      const light = local(3.6 * factor, y + .5, 3.6 * factor);
      box(light.x, light.y, light.z, .35, .3, .35, level > 10 ? materials.red : materials.glow);
    }
    for (const y of [36, 94, 103]) {
      box(p.x, y, p.z, 10, 1.4, 10, materials.steel, -a);
      box(p.x, y + .8, p.z, 10.3, .25, 10.3, materials.panel, -a);
      for (const v of [-4.8, 4.8]) {
        for (let u = -4.5; u <= 4.5; u += 1.5) {
          beam(local(u, y + .8, v), local(u, y + 1.8, v), .08, materials.panel);
        }
        beam(local(-4.8, y + 1.8, v), local(4.8, y + 1.8, v), .09, materials.panel);
      }
    }
    for (const side of [-1, 1]) {
      const bottom = radialPoint(50, a, 10).addScaledVector(tangent, side * 4);
      beam(local(3, 38, side * 3), bottom, 3.7, materials.panel, 3.2);
      beam(local(4.8, 36, side * 3), bottom.clone().addScaledVector(radial, 1.8), .7, materials.dark);
      const shoe = bottom.clone().setY(8.5);
      box(shoe.x, shoe.y, shoe.z, 8, 3, 5, materials.dark, -a);
    }
    for (const side of [-1, 1]) {
      for (let c = 0; c < 4; c++) {
        const anchor = radialPoint(70 - c * 2, a + side * .32, 4.8);
        beam(local(0, 37 + c * 15, side * 3), anchor, .085, materials.steel);
      }
    }
    const crown = local(0, 105.5, 0);
    box(crown.x, crown.y, crown.z, 5.5, 4, 5.5, materials.dark, -a);
    for (let v = -2; v <= 2; v += 2) {
      beam(local(0, 105, v), local(0, 145, v), .23, materials.steel);
    }
    beam(radialPoint(25, a, 35), radialPoint(25, a + 2 * Math.PI / 3, 35), 1.4, materials.dark, 2.6);
    beam(radialPoint(25, a, 37), radialPoint(25, a + 2 * Math.PI / 3, 37), .7, materials.panel, 3.1);
    for (let step = 0; step < 9; step++) {
      const v1 = radialPoint(25, a, 31).lerp(radialPoint(25, a + 2 * Math.PI / 3, 31), step / 9);
      const v2 = radialPoint(25, a, 35).lerp(radialPoint(25, a + 2 * Math.PI / 3, 35), (step + 1) / 9);
      beam(v1, v2, .32);
    }
  }
  ring(25, 4, 36.5, materials.steel, .45);
  ring(25, 0, 38.2, materials.panel, .12);
  ring(25, 0, 33.2, materials.dark, .4);
  ring(29, 1, 144, materials.dark, .3);

  const cableChannels = Array.from({ length: 9 }, (_, i) => {
    const a = Math.floor(i / 3) * 2 * Math.PI / 3 + Math.PI / 6;
    return radialPoint(56, a).addScaledVector(radialPoint(1, a + Math.PI / 2), (i % 3 - 1) * 11.5);
  });
  const launchPositions = [];
  for (let i = 0; i < 12; i++) {
    const sector = Math.floor(i / 4);
    const a = sector * Math.PI * 2 / 3 + Math.PI / 6;
    const p = i % 4 < 3 ? cableChannels[sector * 3 + i % 4].clone() : radialPoint(59, a).addScaledVector(radialPoint(1, a + Math.PI / 2), 25);
    const tangent = radialPoint(1, a + Math.PI / 2);
    const direction = radialPoint(1, a);
    const local = (u, y, v) => p.clone().addScaledVector(direction, u).addScaledVector(tangent, v).setY(y);
    launchPositions.push(p.clone());
    if (i === 1) continue;
    for (const side of [-1, 1]) {
      const base = local(0, 8.3, side * 5.5);
      box(base.x, base.y, base.z, 5.5, 4.2, 2.4, materials.dark, -a);
      for (const u of [-1.4, 1.4]) {
        for (const v of [-.65, .65]) beam(local(u, 9, side * 5.5 + v), local(u, 38, side * 5.5 + v), .32, materials.panel);
      }
      for (let y = 10; y < 37; y += 3.8) {
        beam(local(-1.4, y, side * 5.5), local(1.4, y + 3.8, side * 5.5), .22);
        const rail = local(1.65, y + 1.3, side * 5.5);
        box(rail.x, rail.y, rail.z, .35, 2.8, 1.5, materials.dark, -a);
      }
      const top = local(0, 38, side * 5.5);
      box(top.x, top.y, top.z, 4, .7, 2.5, materials.panel, -a);
      const facing = local(1.5, 24, side * 5.5);
      box(facing.x, facing.y, facing.z, .35, 24, 1.6, materials.panel, -a);
      beam(local(-1.3, 10, side * 6.4), local(-1.3, 35, side * 6.4), .27, materials.yellow);
      beam(local(3.8, 6, side * 6.7), local(1.2, 17, side * 5.5), .75, materials.steel);
      beam(local(-1, 10, side * 5.5), local(-1, 15, side * 2), .6, materials.yellow);
      beam(local(1, 10, side * 5.5), local(1, 15, side * 2), .6, materials.steel);
    }
    const platform = local(0, 14.8, 0);
    box(platform.x, platform.y, platform.z, 4.3, .8, 5.8, materials.dark, -a);
    box(platform.x, platform.y + .46, platform.z, 3.8, .12, 5, materials.steel, -a);
    for (let s = -2; s <= 2; s++) {
      const grille = local(0, 15.4, s);
      box(grille.x, grille.y, grille.z, 3.5, .08, .14, materials.yellow, -a);
    }
  }

  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + Math.PI / 6;
    const start = radialPoint(70, a, 3.2);
    const end = radialPoint(i % 2 === 0 ? 154 : 128, a, 2.3);
    const delta = end.clone().sub(start);
    const center = start.clone().add(end).multiplyScalar(.5);
    box(center.x, center.y, center.z, delta.length(), 1.8, i % 2 === 0 ? 10 : 6, materials.dark, -a);
    box(center.x, center.y + 1, center.z, delta.length(), .3, i % 2 === 0 ? 9.6 : 5.6, materials.concrete, -a);
    const tangent = radialPoint(1, a + Math.PI / 2);
    for (let t = .08; t < 1; t += .13) {
      const p = start.clone().lerp(end, t);
      for (const side of [-1, 1]) {
        const leg = p.clone().addScaledVector(tangent, side * 3.6);
        box(leg.x, -.4, leg.z, 1.3, 5.4, 1.3, materials.concrete);
        const light = p.clone().addScaledVector(tangent, side * 4.5);
        box(light.x, 4.5, light.z, .16, 2.2, .16, materials.steel);
        box(light.x, 5.7, light.z, .3, .12, .3, materials.glow);
      }
      box(p.x, 4.2, p.z, 2.4, .05, .18, materials.yellow, -a);
    }
    const shore = end.clone().addScaledVector(radialPoint(1, a), 7);
    box(shore.x, 1.5, shore.z, 26, 4.4, 22, materials.concrete, -a);
    box(shore.x, 5, shore.z, 12, 3, 9, materials.dark, -a);
    for (let j = 0; j < 6; j++) {
      const p = shore.clone().addScaledVector(tangent, (j - 3) * 2.2);
      box(p.x, 7, p.z, 1.5, .5, 8, materials.panel, -a);
    }
  }
  for (let i = 0; i < 130; i++) {
    const a = random() * Math.PI * 2;
    const r = 51 + random() * 19;
    const p = radialPoint(r, a);
    if (i < 48) {
      const w = 1.1 + random() * 1.9;
      box(p.x, 4 + w / 2, p.z, w, w, w * 2.1, i % 4 ? materials.dark : materials.yellow, -a);
      box(p.x, 4.05 + w, p.z, w * .75, .08, w * 1.85, materials.panel, -a);
    } else {
      box(p.x, 3.45, p.z, 1 + random() * 2, .1, .13, materials.panel, -a);
    }
  }
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const p = radialPoint(43, a, 7.2);
    box(p.x, p.y, p.z, 2, 1.2, 1, materials.dark, -a);
    if (i % 2 === 0) {
      const q = radialPoint(71, a, 5);
      box(q.x, q.y, q.z, 2.3, 2.8, 3.1, materials.panel, -a);
      beam(q.clone().setY(5.5), q.clone().add(new THREE.Vector3(0, 4, 0)), .2, materials.yellow);
      beam(q.clone().setY(9), q.clone().add(radialPoint(6, a + Math.PI / 2)).setY(9.5), .25, materials.yellow);
    }
  }

  const cableVertices = [];
  const cableColors = [];
  const climbers = [];
  const climberPrototype = buildDetailedClimber(materials);
  for (let i = 0; i < 9; i++) {
    const sector = Math.floor(i / 3);
    const a = sector * 2 * Math.PI / 3 + Math.PI / 6;
    const p = cableChannels[i];
    for (let j = 0; j < 24; j++) {
      const corner = Math.floor(j / 6);
      const u = (corner % 2 ? 1 : -1) * 4.35 + (j % 3 - 1) * .12;
      const v = (corner < 2 ? 1 : -1) * 2.8 + (Math.floor((j % 6) / 3) - .5) * .15;
      const offset = new THREE.Vector3(u, 0, v).applyAxisAngle(new THREE.Vector3(0, 1, 0), -a);
      const x = p.x + offset.x;
      const z = p.z + offset.z;
      cableVertices.push(x, 9, z, x, 680, z);
      const c = new THREE.Color(j % 6 === 0 ? 0x778687 : 0x39494e);
      cableColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (j % 6 === 0) part(cylinder, materials.steel, new THREE.Vector3(x, 344.5, z), [.028, 671, .028]);
    }
    const climber = climberPrototype.clone();
    climber.position.set(p.x, i === 1 ? LAUNCH.parkedY : 40 + (i % 3) * 47 + sector * 9, p.z);
    climber.rotation.y = -a;
    climber.userData.initialY = climber.position.y;
    climber.userData.channel = i;
    root.add(climber);
    climbers.push(climber);
  }
  const cables = new THREE.BufferGeometry();
  cables.setAttribute('position', new THREE.Float32BufferAttribute(cableVertices, 3));
  cables.setAttribute('color', new THREE.Float32BufferAttribute(cableColors, 3));
  const cableMesh = new THREE.LineSegments(cables, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .34, depthWrite: false }));
  cableMesh.name = '216-carbon-nanotube-cables';
  root.add(cableMesh);
  root.add(buildIndustrialDetails(materials, launchPositions));
  const launchRig = buildLaunchRig(materials, cableChannels[1], -Math.PI / 6);
  root.add(launchRig.group);
  for (const { geometry, material, matrices } of batches.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = material !== materials.glow && material !== materials.red;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  root.userData.counts = { mainTowers: 3, launchGroups: launchPositions.length, cableChannels: cableChannels.length, cables: cableVertices.length / 6, climbers: climbers.length };
  return { root, materials, climbers, cableChannels, launchPositions, launchRig, launchClimber: climbers[1] };
}
