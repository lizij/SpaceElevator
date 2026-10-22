import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Builder } from './model';

export type CabinView = 'aisle' | 'seat' | 'control' | 'cutaway';
const AISLE_X = 2.38;
const PASSENGER_X = [-4.96, -3.54, -2.12, -.7, .72, 4.4];
export const CABIN_VIEWS: Record<CabinView, { eye: [number, number, number]; look: [number, number, number] }> = {
  aisle: { eye: [AISLE_X, .35, 7.45], look: [AISLE_X, .15, -5] },
  seat: { eye: [.72, .25, 3.48], look: [AISLE_X, .2, -4.8] },
  control: { eye: [-2.15, .25, -7.16], look: [-2.15, -.52, -9.1] },
  cutaway: { eye: [19, 15, 24], look: [0, -.8, 0] }
};

type ControlMaterials = Record<'steel' | 'graphite' | 'lining' | 'safety' | 'orange' | 'light', THREE.Material>;

// A single transform places each screen, bezel and rear shell. Static housing
// and mounts join the existing material batches; only the displays need meshes.
export function addControlSideEquipment(structure: Builder, mats: ControlMaterials) {
  const { steel, graphite, lining, safety, orange, light } = mats;
  const screens: THREE.Matrix4[] = [];
  for (const side of [-1, 1]) {
    const x = side * 5.08;
    structure.box([1.18, 3.42, .42], [x, -.48, -9.1], steel);
    structure.box([1.29, .16, .65], [x, -2.27, -9.04], graphite);
    // Unequal modules: upper meter, paired connections, lower service cover.
    structure.box([.98, .61, .085], [x, .77, -8.846], graphite);
    structure.box([.57, .28, .035], [x-side*.12, .82, -8.789], lining);
    for (let i = 0; i < 5; i++) {
      structure.box([.065, .15 + (i % 3) * .023, .018], [x+side*(-.33+i*.1), .82, -8.761], graphite);
    }
    for (const y of [.66, .84, 1.02])
      structure.box([.065, .043, .04], [x+side*.36, y, -8.784], y === .66 ? orange : safety);
    structure.box([.98, .82, .085], [x, -.13, -8.846], graphite);
    for (const dx of [-.23, .23]) {
      structure.add(new THREE.CylinderGeometry(.126, .126, .065, 16), steel,
        [x+dx, .04, -8.778], [Math.PI/2, 0, 0]);
      structure.add(new THREE.CylinderGeometry(.077, .077, .018, 12), graphite,
        [x+dx, .04, -8.735], [Math.PI/2, 0, 0]);
      structure.box([.22, .055, .025], [x+dx, -.2, -8.79], lining);
    }
    structure.box([.98, .9, .085], [x, -1.09, -8.846], lining);
    for (const dx of [-.37, .37]) for (const y of [-.73, -1.45])
      structure.box([.045, .045, .025], [x+dx, y, -8.789], steel);
    structure.box([.3, .09, .06], [x, -.84, -8.768], graphite);
    for (let j = 0; j < 4; j++)
      structure.box([.69, .038, .021], [x, -1.12-j*.09, -8.79], graphite);
    structure.box([.86, .27, .075], [x, -1.85, -8.84], graphite);
    structure.box([.42, .036, .025], [x, -1.85, -8.79], safety);
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(side*3.65, .35, -8.3),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -side*.55),
      new THREE.Vector3(1, 1, 1));
    const local = (at: [number, number, number]): [number, number, number] =>
      new THREE.Vector3(...at).applyMatrix4(matrix).toArray();
    const housing = new Builder();
    housing.box([1.18, .78, .12], [0, 0, 0], steel);
    housing.box([1.03, .64, .045], [0, .02, .0775], graphite);
    housing.box([.96, .57, .095], [0, .025, -.104], graphite);
    housing.box([.3, .3, .095], [0, 0, -.188], steel);
    for (const dx of [-.47, .47]) {
      housing.box([.043, .03, .025], [dx, -.334, .075], lining);
      housing.box([.036, .036, .022], [dx, .327, .072], graphite);
    }
    housing.box([.042, .022, .025], [.35, -.333, .078], light);
    const frame = housing.finish('cabin');
    for (const obj of frame.children) {
      const mesh = obj as THREE.Mesh;
      structure.add(mesh.geometry.clone().applyMatrix4(matrix), mesh.material as THREE.Material);
      mesh.geometry.dispose();
    }
    // The wall-mounted column carries two real pivots and a boxed cantilever.
    const anchor: [number, number, number] = [side*4.68, .3, -8.82];
    const elbow: [number, number, number] = [side*4.55, .3, -8.52];
    const rear = local([0, 0, -.21]);
    structure.box([.25, .38, .19], anchor, steel);
    structure.cylinder(.115, .115, .42, anchor, graphite, 16);
    structure.girder(anchor, elbow, .14, .16, steel);
    structure.cylinder(.1, .1, .3, elbow, graphite, 16);
    structure.girder(elbow, rear, .14, .16, steel);
    structure.beam([rear[0], rear[1]-.16, rear[2]], [rear[0], rear[1]+.16, rear[2]], .09, graphite, 12);
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x-side*.23, .04, -8.715),
      new THREE.Vector3(side*4.63, -.12, -8.63),
      new THREE.Vector3(side*4.33, .02, -8.57),
      new THREE.Vector3(...local([.15*side, -.22, -.16]))
    ]);
    structure.add(new THREE.TubeGeometry(cable, 18, .028, 6, false), graphite);
    screens.push(matrix);
  }
  return screens;
}

