import * as THREE from 'three';
import { createAssembly, chamferedBox } from './geometry.js';
import { createPBRSurface, createGraphicTexture } from './surfaces.js';

export const CABIN_VIEWS = Object.freeze({
  passenger: { title: '乘客舱', camera: [.15, 1.88, 5.85], target: [0, 1.5, -3.6] },
  control: { title: '操控舱', camera: [1.35, 1.85, 4.8], target: [-.2, 1.28, -2.7] },
  cargo: { title: '货舱', camera: [1.35, 2.05, 5.5], target: [-.8, 1.6, -3.7] },
});

export function buildInterior() {
  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: 0x87928c, roughness: .74, metalness: .35, ...createPBRSurface(133, 'paint') }),
    frame: new THREE.MeshStandardMaterial({ color: 0x394b4c, roughness: .5, metalness: .8, ...createPBRSurface(149, 'metal') }),
    trim: new THREE.MeshStandardMaterial({ color: 0xabb6b0, roughness: .44, metalness: .75 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x26373b, roughness: .82, metalness: .4, ...createPBRSurface(157, 'metal') }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x48564c, roughness: .96, metalness: 0, normalScale: new THREE.Vector2(.08, .08), ...createPBRSurface(193, 'concrete', 256) }),
    harness: new THREE.MeshStandardMaterial({ color: 0x716b50, roughness: .97 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xb69a58, roughness: .58, metalness: .5, ...createPBRSurface(239, 'paint', 256) }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x121f22, roughness: .9 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xd9ede3, emissive: 0xbdd7cb, emissiveIntensity: 2.8, toneMapped: false }),
    amber: new THREE.MeshStandardMaterial({ color: 0xe3a85e, emissive: 0xcd7733, emissiveIntensity: 1.2 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x86a9a4, emissive: 0xffffff, emissiveMap: createGraphicTexture('screen'), emissiveIntensity: .65, roughness: .28, metalness: .15 }),
    sign: new THREE.MeshStandardMaterial({ color: 0xffffff, map: createGraphicTexture(), roughness: .8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x467078, roughness: .08, metalness: .25, clearcoat: 1, transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false }),
  };
  const root = new THREE.Group();
  root.name = 'climber-interior';
  const rooms = {};
  const seatCounts = {};
  const ceilingLamp = chamferedBox(1.35, .06, .44, .04);
  const panel = chamferedBox(.15, 1.55, 1.58, .04);
  const seatCushion = chamferedBox(.86, .18, .85, .08);
  const seatBack = chamferedBox(.87, .98, .17, .06);
  const headrest = chamferedBox(.55, .28, .22, .06);

  function chair(assembly, position, rotation = 0) {
    const local = (x, y, z) => new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation).add(new THREE.Vector3(...position)).toArray();
    const rot = [0, rotation, 0];
    assembly.add(seatCushion, materials.fabric, local(0, .5, 0), undefined, rot, 'seat-cushion');
    assembly.add(seatBack, materials.fabric, local(0, 1.07, .37), undefined, [-.13, rotation, 0], 'seat-back');
    assembly.add(headrest, materials.fabric, local(0, 1.69, .45), undefined, rot, 'seat-headrest');
    assembly.box(materials.frame, local(0, .28, 0), [.76, .15, .66], rot, 'seat-underframe');
    for (const side of [-1, 1]) {
      assembly.beam(materials.frame, local(side * .3, .03, -.24), local(side * .3, .47, .26), .06, 'seat-leg');
      assembly.beam(materials.trim, local(side * .49, .51, .28), local(side * .49, .87, .28), .045, 'armrest-post');
      assembly.box(materials.rubber, local(side * .49, .87, -.04), [.105, .1, .72], rot, 'armrest');
      assembly.beam(materials.harness, local(side * .24, 1.52, .19), local(side * .1, .71, .02), .048, 'restraint-strap');
    }
    assembly.box(materials.yellow, local(0, .68, .015), [.16, .12, .055], rot, 'restraint-buckle');
    assembly.box(materials.frame, local(0, 1.08, .5), [.68, .74, .04], rot, 'seat-back-shell');
    assembly.box(materials.harness, local(0, .82, .53), [.55, .24, .035], rot, 'seat-back-pocket');
    for (const side of [-1, 1]) assembly.round(materials.trim, local(side * .29, 1.36, .55), .02, .015, [Math.PI / 2, 0, 0], 'seat-back-fastener');
  }

  for (const type of Object.keys(CABIN_VIEWS)) {
    const assembly = createAssembly();
    const { add, box, beam, round } = assembly;
    box(materials.floor, [0, -.1, 0], [9.3, .2, 13.7], undefined, 'cabin-floor');
    box(materials.wall, [0, 3.49, 0], [7.55, .14, 13.7], undefined, 'ceiling-skin');
    for (const side of [-1, 1]) {
      box(materials.frame, [side * 4.53, .1, 0], [.22, .2, 13.7], undefined, 'outer-frame');
      box(materials.wall, [side * 4.38, .72, 0], [.16, 1.44, 13.6], undefined, 'lower-sidewall');
      box(materials.wall, [side * 4.38, 2.61, 0], [.16, 1.02, 13.6], undefined, 'upper-sidewall');
      box(materials.wall, [side * 4.07, 3.18, 0], [.2, .9, 13.6], [0, 0, side * .7], 'sloping-ceiling');
      box(materials.frame, [side * 4.24, .3, 0], [.09, .13, 13.6], undefined, 'wall-kickplate');
      box(materials.frame, [side * 4.24, 1.47, 0], [.11, .09, 13.6], undefined, 'window-sill');
      box(materials.frame, [side * 4.24, 2.1, 0], [.11, .09, 13.6], undefined, 'window-header');
      for (let row = 0; row < 7; row++) {
        const z = -5.7 + row * 1.9;
        box(materials.wall, [side * 4.38, 1.78, z], [.16, .62, .9], undefined, 'window-mullion');
        add(new THREE.PlaneGeometry(1, .56), materials.glass, [side * 4.38, 1.78, z + .92], undefined, [0, -side * Math.PI / 2, 0], 'cabin-porthole');
        add(panel, materials.wall, [side * 4.22, .78, z], undefined, undefined, 'interior-access-panel');
        for (const y of [.17, 1.32]) round(materials.trim, [side * 4.11, y, z], .024, .05, [0, 0, Math.PI / 2], 'interior-fastener');
        box(materials.frame, [side * 4.18, 2.38, z], [.09, .08, 1.7], undefined, 'upper-panel-seam');
      }
      for (const x of [3.2, 3.55]) {
        beam(materials.trim, [side * x, 3.15, -6.6], [side * x, 3.15, 6.6], .065, 'ceiling-conduit');
      }
      beam(materials.yellow, [side * 3.92, 2.88, -6.6], [side * 3.92, 2.88, 6.6], .035, 'signal-conduit');
    }
    for (let rib = 0; rib < 7; rib++) {
      const z = -6 + rib * 2;
      for (const side of [-1, 1]) {
        beam(materials.frame, [side * 4.14, .1, z], [side * 4.14, 2.83, z], .13, 'cabin-rib');
        beam(materials.frame, [side * 4.14, 2.83, z], [side * 3.55, 3.39, z], .13, 'ceiling-knee');
        add(ceilingLamp, materials.lamp, [side * 2.35, 3.36, z + .7], undefined, undefined, 'ceiling-luminaire');
        box(materials.rubber, [side * 2.35, 3.4, z + .7], [1.5, .05, .55]);
      }
      beam(materials.frame, [-3.6, 3.39, z], [3.6, 3.39, z], .16, 'ceiling-crossbeam');
      box(materials.floor, [0, .012, z + .7], [8.5, .025, .025], undefined, 'floor-expansion-joint');
    }
    for (let z = -6.4; z < 6.4; z += .16) {
      for (const side of [-1, 1]) box(materials.trim, [side * .66, .017, z], [.09, .018, .075], undefined, 'aisle-marker');
    }
    box(materials.wall, [0, 1.65, -6.85], [9.15, 3.3, .16], undefined, 'front-bulkhead');
    for (const x of [-2.9, 2.9]) box(materials.wall, [x, 1.7, 6.85], [3.35, 3.4, .16], undefined, 'rear-bulkhead');
    box(materials.frame, [0, 3.14, 6.75], [2.7, .53, .2], undefined, 'entry-header');
    box(materials.rubber, [0, 1.4, -6.71], [2.45, 2.8, .12], undefined, 'sealed-door-frame');
    for (const side of [-1, 1]) {
      box(materials.wall, [side * .55, 1.38, -6.61], [1.08, 2.64, .09], undefined, 'pressure-door-leaf');
      beam(materials.yellow, [side * .15, 1, -6.53], [side * .15, 1.7, -6.53], .04, 'door-lock-bar');
      box(materials.trim, [side * 1.29, 1.7, -6.5], [.08, .72, .1], undefined, 'door-jamb');
    }
    box(materials.sign, [0, 3.03, -6.7], [2.3, .48, .06], undefined, 'compartment-sign');
    let seats = 0;
    if (type === 'passenger') {
      for (let row = 0; row < 6; row++) for (const x of [-3, -1.7, 1.7, 3]) {
        chair(assembly, [x, 0, -4.85 + row * 1.87]);
        seats++;
      }
      for (let row = 0; row < 4; row++) for (const side of [-1, 1]) {
        const z = -4.6 + row * 3.1;
        add(chamferedBox(1.9, .42, 1.3, .08), materials.wall, [side * 2.4, 3.06, z], undefined, undefined, 'overhead-locker');
        box(materials.frame, [side * 2.4, 2.82, z + .54], [1.7, .045, .035], undefined, 'locker-latch');
        box(materials.rubber, [side * 2.33, 2.72, z + .38], [1.05, .55, .08], [-.3, 0, 0], 'overhead-display-frame');
        box(materials.screen, [side * 2.33, 2.72, z + .43], [.93, .43, .016], [-.3, 0, 0], 'passenger-display');
      }
    } else if (type === 'control') {
      for (const x of [-2.7, 0, 2.7]) {
        chair(assembly, [x, 0, -1.4]);
        seats++;
        add(chamferedBox(1.85, .88, 1.3, .08), materials.frame, [x, .44, -3.1], undefined, undefined, 'console-base');
        box(materials.wall, [x, .99, -3.03], [1.86, .12, 1.4], [-.24, 0, 0], 'console-worktop');
        box(materials.rubber, [x, 1.53, -3.49], [1.83, 1.05, .1], [-.13, 0, 0], 'console-monitor-frame');
        box(materials.screen, [x, 1.53, -3.41], [1.65, .85, .024], [-.13, 0, 0], 'console-monitor');
        for (let button = 0; button < 12; button++) {
          box(button % 4 ? materials.trim : materials.amber, [x - .66 + button % 6 * .26, 1.06, -2.63 - Math.floor(button / 6) * .17], [.15, .045, .095], undefined, 'console-switch');
        }
      }
      for (const side of [-1, 1]) {
        for (let rack = 0; rack < 3; rack++) {
          const z = -.5 - rack * 1.9;
          add(chamferedBox(.62, 2.35, 1.52, .06), materials.frame, [side * 3.9, 1.2, z], undefined, undefined, 'control-rack');
          for (let unit = 0; unit < 6; unit++) {
            box(materials.wall, [side * 3.54, .32 + unit * .33, z], [.1, .28, 1.32], undefined, 'rack-unit');
            box(materials.amber, [side * 3.47, .32 + unit * .33, z + .48], [.02, .035, .06], undefined, 'rack-status');
          }
        }
      }
      box(materials.screen, [0, 2.69, -6.65], [3.6, .51, .035], undefined, 'overhead-status');
    } else {
      for (const side of [-1, 1]) {
        beam(materials.frame, [side * 2.8, 3.03, -6.4], [side * 2.8, 3.03, 6.3], .22, 'gantry-track');
        for (let rack = 0; rack < 4; rack++) {
          const z = -4.75 + rack * 2.65;
          add(chamferedBox(1.45, 1.18, 1.9, .1), rack % 2 ? materials.wall : materials.frame, [side * 3.05, .7, z], undefined, undefined, 'cargo-container');
          for (const x of [-.5, .5]) box(materials.trim, [side * 3.05 + x, .73, z + 1.02], [.035, 1, .05], undefined, 'container-lock');
          box(materials.yellow, [side * 3.05, 1.34, z], [1.2, .03, .2], undefined, 'cargo-tiedown');
        }
      }
      box(materials.yellow, [0, 2.92, -1.8], [6.05, .27, .46], undefined, 'overhead-gantry');
      add(chamferedBox(1.1, .4, .9, .08), materials.yellow, [-.8, 2.62, -1.8], undefined, undefined, 'hoist-trolley');
      for (const x of [-1, -.6]) beam(materials.frame, [x, 2.43, -1.8], [x, 1.32, -1.8], .035, 'hoist-cable');
      round(materials.yellow, [-.8, 1.27, -1.8], .15, .3, undefined, 'hoist-hook');
      add(new THREE.TorusGeometry(.15, .035, 8, 18, Math.PI * 1.7), materials.frame, [-.8, 1.04, -1.8], undefined, [0, 0, .3], 'hoist-hook-curve');
      for (let z = -6.4; z < 6.4; z += .23) for (const x of [-1.75, 1.75]) box(materials.yellow, [x, .025, z], [.16, .024, .11], undefined, 'cargo-floor-hazard');
      for (let rung = 0; rung < 19; rung++) box(materials.trim, [0, .03, -6 + rung * .66], [2.6, .026, .045], undefined, 'cargo-floor-grille');
    }
    const room = assembly.finish(true);
    room.name = `cabin-${type}`;
    room.visible = type === 'passenger';
    rooms[type] = room;
    seatCounts[type] = seats;
    root.add(room);
  }
  const outside = new THREE.Mesh(new THREE.BoxGeometry(10, 3.8, 14.5), new THREE.MeshBasicMaterial({ color: 0x7396a0, side: THREE.BackSide }));
  outside.position.y = 1.8;
  outside.name = 'window-exterior-light';
  root.add(outside);
  const lights = [];
  for (const z of [-4, 0, 4]) {
    const light = new THREE.PointLight(0xd6e8db, 12, 10, 2);
    light.position.set(0, 2.6, z);
    root.add(light);
    lights.push(light);
  }
  const ambient = new THREE.HemisphereLight(0xaec8c6, 0x61726c, 1.4);
  root.add(ambient);
  const warm = new THREE.PointLight(0xffc58c, 10, 12, 2);
  warm.position.set(3, 2.7, -4);
  root.add(warm);
  const fill = new THREE.DirectionalLight(0xb4d3d6, .75);
  fill.position.set(-4, 3, 4);
  root.add(fill);
  let current = 'passenger';
  return {
    root, materials, rooms, seatCounts,
    setRoom(type) {
      current = Object.hasOwn(rooms, type) ? type : 'passenger';
      for (const [name, room] of Object.entries(rooms)) room.visible = name === current;
      return current;
    },
    setNight(enabled) {
      lights.forEach(light => { light.intensity = enabled ? 9 : 12; });
      ambient.intensity = enabled ? .7 : 1.4;
      outside.material.color.set(enabled ? 0x112f40 : 0x7396a0);
    },
    inspect() { return { room: current, seats: seatCounts[current], components: rooms[current].userData.components }; },
  };
}
