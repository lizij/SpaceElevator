import * as THREE from 'three';
import { createAssembly, chamferedBox } from './geometry.js';

export function buildIndustrialDetails(materials, launchPositions) {
  const { add, box, beam, round, finish } = createAssembly();
  const equipment = chamferedBox(1.3, 1.8, 1, .09);
  for (let tower = 0; tower < 3; tower++) {
    const angle = tower * Math.PI * 2 / 3 + Math.PI / 6;
    const origin = new THREE.Vector3(Math.cos(angle) * 25, 0, Math.sin(angle) * 25);
    const transform = (u, y, v) => new THREE.Vector3(u, y, v).applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle).add(origin).toArray();
    for (const side of [-1, 1]) {
      for (let y = 40; y < 100; y += 5.8) {
        box(materials.steel, transform(side * 4.42, y, 0), [.15, .2, 7.4], [0, -angle, 0], 'tower-panel-joint');
        for (const v of [-3, 3]) round(materials.panel, transform(side * 4.55, y, v), .13, .16, [0, 0, Math.PI / 2], 'tower-fastener');
        box(materials.dark, transform(side * 4.6, y + 1.5, -2.4), [.28, 1.8, .8], [0, -angle, 0], 'service-cassette');
        for (let fin = 0; fin < 5; fin++) box(materials.steel, transform(side * 4.78, y + .85 + fin * .27, -2.4), [.08, .09, .85], [0, -angle, 0], 'vent-fin');
      }
      for (const v of [2.2, 2.65]) {
        beam(materials.yellow, transform(side * 4.7, 37, v), transform(side * 4.7, 101, v), .09, 'service-pipe');
      }
      for (let y = 39; y < 100; y += 1.4) beam(materials.steel, transform(side * 4.7, y, 2.2), transform(side * 4.7, y, 2.65), .06, 'ladder-rung');
    }
    for (let step = 0; step < 18; step++) {
      const a = angle + step / 18 * Math.PI * 2 / 3;
      const b = angle + (step + 1) / 18 * Math.PI * 2 / 3;
      const p = (r, theta, y) => [Math.cos(theta) * r, y, Math.sin(theta) * r];
      for (const r of [23, 27]) {
        beam(materials.panel, p(r, a, 37), p(r, a, 38.1), .08, 'catwalk-post');
        beam(materials.panel, p(r, a, 38.1), p(r, b, 38.1), .09, 'catwalk-handrail');
      }
      box(materials.dark, p(25, a, 36.58), [.08, .08, 3.5], [0, -a, 0], 'catwalk-grille');
    }
  }
  launchPositions.forEach((position, index) => {
    if (index === 1) return;
    const angle = Math.floor(index / 4) * Math.PI * 2 / 3 + Math.PI / 6;
    const local = (u, y, v) => new THREE.Vector3(u, y, v).applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle).add(position).toArray();
    for (const side of [-1, 1]) {
      for (const u of [-1, 1]) {
        const a = local(u, 8, side * 6.6);
        const b = local(u, 14.6, side * 2);
        const center = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), .55).toArray();
        beam(materials.steel, a, center, .48, 'hydraulic-barrel');
        beam(materials.chrome, center, b, .23, 'hydraulic-piston');
        round(materials.dark, a, .43, .8, [Math.PI / 2, 0, 0], 'actuator-pivot');
        round(materials.yellow, b, .3, .6, [Math.PI / 2, 0, 0], 'actuator-pivot');
      }
      for (const y of [16, 23, 30]) {
        box(materials.dark, local(2, y, side * 5.5), [2.2, .4, 3], [0, -angle, 0], 'launch-service-balcony');
        beam(materials.yellow, local(3, y, side * 4), local(3, y + 1, side * 4), .09);
        beam(materials.steel, local(3, y + 1, side * 4), local(3, y + 1, side * 7), .08);
        beam(materials.steel, local(0, y - 2, side * 5.5), local(3, y, side * 5.5), .2, 'balcony-brace');
      }
      add(equipment, materials.panel, local(3.4, 7, side * 5.5), undefined, [0, -angle, 0], 'control-cabinet');
      beam(materials.dark, local(2.1, 7, side * 6.2), local(2.1, 34, side * 6.2), .16, 'conduit');
      round(materials.steel, local(-2.5, 10.2, side * 5.5), .52, 7.5, undefined, 'static-booster');
      for (const y of [7, 10.2, 13.4]) round(materials.dark, local(-2.5, y, side * 5.5), .58, .2, undefined, 'booster-collar');
    }
    for (let s = -7; s <= 7; s++) box(materials.panel, local(0, 15.3, s * .31), [4.2, .055, .045], [0, -angle, 0], 'launch-grate');
    box(materials.yellow, local(0, 6.45, 5.5), [4, .08, 1], [0, -angle, 0], 'safety-zone');
    if (index % 3 === 0) box(materials.glow, local(2.8, 16.6, 0), [.22, .2, .3]);
  });
  for (let sector = 0; sector < 3; sector++) {
    const angle = sector * Math.PI * 2 / 3 + Math.PI / 6;
    const local = (u, y, v) => new THREE.Vector3(u, y, v).applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle).add(new THREE.Vector3(Math.cos(angle) * 25, 0, Math.sin(angle) * 25)).toArray();
    for (const side of [-1, 1]) {
      for (let y = 34; y < 98; y += 7.2) {
        for (let v = -2.7; v <= 2.7; v += 1.8) {
          box(materials.steel, local(side * 4.54, y + 3.4, v), [.075, 6.65, 1.66], [0, -angle, 0], 'tower-layered-panel');
          for (const dy of [-2.9, 2.9]) round(materials.chrome, local(side * 4.63, y + 3.4 + dy, v), .045, .05, [0, 0, Math.PI / 2], 'tower-panel-bolt');
        }
      }
    }
    for (let level = 0; level < 6; level++) {
      const y = 17 + level * 2.4;
      for (const v of [-5.05, 5.05]) {
        box(materials.dark, local(0, y, v), [7.3, .3, .07], [0, -angle, 0], 'pedestal-louvre');
        box(materials.steel, local(0, y + .17, v), [7.5, .06, .13], [0, -angle, 0]);
      }
    }
  }
  for (let segment = 0; segment < 36; segment++) {
    const a = segment * Math.PI * 2 / 36;
    const p = (r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const rotate = [0, -a, 0];
    add(equipment, materials.dark, p(70.5, 4.6), [1.6, .8, 1], rotate, 'quayside-service-box');
    beam(materials.steel, p(61, 3.42), p(72, 3.42), .06, 'radial-deck-joint');
    for (const y of [.25, .75]) {
      const b = a + Math.PI * 2 / 36;
      beam(materials.panel, p(74.1, y), [Math.cos(b) * 74.1, y, Math.sin(b) * 74.1], .17, 'foundation-pipe');
    }
    box(materials.dark, p(74.8, 1.45), [.1, 1.2, 1.8], rotate, 'foundation-service-opening');
  }
  for (let crane = 0; crane < 6; crane++) {
    const a = crane * Math.PI / 3 + .25;
    const origin = new THREE.Vector3(Math.cos(a) * 68, 0, Math.sin(a) * 68);
    const p = (x, y, z) => new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -a).add(origin).toArray();
    round(materials.dark, p(0, 4.5, 0), 1.25, 1.8, undefined, 'quay-crane-base');
    beam(materials.steel, p(0, 5, 0), p(0, 11.5, 0), .42, 'quay-crane-mast');
    add(equipment, materials.yellow, p(0, 10.8, 0), [1.1, .8, 1.2], [0, -a, 0], 'crane-cab');
    for (const z of [-.34, .34]) {
      beam(materials.steel, p(0, 12, z), p(9, 14.5, z), .13, 'crane-boom');
      beam(materials.steel, p(0, 10.5, z), p(9, 14.5, z), .1, 'crane-boom-brace');
      beam(materials.dark, p(9, 14.5, z), p(9, 6, z), .035, 'crane-cable');
    }
    round(materials.yellow, p(9, 5.9, 0), .2, .4, undefined, 'crane-hook');
    for (let tank = 0; tank < 3; tank++) {
      round(materials.panel, p(-3.6, 5.8, -2 + tank * 2), .68, 3.2, undefined, 'pressure-tank');
      round(materials.dark, p(-3.6, 7.45, -2 + tank * 2), .72, .12, undefined, 'tank-band');
    }
  }
  const group = finish(true);
  group.name = 'industrial-detail-layer';
  return group;
}
