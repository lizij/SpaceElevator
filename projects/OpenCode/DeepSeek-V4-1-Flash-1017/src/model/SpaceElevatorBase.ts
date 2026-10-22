import * as THREE from 'three';
import { MATS } from '../scene/materials';
import { DEG, MeshBuilder, Rng, clamp, decalTexture, glowTexture, ringPoint } from '../scene/util';

const CABLES = 216;
const CABLE_TOP = 26000;
const CABLES_ORIGIN = 520;

export interface CarHandle {
  group: THREE.Group;
  index: number;
  engines: THREE.Sprite[];
  baseY: number;
}

export interface BaseModel {
  group: THREE.Group;
  cars: CarHandle[];
  hero: CarHandle;
  lightSprites: THREE.Sprite[];
  cableTop: number;
  anchorY: number;
}

/* ── car ──────────────────────────────────────────────────────── */

function createCar(index: number, withEngines: boolean): THREE.Group {
  const g = new THREE.Group();
  const b = new MeshBuilder();
  const rng = new Rng(9000 + index * 37);

  // Four corner clamp towers riding the cable bundle.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(22, 78, 22, MATS.hullShade, [sx * 38, 0, sz * 30]);
      b.box(25, 9, 25, MATS.steel, [sx * 38, 34, sz * 30]);
      b.box(25, 8, 25, MATS.steel, [sx * 38, -34, sz * 30]);
      b.box(27, 4, 27, MATS.orange, [sx * 38, -26, sz * 30]);
      // clamp jaws facing the cable shaft
      b.box(5, 30, 9, MATS.steelLight, [sx * 32, 20, sz * 30 - sz * 12]);
      b.box(4, 12, 7, MATS.orange, [sx * 31, 30, sz * 30 - sz * 12]);
      // outer corner light rail
      b.box(1.2, 60, 1.2, MATS.strip, [sx * 49.4, 0, sz * 41.4]);
    }
  }

  // Low, wide hull wrapped around a 52 m cable shaft.
  b.box(26, 46, 86, MATS.hull, [-38, 0, 0]);
  b.box(26, 46, 86, MATS.hull, [38, 0, 0]);
  b.box(50, 46, 26, MATS.hull, [0, 0, -38]);
  b.box(50, 46, 26, MATS.hull, [0, 0, 38]);
  b.box(102, 3, 88, MATS.hullShade, [0, 24, 0]);
  b.box(102, 3, 88, MATS.steel, [0, -24, 0]);

  // Dark photovoltaic roof, split around the cable opening.
  b.box(26, 2.2, 84, MATS.glass, [-38, 26, 0]);
  b.box(26, 2.2, 84, MATS.glass, [38, 26, 0]);
  b.box(50, 2.2, 26, MATS.glass, [0, 26, -39]);
  b.box(50, 2.2, 26, MATS.glass, [0, 26, 39]);
  for (const x of [-46, -38, -30, 30, 38, 46]) {
    b.box(1.2, 0.8, 84, MATS.steelLight, [x, 27.2, 0]);
  }
  for (const z of [-46, -30, 30, 46]) {
    b.box(50, 0.8, 1.2, MATS.steelLight, [0, 27.2, z]);
  }
  // roof edge rails
  for (const s of [-1, 1]) {
    b.box(2.4, 2.4, 88, MATS.steelLight, [s * 50.5, 27, 0]);
    b.box(102, 2.4, 2.4, MATS.steelLight, [0, 27, s * 43.5]);
  }

  // Warm cabin windows on all four faces.
  for (const s of [-1, 1]) {
    b.box(44, 9, 1.6, MATS.glassWarm, [0, 8, s * 51.4]);
    b.box(1.6, 9, 46, MATS.glassWarm, [s * 51.4, 8, 0]);
    b.box(46, 2.2, 2.2, MATS.steel, [0, 13.4, s * 51.7]);
    b.box(46, 2.2, 2.2, MATS.steel, [0, 2.6, s * 51.7]);
    b.box(2.2, 2.2, 48, MATS.steel, [s * 51.7, 13.4, 0]);
    b.box(2.2, 2.2, 48, MATS.steel, [s * 51.7, 2.6, 0]);
    for (let i = -2; i <= 2; i++) {
      b.box(1.4, 10.4, 1.4, MATS.steel, [i * 11, 8, s * 51.6]);
      b.box(1.4, 10.4, 1.4, MATS.steel, [s * 51.6, 8, i * 11]);
    }
  }

  // Lower side equipment pods with compact docking ports.
  for (const s of [-1, 1]) {
    b.box(12, 18, 40, MATS.hullShade, [s * 57, -15, 0]);
    b.box(14, 4, 42, MATS.steel, [s * 57, -23, 0]);
    b.cyl(4.6, 5.4, 4, 16, MATS.steel, [s * 63.5, -15, 0], [0, 0, Math.PI / 2]);
    b.torus(6.2, 0.9, MATS.orange, [s * 65.6, -15, 0], [0, Math.PI / 2, 0], 8, 24);
    b.box(2, 12, 2, MATS.strip, [s * 63.4, -12, 15]);

    // rear service collar
    b.cyl(5, 6, 4, 16, MATS.steel, [s * 28, -18, 52], [Math.PI / 2, 0, 0]);
  }

  // Forward docking port below the bridge windows.
  b.cyl(6, 7, 5, 20, MATS.steel, [0, -13, 52], [Math.PI / 2, 0, 0]);
  b.torus(7.6, 1.1, MATS.orange, [0, -13, 54.6], [0, 0, 0], 8, 28);

  // Bottom service module and main engines.
  b.box(64, 12, 64, MATS.hullShade, [0, -38, 0]);
  b.box(54, 9, 54, MATS.steel, [0, -47, 0]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(16, 18, 16, MATS.hullShade, [sx * 27, -38, sz * 27]);
      b.cyl(7.5, 10, 16, 18, MATS.steel, [sx * 19, -57, sz * 19]);
      b.cyl(8.6, 8.6, 2.6, 18, MATS.steelLight, [sx * 19, -65.4, sz * 19]);
      b.cyl(5.6, 5.6, 1, 16, MATS.lampCyan, [sx * 19, -67, sz * 19]);
      b.box(2, 6, 2, MATS.orange, [sx * 27, -53, sz * 27]);
    }
  }

  // Top clamp collar and guide arms.
  b.cyl(27, 29, 10, 32, MATS.steel, [0, 32, 0], [0, 0, 0], true);
  b.torus(28, 1.5, MATS.steelLight, [0, 37, 0], [Math.PI / 2, 0, 0], 6, 40);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.box(34, 3, 5, MATS.steelLight, [Math.cos(a) * 22, 33, Math.sin(a) * 22], [0, -a, 0]);
  }
  b.torus(24, 1.2, MATS.orange, [0, -42, 0], [Math.PI / 2, 0, 0], 6, 40);

  // Hull ribs, panel lines and greebles.
  for (const y of [-18, -6, 16]) {
    b.box(104, 1.4, 90, MATS.steel, [0, y, 0]);
  }
  for (let i = 0; i < 20; i++) {
    const face = Math.floor(rng.next() * 4);
    const x = rng.range(-44, 44);
    const y = rng.range(-20, 18);
    const z = face < 2 ? (face === 0 ? 51.8 : -51.8) : rng.range(-40, 40);
    const px = face >= 2 ? (face === 2 ? 51.8 : -51.8) : x;
    const pz = face >= 2 ? x : z;
    b.box(rng.range(2, 6), rng.range(2, 4), rng.range(1, 3), MATS.steelLight, [px, y, pz]);
  }
  for (const s of [-1, 1]) {
    b.cyl(2, 2, 30, 8, MATS.steelLight, [s * 47, -12, 33]);
    b.cyl(1.2, 1.2, 28, 8, MATS.orange, [s * 44, -14, 34]);
  }

  // Exterior outline lighting.
  for (const s of [-1, 1]) {
    b.box(98, 1.4, 1.4, MATS.strip, [0, 25.4, s * 44.2]);
    b.box(1.4, 1.4, 80, MATS.strip, [s * 51.6, 25.4, 0]);
    b.box(98, 1.2, 1.2, MATS.strip, [0, -25.8, s * 44.2]);
    b.box(1.2, 1.2, 80, MATS.strip, [s * 51.6, -25.8, 0]);
    b.box(4, 8, 1.2, MATS.lamp, [s * 45, 5, 52]);
  }

  // Service platform rim + hazard band under the hull.
  b.box(112, 2.4, 96, MATS.hazard, [0, -27, 0]);
  for (const s of [-1, 1]) {
    b.box(110, 1.2, 1.2, MATS.steelLight, [0, -22, s * 47]);
    b.box(1.2, 1.2, 92, MATS.steelLight, [s * 55, -22, 0]);
  }

  g.add(b.build({ name: `car-${index}` }));

  // Livery decals
  const decalMat = new THREE.MeshBasicMaterial({
    map: decalTexture(['UEG', '太空电梯 · 货运轿厢', `SE-${String(index + 1).padStart(2, '0')} / 216 CABLES`]),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  const decalGeo = new THREE.PlaneGeometry(34, 15);
  const decalFront = new THREE.Mesh(decalGeo, decalMat);
  decalFront.position.set(18, -2, 51.9);
  decalFront.scale.set(0.8, 0.8, 1);
  g.add(decalFront);
  const decalSide = new THREE.Mesh(decalGeo, decalMat);
  decalSide.position.set(51.9, -2, 28);
  decalSide.rotation.y = Math.PI / 2;
  decalSide.scale.set(0.8, 0.8, 1);
  g.add(decalSide);

  // Engine glow (hidden unless launching)
  const engines: THREE.Sprite[] = [];
  if (withEngines) {
    const engineTex = glowTexture('rgba(220,248,255,1)', 'rgba(110,220,255,0.5)');
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const engineMat = new THREE.SpriteMaterial({
          map: engineTex,
          color: 0x9fe8ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        const spr = new THREE.Sprite(engineMat);
        spr.position.set(sx * 19, -74, sz * 19);
        spr.scale.set(30, 56, 1);
        spr.visible = false;
        spr.userData.engine = true;
        engines.push(spr);
        g.add(spr);
      }
    }
  }

  if (index === 1) {
    const carGlow = new THREE.PointLight(0xffc99a, 3200, 560, 2);
    carGlow.position.set(0, 18, 0);
    g.add(carGlow);
    const carGlowLow = new THREE.PointLight(0xffd9b0, 1600, 340, 2);
    carGlowLow.position.set(0, -32, 0);
    g.add(carGlowLow);
  }

  return g;
}

/* ── base ─────────────────────────────────────────────────────── */

export function createSpaceElevatorBase(): BaseModel {
  const root = new THREE.Group();
  root.name = 'space-elevator-base';
  const lightSprites: THREE.Sprite[] = [];
  const rng = new Rng(20230122);

  const halo = glowTexture('rgba(255,244,214,1)', 'rgba(255,176,110,0.55)');
  const addFlood = (x: number, y: number, z: number, scale = 70, color = 0xffd7a6) => {
    const spr = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: halo,
        color,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    spr.position.set(x, y, z);
    spr.scale.set(scale, scale, 1);
    lightSprites.push(spr);
    root.add(spr);
  };

  /* outer ring platform */
  {
    const b = new MeshBuilder();
    const R_OUT = 1480;
    const R_IN = 1100;
    const deckY = 88;
    b.addAt(new THREE.RingGeometry(R_IN, R_OUT, 160, 3), MATS.deck, [0, deckY, 0], [-Math.PI / 2, 0, 0]);
    b.cyl(R_OUT, R_OUT + 10, 110, 160, MATS.concrete, [0, 33, 0], [0, 0, 0], true);
    b.cyl(R_IN, R_IN, 110, 160, MATS.concreteDark, [0, 33, 0], [0, 0, 0], true);
    b.addAt(new THREE.RingGeometry(R_OUT - 8, R_OUT, 160, 1), MATS.hazard, [0, deckY + 0.6, 0], [-Math.PI / 2, 0, 0]);
    b.addAt(new THREE.RingGeometry(R_IN, R_IN + 8, 160, 1), MATS.hazard, [0, deckY + 0.6, 0], [-Math.PI / 2, 0, 0]);

    // parapet + railing
    b.cyl(R_OUT, R_OUT, 3, 160, MATS.steelLight, [0, deckY + 11, 0], [0, 0, 0], true);
    b.cyl(R_IN, R_IN, 3, 160, MATS.steelLight, [0, deckY + 11, 0], [0, 0, 0], true);
    b.torus(R_OUT - 1, 1.1, MATS.steelLight, [0, deckY + 21, 0], [Math.PI / 2, 0, 0], 4, 160);
    b.torus(R_IN + 1, 1.1, MATS.steelLight, [0, deckY + 21, 0], [Math.PI / 2, 0, 0], 4, 160);
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * 360;
      for (const r of [R_OUT - 1, R_IN + 1]) {
        const p = ringPoint(r, a);
        b.box(1, 10, 1, MATS.steelLight, [p.x, deckY + 16, p.z]);
      }
    }

    // deck markings
    for (const r of [1180, 1290, 1400]) {
      b.torus(r, 1.2, MATS.yellow, [0, deckY + 0.7, 0], [Math.PI / 2, 0, 0], 4, 200);
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * 360;
      const p = ringPoint(1190, a);
      const q = ringPoint(1390, a);
      b.beam([p.x, deckY + 0.8, p.z], [q.x, deckY + 0.8, q.z], 2.4, 0.6, MATS.yellow);
    }

    // perimeter outline lights
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * 360;
      const p = ringPoint(R_OUT - 3, a, deckY + 23);
      b.box(2.2, 1.6, 2.2, MATS.lampWarm, [p.x, p.y, p.z], [0, -a, 0]);
    }

    // four cargo docks extending from the ring
    const crateMats = [MATS.hull, MATS.hullShade, MATS.steelBlue, MATS.steelLight];
    for (let k = 0; k < 4; k++) {
      const a = 45 + k * 90;
      const p = ringPoint(1350, a);
      const tx = -Math.sin(a * DEG);
      const tz = Math.cos(a * DEG);
      b.box(330, 24, 300, MATS.deck, [p.x, deckY - 6, p.z], [0, -a * DEG, 0]);
      b.box(320, 8, 290, MATS.concreteDark, [p.x, deckY - 22, p.z], [0, -a * DEG, 0]);
      b.box(330, 2, 8, MATS.hazard, [p.x, deckY + 7, p.z], [0, -a * DEG, 0]);
      // cargo crates staged away from the centre hazard stripe and the crane
      for (let j = 0; j < 4; j++) {
        const off = [-84, -42, 42, 84][j];
        const q = ringPoint(1400, a, 0);
        const cx = q.x + tx * off;
        const cz = q.z + tz * off;
        b.box(30, 16, 20, crateMats[(j + k) % crateMats.length], [cx, deckY + 14, cz], [0, -a * DEG, 0]);
        b.box(10, 2, 8, MATS.steel, [cx, deckY + 23, cz], [0, -a * DEG, 0]);
      }
    }

    const mesh = b.build({ name: 'outer-ring' });
    root.add(mesh);
  }

  /* core island + radial piers */
  {
    const b = new MeshBuilder();
    b.cyl(462, 545, 128, 96, MATS.concrete, [0, 33, 0]);
    b.addAt(new THREE.CircleGeometry(462, 96), MATS.deck, [0, 97, 0], [-Math.PI / 2, 0, 0]);
    b.cyl(470, 470, 6, 96, MATS.steelLight, [0, 100, 0], [0, 0, 0], true);
    b.torus(455, 3.4, MATS.hazard, [0, 99, 0], [Math.PI / 2, 0, 0], 4, 120);

    // ring road / painted marks
    b.torus(380, 1.6, MATS.yellow, [0, 98, 0], [Math.PI / 2, 0, 0], 4, 140);
    b.torus(280, 1.2, MATS.yellow, [0, 98, 0], [Math.PI / 2, 0, 0], 4, 120);

    // 8 radial piers
    for (let i = 0; i < 8; i++) {
      const a = 22.5 + i * 45;
      const p = ringPoint(780, a);
      b.box(640, 16, 66, MATS.deck, [p.x, 78, p.z], [0, -a * DEG, 0]);
      b.box(640, 3, 4, MATS.steelLight, [p.x, 87.5, p.z - 30], [0, -a * DEG, 0]);
      b.box(640, 3, 4, MATS.steelLight, [p.x, 87.5, p.z + 30], [0, -a * DEG, 0]);
      for (let r = 540; r < 1100; r += 140) {
        const q = ringPoint(r, a);
        b.cyl(9, 12, 88, 12, MATS.concreteDark, [q.x, 30, q.z]);
      }
    }

    // two wide causeways
    for (let k = 0; k < 2; k++) {
      const a = k * 180;
      const p = ringPoint(780, a);
      b.box(660, 20, 138, MATS.deck, [p.x, 80, p.z], [0, -a * DEG, 0]);
      b.box(660, 2.4, 6, MATS.hazard, [p.x, 91, p.z - 66], [0, -a * DEG, 0]);
      b.box(660, 2.4, 6, MATS.hazard, [p.x, 91, p.z + 66], [0, -a * DEG, 0]);
      for (let r = 540; r < 1100; r += 120) {
        const q = ringPoint(r, a);
        for (const off of [-54, 54]) {
          const d = ringPoint(r, a + (off / r) * (180 / Math.PI));
          b.cyl(5, 6, 84, 8, MATS.steel, [d.x, 38, d.z]);
        }
        b.cyl(7, 9, 86, 10, MATS.concreteDark, [q.x, 34, q.z]);
      }
      // pipeline along causeway
      for (const off of [-48, 48]) {
        const q = ringPoint(780, a);
        b.cyl(4, 4, 660, 10, MATS.steelLight, [q.x, 94, q.z + off], [0, 0, Math.PI / 2]);
      }
    }

    root.add(b.build({ name: 'core' }));
  }

  /* anchor hub and dampers */
  {
    const b = new MeshBuilder();
    const deck = 100;
    // six legs
    for (let i = 0; i < 6; i++) {
      const a = i * 60 + 30;
      const foot = ringPoint(268, a, deck);
      const top = ringPoint(150, a, 320);
      b.beam([foot.x, foot.y, foot.z], [top.x, top.y, top.z], 26, 30, MATS.steel);
      b.beam([foot.x, foot.y + 20, foot.z], [top.x, top.y - 20, top.z], 10, 10, MATS.steelLight);
    }
    // service ring: an open annulus around the 216-cable bundle, not a solid disc
    b.addAt(new THREE.RingGeometry(30, 238, 96, 2), MATS.deck, [0, 330, 0], [-Math.PI / 2, 0, 0]);
    b.cyl(238, 238, 18, 96, MATS.deck, [0, 321, 0], [0, 0, 0], true);
    b.cyl(30, 30, 18, 32, MATS.concreteDark, [0, 321, 0], [0, 0, 0], true);
    b.addAt(new THREE.RingGeometry(30, 46, 64, 1), MATS.hazard, [0, 330.7, 0], [-Math.PI / 2, 0, 0]);
    b.torus(236, 2.4, MATS.hazard, [0, 341, 0], [Math.PI / 2, 0, 0], 4, 100);
    b.cyl(238, 238, 4, 64, MATS.steelLight, [0, 342, 0], [0, 0, 0], true);
    for (let i = 0; i < 32; i++) {
      const p = ringPoint(236, (i / 32) * 360, 342);
      b.box(1, 9, 1, MATS.steelLight, [p.x, 347, p.z]);
    }

    // Hollow anchor bell: the cable bundle passes through the central well.
    b.cyl(118, 168, 190, 48, MATS.hullShade, [0, 425, 0], [0, 0, 0], true);
    b.addAt(new THREE.RingGeometry(22, 118, 64, 2), MATS.deck, [0, 520, 0], [-Math.PI / 2, 0, 0]);
    // guide throat around the bundle
    b.cyl(20, 20, 90, 32, MATS.steel, [0, 530, 0], [0, 0, 0], true);
    // narrow guide collar supporting the radial arms; the top ring stays open
    b.cyl(26, 34, 46, 32, MATS.steel, [0, 543, 0], [0, 0, 0], true);
    b.torus(26.5, 1.6, MATS.orange, [0, 566, 0], [Math.PI / 2, 0, 0], 6, 64);
    b.torus(20.5, 1.3, MATS.orange, [0, 575, 0], [Math.PI / 2, 0, 0], 6, 64);
    b.addAt(new THREE.RingGeometry(23, 34, 32, 1), MATS.hazard, [0, 521, 0], [-Math.PI / 2, 0, 0]);
    b.torus(117.5, 2.0, MATS.steelLight, [0, 520, 0], [Math.PI / 2, 0, 0], 6, 64);

    // vertical ribs and service bands on the anchor bell
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.beam([Math.cos(a) * 166, 336, Math.sin(a) * 166], [Math.cos(a) * 116, 526, Math.sin(a) * 116], 3.2, 4.2, MATS.steelLight);
    }
    for (const y of [390, 455, 515]) {
      const rad = 168 - (y - 330) * 0.28;
      b.cyl(rad + 2.2, rad + 2.2, 3.2, 48, MATS.steelLight, [0, y, 0], [0, 0, 0], true);
    }
    // lamps ride on the bell surface instead of floating beside it
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      const rad = 168 - (480 - 330) * 0.28 + 2.0;
      b.box(2.6, 2.6, 2.6, i % 4 === 0 ? MATS.lampWarm : MATS.steelLight, [Math.cos(a) * rad, 480, Math.sin(a) * rad]);
    }

    // nine radial cable guides resting on the bell crown
    for (let i = 0; i < 9; i++) {
      const a = i * 40;
      const dir = a * DEG;
      b.box(78, 7, 12, MATS.steel, [Math.cos(dir) * 65, 566, Math.sin(dir) * 65], [0, -dir, 0]);
      const tip = ringPoint(104, a, 566);
      b.cyl(4.4, 4.4, 9, 10, MATS.orange, [tip.x, tip.y, tip.z], [Math.PI / 2, 0, 0]);
    }

    // four huge dampers between hub and towers
    for (let i = 0; i < 4; i++) {
      const a = 45 + i * 90;
      const p1 = ringPoint(170, a, 250);
      const p2 = ringPoint(360, a, 250);
      b.tube([p1.x, p1.y, p1.z], [p2.x, p2.y, p2.z], 34, MATS.steelLight, 20);
      b.tube([p2.x, p2.y, p2.z], [p2.x * 1.25, p2.y, p2.z * 1.25], 12, MATS.steel, 12);
      b.torus(35.5, 2.2, MATS.orange, [p1.x, p1.y, p1.z], [0, (90 - a) * DEG, 0], 8, 32);
    }
    // grounded pylons so the dampers are not floating above the island
    for (const a of [45, 135, 225, 315]) {
      // main tube support: tube bottom is y216
      {
        const p = ringPoint(220, a, 0);
        b.cyl(12, 15, 115, 12, MATS.concreteDark, [p.x, 154.5, p.z]);
        b.cyl(24, 24, 8, 16, MATS.steel, [p.x, 212, p.z]);
      }
      // outboard extension support: tube bottom is y238
      {
        const p = ringPoint(420, a, 0);
        b.cyl(10, 13, 133, 12, MATS.concreteDark, [p.x, 163.5, p.z]);
        b.cyl(20, 20, 8, 16, MATS.steel, [p.x, 234, p.z]);
      }
    }

    // cable guides / tension drums resting on cradles on the service ring
    for (let i = 0; i < 12; i++) {
      const a = i * 30 + 15;
      const p = ringPoint(200, a, 0);
      const tx = -Math.sin(a * DEG);
      const tz = Math.cos(a * DEG);
      const y = 339;
      b.tube(
        [p.x - tx * 23, y, p.z - tz * 23],
        [p.x + tx * 23, y, p.z + tz * 23],
        9, MATS.steelLight, 14,
      );
      for (const s of [-1, 1]) {
        b.tube(
          [p.x + tx * s * 18, y, p.z + tz * s * 18],
          [p.x + tx * s * 22, y, p.z + tz * s * 22],
          9.4, MATS.orange, 14,
        );
      }
    }

    // floodlights around the hub deck, between the six hub legs
    for (let i = 0; i < 8; i++) {
      const ang = i * 45 + 22.5;
      const p = ringPoint(215, ang, 330);
      b.box(3, 20, 3, MATS.steelLight, [p.x, 340, p.z]);
      const tx = -Math.sin(ang * DEG);
      const tz = Math.cos(ang * DEG);
      b.box(12, 4, 1, MATS.lamp, [p.x + tx * 3, 351, p.z + tz * 3], [0, -ang * DEG, 0]);
      addFlood(p.x, 351, p.z, 30);
    }

    root.add(b.build({ name: 'anchor-hub' }));
  }

  /* three main tower clusters */
  {
    const b = new MeshBuilder();
    const clusterAngle = [90, 210, 330];
    const clusterRadius = 340;
    const colRadius = 74;
    const baseY = 92;
    const towerHeight = 1900;
    const topY = baseY + towerHeight;

    // A slender central spine inside a triangle of three load-bearing columns.
    const mastBaseR = 27;
    const mastTopR = 20;
    const mastBaseY = 92;
    const mastH = 1900;
    const mastR = (y: number) =>
      mastBaseR - clamp((y - mastBaseY) / mastH, 0, 1) * (mastBaseR - mastTopR);
    const colR = (y: number) =>
      30 - clamp((y - baseY) / towerHeight, 0, 1) * 13;

    const topPoints: THREE.Vector3[][] = [];

    for (const ca of clusterAngle) {
      const center = ringPoint(clusterRadius, ca, 0);
      const points: THREE.Vector3[] = [];

      // ── central spine ─────────────────────────────────────────
      b.cyl(mastTopR, mastBaseR, mastH, 40, MATS.hullShade, [center.x, mastBaseY + mastH / 2, center.z]);
      // flared pedestal, kept inside the column triangle
      b.cyl(mastBaseR, 29, 48, 40, MATS.hullShade, [center.x, 116, center.z]);
      b.torus(27.2, 1.2, MATS.steelLight, [center.x, 141, center.z], [Math.PI / 2, 0, 0], 4, 40);

      for (let y = 160; y < 1860; y += 142) {
        const rad = mastR(y);
        b.cyl(rad + 2.2, rad + 2.2, 3.2, 40, MATS.steel, [center.x, y, center.z], [0, 0, 0], true);
        b.torus(rad + 3.0, 1.1, MATS.hull, [center.x, y - 2, center.z], [Math.PI / 2, 0, 0], 4, 40);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          const rr = rad + 2.8;
          b.box(2.2, 1.6, 1.5, i % 3 === 0 ? MATS.lampWarm : MATS.steelLight,
            [center.x + Math.cos(a) * rr, y - 2, center.z + Math.sin(a) * rr], [0, -a, 0]);
        }
      }

      // vertical panel seams follow the taper instead of cutting into it
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.12;
        b.beam(
          [center.x + Math.cos(a) * 28.1, 150, center.z + Math.sin(a) * 28.1],
          [center.x + Math.cos(a) * 21.1, 1840, center.z + Math.sin(a) * 21.1],
          3.1, 1.1, MATS.hullDark,
        );
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.45;
        b.beam(
          [center.x + Math.cos(a) * 28.6, 150, center.z + Math.sin(a) * 28.6],
          [center.x + Math.cos(a) * 21.6, 1840, center.z + Math.sin(a) * 21.6],
          4.4, 1.4, MATS.steelBlue,
        );
      }
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        b.beam(
          [center.x + Math.cos(a) * 27.5, 150, center.z + Math.sin(a) * 27.5],
          [center.x + Math.cos(a) * 20.5, 1840, center.z + Math.sin(a) * 20.5],
          1.4, 2.6, MATS.steelLight,
        );
      }
      for (const y of [520, 1040, 1560]) {
        const rad = mastR(y) + 2.2;
        b.cyl(rad, rad, 16, 40, MATS.steel, [center.x, y, center.z], [0, 0, 0], true);
      }

      // ── three outer columns ──────────────────────────────────
      for (let c = 0; c < 3; c++) {
        const a = c * 120 + 90;
        const p = new THREE.Vector3(
          center.x + Math.cos(a * DEG) * colRadius,
          0,
          center.z + Math.sin(a * DEG) * colRadius,
        );
        points.push(p);
        const inward = new THREE.Vector2(-p.x + center.x, -p.z + center.z).normalize();
        const tangent = new THREE.Vector2(-inward.y, inward.x);

        // flared foot with surface-mounted ribs
        b.cyl(30, 44, 150, 28, MATS.hullShade, [p.x, baseY + 75, p.z]);
        for (let r = 0; r < 12; r++) {
          const ra = (r / 12) * Math.PI * 2;
          b.beam(
            [p.x + Math.cos(ra) * 44.2, baseY + 4, p.z + Math.sin(ra) * 44.2],
            [p.x + Math.cos(ra) * 30.2, baseY + 148, p.z + Math.sin(ra) * 30.2],
            3.0, 2.2, MATS.steelLight,
          );
        }
        b.torus(43.2, 2.1, MATS.hazard, [p.x, 116, p.z], [Math.PI / 2, 0, 0], 4, 32);
        b.torus(30.4, 1.4, MATS.orange, [p.x, 238, p.z], [Math.PI / 2, 0, 0], 4, 28);

        // tapered load-bearing column
        b.cyl(17, 30, towerHeight - 60, 28, MATS.hull, [p.x, baseY + 60 + (towerHeight - 60) / 2, p.z]);

        // ribs follow the exact surface radius from bottom to top
        for (let r = 0; r < 8; r++) {
          const ra = (r / 8) * Math.PI * 2;
          b.beam(
            [p.x + Math.cos(ra) * (colR(250) + 0.7), 250, p.z + Math.sin(ra) * (colR(250) + 0.7)],
            [p.x + Math.cos(ra) * (colR(1984) + 0.7), 1984, p.z + Math.sin(ra) * (colR(1984) + 0.7)],
            1.6, 2.4, MATS.hullShade,
          );
        }
        for (let r = 0; r < 8; r++) {
          const ra = (r / 8) * Math.PI * 2 + Math.PI / 8;
          b.beam(
            [p.x + Math.cos(ra) * (colR(250) + 0.6), 250, p.z + Math.sin(ra) * (colR(250) + 0.6)],
            [p.x + Math.cos(ra) * (colR(1984) + 0.6), 1984, p.z + Math.sin(ra) * (colR(1984) + 0.6)],
            1.8, 0.9, MATS.hullDark,
          );
        }

        // lit service windows pressed onto the surface
        for (let wy = 280; wy < topY - 80; wy += 210) {
          const rr = colR(wy) + 1.1;
          for (let i = 0; i < 6; i++) {
            const wa = (i / 6) * Math.PI * 2 + 0.35;
            b.box(1.5, 2.8, 1.0, i % 2 === 0 ? MATS.lampWarm : MATS.lampCyan,
              [p.x + Math.cos(wa) * rr, wy, p.z + Math.sin(wa) * rr], [0, -wa, 0]);
          }
        }

        // orange service band, sized to the local column radius
        const bandR = colR(342) + 0.8;
        b.cyl(bandR, bandR + 0.2, 5, 28, MATS.orange, [p.x, 342, p.z], [0, 0, 0], true);

        // lattice collars
        for (let y = 260; y < topY - 30; y += 120) {
          const rr = colR(y);
          b.torus(rr + 0.25, 1.2, MATS.steelLight, [p.x, y, p.z], [Math.PI / 2, 0, 0], 4, 32);
          b.cyl(rr + 2.2, rr + 2.2, 2, 24, MATS.steel, [p.x, y + 4, p.z], [0, 0, 0], true);
        }

        // twin guide rails on the inward face, clear of the column body
        for (const side of [-1, 1]) {
          const r0 = colR(250) + 1.8;
          const r1 = colR(1984) + 1.8;
          const o0x = p.x + inward.x * r0 + tangent.x * side * 5;
          const o0z = p.z + inward.y * r0 + tangent.y * side * 5;
          const o1x = p.x + inward.x * r1 + tangent.x * side * 5;
          const o1z = p.z + inward.y * r1 + tangent.y * side * 5;
          b.beam([o0x, 250, o0z], [o1x, 1984, o1z], 2.0, 2.0, MATS.steel);
        }

        // top cap and beacon
        b.cyl(17.6, 17.6, 10, 28, MATS.steel, [p.x, topY + 5, p.z]);
        b.torus(17.9, 1.2, MATS.orange, [p.x, topY + 10, p.z], [Math.PI / 2, 0, 0], 4, 32);
        b.box(3, 3, 3, MATS.lampRed, [p.x, topY + 13, p.z]);
      }

      // intra-cluster X-bracing, safely outside the central spine
      for (let band = 0; band < 8; band++) {
        const y0 = 260 + band * 210;
        const y1 = y0 + 190;
        for (let c = 0; c < 3; c++) {
          const p = points[c];
          const q = points[(c + 1) % 3];
          b.beam([p.x, y0, p.z], [q.x, y0, q.z], 6, 6, MATS.steelLight);
          b.beam([p.x, y1, p.z], [q.x, y1, q.z], 4, 4, MATS.steel);
          b.beam([p.x, y0, p.z], [q.x, y1, q.z], 2.5, 2.5, MATS.steel);
          b.beam([q.x, y0, q.z], [p.x, y1, p.z], 2.5, 2.5, MATS.steel);
        }
      }

      // ── maintenance platforms: annulus + walkways, no solid discs ──
      for (const py of [480, 960, 1440, 1760]) {
        const mr = mastR(py);
        const inner = mr + 3.0;
        const outer = mr + 10.0;
        b.addAt(new THREE.RingGeometry(inner, outer, 64, 1), MATS.steel, [center.x, py, center.z], [-Math.PI / 2, 0, 0]);
        // top rail only; a solid skirt here would cut through the walkways
        b.torus(outer - 0.5, 0.55, MATS.steelLight, [center.x, py + 8, center.z], [Math.PI / 2, 0, 0], 4, 64);

        // walkways out to each column, with separate landing rings around them
        for (let c = 0; c < 3; c++) {
          const p = points[c];
          const dir = new THREE.Vector2(p.x - center.x, p.z - center.z).normalize();
          const cr = colR(py);
          const landingInner = cr + 0.4;
          const landingOuter = cr + 4.6;
          const nearEdge = colRadius - landingOuter;
          const walkwayEnd = Math.max(outer + 0.5, nearEdge);
          b.box(4.0, 2.0, Math.max(1, walkwayEnd - outer), MATS.steel,
            [center.x + dir.x * (outer + walkwayEnd) / 2, py, center.z + dir.y * (outer + walkwayEnd) / 2],
            [0, -Math.atan2(dir.y, dir.x) + Math.PI / 2, 0]);
          b.addAt(new THREE.RingGeometry(landingInner, landingOuter, 32, 1), MATS.steel,
            [p.x, py, p.z], [-Math.PI / 2, 0, 0]);
          b.torus(landingOuter - 0.2, 0.8, MATS.steelLight, [p.x, py + 0.4, p.z], [Math.PI / 2, 0, 0], 4, 32);
          // walkway railings
          const midX = center.x + dir.x * (outer + walkwayEnd) / 2;
          const midZ = center.z + dir.y * (outer + walkwayEnd) / 2;
          const len = Math.max(1, walkwayEnd - outer);
          const tx = -dir.y;
          const tz = dir.x;
          for (const side of [-1, 1]) {
            b.box(0.8, 6, 0.8, MATS.steelLight,
              [midX + tx * side * 2.2, py + 4, midZ + tz * side * 2.2]);
          }
          b.beam(
            [midX + tx * 2.2 - dir.x * len / 2, py + 7, midZ + tz * 2.2 - dir.y * len / 2],
            [midX + tx * 2.2 + dir.x * len / 2, py + 7, midZ + tz * 2.2 + dir.y * len / 2],
            0.6, 0.6, MATS.steelLight,
          );
          b.beam(
            [midX - tx * 2.2 - dir.x * len / 2, py + 7, midZ - tz * 2.2 - dir.y * len / 2],
            [midX - tx * 2.2 + dir.x * len / 2, py + 7, midZ - tz * 2.2 + dir.y * len / 2],
            0.6, 0.6, MATS.steelLight,
          );
        }

        // platform posts, skipped at the three walkway openings
        for (let i = 0; i < 48; i++) {
          const pa = (i / 48) * Math.PI * 2;
          let blocked = false;
          for (let c = 0; c < 3; c++) {
            const dirA = Math.atan2(points[c].z - center.z, points[c].x - center.x);
            let d = Math.abs(pa - dirA) % (Math.PI * 2);
            if (d > Math.PI) d = Math.PI * 2 - d;
            if (d < 0.055) blocked = true;
          }
          if (blocked) continue;
          b.box(0.8, 8, 0.8, MATS.steelLight,
            [center.x + Math.cos(pa) * (outer - 0.6), py + 4, center.z + Math.sin(pa) * (outer - 0.6)]);
        }
      }

      // ── crown / machine room ─────────────────────────────────
      const cy = topY;
      b.cyl(24, 30, 60, 32, MATS.hullShade, [center.x, cy + 30, center.z]);
      b.cyl(26, 26, 8, 32, MATS.steel, [center.x, cy + 64, center.z]);
      b.torus(26.4, 1.2, MATS.orange, [center.x, cy + 68, center.z], [Math.PI / 2, 0, 0], 4, 32);
      b.box(52, 10, 14, MATS.steel, [center.x, cy + 52, center.z]);

      // crown-to-column radial struts and a triangular cap frame
      for (let c = 0; c < 3; c++) {
        const p = points[c];
        const q = points[(c + 1) % 3];
        const d = new THREE.Vector2(p.x - center.x, p.z - center.z).normalize();
        b.beam(
          [center.x + d.x * 29, cy + 6, center.z + d.y * 29],
          [p.x, cy + 6, p.z],
          3.2, 3.2, MATS.steelLight,
        );
        b.beam([p.x, cy + 8, p.z], [q.x, cy + 8, q.z], 7.0, 7.0, MATS.steelLight);
      }

      // crane / antenna cluster, entirely above the columns
      b.beam([center.x, cy + 70, center.z], [center.x + 70, cy + 96, center.z + 18], 4.6, 4.6, MATS.steelLight);
      b.cyl(1.5, 1.5, 150, 6, MATS.steelLight, [center.x - 18, cy + 142, center.z + 14]);
      b.box(4, 4, 4, MATS.lampRed, [center.x - 18, cy + 220, center.z + 14]);
      b.box(7, 7, 7, MATS.lamp, [center.x + 18, cy + 76, center.z - 18]);

      // hazard collars above the flared feet
      for (let i = 0; i < 24; i++) {
        const ha = (i / 24) * Math.PI * 2;
        for (const p of points) {
          const rr = colR(250) + 1.4;
          b.box(6.4, 6.4, 1.3, MATS.hazard,
            [p.x + Math.cos(ha) * rr, 250, p.z + Math.sin(ha) * rr], [0, -ha, 0]);
        }
      }

      topPoints.push(points.map((p) => new THREE.Vector3(p.x, cy + 40, p.z)));
    }

    // inter-cluster trusses
    for (let band = 0; band < 4; band++) {
      const y = 420 + band * 440;
      for (let c = 0; c < 3; c++) {
        const a = topPoints[c][0].clone().setY(y);
        const bb = topPoints[(c + 1) % 3][0].clone().setY(y);
        b.beam([a.x, y, a.z], [bb.x, y, bb.z], 13, 15, MATS.steelLight);
        b.beam([a.x, y - 40, a.z], [bb.x, y + 40, bb.z], 3.4, 3.4, MATS.steel);
        b.beam([a.x, y + 40, a.z], [bb.x, y - 40, bb.z], 3.4, 3.4, MATS.steel);
      }
    }

    root.add(b.build({ name: 'main-towers' }));
  }

  /* twelve launch towers, in three groups of four, standing on the outer ring */
  {
    const b = new MeshBuilder();
    const groups = [90, 210, 330];
    const deckY = 88;
    for (const g of groups) {
      for (const offset of [-18, -6, 6, 18]) {
        const a = (g + offset) * DEG;
        const baseR = 1210;
        const topR = 1150;
        const tx = Math.cos(a) * baseR;
        const tz = Math.sin(a) * baseR;
        const ux = Math.cos(a);
        const uz = Math.sin(a);
        const px = -uz;
        const pz = ux;
        const height = 880;
        const width = 14;
        const feetY = deckY + 12;
        const armTop = height - 160;
        const armEndR = 760;

        // footing sits directly on the ring deck
        b.box(56, 34, 84, MATS.concreteDark, [tx, deckY + 17, tz], [0, -a, 0]);
        b.box(44, 8, 70, MATS.hazard, [tx, deckY + 38, tz], [0, -a, 0]);

        // twin masts, leaning slightly inward
        for (const s of [-1, 1]) {
          const fx = tx + px * s * 20;
          const fz = tz + pz * s * 20;
          const gx = Math.cos(a) * topR + px * s * 16;
          const gz = Math.sin(a) * topR + pz * s * 16;
          b.beam([fx, feetY, fz], [gx, height, gz], width, width, MATS.hullShade);
          // secondary rails
          b.beam([fx + px * 8, feetY, fz + pz * 8], [gx + px * 7, height, gz + pz * 7], 4, 4, MATS.steel);
          b.beam([fx - px * 8, feetY, fz - pz * 8], [gx - px * 7, height, gz - pz * 7], 4, 4, MATS.steel);
        }

        // lattice bracing; the catapult pivot level is left clear
        for (let y = feetY + 44; y < height - 40; y += 120) {
          if (Math.abs(y - armTop) < 34) continue;
          const t = clamp((y - feetY) / (height - feetY), 0, 1);
          const cx = tx + (Math.cos(a) * topR - tx) * t;
          const cz = tz + (Math.sin(a) * topR - tz) * t;
          const sep = 20 - 4 * t;
          b.beam([cx + px * -sep, y, cz + pz * -sep], [cx + px * sep, y, cz + pz * sep], 3.4, 3.4, MATS.steel);
          b.beam([cx + px * -sep, y + 54, cz + pz * -sep], [cx + px * sep, y, cz + pz * sep], 2, 2, MATS.steel);
          b.beam([cx + px * sep, y + 54, cz + pz * sep], [cx + px * -sep, y, cz + pz * -sep], 2, 2, MATS.steel);
        }

        // catapult arm: an open lattice that ends outside the main tower cluster
        const ex = Math.cos(a) * armEndR;
        const ez = Math.sin(a) * armEndR;
        b.beam([tx, armTop + 10, tz], [ex, armTop + 10, ez], 6, 6, MATS.hullShade);
        b.beam([tx, armTop - 10, tz], [ex, armTop - 10, ez], 5, 5, MATS.hullShade);
        const armSteps = Math.max(6, Math.round((baseR - armEndR) / 30));
        for (let s = 0; s < armSteps; s++) {
          const t0 = s / armSteps;
          const t1 = (s + 1) / armSteps;
          const ax = tx + (ex - tx) * t0;
          const az = tz + (ez - tz) * t0;
          const bx = tx + (ex - tx) * t1;
          const bz = tz + (ez - tz) * t1;
          b.beam([ax, armTop - 10, az], [ax, armTop + 10, az], 2.0, 2.0, MATS.steel);
          b.beam([ax, armTop - 10, az], [bx, armTop + 10, bz], 1.8, 1.8, MATS.steel);
          b.beam([bx, armTop - 10, bz], [ax, armTop + 10, az], 1.8, 1.8, MATS.steel);
          if (s % 2 === 0) b.beam([ax, armTop + 10, az], [ax, armTop + 17, az], 1.2, 1.2, MATS.steelLight);
        }
        b.beam([tx, armTop + 17, tz], [ex, armTop + 17, ez], 2.6, 2.6, MATS.steelLight);
        // pivot axle spanning the twin masts
        b.tube(
          [tx + px * 25, armTop, tz + pz * 25],
          [tx - px * 25, armTop, tz - pz * 25],
          7, MATS.steel, 12,
        );
        b.beam([tx, armTop - 34, tz], [ex, armTop - 14, ez], 6, 6, MATS.steelLight);
        b.beam([tx, armTop + 14, tz], [ex, armTop + 30, ez], 3.0, 3.0, MATS.steel);
        b.beam([tx, armTop + 30, tz], [ex, armTop - 14, ez], 2.0, 2.0, MATS.steel);
        // counterweight on the short end, outboard of the pivot
        b.box(44, 52, 40, MATS.concreteDark, [tx + ux * 34, height - 100, tz + uz * 34], [0, -a, 0]);
        b.box(34, 6, 30, MATS.hazard, [tx + ux * 34, height - 71, tz + uz * 34], [0, -a, 0]);
        b.beam([tx + ux * 34, height - 72, tz + uz * 34], [ex, armTop, ez], 1.4, 1.4, MATS.steel);
        // cradle
        b.box(24, 10, 54, MATS.steel, [ex, armTop - 18, ez], [0, -a, 0]);
        b.box(18, 8, 46, MATS.orange, [ex, armTop - 26, ez], [0, -a, 0]);
        for (let i = 0; i < 4; i++) {
          b.cyl(5, 5, 12, 10, MATS.steel, [ex + ux * (i * 10 - 15), armTop - 6, ez + uz * (i * 10 - 15)]);
        }
        // machinery house and antenna, outboard of the masts, on a cantilever beam
        b.beam([tx, height - 52, tz], [tx + ux * 30, height - 52, tz + uz * 30], 14, 10, MATS.steelLight);
        b.box(38, 26, 34, MATS.hullShade, [tx + ux * 30, height - 40, tz + uz * 30]);
        b.box(30, 6, 26, MATS.steel, [tx + ux * 30, height - 24, tz + uz * 30]);
        b.cyl(2, 2, 40, 6, MATS.steelLight, [tx + ux * 34, height - 7, tz + uz * 34]);
        b.box(3, 3, 3, MATS.lampRed, [tx + ux * 34, height + 16, tz + uz * 34]);
        // warning light on cradle
        b.box(2.6, 2.6, 2.6, MATS.lampRed, [ex, armTop - 32, ez]);
        // ladder offset outside the pivot and brace envelope
        const lx = tx + px * 34 + ux * 4;
        const lz = tz + pz * 34 + uz * 4;
        b.tube([lx, feetY + 4, lz], [lx, height - 60, lz], 2.2, MATS.steel);
        b.cyl(3.2, 3.2, 110, 8, MATS.orange, [tx - ux * 26, deckY + 8, tz - uz * 26]);
      }
    }

    root.add(b.build({ name: 'launch-towers' }));
  }

  /* superstructure: hangars, containers, cranes, radar, masts */
  {
    const b = new MeshBuilder();
    const deckY = 88;
    const palette = [MATS.hull, MATS.hullShade, MATS.steelBlue, MATS.steelLight];

    // Deterministic slots keep every structure clear of tower feet, docks and each other.
    const towerAngles = [72, 84, 96, 108, 192, 204, 216, 228, 312, 324, 336, 348];
    const dockAngles = [45, 135, 225, 315];
    const angularGap = (a: number, ref: number) => {
      let d = Math.abs(a - ref) % 360;
      if (d > 180) d = 360 - d;
      return d;
    };
    const blocked = (a: number) =>
      towerAngles.some((t) => angularGap(a, t) < 4) || dockAngles.some((d) => angularGap(a, d) < 6);

    // four modular hangars on the outer service band
    for (let k = 0; k < 4; k++) {
      const a = [20, 120, 170, 270][k];
      const p = ringPoint(1360, a, deckY);
      const ux = Math.cos(a * DEG);
      const uz = Math.sin(a * DEG);
      const tx = -uz;
      const tz = ux;
      b.box(70, 34, 150, palette[k % palette.length], [p.x, deckY + 17, p.z], [0, -a * DEG, 0]);
      b.box(54, 4, 130, MATS.steel, [p.x, deckY + 36, p.z], [0, -a * DEG, 0]);
      // two doors on the inward face
      for (const off of [-35, 35]) {
        b.box(1, 18, 26, MATS.steelBlue,
          [p.x - ux * 35.5 + tx * off, deckY + 9, p.z - uz * 35.5 + tz * off], [0, -a * DEG, 0]);
      }
      // rooftop plant, kept inside the roof outline
      b.box(26, 4, 16, MATS.steelLight, [p.x + tx * 30, deckY + 40, p.z + tz * 30], [0, -a * DEG, 0]);
      b.cyl(2.2, 2.2, 12, 8, MATS.steel, [p.x - tx * 42, deckY + 44, p.z - tz * 42]);
    }

    // one orderly container row between the tower feet and the hangars
    for (let i = 0; i < 30; i++) {
      const a = i * 12;
      if (blocked(a)) continue;
      const p = ringPoint(1300, a, deckY);
      const h = 22 + (i % 4) * 3;
      b.box(34, h, 62, palette[i % palette.length], [p.x, deckY + h / 2, p.z], [0, -a * DEG, 0]);
      const tx = -Math.sin(a * DEG);
      const tz = Math.cos(a * DEG);
      b.box(16, 3, 34, MATS.steel, [p.x + tx * 8, deckY + h + 1.5, p.z + tz * 8], [0, -a * DEG, 0]);
      b.box(10, 2.4, 14, MATS.steelLight, [p.x - tx * 22, deckY + h + 1.2, p.z - tz * 22], [0, -a * DEG, 0]);
    }

    // twin service pipes run along the inner service band, clear of tower feet and docks
    for (const r of [1136, 1156]) {
      b.torus(r, 2.6, MATS.steelLight, [0, 100, 0], [Math.PI / 2, 0, 0], 6, 160);
    }
    for (let i = 0; i < 30; i++) {
      const a = i * 12;
      const p = ringPoint(1146, a, 0);
      b.box(22, 12, 4, MATS.steel, [p.x, 94, p.z], [0, -a * DEG, 0]);
    }

    // storage tanks fill the gaps between hangars and docks
    for (const a of [0, 90, 150, 240, 300]) {
      const p = ringPoint(1350, a, 0);
      b.cyl(11, 12, 34, 16, MATS.hullShade, [p.x, deckY + 17, p.z]);
      b.cyl(12.1, 12.1, 3, 16, MATS.orange, [p.x, deckY + 5, p.z], [0, 0, 0], true);
      b.cyl(6, 11, 6, 16, MATS.steelLight, [p.x, deckY + 37, p.z]);
      b.box(4, 3, 4, MATS.lampRed, [p.x, deckY + 42, p.z]);
    }

    // a low outer row of service modules fills the perimeter without crowding the hangars
    for (let i = 0; i < 36; i++) {
      const a = i * 10;
      if (blocked(a)) continue;
      if ([20, 120, 170, 270].some((h) => angularGap(a, h) < 10)) continue;
      const p = ringPoint(1410, a, deckY);
      b.box(22, 12, 38, palette[i % palette.length], [p.x, deckY + 6, p.z], [0, -a * DEG, 0]);
      b.box(10, 2, 16, MATS.steel, [p.x, deckY + 13, p.z], [0, -a * DEG, 0]);
    }

    // four tower cranes
    for (let k = 0; k < 4; k++) {
      const a = 45 + k * 90;
      const p = ringPoint(1260, a, 90);
      const mastH = 240;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          b.beam([p.x + sx * 6, 90, p.z + sz * 6], [p.x + sx * 4, 90 + mastH, p.z + sz * 4], 2.4, 2.4, MATS.yellow);
        }
      }
      for (let y = 110; y < 90 + mastH; y += 22) {
        b.box(12, 1.6, 1.6, MATS.yellow, [p.x, y, p.z]);
        b.box(1.6, 1.6, 12, MATS.yellow, [p.x, y, p.z]);
      }
      const jibDir = a + 180;
      const jx = Math.cos(jibDir * DEG);
      const jz = Math.sin(jibDir * DEG);
      b.box(170, 4, 5, MATS.yellow, [p.x + jx * 85, 90 + mastH + 8, p.z + jz * 85], [0, -jibDir * DEG, 0]);
      b.box(60, 4, 6, MATS.yellow, [p.x - jx * 30, 90 + mastH + 8, p.z - jz * 30], [0, -jibDir * DEG, 0]);
      b.box(18, 14, 12, MATS.concreteDark, [p.x - jx * 54, 90 + mastH, p.z - jz * 54]);
      b.tube([p.x + jx * 120, 90 + mastH + 4, p.z + jz * 120], [p.x + jx * 120, 150, p.z + jz * 120], 0.6, MATS.steel, 4);
      b.box(4, 4, 4, MATS.lampRed, [p.x, 90 + mastH + 18, p.z]);
    }

    // radar dishes on the core island, clear of the tower clusters
    for (const pos of [
      ringPoint(420, 0, 97),
      ringPoint(420, 180, 97),
    ]) {
      b.cyl(5, 7, 40, 10, MATS.steel, [pos.x, 117, pos.z]);
      b.cyl(30, 4, 9, 24, MATS.hullShade, [pos.x, 140, pos.z + 2], [Math.PI / 2.6, 0, 0]);
      b.cyl(1.2, 1.2, 22, 6, MATS.steelLight, [pos.x, 142, pos.z + 12], [Math.PI / 2.6, 0, 0]);
    }

    // perimeter floodlight masts
    for (let i = 0; i < 16; i++) {
      const a = 11.25 + i * 22.5;
      const p = ringPoint(1430, a, 90);
      b.cyl(3.4, 5, 150, 8, MATS.steelLight, [p.x, 165, p.z]);
      b.box(14, 7, 5, MATS.steel, [p.x, 243, p.z], [0, -a, 0]);
      b.box(12, 4, 1, MATS.lamp, [p.x - Math.sin(a * DEG) * 3, 243, p.z + Math.cos(a * DEG) * 3], [0, -a, 0]);
      b.box(3, 3, 3, MATS.lampRed, [p.x, 250, p.z]);
      addFlood(p.x, 243, p.z, 38);
    }

    // deck signage, read from above
    const signMat = new THREE.MeshBasicMaterial({
      map: decalTexture(['UEG', '赤道太空电梯基地', 'EQUATORIAL SPACE ELEVATOR BASE / EQ-01'], '#ff6a2a'),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), signMat);
    sign.position.set(0, 99.2, -280);
    sign.rotation.set(-Math.PI / 2, 0, Math.PI);
    root.add(sign);

    root.add(b.build({ name: 'superstructure' }));
  }

  /* cables */
  {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    const inst = new THREE.InstancedMesh(geo, MATS.cable, CABLES);
    inst.name = 'cables';
    const dummy = new THREE.Object3D();
    const rings: Array<[number, number]> = [
      [5, 36],
      [10, 72],
      [15, 108],
    ];
    let idx = 0;
    for (const [radius, count] of rings) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + radius * 0.01;
        const rr = radius + Math.sin(i * 2.399) * 1.6;
        dummy.position.set(Math.cos(a) * rr, CABLES_ORIGIN + CABLE_TOP / 2, Math.sin(a) * rr);
        const thick = 0.12 + ((i * 37) % 100) / 100 * 0.2;
        dummy.scale.set(thick, CABLE_TOP, thick);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(idx++, dummy.matrix);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = false;
    root.add(inst);

    // faint luminous core to read the tether at distance
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x1e4b62,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: true,
      toneMapped: false,
    });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6.5, CABLE_TOP, 12, 1, true), glowMat);
    core.position.y = CABLES_ORIGIN + CABLE_TOP / 2;
    core.name = 'tether-glow';
    root.add(core);

    // tension rings
    const b = new MeshBuilder();
    for (const y of [900, 1600, 2200, 3000, 3600, 4200, 4800, 5600]) {
      b.torus(35, 0.6, MATS.steelLight, [0, y, 0], [Math.PI / 2, 0, 0], 4, 40);
    }
    root.add(b.build({ name: 'tension-rings', castShadow: false, receiveShadow: false }));
  }

  // nine elevator cars
  const cars: CarHandle[] = [];
  const heights = [1200, 700, 2600, 5200, 9000, 13000, 17000, 21000, 25000];
  heights.forEach((baseY, index) => {
    const car = createCar(index, index === 1);
    car.position.set(0, baseY, 0);
    car.name = `elevator-car-${index + 1}`;
    car.userData.baseY = baseY;
    root.add(car);
    const engines: THREE.Sprite[] = [];
    car.traverse((obj) => {
      if (obj.userData.engine) engines.push(obj as THREE.Sprite);
    });
    cars.push({ group: car, index, engines, baseY });
  });
  const hero = cars[1];
  // Show engine glow only for the hero car.
  for (const car of cars) {
    if (car !== hero) for (const e of car.engines) e.material.opacity = 0;
  }

  root.add(createDrones());
  root.add(createShips(rng));

  return {
    group: root,
    cars,
    hero,
    lightSprites,
    cableTop: CABLES_ORIGIN + CABLE_TOP,
    anchorY: CABLES_ORIGIN,
  };
}

