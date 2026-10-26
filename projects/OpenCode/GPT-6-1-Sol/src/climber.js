import * as THREE from 'three';
import { chamferedBox, createAssembly } from './geometry.js';

export function buildClimber(materials) {
  const assembly = createAssembly();
  const { add, box, beam, round } = assembly;
  const hull = chamferedBox(6.9, 2.15, 5.1, .5, 2);
  add(hull, materials.white, [0, 0, 0], undefined, undefined, 'faceted-hull');
  add(chamferedBox(6.4, .5, 4.8, .25), materials.dark, [0, -1.24, 0], undefined, undefined, 'underframe');
  add(chamferedBox(4.65, .42, 3.85, .22), materials.dark, [0, 1.15, 0], undefined, undefined, 'recessed-roof');
  for (const side of [-1, 1]) {
    box(materials.white, [0, .82, side * 2.12], [6.1, .52, .62], [side * -.6, 0, 0], 'shoulder-armour');
    for (let i = -5; i <= 5; i++) {
      box(materials.dark, [i * .47, .19, side * 2.775], [.29, .22, .04], undefined, 'porthole-bezel');
      box(materials.window, [i * .47, .19, side * 2.79], [.24, .17, .055], undefined, 'porthole');
    }
    for (let i = -2; i <= 2; i++) {
      box(materials.panel, [i * 1.1, -.43, side * 2.79], [1.04, .71, .08], undefined, 'access-panel');
      for (const offset of [-.4, .4]) {
        round(materials.steel, [i * 1.1 + offset, -.6, side * 2.73], .035, .035, [Math.PI / 2, 0, 0], 'hull-fastener');
      }
      box(materials.dark, [i * 1.1, -.38, side * 2.62], [.015, .97, .025]);
    }
    box(materials.yellow, [0, -.85, side * 2.65], [5.8, .06, .03]);
    add(new THREE.PlaneGeometry(1.04, .27), materials.sign, [0, -.4, side * 2.845], undefined, [0, side === 1 ? 0 : Math.PI, 0], 'hull-identification');
    for (const end of [-1, 1]) {
      const x = side * 4.35;
      const z = end * 2.8;
      add(chamferedBox(1.8, 2.35, 1.65, .2), materials.white, [x, -.08, z], undefined, undefined, 'drive-pod');
      box(materials.dark, [x, -.05, z + end * .87], [1.3, 1.85, .1], undefined, 'drive-recess');
      box(materials.steel, [x, -.15, z + end * .94], [.85, 1.4, .12]);
      for (let fin = 0; fin < 6; fin++) box(materials.panel, [x, -.67 + fin * .21, z + end * 1.02], [.78, .055, .08], undefined, 'drive-louvre');
      for (const dx of [-.47, .47]) {
        round(materials.chrome, [x + dx, .02, z + end * 1.065], .1, 1.35, undefined, 'drive-actuator');
        for (const y of [-.58, .64]) round(materials.dark, [x + dx, y, z + end * 1.065], .15, .12, undefined, 'actuator-seal');
      }
      for (const y of [-.84, .92]) for (const dx of [-.63, .63]) {
        round(materials.chrome, [x + dx, y, z + end * 1.02], .045, .06, [Math.PI / 2, 0, 0], 'pod-fastener');
      }
      for (const dx of [-.6, .6]) beam(materials.steel, [x + dx, -.95, z + end * .94], [x + dx, .85, z + end * .94], .045, 'recess-edge');
      round(materials.dark, [x, 1.25, z], .62, .15, undefined, 'guide-base');
      for (let mount = 0; mount < 4; mount++) {
        const angle = mount * Math.PI / 2;
        round(materials.panel, [x + Math.cos(angle) * .5, 1.37, z + Math.sin(angle) * .5], .065, .08, undefined, 'guide-bolt');
      }
      round(materials.steel, [x, 1.55, z], .3, .6, undefined, 'guide-spindle');
      for (let roller = 0; roller < 4; roller++) {
        const a = roller * Math.PI / 2;
        round(materials.chrome, [x + Math.cos(a) * .37, 1.57, z + Math.sin(a) * .37], .12, .12, [0, 0, Math.PI / 2], 'cable-guide-roller');
      }
      const collar = new THREE.TorusGeometry(.48, .085, 8, 24);
      add(collar, materials.yellow, [x, 1.68, z], undefined, [Math.PI / 2, 0, 0], 'guide-collar');
      box(materials.yellow, [x, -1.75, z], [.46, 1.08, .34], undefined, 'drive-foot');
      box(materials.dark, [side * 3.55, -.1, z * .82], [1.65, .75, .8], undefined, 'outrigger');
      beam(materials.steel, [side * 2.8, -1.2, end * 1.8], [x, -1.6, z], .14, 'pod-brace');
      beam(materials.yellow, [side * 3.4, .7, end * 2.2], [x, 1.45, z], .085, 'drive-link');
      beam(materials.chrome, [side * 3.5, .58, end * 2.17], [x, 1.15, z], .035, 'drive-link-piston');
      const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(side * 3.45, -.5, end * 2.3), new THREE.Vector3(side * 3.7, -.74, end * 2.55), new THREE.Vector3(x, -.5, z)]);
      add(new THREE.TubeGeometry(hose, 10, .038, 6, false), materials.dark, [0, 0, 0], undefined, undefined, 'drive-hose');
      box(end === 1 ? materials.cyan : materials.red, [x + side * .94, .9, z], [.08, .14, .3]);
    }
  }
  for (let i = -2; i <= 2; i++) {
    box(materials.panel, [i * .88, 1.39, 0], [.025, .04, 3.3]);
    for (const side of [-1, 1]) {
      beam(materials.steel, [i * .95, -1.4, side * 1.8], [(i + .7) * .95, -2.25, side * .8], .1, 'bottom-truss');
    }
  }
  add(chamferedBox(3.5, .35, 2.8, .4), materials.steel, [0, -2.2, 0], undefined, undefined, 'bottom-assembly');
  for (const side of [-1, 1]) {
    add(chamferedBox(.54, .4, 3.5, .12), materials.panel, [side * 2.7, 1.16, 0], undefined, [0, 0, side * .4], 'roof-shoulder');
    for (const end of [-1, 1]) {
      box(materials.dark, [side * 2.83, 1.08, end * 1.38], [.52, .06, .5], undefined, 'roof-intake');
      for (let i = 0; i < 3; i++) box(materials.steel, [side * 2.83, 1.13, end * 1.38 + (i - 1) * .13], [.46, .025, .025]);
    }
    box(materials.dark, [side * 3.53, -.22, 0], [.03, 1.35, 1.04], undefined, 'side-door');
    box(materials.panel, [side * 3.56, -.22, 0], [.04, 1.17, .87], undefined, 'door-leaf');
    box(materials.yellow, [side * 3.6, -.1, .27], [.03, .2, .05], undefined, 'door-handle');
  }
  for (let i = -5; i <= 5; i++) box(materials.steel, [i * .39, 1.4, 0], [.035, .04, 3.1], undefined, 'roof-seam');
  for (let tile = 0; tile < 12; tile++) {
    box(materials.dark, [(tile % 4 - 1.5) * 1.03, 1.405, (Math.floor(tile / 4) - 1) * 1.01], [.98, .028, .96], undefined, 'roof-inset-tile');
    for (const side of [-1, 1]) round(materials.chrome, [(tile % 4 - 1.5) * 1.03 + side * .41, 1.435, (Math.floor(tile / 4) - 1) * 1.01 + .4], .018, .018, undefined, 'roof-tile-fastener');
  }
  for (const side of [-1, 1]) {
    box(materials.panel, [side * 2.15, 1.4, 0], [.14, .1, 3.4], undefined, 'roof-rim');
    for (let fin = 0; fin < 9; fin++) box(materials.steel, [fin * .39 - 1.56, .86, side * 2.42], [.23, .16, .055], undefined, 'shoulder-vent');
    beam(materials.panel, [-2.4, -.91, side * 2.7], [2.4, -.91, side * 2.7], .05, 'bumper');
    for (let i = -1; i <= 1; i++) {
      beam(materials.steel, [-2.1, -1.37, i * 1.2], [2.1, -2.12, i * 1.2], .07, 'bottom-diagonal');
      beam(materials.steel, [2.1, -1.37, i * 1.2], [-2.1, -2.12, i * 1.2], .07, 'bottom-diagonal');
    }
  }
  const group = assembly.finish();
  group.name = 'four-corner-climber';
  return group;
}