function screenTexture(title: string, kind: 'display' | 'label' = 'display') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = kind === 'display' ? 512 : 192;
  const c = canvas.getContext('2d')!;
  c.fillStyle = kind === 'display' ? '#101d23' : '#293536'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#a0c8c7'; c.font = '500 38px monospace'; c.fillText(title, 36, 62);
  if (kind === 'display') {
    c.fillStyle = '#58757b'; c.font = '22px monospace'; c.fillText('SEV–03   /   UEG GABON   /   SYSTEM READY', 36, 102);
    for (let i = 0; i < 6; i++) {
      c.fillStyle = '#243b43'; c.fillRect(36, 150 + i * 47, 600, 20);
      c.fillStyle = i === 4 ? '#bba573' : '#629998'; c.fillRect(36, 150 + i * 47, 230 + (i * 71) % 300, 20);
      c.fillStyle = '#adbbb6'; c.font = '19px monospace'; c.fillText(['CABIN PRESSURE', 'OXYGEN', 'THERMAL CONTROL', 'POWER BUS', 'CLAMP LOAD', 'LIFE SUPPORT'][i], 672, 168 + i * 47);
    }
    c.strokeStyle = '#3f7278'; c.lineWidth = 2; c.strokeRect(22, 122, 980, 328);
    c.fillStyle = '#d2b580'; c.font = '21px monospace'; c.fillText('ASCENT CONTROL     ● NOMINAL', 36, 487);
  } else {
    c.strokeStyle = '#c2ad7c'; c.lineWidth = 3; c.beginPath(); c.moveTo(36, 95); c.lineTo(985, 95); c.stroke();
    c.fillStyle = '#b1bab5'; c.font = '25px monospace'; c.fillText('UNITED EARTH GOVERNMENT  /  SEV–03', 36, 148);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

function cabinFinish() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#e2e0d6'; c.fillRect(0, 0, 512, 512);
  let seed = 47;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 12000; i++) {
    c.fillStyle = random() > .5 ? '#ffffff13' : '#25382b0b';
    c.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1);
  }
  for (let i = 0; i < 80; i++) {
    c.fillStyle = '#25382b13';
    c.fillRect(random() * 512, random() * 512, .6, 2 + random() * 16);
  }
  const edge = c.createLinearGradient(0, 0, 0, 512);
  edge.addColorStop(0, '#14241f25'); edge.addColorStop(.08, '#14241f00');
  edge.addColorStop(.92, '#14241f00'); edge.addColorStop(1, '#14241f30');
  c.fillStyle = edge; c.fillRect(0, 0, 512, 512);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  return map;
}