/* ── support ships on the water ───────────────────────────────── */

function createShips(rng: Rng): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ships';
  const b = new MeshBuilder();
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, 360) * DEG;
    const r = rng.range(1850, 2600);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const len = rng.range(160, 280);
    const wid = rng.range(30, 46);
    const heading = a + Math.PI / 2 + rng.range(-0.4, 0.4);
    // hull
    b.box(len, 14, wid, MATS.steelBlue, [x, 1, z], [0, -heading, 0]);
    b.box(len * 0.86, 4, wid * 0.9, MATS.steel, [x, 10, z], [0, -heading, 0]);
    // bow
    b.box(len * 0.22, 10, wid * 0.62, MATS.steelBlue, [x + Math.cos(heading) * len * 0.55, 3, z + Math.sin(heading) * len * 0.55], [0, -heading, 0]);
    // bridge
    const bx = x - Math.cos(heading) * len * 0.28;
    const bz = z - Math.sin(heading) * len * 0.28;
    b.box(24, 22, 24, MATS.hull, [bx, 22, bz], [0, -heading, 0]);
    b.box(26, 3, 26, MATS.steel, [bx, 34, bz], [0, -heading, 0]);
    b.box(18, 5, 18, MATS.glassWarm, [bx, 30, bz], [0, -heading, 0]);
    // deck containers
    for (let k = 0; k < 4; k++) {
      const t = (k - 1.5) / 4;
      b.box(26, 8, 20, k % 2 ? MATS.orange : MATS.hullShade, [x + Math.cos(heading) * t * len, 17, z + Math.sin(heading) * t * len], [0, -heading, 0]);
    }
    // running lights
    b.box(3, 3, 3, MATS.lampRed, [x - Math.cos(heading) * len * 0.5, 8, z - Math.sin(heading) * len * 0.5]);
    b.box(3, 3, 3, MATS.lamp, [bx, 36, bz]);
  }
  group.add(b.build({ name: 'support-ships' }));
  return group;
}

/* ── small flying lights for scale and life ───────────────────── */

function createDrones(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'drones';
  const tex = glowTexture('rgba(255,255,255,1)', 'rgba(255,180,120,0.5)');
  const rng = new Rng(771);
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: i % 2 === 0 ? 0xffd2a0 : 0x9fe8ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(20, 20, 1);
    spr.position.set(rng.range(-900, 900), rng.range(380, 900), rng.range(-900, 900));
    spr.userData.radius = rng.range(500, 1250);
    spr.userData.speed = rng.range(0.03, 0.08);
    spr.userData.phase = rng.range(0, Math.PI * 2);
    spr.userData.height = spr.position.y;
    group.add(spr);
  }
  return group;
}