export function buildCabin() {
  const root = new THREE.Group(); root.name = 'cabin-interior';
  // The room's long axis follows the exterior cabin's wide X axis.
  root.rotation.y = Math.PI / 2;
  const finish = cabinFinish();
  const shell = new THREE.MeshStandardMaterial({ color: 0x89928e, map: finish, metalness: .28, roughness: .75 });
  const lining = new THREE.MeshStandardMaterial({ color: 0xb6b9ae, map: finish, metalness: .16, roughness: .83 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x465453, metalness: .65, roughness: .6 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x182424, metalness: .25, roughness: .85 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x3b4947, metalness: 0, roughness: .97 });
  const strap = new THREE.MeshStandardMaterial({ color: 0x7b806f, metalness: .05, roughness: .95 });
  const safety = new THREE.MeshStandardMaterial({ color: 0xc1a766, metalness: .24, roughness: .66 });
  const light = new THREE.MeshStandardMaterial({ color: 0xdbe8de, emissive: 0xc1d6c9, emissiveIntensity: 1.5, roughness: .6 });
  const orange = new THREE.MeshStandardMaterial({ color: 0x9e5438, roughness: .7 });
  const mats = { shell, lining, steel, graphite, fabric, strap, safety, light, orange };

  function sign(text: string, width: number, height: number, at: [number, number, number], ry = 0, display = false, parent = root) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: screenTexture(text, display ? 'display' : 'label'), toneMapped: false }));
    mesh.position.set(...at); mesh.rotation.y = ry; parent.add(mesh); return mesh;
  }
  const structure = new Builder();
  // Continuous pressure floor plus separated inset tread panels.
  structure.box([12.6, .24, 19.2], [0, -2.55, 0], graphite);
  for (let z = -8.9; z < 9; z += 1.42) for (const x of [-4.65, -1.55, 1.55, 4.65]) {
    structure.box([3.04, .08, 1.35], [x, -2.39, z], steel);
    for (let j = 0; j < 5; j++) structure.box([2.85, .025, .018], [x, -2.335, z - .5 + j * .25], graphite);
  }
  for (const x of [AISLE_X-.98, AISLE_X+.98]) {
    structure.box([.055, .02, 15.3], [x, -2.33, .5], safety);
    for (let z = -5.2; z < 8; z += 1.9) structure.box([.04, .035, .3], [x, -2.32, z], light);
  }
  for (const x of PASSENGER_X.flatMap(center=>[center-.44,center+.44])) {
    structure.box([.1, .07, 13.7], [x, -2.29, .7], graphite);
    for (let z = -5.5; z < 7; z += .34) structure.box([.11, .021, .1], [x, -2.244, z], steel);
  }

  const leftWall = new Builder(), rightWall = new Builder(), roof = new Builder();
  const wallDisplays = [new THREE.Group(), new THREE.Group()];
  const displayFrames = [new Builder(), new Builder()];
  root.add(...wallDisplays);
  for (const side of [-1, 1]) {
    const wall = side < 0 ? leftWall : rightWall;
    wall.box([.22, 4.3, 19.2], [side * 6.3, -.3, 0], graphite);
    for (let i = 0; i < 10; i++) {
      const z = -8.55 + i * 1.9;
      wall.box([.14, 2.5, 1.77], [side * 6.14, -.8, z], shell);
      wall.box([.12, .87, 1.77], [side * 6.06, 1.03, z], lining);
      wall.box([.12, .45, 1.25], [side * 5.96, .63, z], graphite);
      wall.box([.06, .3, 1.07], [side * 5.86, .63, z], steel);
      // Recessed ventilation slats, never coincident with the inset.
      for (let j = 0; j < 7; j++) wall.box([.04, .28, .035], [side * 5.81, .63, z - .45 + j * .15], graphite);
      for (const y of [-1.7, .14]) for (const dz of [-.73, .73]) wall.box([.05, .07, .07], [side * 6.04, y, z + dz], steel);
      wall.box([.24, 3.9, .13], [side * 6.02, -.25, z + .91], steel);
      wall.beam([side * 5.92, -1.2, z + .68], [side * 5.92, -.5, z + .68], .045, safety);
    }
    // Three side-wall stations: each screen and its physical bezel share the
    // same local transform, keeping the display above its recessed backing.
    for(const [i,z] of [-4.65,.45,5.55].entries()){
      const display=wallDisplays[side<0?0:1],angle=-side*Math.PI/2;
      const panel=new THREE.Group();panel.position.set(side*5.84,.98,z);panel.rotation.set(-.14,angle,0);display.add(panel);
      const housing=new Builder();
      housing.box([1.36,.99,.14],[0,0,0],steel);
      housing.box([1.2,.77,.075],[0,.03,.09],graphite);
      for(const x of [-.46,.46])housing.box([.07,.04,.04],[x,-.41,.1],lining);
      panel.updateMatrix();
      const frame=housing.finish('cabin');
      for(const obj of frame.children){
        const mesh=obj as THREE.Mesh;
        displayFrames[side<0?0:1].add(mesh.geometry.clone().applyMatrix4(panel.matrix),mesh.material as THREE.Material);
        mesh.geometry.dispose();
      }
      sign(i%2?'LIFE SUPPORT':'CABIN STATUS',1.1,.67,[0,.035,.135],0,true,panel);
      wall.box([.36,1.08,.74],[side*5.92,-.65,z],steel);
      wall.box([.04,.7,.58],[side*5.71,-.62,z],graphite);
      for(let j=0;j<4;j++){
        wall.box([.07,.055,.055],[side*5.67,-.83+j*.14,z-.15],j===2?orange:safety);
        wall.box([.065,.04,.18],[side*5.67,-.83+j*.14,z+.1],lining);
      }
      wall.beam([side*5.96,.45,z+.48],[side*5.96,-1.31,z+.48],.038,graphite,8);
    }
    // Angled equipment shoulders, exposed ducts and recessed service modules.
    for (let i = 0; i < 7; i++) {
      const z = -5.4 + i * 1.95;
      roof.box([1.55, .15, 1.81], [side * 5.13, 1.8, z], shell, [0, 0, -side * .36]);
      if (i % 2 === 0) {
        roof.box([.72, .46, 1.12], [side * 4.5, 1.83, z], steel);
        roof.box([.1, .27, .68], [side * 4.08, 1.82, z], graphite);
      }
      roof.box([.52, .10, 1.54], [side * 5.22, 1.58, z], light, [0, 0, -side * .36]);
      roof.girder([side * 5.85, 1.05, z + .87], [side * 4.62, 2.15, z + .87], .22, .22, steel);
    }
    roof.box([1.4, .14, 19.2], [side * 5.75, 2.22, 0], lining, [0, 0, -side * .5]);
    for (const x of [2.7, 3, 3.35]) roof.beam([side * x, 2.04, -9.3], [side * x, 2.04, 9.3], x === 3 ? .12 : .07, steel);
    for (const x of [1.4, 1.65]) roof.beam([side * x, 2.16, -9.3], [side * x, 2.16, 9.3], .075, graphite);
    for (let z = -8; z < 9; z += 1.6) {
      roof.box([.65, .13, .22], [side * 1.52, 2.04, z], steel);
      roof.cylinder(.08, .08, .1, [side * 1.52, 1.94, z], graphite, 8);
    }
  }
  wallDisplays.forEach((group,i)=>group.add(displayFrames[i].finish('cabin')));
  roof.box([10.9, .2, 19.2], [0, 2.85, 0], graphite);
  for (let z = -8.8; z < 9; z += 1.6) {
    roof.box([5.3, .1, 1.48], [0, 2.6, z], shell);
    roof.box([10.7, .42, .32], [0, 2.12, z + .77], steel);
    for (const x of [-.85, .85]) roof.box([.12, .32, 1.5], [x, 2.16, z], graphite);
    for (let j = 0; j < 4; j++) roof.box([1.8, .11, .095], [0, 2.01, z - .52 + j * .34], steel);
    for (const x of [-.4, .4]) roof.beam([x, 2.27, z - .7], [x, 2.27, z + .7], .09, graphite);
  }
  for (const z of [-4.1, 1, 6.1]) {
    roof.box([2.25, .38, .92], [AISLE_X, 1.71, z], shell);
    roof.box([1.7, .12, .56], [AISLE_X, 1.45, z], graphite);
    for (const x of [-.68, .68]) roof.box([.12, .1, .24], [AISLE_X+x, 1.36, z], safety);
  }
  // The front plate shows one broad suspended unit above the main seat bank.
  // Its dark face looks toward the front cross-passage; the reverse is a plain
  // service casing. Both faces, brackets and conduits belong to the removable roof.
  roof.add(new RoundedBoxGeometry(6.7, 1.22, .38, 3, .14), shell, [-2.12, 1.48, -5.72]);
  roof.add(new RoundedBoxGeometry(6.36, .98, .09, 3, .1), graphite, [-2.12, 1.47, -5.953]);
  roof.add(new RoundedBoxGeometry(6.25, .86, .065, 2, .07), steel, [-2.12, 1.49, -5.487]);
  for (const x of [-5.33, 1.09]) {
    roof.box([.31, .55, .54], [x, 1.38, -5.77], steel);
    roof.box([.23, .36, .09], [x, 1.37, -6.09], lining);
    for (const y of [1.25, 1.49]) roof.box([.065, .065, .035], [x, y, -6.155], graphite);
    roof.girder([x, 1.77, -5.73], [x, 2.41, -6.28], .14, .2, steel);
    roof.box([.45, .13, .42], [x, 2.44, -6.28], shell);
    for (const dx of [-.075, .075]) {
      const conduit = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x+dx, 1.56, -6.1),
        new THREE.Vector3(x+dx, 1.95, -6.12),
        new THREE.Vector3(x+dx, 2.23, -6.04),
        new THREE.Vector3(x+dx, 2.33, -5.6),
        new THREE.Vector3(x+dx, 2.33, -4.75)
      ]);
      roof.add(new THREE.TubeGeometry(conduit, 16, .037, 6, false), graphite);
    }
  }
  for (const x of [-4.2, -2.12, -.04]) {
    roof.box([.035, .67, .025], [x, 1.49, -5.442], graphite);
    for (const y of [1.19, 1.79]) roof.box([.06, .055, .03], [x+.15, y, -5.438], lining);
  }
  roof.box([.24, .35, .12], [1.47, 1.89, -5.78], steel);
  roof.add(new THREE.CylinderGeometry(.09, .09, .075, 16), orange, [1.47, 1.91, -5.877], [Math.PI/2, 0, 0]);
  // Rear pressure hatch, wheel, locking dogs and overhead caution signage.
  const rear = new Builder();
  rear.box([12.6, 5.15, .24], [0, .1, 9.55], shell);
  rear.box([2.3, 3.3, .16], [0, -.7, 9.34], graphite);
  rear.add(new RoundedBoxGeometry(1.95, 2.94, .14, 2, .16), lining, [0, -.7, 9.18]);
  rear.add(new THREE.TorusGeometry(.38, .035, 8, 32), steel, [.28, -.65, 9.05]);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    rear.beam([.28, -.65, 9.02], [.28 + Math.cos(a) * .33, -.65 + Math.sin(a) * .33, 9.02], .025, steel);
  }
  for (const x of [-1, 1]) for (const y of [-1.7, .3]) rear.box([.25, .16, .11], [x, y, 9.06], steel);
  const rearSign = sign('AIRLOCK  /  KEEP SEALED', 2.85, .54, [0, 1.4, 9.38], Math.PI);
  const rearWall = rear.finish('cabin'); root.add(rearWall);

  // Front bulkhead has a real doorway, allowing a sightline into the control bay.
  // Extra width on the control-seat side provides turning space after entry.
  const leftEdge=AISLE_X-1.25,rightEdge=AISLE_X+1.65;
  const doorWidth=rightEdge-leftEdge,doorCenter=(leftEdge+rightEdge)/2;
  structure.box([leftEdge+6.3,4.86,.23],[(leftEdge-6.3)/2,-.05,-6.43],shell);
  structure.box([6.3-rightEdge,4.86,.23],[(rightEdge+6.3)/2,-.05,-6.43],shell);
  structure.box([doorWidth, 1.15, .23], [doorCenter, 2.01, -6.43], shell);
  for (const x of [leftEdge,rightEdge]) structure.box([.15, 3.83, .45], [x, -.58, -6.38], steel);
  structure.box([doorWidth+.15, .16, .45], [doorCenter, 1.41, -6.38], steel);
  sign('FLIGHT CONTROL', 2.3, .43, [doorCenter, 2.04, -6.28]);
  sign('CABIN / SECURE HARNESS', 2.8, .53, [-2.3, 1.25, -6.28]);
  sign('LIFE SUPPORT', 1.65, .9, [4.88, .25, -6.27], 0, true);
  // Control room end wall and consoles.
  structure.box([12.6, 5.15, .22], [0, .1, -9.56], graphite);
  for (let i = 0; i < 6; i++) {
    const x = -5.1 + i * 2.04;
    structure.box([1.92, 4.55, .12], [x, -.05, -9.37], shell);
    structure.box([1.4, .12, .7], [x, 2.26, -8.97], light);
  }
  for (const x of [-2.15, 2.15]) {
    // Raised equipment chest with an open footwell; the seat footrests extend
    // beneath the desk and must not intersect a floor-to-worktop solid plinth.
    structure.box([2.55, .45, 1.24], [x, -1.405, -8.62], steel);
    for (const side of [-1,1])
      structure.box([.24, .63, 1.3], [x+side*1.155, -1.945, -8.59], steel);
    structure.box([2.66, .15, 1.44], [x, -1.12, -8.5], graphite, [-.16, 0, 0]);
    structure.box([1.88, 1.07, .24], [x, -.16, -9.14], graphite, [-.22, 0, 0]);
    const primary = sign('ASCENT / ' + (x < 0 ? 'NAV' : 'SYSTEMS'), 1.64, .86, [x, -.13, -8.991], 0, true);
    primary.rotation.x = -.22;
    structure.box([2.12, .18, 1.24], [x, -.96, -8.4], shell, [-.38, 0, 0]);
    // Place fittings in the worktop's local plane, including the dial axes.
    const onDesk = (dx: number, height: number, dz: number, lift = 0): [number, number, number] =>
      new THREE.Vector3(dx, .09 + height / 2 + .006 + lift, dz)
        .applyEuler(new THREE.Euler(-.38, 0, 0)).add(new THREE.Vector3(x, -.96, -8.4)).toArray();
    structure.box([1.08, .025, .64], onDesk(0, .025, -.19), graphite, [-.38, 0, 0]);
    const lower = sign('CLAMP LOAD / POWER', .96, .52, onDesk(0, 0, -.19, .032), 0, true);
    lower.rotation.x = -Math.PI / 2 - .38;
    structure.box([1.77, .75, .22], [x, 1.05, -9.11], steel, [-.16, 0, 0]);
    const upper = sign('GUIDANCE / TELEMETRY', 1.52, .55, [x, 1.07, -8.96], 0, true);
    upper.rotation.x = -.16;
    structure.box([.12, .9, .16], [x + 1.17, .95, -8.92], light);
    for (const side of [-1, 1]) {
      structure.box([.58, 1.5, 1.56], [x + side * 1.61, -1.39, -8.24], graphite);
      structure.box([.62, .13, 1.59], [x + side * 1.61, -.56, -8.24], steel, [-.12, 0, 0]);
      const onSide = (dx: number, height: number, dz: number): [number, number, number] =>
        new THREE.Vector3(dx, .065 + height / 2 + .006, dz)
          .applyEuler(new THREE.Euler(-.12, 0, 0)).add(new THREE.Vector3(x + side * 1.61, -.56, -8.24)).toArray();
      for (let row = 0; row < 6; row++) for (let col = 0; col < 3; col++)
        structure.box([.075, .028, .085], onSide(-.16 + col * .16, .028, -.58 + row * .17),
          row === 0 && col === 2 ? orange : col === 0 ? safety : graphite, [-.12, 0, 0]);
      for (const dx of [-.14, .14]) {
        structure.add(new THREE.CylinderGeometry(.05, .055, .075, 12), graphite, onSide(dx, .075, .56), [-.12, 0, 0]);
        structure.box([.045, .021, .025], onSide(dx, .021, .4), safety, [-.12, 0, 0]);
      }
    }
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) for (const dx of [-.095, .095])
        structure.box([.105, .035, .095], onDesk(side * .79 + dx, .035, -.4 + row * .21),
          row === 0 ? safety : row === 2 && dx > 0 ? orange : graphite, [-.38, 0, 0]);
      for (const dx of [-.095, .095]) {
        structure.add(new THREE.CylinderGeometry(.043, .048, .075, 12), graphite,
          onDesk(side * .79 + dx, .075, .26), [-.38, 0, 0]);
        structure.box([.013, .006, .049], onDesk(side * .79 + dx, .006, .26, .075), lining, [-.38, 0, 0]);
      }
    }
    for (let row = 0; row < 2; row++) for (let col = 0; col < 7; col++) {
      structure.box([.10, .033, .075], onDesk(-.45 + col * .15, .033, .27 + row * .17),
        col === 0 ? safety : graphite, [-.38, 0, 0]);
      if (row === 0) structure.box([.035, .015, .018], onDesk(-.45 + col * .15, .015, .17),
        col === 4 ? orange : light, [-.38, 0, 0]);
    }
    for(const side of [-1,1]){
      structure.box([.32, .44, .18], [x+side*1.05,-.19,-8.99],steel,[-.22,0,0]);
      for(let j=0;j<3;j++)structure.box([.08,.045,.06],[x+side*1.05,-.31+j*.12,-8.865],j===1?orange:light);
    }
    structure.beam([x + .82, -1.03, -8.08], [x + .82, -.64, -8.08], .035, graphite);
    structure.box([.19, .08, .12], [x + .82, -.6, -8.08], graphite);
  }
  sign('SEV–03', 1.52, .42, [0, .86, -9.2]);
  addControlSideEquipment(structure, mats).forEach((matrix, i) => {
    const display = sign(i ? 'POWER / AUX' : 'GUIDANCE / AUX', .94, .54, [0, 0, 0], 0, true);
    display.position.set(0, .02, .106).applyMatrix4(matrix);
    display.quaternion.setFromRotationMatrix(matrix);
  });

  // High-backed restraint seats follow the public passenger/control-room plates.
  const seat = new Builder();
  seat.box([.96, .14, 1.08], [0, .12, 0], steel);
  for (const x of [-.42, .42]) for (const z of [-.4, .4]) seat.box([.1, .51, .1], [x, .3, z], steel);
  seat.add(new RoundedBoxGeometry(1.07, .26, 1.04, 3, .08), fabric, [0, .67, -.04]);
  seat.add(new RoundedBoxGeometry(1.08, 1.58, .16, 2, .025), steel, [0, 1.4, .43], [-.08, 0, 0]);
  seat.add(new RoundedBoxGeometry(.86, 1.28, .16, 2, .04), fabric, [0, 1.38, .26], [-.08, 0, 0]);
  seat.add(new RoundedBoxGeometry(.68, .31, .105, 2, .02), steel, [0, 2.18, .45]);
  seat.add(new RoundedBoxGeometry(.58, .26, .12, 2, .025), fabric, [0, 2.18, .33]);
  seat.box([.5,.17,.035],[0,2.18,.521],graphite);
  for(const x of [-.3,.3])seat.box([.06,.27,.04],[x,2.18,.522],lining);
  // Back-shell service panel, folded tray and fastening points.
  seat.add(new RoundedBoxGeometry(.77, .83, .055, 2, .035), graphite, [0, 1.38, .59], [-.08, 0, 0]);
  seat.box([.65, .37, .045], [0, 1.09, .64], steel, [-.08, 0, 0]);
  seat.box([.16, .05, .055], [0, 1.3, .69], safety);
  for(const y of [1.03,1.91])seat.box([.99,.11,.12],[0,y,.56],lining,[-.08,0,0]);
  for (const x of [-.39, .39]) for (const y of [.98, 1.76])
    seat.box([.045, .045, .045], [x, y, .63], lining);
  for (const x of [-.35, .35]) seat.box([.025, 1.05, .027], [x, 1.4, .089], strap, [-.08, 0, 0]);
  for (const x of [-.54, .54]) {
    seat.box([.07, .61, .09], [x, .72, .25], steel);
    seat.add(new RoundedBoxGeometry(.16, .12, .91, 2, .045), graphite, [x, 1.04, -.07]);
    seat.box([.045, .13, .14], [x, 1.08, -.29], safety);
  }
  // Four-point restraint: shoulder belts, lap belt and central release buckle.
  for (const x of [-.27, .27]) seat.box([.10, 1.12, .035], [x, 1.34, .091], strap, [0, 0, x > 0 ? .17 : -.17]);
  seat.box([.84, .095, .045], [0, .82, -.03], strap);
  seat.box([.19, .2, .07], [0, .88, -.085], steel);
  seat.box([.09, .09, .035], [0, .88, -.14], orange);
  seat.box([.74, .04, .38], [0, .24, -.76], graphite);
  seat.beam([-.37, .23, -.9], [.37, .23, -.9], .045, steel);
  for (const x of [-.5, .5]) {
    seat.girder([x, .19, -.4], [x, 1.91, .52], .11, .1, steel);
    seat.box([.17, 1.25, .14], [x, 1.24, .56], lining, [-.08, 0, 0]);
    seat.add(new THREE.CylinderGeometry(.12, .12, .12, 12), graphite, [x, .66, .39], [0, 0, Math.PI / 2]);
    seat.box([.18, .1, .64], [x, .13, -.03], steel);
  }
  const template = seat.finish('cabin');
  const seatPositions: [number, number, number][] = [];
  for (let row = 0; row < 7; row++) for (const x of PASSENGER_X) seatPositions.push([x, -2.23, -4.65 + row * 1.7]);
  seatPositions.push([-2.15, -2.23, -7.38], [2.15, -2.23, -7.38]);
  for (const obj of template.children) {
    const mesh = obj as THREE.Mesh;
    const instance = new THREE.InstancedMesh(mesh.geometry, mesh.material, seatPositions.length);
    seatPositions.forEach((at, i) => instance.setMatrixAt(i, new THREE.Matrix4().makeTranslation(...at)));
    instance.castShadow = instance.receiveShadow = true; root.add(instance);
  }
  root.add(structure.finish('cabin'));
  const port = leftWall.finish('cabin'), starboard = rightWall.finish('cabin'), ceiling = roof.finish('cabin');
  root.add(port, starboard, ceiling);
  // Broad local light pools preserve the utilitarian, enclosed atmosphere.
  for (const z of [-8, -3, 3, 7]) {
    const lamp = new THREE.PointLight(0xd9e8df, 28, 14, 2);
    lamp.position.set(0, 1.9, z); root.add(lamp);
  }
  root.traverse(obj => obj.layers.set(1));
  return {
    root, seatCount: seatPositions.length, materials: mats,
    setCutaway(enabled: boolean) {
      ceiling.visible = starboard.visible = rearWall.visible = rearSign.visible = !enabled;
      wallDisplays[1].visible = !enabled;
    },
    point(local: [number, number, number]) { root.updateWorldMatrix(true, false); return root.localToWorld(new THREE.Vector3(...local)); }
  };
}
