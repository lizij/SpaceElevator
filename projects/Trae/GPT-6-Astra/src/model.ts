import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { detailBase, detailClimber, detailStation } from './detail';
import { BASE_TOWERS, STATION_TOWERS } from './station-layout';
import { CABLE_GUIDES, GUIDE_SPACING, cableRoutes } from './cable-layout';
import { crossesHarborRoad } from './harbor-layout';

export type View = 'overview' | 'base' | 'climber' | 'station' | 'cabin';
type V3 = [number, number, number];

// Static parts are batched by material. This keeps the machinery detailed while
// avoiding one draw call per girder, window or panel.
export class Builder {
  private batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0]) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix);
    const list = this.batches.get(material) ?? [];
    list.push(geometry);
    this.batches.set(material, list);
  }
  box(size: V3, at: V3, material: THREE.Material, rotation: V3 = [0, 0, 0]) { this.add(new THREE.BoxGeometry(...size), material, at, rotation); }
  cylinder(top: number, bottom: number, height: number, at: V3, material: THREE.Material, segments = 16) {
    this.add(new THREE.CylinderGeometry(top, bottom, height, segments), material, at);
  }
  ring(radius: number, tube: number, y: number, material: THREE.Material, tubularSegments = 80) {
    this.add(new THREE.TorusGeometry(radius, tube, 6, tubularSegments), material, [0, y, 0], [Math.PI / 2, 0, 0]);
  }
  beam(a: V3, b: V3, radius: number, material: THREE.Material, segments = 5) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const geo = new THREE.CylinderGeometry(radius, radius, direction.length(), segments);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    geo.translate(...start.add(end).multiplyScalar(0.5).toArray());
    const list = this.batches.get(material) ?? []; list.push(geo); this.batches.set(material, list);
  }
  girder(a: V3, b: V3, width: number, depth: number, material: THREE.Material) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const geo = new THREE.BoxGeometry(width, direction.length(), depth);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    this.add(geo, material, start.add(end).multiplyScalar(.5).toArray() as V3);
  }
  finish(name: View | 'cables' | 'ice-shield') {
    const group = new THREE.Group(); group.name = name;
    for (const [material, geometries] of this.batches) {
      const normalized = geometries.map(g => g.index ? g.toNonIndexed() : g);
      const merged = mergeGeometries(normalized, false);
      if (!merged) throw new Error(`Unable to merge ${name}`);
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.part = name;
      group.add(mesh); normalized.forEach(g => g.dispose()); geometries.forEach(g => g.dispose());
    }
    return group;
  }
}

// Reconstruction references: the public art-book plates reproduced by Beijing
// Daily on 2023-02-04. Keep the broad silhouette grounded in those plates:
// three launch pylons, a shallow chamfered cabin with four independent grippers,
// unbraced cable bundles and an open orbital ring with a long lower spindle.
export const DIMENSIONS = { groundRadius: 1000, groundCenter: -1003, terminal: 350, journeyStart: 100, journeySpan: 150 };

function surfaceMaps() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#dedfdd';ctx.fillRect(0,0,1024,1024);
  let seed=141;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Paint has fine wear, not another layer of panels. Joints and fasteners
  // belong to the geometry so large panels remain legible at a distance.
  for(let i=0;i<90;i++){
    const x=rand()*1024,y=rand()*1024,r=18+rand()*90;
    const stain=ctx.createRadialGradient(x,y,0,x,y,r);
    stain.addColorStop(0,'#24312b09');stain.addColorStop(1,'#24312b00');
    ctx.fillStyle=stain;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<38000;i++){ctx.fillStyle=rand()>.5?'#ffffff0a':'#25312b07';ctx.fillRect(rand()*1024,rand()*1024,rand()*2+1,1);}
  for(let i=0;i<160;i++){ctx.fillStyle='#3d484110';ctx.fillRect(rand()*1024,rand()*1024,.65,2+rand()*12);}
  const texture=(source:HTMLCanvasElement)=>{
    const t=new THREE.CanvasTexture(source);t.anisotropy=8;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
  };
  const map=texture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const bumpCanvas=document.createElement('canvas');bumpCanvas.width=bumpCanvas.height=512;
  const bc=bumpCanvas.getContext('2d')!;bc.fillStyle='#808080';bc.fillRect(0,0,512,512);
  for(let i=0;i<16000;i++){const v=119+Math.floor(rand()*18);bc.fillStyle=`rgb(${v},${v},${v})`;bc.fillRect(rand()*512,rand()*512,1,1);}
  const bump=texture(bumpCanvas);
  const roughCanvas=document.createElement('canvas');roughCanvas.width=roughCanvas.height=1024;
  const rc=roughCanvas.getContext('2d')!;rc.fillStyle='#cecece';rc.fillRect(0,0,1024,1024);
  for(let i=0;i<12000;i++){const v=190+Math.floor(rand()*30);rc.fillStyle=`rgb(${v},${v},${v})`;rc.fillRect(rand()*1024,rand()*1024,1+rand()*12,1+rand()*3);}
  const roughness=texture(roughCanvas);
  return {map,bump,roughness};
}
function surfaceUV(geometry:THREE.BufferGeometry) {
  const g=geometry.index?geometry.toNonIndexed():geometry;
  if(g!==geometry)geometry.dispose();
  g.computeVertexNormals();
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv:number[]=[];
  for(let i=0;i<p.count;i++){
    const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
    if(ay>=ax&&ay>=az)uv.push(p.getX(i)/6,p.getZ(i)/6);
    else if(ax>=az)uv.push(p.getZ(i)/6,p.getY(i)/6);
    else uv.push(p.getX(i)/6,p.getY(i)/6);
  }
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
}
function panelPaint() {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const c=canvas.getContext('2d')!;c.fillStyle='#dedfdd';c.fillRect(0,0,1024,256);
  const metalCanvas=document.createElement('canvas');metalCanvas.width=1024;metalCanvas.height=256;
  const mc=metalCanvas.getContext('2d')!;mc.fillStyle='#383838';mc.fillRect(0,0,1024,256);
  let seed=867;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Localized handling wear at real hatch edges. No panel grid or fake bolts.
  for(let i=0;i<190;i++){
    const edge=i%4,along=random(),distance=1+Math.pow(random(),3)*9;
    const x=edge<2?along*1024:edge===2?distance:1024-distance;
    const y=edge<2?(edge===0?distance:256-distance):along*256;
    const w=edge<2?1+random()*7:.6+random()*1.4,h=edge<2?.6+random()*1.4:1+random()*5;
    c.fillStyle=i%5?'#66726d36':'#4d5d5580';c.fillRect(x,y,w,h);
    mc.fillStyle='#a3a3a3';mc.fillRect(x,y,w,h);
  }
  for(let i=0;i<3500;i++){
    c.fillStyle=i%2?'#ffffff08':'#24322d06';c.fillRect(random()*1024,random()*256,1,1);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const metalness=new THREE.CanvasTexture(metalCanvas);metalness.anisotropy=8;
  return {map,metalness};
}
function chamferedBox(w:number,h:number,d:number,cut:number,bore=0,boreZ=0) {
  const shape=new THREE.Shape();const x=w/2,z=d/2,c=Math.min(cut,x*.7,z*.7);
  shape.moveTo(-x+c,-z);shape.lineTo(x-c,-z);shape.lineTo(x,-z+c);shape.lineTo(x,z-c);shape.lineTo(x-c,z);shape.lineTo(-x+c,z);shape.lineTo(-x,z-c);shape.lineTo(-x,-z+c);shape.closePath();
  const bevel=Math.min(.12,Math.min(w,h,d)*.075);
  if(bore){
    // Extrusion bevels shrink holes: keep the requested radius at the lip.
    const hole=new THREE.Path();hole.absarc(0,-boreZ,bore+bevel,0,Math.PI*2,true);shape.holes.push(hole);
  }
  const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1});g.rotateX(-Math.PI/2);g.translate(0,-h/2,0);return surfaceUV(g);
}
function loft(w:number,d:number,levels:{y:number;scale:number}[],cut=1) {
  const outline=[[-w/2+cut,-d/2],[w/2-cut,-d/2],[w/2,-d/2+cut],[w/2,d/2-cut],[w/2-cut,d/2],[-w/2+cut,d/2],[-w/2,d/2-cut],[-w/2,-d/2+cut]];
  const positions:number[]=[],indices:number[]=[];
  levels.forEach(l=>outline.forEach(([x,z])=>positions.push(x*l.scale,l.y,z*l.scale)));
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<8;i++){const a=j*8+i,b=j*8+(i+1)%8,c=b+8,e=a+8;indices.push(a,e,b,b,e,c);}
  for(let i=1;i<7;i++){indices.push(0,i,(i+1));const off=(levels.length-1)*8;indices.push(off,off+i+1,off+i);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);return surfaceUV(geo);
}
function plate(b:Builder,w:number,h:number,d:number,at:V3,mat:THREE.Material,cut=.4,rotation:V3=[0,0,0]){b.add(chamferedBox(w,h,d,cut),mat,at,rotation);}
function decal(text:string,width:number,height:number,color='#29312c') {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 112px Arial';ctx.fillText(text,512,140);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}));
}
function annulus(b:Builder,inner:number,outer:number,y:number,thickness:number,mat:THREE.Material,segments=64){
  const shape=new THREE.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
  const g=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:segments/4,steps:1});g.rotateX(-Math.PI/2);b.add(g,mat,[0,y,0]);
}
export function buildElevator() {
  const maps=surfaceMaps();
  const hull=new THREE.MeshStandardMaterial({color:0xe0e2df,map:maps.map,bumpMap:maps.bump,bumpScale:.012,roughnessMap:maps.roughness,metalness:.16,roughness:.9});
  const lightHull=new THREE.MeshStandardMaterial({color:0xcdd3d0,map:maps.map,roughnessMap:maps.roughness,metalness:.24,roughness:.83});
  const wear=panelPaint(),hatchPaint=lightHull.clone();
  hatchPaint.map=wear.map;hatchPaint.metalness=.85;hatchPaint.metalnessMap=wear.metalness;
  const dark=new THREE.MeshStandardMaterial({color:0x28332f,metalness:.73,roughness:.49});
  const truss=new THREE.MeshStandardMaterial({color:0x687675,metalness:.8,roughness:.44});
  const black=new THREE.MeshStandardMaterial({color:0x111b1d,map:maps.map,metalness:.48,roughness:.73});
  const brass=new THREE.MeshStandardMaterial({color:0x9b8050,metalness:.7,roughness:.48});
  const glass=new THREE.MeshStandardMaterial({color:0x14262b,metalness:.95,roughness:.21});
  const light=new THREE.MeshBasicMaterial({color:0xffcc8c});
  const blue=new THREE.MeshBasicMaterial({color:0xb4d8dc});
  const warning=new THREE.MeshStandardMaterial({color:0xd2ad5a,roughness:.6,metalness:.2});
  const slab=new THREE.MeshStandardMaterial({color:0x4b5550,roughness:.98,metalness:.05});
  const materials={hull,lightHull,dark,truss,black,brass,glass,light,blue,warning,slab};

  // Broad circular launch harbor, not a small pedestal.
  const base=new Builder();
  annulus(base,15,48,-1.6,3.5,dark);annulus(base,18,47,2,.45,slab);
  annulus(base,19,30,3,.35,hull);
  for(const [r,tube,material] of [[46.2,.24,truss],[43.4,.09,warning]] as const)for(let i=0;i<128;i++){
    const a=i*Math.PI/64,next=a+Math.PI/64,mid=(a+next)/2;
    if(crossesHarborRoad(Math.cos(mid)*r,Math.sin(mid)*r,tube,r*Math.PI/128+tube,mid))continue;
    base.beam([Math.cos(a)*r,2.6,Math.sin(a)*r],[Math.cos(next)*r,2.6,Math.sin(next)*r],tube,material);
  }
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,c=Math.cos(a),s=Math.sin(a);
    if(crossesHarborRoad(c*46.3,s*46.3,1.5,2.5,a))continue;
    base.box([3,1.8,5],[c*46.3,2,s*46.3],dark,[0,-a,0]);base.box([.2,.4,.2],[c*46.5,3.5,s*46.5],light);
  }
  for(let i=0;i<3;i++){
    const tower=BASE_TOWERS[i],a=tower.angle,c=Math.cos(a),s=Math.sin(a),[x,,z]=tower.at(0,0),rotation=tower.rotation;
    // Three straight, very tall guide pylons separated by open air.
    plate(base,8,66,8,tower.at(0,36),dark,.6,rotation);
    for(const dx of [-1,1]){
      base.box([1.6,63,8.4],tower.at(dx*3.25,36),hull,rotation);
      base.box([.3,61,.35],tower.at(dx*3.5,36,4.4),lightHull,rotation);
      base.box([.22,62,.3],tower.at(dx*1.75,36,4.3),truss,rotation);
      base.box([1.1,62,.5],tower.at(dx*3.25,36,-4.25),hull,rotation);
    }
    for(let j=0;j<14;j++){
      const y=5+j*4.5;
      base.box([4.1,.22,.45],tower.at(0,y,4.35),truss,rotation);
      base.beam(tower.at(-1.7,y,4.4),tower.at(1.7,y+4.5,4.4),.065,truss);
      base.box([8.7,.24,8.7],tower.at(0,y),truss,rotation);
      if(j%5===0){base.box([2.6,.09,.5],tower.at(0,y+.3,4.6),light,rotation);base.box([.65,1.6,.55],tower.at(4.25,y+1),brass,rotation);}
    }
    for(let k=0;k<3;k++)base.cylinder(.4,.4,65,tower.at(-2+k*2,35,-4.6),truss,8);
    base.box([10,1,10],tower.at(0,69.5),dark,rotation);base.box([9.5,.4,9.5],tower.at(0,70.25),hull,rotation);
    for(const guide of CABLE_GUIDES.filter(g=>g.tower===i)){
      base.box([1.75,1.2,2.1],tower.at(guide.tangent,71),dark,rotation);
      base.box([1.8,.16,2.2],tower.at(guide.tangent,71.68),truss,rotation);
      for(let j=-2;j<=2;j++)base.add(new THREE.TorusGeometry(j===0?.155:.085,j===0?.015:.02,6,16),truss,
        tower.at(guide.tangent+guide.strandDirection*j*.31,71.8),[Math.PI/2,0,0]);
    }
    // Broad radial wedge feet, with separate pale cheek plates and a dark
    // service channel between them. Their upper ends meet the transfer ring.
    for(const side of [-1,1]){
      const profile=new THREE.Shape();
      profile.moveTo(-3,3);profile.lineTo(15,3);profile.lineTo(4,26.2);profile.lineTo(-3,26.2);profile.closePath();
      const foot=new THREE.ExtrudeGeometry(profile,{depth:2.9,bevelEnabled:false});
      foot.translate(0,0,-1.45);
      base.add(foot,dark,[x-s*side*2.75,0,z+c*side*2.75],[0,-a,0]);
      const skin=new THREE.ExtrudeGeometry(profile,{depth:.36,bevelEnabled:false});
      skin.translate(0,0,-.18);
      base.add(skin,hull,[x-s*side*4.25,0,z+c*side*4.25],[0,-a,0]);
      base.girder([c*40-s*side*4.4,3,s*40+c*side*4.4],[c*30-s*side*4.4,25,s*30+c*side*4.4],.6,.55,lightHull);
      base.box([8,1.25,8],[c*38-s*side*2.5,3,s*38+c*side*2.5],dark,[0,-a,0]);
    }
    for(const da of [-.2,.2]){
      const ex=Math.cos(a+da)*76,ez=Math.sin(a+da)*76;
      base.beam([x,64,z],[ex,1,ez],.085,truss);base.beam([x,27,z],[ex,1,ez],.1,truss);
      base.box([3,1.5,5],[ex,.4,ez],dark,[0,-a,0]);
    }
    // Causeway and outer landing share one continuous surface in detailBase.
    for(let j=0;j<7;j++){
      const da=a+.15+j*.065,r=57+(j%2)*7;
      const height=2.5+j%3;
      base.box([4+(j%2)*3,height,3.15],[Math.cos(da)*r,1+height/2,Math.sin(da)*r],hull,[0,-da,0]);
      base.box([3,.3,2.9],[Math.cos(da)*r,1+height+.18,Math.sin(da)*r],dark,[0,-da,0]);
    }
  }
  annulus(base,22,30,25.5,.65,dark);
  for(const r of [22.2,29.8])for(const y of [22.3,25.5])base.ring(r,.32,y,truss,96);
  base.ring(29.8,.085,26.2,lightHull,96);
  // Multi-level launch gantry floor, gantry stairs and access bridges.
  for(let i=0;i<36;i++){
    const a=i*Math.PI/18,next=a+Math.PI/18;
    for(const r of [22.2,29.8]){
      base.girder([Math.cos(a)*r,22.3,Math.sin(a)*r],[Math.cos(next)*r,25.5,Math.sin(next)*r],.22,.26,truss);
      base.girder([Math.cos(a)*r,22.3,Math.sin(a)*r],[Math.cos(a)*r,25.5,Math.sin(a)*r],.27,.32,dark);
    }
    base.girder([Math.cos(a)*22,22.3,Math.sin(a)*22],[Math.cos(a)*30,22.3,Math.sin(a)*30],.28,.38,dark);
    base.box([2,.18,3],[Math.cos(a)*34,3.6,Math.sin(a)*34],truss,[0,-a,0]);
  }
  for(const x of [-36,36]){
    base.box([7,7,12],[x,5,8],hull);base.box([7.3,.3,12.3],[x,8.7,8],dark);
    base.box([5,1.3,.05],[x,6,14.1],glass);
    for(let i=0;i<8;i++)base.box([1.5,.25,1.2],[x-4,1+i*.8,12-i*.8],truss);
  }
  for(let i=0;i<48;i++){
    const a=i*Math.PI/24,rad=37+(i%3)*2,x=Math.cos(a)*rad,z=Math.sin(a)*rad;
    plate(base,2.5+(i%2)*1.3,1.2+(i%4)*.25,3.8,[x,3.4,z],i%3?hull:dark,.15);
    for(let j=0;j<4;j++)base.box([.22,.15,2.9],[x-.8+j*.55,4.5+(i%4)*.25,z],truss);
    if(i%4===0){
      base.beam([x,4,z],[x,12,z],.16,brass);base.beam([x,12,z],[x+5,12,z],.12,brass);
      base.beam([x,8,z],[x+4,12,z],.09,truss);base.beam([x+4,12,z],[x+4,6,z],.025,truss);
    }
  }
  detailBase(base,materials);
  const baseGroup=base.finish('base');
  const baseSign=decal('UEG  /  GABON',17,2.1,'#d1d1b9');baseSign.position.set(0,2.4,47);baseGroup.add(baseSign);

  // Long, parallel cable bundles. There are deliberately no tower-like cross
  // floors or diagonal braces between the cable pairs in the free span.
  const cables=new Builder();
  const {x:guideX,z:guideZ}=GUIDE_SPACING;
  for(const run of cableRoutes(DIMENSIONS.terminal)){
    const material=run.strand===0?black:truss;
    // Vertical end tangents keep both transfers continuous with the free span.
    for(const [start,end] of [[run.base,run.lower],[run.upper,run.entry]]){
      const height=end[1]-start[1];
      const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(...start),
        new THREE.Vector3(start[0],start[1]+height/3,start[2]),
        new THREE.Vector3(end[0],end[1]-height/3,end[2]),new THREE.Vector3(...end));
      cables.add(new THREE.TubeGeometry(curve,24,run.radius,8,false),material);
    }
    for(const [start,end] of [[run.lower,run.upper],[run.entry,run.top]])
      cables.add(new THREE.CylinderGeometry(run.radius,run.radius,end[1]-start[1],8,1,true),
        material,[start[0],(start[1]+end[1])/2,start[2]]);
  }
  const cableGroup=cables.finish('cables');

  // Shallow, chamfered main cabin, dark suction roof, four large independent
  // gripper pods. Proportions derive from the art-book cabin plate (04).
  const car=new Builder();
  car.add(loft(23.8,17.4,[{y:-3,scale:.88},{y:-2.1,scale:1},{y:1.35,scale:1},{y:3.8,scale:.83}],1.7),hull);
  car.add(loft(24,17.6,[{y:-3.7,scale:.82},{y:-3,scale:.97}],1.8),dark);
  plate(car,18.8,.5,12.8,[0,4,0],black,.9);
  plate(car,17.8,.14,11.8,[0,4.34,0],dark,.55);
  car.box([.1,.06,11.5],[0,4.44,0],truss);
  for(const x of [-10.3,10.3]){
    car.box([1.1,.36,13.3],[x,3.66,0],lightHull);
    for(const z of [-5.6,5.6])plate(car,1.4,.25,1.1,[x,3.91,z],truss,.12);
  }
  // Long panel joints follow each flat shoulder rather than smoothing the
  // folded metal into a curved aerodynamic shell.
  for(const z of [-1,1])for(const x of [-9.5,-6.4,-3.3,3.3,6.4,9.5]){
    car.beam([x,1.39,z*8.73],[x,3.85,z*7.24],.018,truss);
    car.box([.20,.06,.13],[x,3.9,z*7.16],dark);
  }
  for(const x of [-1,1])for(const z of [-5.6,-2.8,0,2.8,5.6]){
    car.beam([x*11.94,1.39,z],[x*9.92,3.85,z],.018,truss);
  }
  // Fine, low window band and layered hatches instead of a large glass facade.
  for(const z of [-1,1]){
    car.box([21.2,.43,.075],[0,.55,z*8.73],lightHull);
    for(const center of [-6.6,0,6.6])for(let i=0;i<5;i++){
      car.box([.42,.25,.095],[center-1.2+i*.6,.61,z*8.81],glass);
      car.box([.49,.035,.11],[center-1.2+i*.6,.77,z*8.82],lightHull);
    }
    car.box([20.8,.10,.09],[0,-1.9,z*8.75],truss);
    for(const x of [-6.6,0,6.6]){
      plate(car,6.34,1.75,.11,[x,-.78,z*8.79],dark,.1);
      car.box([5.97,1.43,.07],[x,-.78,z*8.87],hatchPaint);
      for(const y of [-1.61,.05])car.box([6.34,.1,.11],[x,y,z*8.93],hull);
      for(const dx of [-3.1,3.1])car.box([.1,1.67,.11],[x+dx,-.78,z*8.93],hull);
      car.box([5.82,.075,.09],[x,-1.45,z*8.94],truss);
      for(const dx of [-2.8,2.8])for(const y of [-1.47,-.06])car.box([.13,.065,.17],[x+dx,y,z*8.89],dark);
    }
    for(const x of [-9.9,-3.3,3.3,9.9]){
      car.box([.14,3.2,.22],[x,-.1,z*8.87],lightHull);
      for(const y of [-1.6,.15])car.box([.26,.13,.26],[x,y,z*8.91],truss);
    }
    car.box([18,.06,.12],[0,-2.22,z*8.55],lightHull);
    for(const x of [-10.5,10.5])car.box([.7,.19,.17],[x,-1.9,z*8.59],light);
  }
  for(const x of [-1,1]){
    for(const z of [-4.5,4.5]){
      car.box([.1,.5,2.8],[x*11.97,.7,z],dark);
      for(let j=0;j<4;j++)car.box([.11,.24,.4],[x*12.04,.7,z-.9+j*.6],glass);
    }
    plate(car,.12,2.4,3.3,[x*11.91,-.9,0],hull,.3);
    car.box([.23,.4,.12],[x*12.02,-.4,1],dark);
    for(const z of [-4.5,4.5])for(let j=0;j<9;j++)car.box([.12,.07,2.7],[x*12.02,-1.65+j*.12,z],black);
  }
  for(const x of [-1,1])for(const z of [-1,1]){
    const px=x*guideX,pz=z*guideZ;
    // Open upper/lower fork: no solid block across the actuator opening.
    for(const y of [-1.9,1.8])for(const dz of [-.48,.48]){
      const root:V3=[x*9.6,y,z*7.3+dz],tip:V3=[px-x*1.92,y-.15,pz+dz];
      car.girder(root,tip,.32,.25,dark);
      car.add(new THREE.CylinderGeometry(.31,.31,.25,16),truss,tip,[Math.PI/2,0,0]);
    }
    car.beam([x*10,-1.5,z*7.6],[px-x*1.96,1.55,pz],.17,truss);
    car.beam([x*10.3,1.4,z*7.7],[px-x*2.22,-.65,pz],.24,dark);
    car.beam([px-x*2.22,-.65,pz],[px-x*1.96,-1.65,pz],.11,brass);
    // The long pod runs outward along Z: guide at the inner end, radiator at
    // the outer end. Its offset shell retains a bore on the unchanged cable.
    const guidePlate=(w:number,h:number,d:number,y:number,mat:THREE.Material,cut:number)=>
      car.add(chamferedBox(w,h,d,cut,.78,-z*1.2),mat,[px,y,pz+z*1.2]);
    guidePlate(4.1,5.7,6.4,0,hull,.65);
    // Narrow outer end carries the long removable hatch.
    for(const dx of [-1.61,1.61])plate(car,.60,5.55,.7,[px+dx,0,pz+z*4.50],lightHull,.16);
    for(const y of [-2.48,2.48])plate(car,2.92,.62,.7,[px,y,pz+z*4.50],lightHull,.16);
    guidePlate(4.18,.45,6.5,3.08,dark,.6);
    // One continuous cap rests on the body; there is no diagonal fan apron.
    const apronOutline=[[-2.15,-1.575],[-1.60,-2.125],[1.60,-2.125],[2.15,-1.575],
      [2.15,3.975],[1.60,4.525],[-1.60,4.525],[-2.15,3.975]];
    const apron=new THREE.Shape();
    apronOutline.forEach(([xx,zz],i)=>i?apron.lineTo(x*xx,-z*zz):apron.moveTo(x*xx,-z*zz));apron.closePath();
    const bore=new THREE.Path();bore.absarc(0,0,.78,0,Math.PI*2,true);apron.holes.push(bore);
    const deck=new THREE.ExtrudeGeometry(apron,{depth:.13,bevelEnabled:false,curveSegments:16});
    deck.rotateX(-Math.PI/2);car.add(surfaceUV(deck),lightHull,[px,3.315,pz]);
    guidePlate(4.25,.35,6.6,-3.05,dark,.6);
    // True sleeve through the cap and pod; five strands never enter a solid
    // cylinder. The collar is built in detailClimber on the same guide axis.
    const sleeve=new THREE.LatheGeometry([
      new THREE.Vector2(.78,3.39),new THREE.Vector2(.91,3.39),
      new THREE.Vector2(.91,5.83),new THREE.Vector2(.78,5.83),new THREE.Vector2(.78,3.39)
    ],40);
    car.add(sleeve,dark,[px,0,pz]);
    // Two bands of removable metal sectors, with narrow exposed sleeve seams.
    for(const [low,high,radius] of [[3.57,4.25,1.04],[4.30,5.59,.98]]){
      for(let sector=0;sector<4;sector++){
        const skin=new THREE.LatheGeometry([
          new THREE.Vector2(.9,low),new THREE.Vector2(radius,low),
          new THREE.Vector2(radius,high-.08),new THREE.Vector2(radius-.06,high),
          new THREE.Vector2(.9,high),new THREE.Vector2(.9,low)
        ],12,sector*Math.PI/2+.035,Math.PI/2-.07);
        car.add(skin,truss,[px,0,pz]);
      }
    }
    // Rail pressure rollers, piston rods, braces and service panels.
    for(const a of [-1,1]){
      // Bent side cheek stays behind the outward fan. Its foot and upper
      // saddle share actual faces with the deck and sleeve, respectively.
      const brace=new THREE.Shape();
      brace.moveTo(a*1.22,3.45);brace.lineTo(a*1.94,3.45);
      brace.lineTo(a*1.94,3.77);brace.lineTo(a*1.48,4.08);
      brace.lineTo(a*.95,5.35);brace.lineTo(a*.78,5.35);
      brace.lineTo(a*.78,4.73);brace.lineTo(a*1.20,3.87);brace.closePath();
      const rib=new THREE.ExtrudeGeometry(brace,{depth:.22,bevelEnabled:false});
      rib.translate(0,0,-.11);car.add(surfaceUV(rib),brass,[px,0,pz-z*.40]);
      car.girder([px+a*1.78,3.7,pz-z*.40],[px+a*1.38,4.06,pz-z*.40],.12,.26,truss);
      car.girder([px+a*1.38,4.06,pz-z*.40],[px+a*.91,5.23,pz-z*.40],.10,.26,truss);
      car.box([.72,.14,.58],[px+a*1.59,3.48,pz-z*.40],dark);
      car.add(new THREE.CylinderGeometry(.14,.14,.3,12),dark,[px+a*.93,5.08,pz-z*.40],[Math.PI/2,0,0]);
      car.beam([px+a*1.8,-2.2,pz-1.5],[px+a*1.8,2.6,pz-1.5],.13,truss);
      car.box([.20,7.3,.40],[px+a*1.85,-.9,pz-1.5],brass);
      car.cylinder(.27,.27,.5,[px+a*1.8,3.1,pz-1.5],black,10);
      car.box([.20,1.1,.20],[px+a*1.85,2.4,pz+z*4.25],lightHull);
    }
    car.box([2.85,4.15,.11],[px,.02,pz+z*4.60],dark);
    const hatch=new THREE.Shape();
    hatch.moveTo(-.86,1.72);hatch.lineTo(.86,1.72);hatch.lineTo(.98,1.56);
    hatch.lineTo(.98,-1.16);hatch.lineTo(.76,-1.68);hatch.lineTo(-.76,-1.68);
    hatch.lineTo(-.98,-1.16);hatch.lineTo(-.98,1.56);hatch.closePath();
    const hatchSkin=new THREE.ExtrudeGeometry(hatch,{depth:.15,bevelEnabled:true,bevelSize:.045,bevelThickness:.035,bevelSegments:1});
    hatchSkin.translate(0,0,-.075);car.add(surfaceUV(hatchSkin),hull,[px,.05,pz+z*4.73]);
    for(const a of [-1,1])car.beam([px+a*.97,-1.11,pz+z*4.86],[px+a*.74,-1.61,pz+z*4.86],.045,truss);
    car.box([1.35,.32,.14],[px,1.42,pz+z*4.87],truss);
    car.box([.2,1.25,.19],[px+x*1.23,-.6,pz+z*4.80],truss);
    for(const dx of [-1.18,1.18]){
      car.beam([px+dx,-1.8,pz+z*4.82],[px+dx,1.75,pz+z*4.82],.045,truss);
      for(const yy of [-1.5,1.3])car.box([.27,.16,.2],[px+dx,yy,pz+z*4.90],dark);
    }
    for(let j=0;j<9;j++)car.box([.1,.2,.11],[px-1.35+j*.3375,-2.2,pz+z*4.93],j%2?black:warning,[0,0,.3]);
    // Long-side well: an inner access cover and an outer pressure case.
    // Dark paint is confined to the narrow service gaps between equipment.
    car.box([.08,4.35,4.90],[px+x*2.15,-.03,pz+z*1.2],black);
    plate(car,.14,3.65,1.91,[px+x*2.23,-.04,pz-z*.08],hull,.14);
    for(const yy of [-1.64,1.53]){
      car.box([.20,.15,1.97],[px+x*2.27,yy,pz-z*.08],truss);
      for(const zz of [-.81,.64])
        car.box([.14,.22,.13],[px+x*2.39,yy,pz+z*zz],dark);
    }
    // The pressure case has a clipped vertical outline and real thickness.
    // Extrusion maps local horizontal coordinates to the pod's outward Z.
    const caseOutline=new THREE.Shape();
    caseOutline.moveTo(-.60,-1.64);caseOutline.lineTo(.60,-1.64);
    caseOutline.lineTo(.82,-1.43);caseOutline.lineTo(.82,1.35);
    caseOutline.lineTo(.65,1.58);caseOutline.lineTo(-.65,1.58);
    caseOutline.lineTo(-.82,1.35);caseOutline.lineTo(-.82,-1.43);caseOutline.closePath();
    const caseSkin=new THREE.ExtrudeGeometry(caseOutline,{
      depth:.38,bevelEnabled:true,bevelSize:.045,bevelThickness:.03,bevelSegments:2
    });
    caseSkin.translate(0,0,-.19);caseSkin.rotateY(x*Math.PI/2);
    car.add(surfaceUV(caseSkin),lightHull,[px+x*2.37,-.03,pz+z*2.32]);
    for(const yy of [-1.90,1.75]){
      car.box([.29,.39,1.97],[px+x*2.30,yy,pz+z*2.32],dark);
      car.box([.22,.18,1.78],[px+x*2.49,yy,pz+z*2.32],truss);
      for(const zz of [1.67,2.97])
        car.box([.18,.29,.23],[px+x*2.57,yy,pz+z*zz],hull);
    }
    // Side rods terminate in brackets seated on the backing, not in space.
    for(const zz of [1.09,3.43]){
      car.beam([px+x*2.35,-1.94,pz+z*zz],[px+x*2.35,1.90,pz+z*zz],.055,truss);
      for(const yy of [-1.81,1.62])
        car.box([.24,.18,.21],[px+x*2.28,yy,pz+z*zz],truss);
    }
    for(const dz of [-2.53,2.53])car.box([.36,4.78,.22],[px+x*2.16,-.03,pz+z*1.2+dz],lightHull);
    for(const yy of [-2.3,2.3])car.box([.36,.24,4.9],[px+x*2.16,yy,pz+z*1.2],lightHull);
    // Lower metallic guide fins are a distinctive silhouette in the reference.
    const finOutline=new THREE.Shape();
    finOutline.moveTo(-1.75,-3.05);finOutline.lineTo(1.75,-3.05);finOutline.lineTo(1.75,-6.55);
    finOutline.lineTo(1.18,-7.15);finOutline.lineTo(-1.18,-7.15);finOutline.lineTo(-1.75,-6.55);finOutline.closePath();
    const fin=new THREE.ExtrudeGeometry(finOutline,{depth:.38,bevelEnabled:false});
    fin.translate(0,0,-.19);car.add(surfaceUV(fin),truss,[px+x*1.0,0,pz+z*1.6],[0,Math.PI/2,0]);
    for(const dz of [-1.4,-.7,0,.7,1.4])car.box([.49,3.55,.1],[px+x*1.0,-4.97,pz+z*1.6+dz],dark);
    car.beam([px+x*1.0,-2.92,pz+z*3.96],[px+x*1.0,-6.4,pz+z*2.48],.095,truss);
    car.box([.58,.22,3.65],[px+x*1.0,-3.24,pz+z*1.6],dark);
    car.box([.65,.14,.33],[px,2.72,pz+z*4.90],light);
  }
  // Underside heat-shield frame: layered machinery, diagonal members and nozzles.
  for(let i=0;i<7;i++){
    const x=-9+i*3;
    car.beam([x,-3.7,-6.5],[x,-4.8,6.5],.12,truss);
    car.beam([x,-4.8,-6.5],[x+2.5,-3.7,6.5],.10,truss);
    car.box([1.8,.6,9],[x,-3.9,0],black);
  }
  car.box([18,.22,.3],[0,-5.1,-6.5],truss);car.box([18,.22,.3],[0,-5.1,6.5],truss);
  for(const x of [-8,-4,4,8])for(const z of [-4.5,4.5]){
    car.cylinder(.48,.9,1.2,[x,-4.7,z],dark,16);car.cylinder(.63,.86,.3,[x,-5.4,z],truss,16);car.cylinder(.58,.72,.12,[x,-5.58,z],black,16);
  }
  detailClimber(car,materials);
  const climber=car.finish('climber');
  for(const z of [-1,1]){
    const sign=decal('SEV–03',2.2,.55);sign.position.set(-6,-.65,z*8.98);if(z<0)sign.rotation.y=Math.PI;climber.add(sign);
    const num=decal('UEG / GABON',2.3,.32);num.position.set(6,-1.25,z*8.98);if(z<0)num.rotation.y=Math.PI;climber.add(num);
  }
  // Four hinged cooling/ice-shield wings, based on the published exploded view.
  // Linkage dimensions and the opening angle are adapted for this exhibit.
  const iceShield=new THREE.Group();iceShield.name='ice-shield';climber.add(iceShield);
  const shieldAssembly=new THREE.Group();iceShield.add(shieldAssembly);
  const mount=new Builder(),liftRods:THREE.Mesh[]=[];
  // Wide, open mounting spider above the independent dark cooling tray.
  // The chamfers leave room for the vehicle's inboard underside nozzles.
  const mountOutline=[[-3.6,-3.7],[3.6,-3.7],[4.9,-2.4],[4.9,2.4],
    [3.6,3.7],[-3.6,3.7],[-4.9,2.4],[-4.9,-2.4]];
  const mountFrame=new THREE.Shape(),mountOpening=new THREE.Path();
  mountOutline.forEach(([x,z],i)=>i?mountFrame.lineTo(x,-z):mountFrame.moveTo(x,-z));
  mountFrame.closePath();
  [...mountOutline].reverse().forEach(([x,z],i)=>{
    const ix=x-Math.sign(x)*.44,iz=z-Math.sign(z)*.44;
    if(i)mountOpening.lineTo(ix,-iz);else mountOpening.moveTo(ix,-iz);
  });
  mountOpening.closePath();mountFrame.holes.push(mountOpening);
  const mountGeometry=new THREE.ExtrudeGeometry(mountFrame,{depth:.28,bevelEnabled:false});
  mountGeometry.rotateX(-Math.PI/2);mount.add(surfaceUV(mountGeometry),lightHull,[0,-5.01,0]);
  annulus(mount,1.8,2.5,-5.01,.28,lightHull,48);
  for(let i=0;i<mountOutline.length;i++){
    const p=mountOutline[i],q=mountOutline[(i+1)%mountOutline.length];
    for(const t of [.18,.82]){
      const x=THREE.MathUtils.lerp(p[0],q[0],t),z=THREE.MathUtils.lerp(p[1],q[1],t);
      const length=Math.hypot(x,z),end:V3=[x*.96,-4.87,z*.96];
      mount.girder([x/length*2.36,-4.87,z/length*2.36],end,.28,.25,lightHull);
      // Short raised root straps remain attached to the rim and spoke.
      mount.girder([x*.82,-4.715,z*.82],end,.16,.08,truss);
    }
    const cx=(p[0]+q[0])*.5,cz=(p[1]+q[1])*.5;
    mount.box([i%2?.45:.72,.06,.24],[cx*.965,-4.70,cz*.965],truss,
      [0,-Math.atan2(q[1]-p[1],q[0]-p[0]),0]);
  }
  for(const x of [-4.2,4.2])for(const z of [-3.1,3.1]){
    mount.box([.7,.16,.7],[Math.sign(x)*3,-4.2,z],truss);
    mount.girder([Math.sign(x)*3,-4.2,z],[x,-4.96,z],.26,.3,truss);
    mount.girder([x,-4.87,z],[x*.4,-4.87,z*.4],.32,.3,lightHull);
    mount.box([.66,.3,.66],[x,-4.87,z],lightHull);
    mount.cylinder(.29,.29,.55,[x,-5.1,z],dark,12);
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.85,10),truss);
    rod.position.set(x,-5.375,z);rod.castShadow=rod.receiveShadow=true;iceShield.add(rod);liftRods.push(rod);
  }
  iceShield.add(mount.finish('ice-shield'));
  const shieldCore=new Builder();
  const rim:V3[]=[[-4.8,-5.8,-4.6],[4.8,-5.8,-4.6],[6.5,-5.8,-2.9],[6.5,-5.8,2.9],[4.8,-5.8,4.6],[-4.8,-5.8,4.6],[-6.5,-5.8,2.9],[-6.5,-5.8,-2.9]];
  for(let i=0;i<rim.length;i++){
    const p=rim[i],next=rim[(i+1)%rim.length];
    const dx=next[0]-p[0],dz=next[2]-p[2],length=Math.hypot(dx,dz);
    const rotation:V3=[0,-Math.atan2(dz,dx),0];
    const divisions=Math.ceil(length/2.4);
    // Thick, segmented edge rails around an open mechanical tray.
    for(let j=0;j<divisions;j++){
      const t=(j+.5)/divisions,x=p[0]+dx*t,z=p[2]+dz*t;
      shieldCore.box([length/divisions-.055,.66,.32],[x,-6.14,z],dark,rotation);
      shieldCore.box([length/divisions-.09,.075,.38],[x,-5.75,z],truss,rotation);
      shieldCore.box([length/divisions-.09,.08,.38],[x,-6.515,z],truss,rotation);
    }
    shieldCore.box([.3,.72,.3],[p[0],-6.1,p[2]],lightHull,rotation);
    const radius=Math.hypot(p[0],p[2]);
    const hub:V3=[p[0]/radius*2.48,-5.65,p[2]/radius*2.48];
    shieldCore.girder(hub,[p[0],-6.1,p[2]],.24,.28,dark);
    // Branches meet a radial member and the rim, rather than ending in air.
    const branch:V3=[THREE.MathUtils.lerp(hub[0],p[0],.53),
      THREE.MathUtils.lerp(hub[1],-6.1,.53),THREE.MathUtils.lerp(hub[2],p[2],.53)];
    shieldCore.girder(branch,[THREE.MathUtils.lerp(p[0],next[0],i%2?.63:.38),
      -6.1,THREE.MathUtils.lerp(p[2],next[2],i%2?.63:.38)],.15,.18,truss);
    // Chamfer equipment sits inboard of the four lift sleeves and nozzles.
    const bayInset=i%2?.31:.36;
    const x=(p[0]+next[0])*bayInset,z=(p[2]+next[2])*bayInset,a=Math.atan2(x,z);
    const local=(t:number,y:number,r:number):V3=>[x+Math.cos(a)*t+Math.sin(a)*r,y,z-Math.sin(a)*t+Math.cos(a)*r];
    // The long, side and chamfer bays carry different cooling assemblies.
    // All local pipes end in the centre manifold or a real equipment port.
    const longBay=i===0||i===4,sideBay=i===2||i===6;
    const bayWidth=longBay?3.25:sideBay?2.1:1.95;
    plate(shieldCore,bayWidth,.2,1.48,[x,-5.95,z],black,.15,[0,a,0]);
    const pumps=longBay?[[-1.04,.5],[.03,.35],[.89,.42]]:sideBay?[[-.3,.61]]:[[-.49,.42]];
    for(const [t,radius] of pumps){
      const at=local(t,-5.69,0);
      shieldCore.cylinder(radius,radius,.3,at,dark,20);
      shieldCore.add(new THREE.TorusGeometry(radius-.06,.04,5,24),truss,local(t,-5.52,0),[Math.PI/2,0,0]);
      shieldCore.cylinder(radius*.29,radius*.29,.12,local(t,-5.49,0),truss,12);
      const spokes=radius>.5?12:8;
      for(let j=0;j<spokes;j++){
        const b=j*Math.PI*2/spokes;
        shieldCore.beam(local(t+Math.cos(b)*radius*.34,-5.53,Math.sin(b)*radius*.34),
          local(t+Math.cos(b)*(radius-.1),-5.53,Math.sin(b)*(radius-.1)),.025,truss,4);
      }
      shieldCore.beam(local(t,-5.67,-radius*.8),local(t,-5.67,-radius-.15),.1,dark,8);
      const pipe=new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.sin(a)*2.5+Math.cos(a)*t*.45,-5.55,Math.cos(a)*2.5-Math.sin(a)*t*.45),
        new THREE.Vector3(...local(t*.75,-5.65,-1)),
        new THREE.Vector3(...local(t,-5.67,-radius-.1))
      ]);
      shieldCore.add(new THREE.TubeGeometry(pipe,12,.06,6,false),truss);
    }
    if(!longBay){
      const t=sideBay?.73:.48;
      plate(shieldCore,sideBay?.46:.62,.36,sideBay?1.12:1.52,local(t,-5.66,0),dark,.12,[0,a,0]);
      for(let j=0;j<5;j++)shieldCore.box([sideBay?.36:.52,.045,.07],local(t,-5.45,-.43+j*.21),truss,[0,a,0]);
      for(const r of [-.48,.48]){
        shieldCore.box([sideBay?.52:.68,.07,.12],local(t,-5.76,r),truss,[0,a,0]);
        shieldCore.beam(local(t,-5.65,r),local(t+.25,-5.65,r),.085,truss,8);
      }
      const pipe=new THREE.CatmullRomCurve3([
        new THREE.Vector3(...local(t+.2,-5.65,.48)),
        new THREE.Vector3(...local(t+.4,-5.64,sideBay?.76:.48)),
        new THREE.Vector3(...local(-.3,-5.67,sideBay?.77:.52)),
        new THREE.Vector3(...local(-.3,-5.67,.38))
      ]);
      shieldCore.add(new THREE.TubeGeometry(pipe,16,.045,6,false),truss);
    }
    for(const t of [-bayWidth*.34,bayWidth*.34]){
      shieldCore.girder(local(t,-6.03,-.72),local(t,-6.03,.85),.12,.15,truss);
      shieldCore.girder(local(0,-6.03,.78),local(t,-6.03,.78),.12,.15,dark);
    }
    shieldCore.girder([x,-5.95,z],[(p[0]+next[0])*.5,-5.95,(p[2]+next[2])*.5],.22,.24,dark);
    for(let j=0;j<5;j++)shieldCore.box([bayWidth-.22,.075,.07],local(0,-6.1,-.42+j*.21),truss,[0,a,0]);
  }
  annulus(shieldCore,1.75,2.65,-5.6,.28,dark,48);
  shieldCore.ring(2.4,.15,-5.85,truss,48);
  for(const x of [-4.2,4.2])for(const z of [-3.1,3.1]){
    plate(shieldCore,.88,.24,.8,[x,-5.89,z],truss,.12);
    shieldCore.cylinder(.3,.3,.22,[x,-5.77,z],dark,12);
    shieldCore.girder([x,-5.94,z],[Math.sign(x)*5.65,-5.94,Math.sign(z)*3.75],.25,.28,dark);
  }
  // Open lower cradle: the perimeter carries the four upper struts, while
  // two crossmembers retain the inboard brake anchors inside the opening.
  const cradle=new THREE.Shape(),opening=new THREE.Path();
  const cradleOutline=[[-2,-1.7],[2,-1.7],[2.6,-1.1],[2.6,1.1],[2,1.7],[-2,1.7],[-2.6,1.1],[-2.6,-1.1]];
  cradleOutline.forEach(([x,z],i)=>i?cradle.lineTo(x,z):cradle.moveTo(x,z));cradle.closePath();
  opening.moveTo(-1.75,-.9);opening.lineTo(-1.75,.9);opening.lineTo(1.75,.9);opening.lineTo(1.75,-.9);opening.closePath();
  cradle.holes.push(opening);
  const cradleGeometry=new THREE.ExtrudeGeometry(cradle,{depth:.48,bevelEnabled:true,bevelSize:.036,bevelThickness:.036,bevelSegments:2,steps:1});
  cradleGeometry.rotateX(-Math.PI/2);shieldCore.add(surfaceUV(cradleGeometry),dark,[0,-7.29,0]);
  for(const x of [-1.3,1.3])shieldCore.box([.24,.48,2],[x,-7.05,0],dark);
  for(const x of [-1.85,1.85]){
    shieldCore.girder([x,-5.48,-1.7],[x,-6.8,-1.4],.24,.3,truss);
    shieldCore.girder([x,-5.48,1.7],[x,-6.8,1.4],.24,.3,truss);
    shieldCore.box([.5,.6,2.7],[x,-7.38,0],truss);
    const cx=Math.sign(x)*2.19;
    plate(shieldCore,.5,.28,1.62,[cx,-6.64,0],black,.1);
    for(const z of [-.55,.55])shieldCore.box([.59,.08,.16],[cx,-6.7,z],truss);
    for(let j=0;j<6;j++)shieldCore.box([.39,.045,.07],[cx,-6.475,-.53+j*.21],truss);
    for(const z of [-.55,.55]){
      const pipe=new THREE.CatmullRomCurve3([
        new THREE.Vector3(cx,-6.55,z),new THREE.Vector3(cx,-6.38,z+Math.sign(z)*.25),
        new THREE.Vector3(x,-6.48,Math.sign(z)*1.3),new THREE.Vector3(x,-6.85,Math.sign(z)*1.4)
      ]);
      shieldCore.add(new THREE.TubeGeometry(pipe,10,.045,6,false),truss);
    }
  }
  const shieldWings:THREE.Group[]=[];
  // Hinges lie outside the octagonal tray. An inboard pivot would swing the
  // equipment through its rim before reaching the deployed state.
  const shieldHingeRadius=6.7;
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2;
    const pivot=new THREE.Group();pivot.position.set(Math.sin(a)*shieldHingeRadius,-7.2,Math.cos(a)*shieldHingeRadius);pivot.rotation.y=a;
    const wing=new Builder();
    const perimeter:V3[]=[[-1.15,0,.2],[1.15,0,.2],[3.25,0,4.7],[2.5,0,5.35],[-2.5,0,5.35],[-3.25,0,4.7]];
    // The open carrier sits behind the underside equipment, never over it.
    const carrier=new THREE.Shape();
    perimeter.forEach(([x,,z],j)=>j?carrier.lineTo(x*.91,-z):carrier.moveTo(x*.91,-z));
    carrier.closePath();
    for(const z of [.9,1.95,3,4.05])for(const side of [-1,1]){
      const halfWidth=(zz:number)=>(1.15+(zz-.2)/4.5*2.1)*.91-.16;
      const hole=new THREE.Path(),z0=z-.4,z1=z+.4;
      hole.moveTo(side*.12,-z0);hole.lineTo(side*halfWidth(z0),-z0);
      hole.lineTo(side*halfWidth(z1),-z1);hole.lineTo(side*.12,-z1);hole.closePath();
      carrier.holes.push(hole);
    }
    const skin=new THREE.ExtrudeGeometry(carrier,{depth:.10,bevelEnabled:false,steps:1});
    skin.rotateX(-Math.PI/2);wing.add(skin,dark,[0,.11,0]);
    for(let j=0;j<perimeter.length;j++)wing.girder(perimeter[j],perimeter[(j+1)%perimeter.length],.25,.3,lightHull);
    wing.girder([-1,0,.3],[2.8,0,4.8],.16,.22,truss);
    wing.girder([1,0,.3],[-2.8,0,4.8],.16,.22,truss);
    for(const z of [1.9,3.4,4.75]){
      const w=1.15+(z-.2)/4.5*2.1;
      wing.box([w*2,.2,.17],[0,-.12,z],dark);
      for(const s of [-1,1]){
        const width=.68+w*.22,cx=s*w*.55;
        wing.box([width,.27,1.04],[cx,-.19,z-.52],dark);
        for(let j=0;j<6;j++)wing.box([width-.13,.13,.065],[cx,-.38,z-.94+j*.16],truss);
        for(const offset of [-width*.43,width*.43]){
          wing.beam([cx+offset,-.3,z-1.05],[cx+offset,-.3,z+.05],.05,truss,6);
          wing.box([.12,.18,1.16],[cx+offset,-.07,z-.5],lightHull);
        }
      }
      wing.box([.55,.4,.85],[0,-.17,z-.48],truss);
    }
    for(const s of [-1,1]){
      const pipe=new THREE.CatmullRomCurve3([new THREE.Vector3(s*.3,-.48,.45),
        new THREE.Vector3(s*.4,-.48,1.4),new THREE.Vector3(s*1.1,-.48,2.4),
        new THREE.Vector3(s*1.55,-.48,3.7),new THREE.Vector3(s*1.55,-.48,4.85)]);
      wing.add(new THREE.TubeGeometry(pipe,20,.06,6,false),truss);
      for(const z of [1.25,2.7,4.12]){
        const w=(1.15+(z-.2)/4.5*2.1)*.83;
        wing.girder([s*.34,-.48,z],[s*w,-.48,z+.23],.08,.1,dark);
      }
    }
    wing.girder([-1.1,0,0],[1.1,0,0],.22,.25,dark);
    wing.girder([0,0,0],[0,0,.65],.25,.28,dark);
    for(const x of [-.9,.9]){
      wing.beam([x,.1,.25],[x,.5,2.2],.17,dark);
      wing.beam([x,.5,2.2],[x,.56,3.8],.085,truss);
      wing.add(new THREE.CylinderGeometry(.3,.3,.65,16),truss,[x,0,0],[0,0,Math.PI/2]);
    }
    // Outboard lower hinges allow the wings to tilt upward below the hull.
    shieldCore.girder([Math.sin(a)*3,-5.8,Math.cos(a)*3],[Math.sin(a)*shieldHingeRadius,-7.2,Math.cos(a)*shieldHingeRadius],.24,.3,dark);
    const axis=(t:number):V3=>[Math.sin(a)*shieldHingeRadius+Math.cos(a)*t,-7.2,Math.cos(a)*shieldHingeRadius-Math.sin(a)*t];
    shieldCore.girder(axis(-1.4),axis(1.4),.22,.25,dark);
    for(const t of [-1.32,1.32])shieldCore.box([.18,.65,.65],axis(t),lightHull,[0,a,0]);
    const hinge=new THREE.Group();hinge.add(wing.finish('ice-shield'));pivot.add(hinge);shieldAssembly.add(pivot);shieldWings.push(hinge);
  }
  const airBrakes:THREE.Group[]=[];
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2,pivot=new THREE.Group();pivot.position.set(Math.sin(a)*2.3,-7.6,Math.cos(a)*2.3);pivot.rotation.y=a;
    const hinge=new THREE.Group(),brake=new Builder();
    brake.girder([0,0,0],[0,0,2.9],.3,.38,dark);
    brake.box([3.4,.19,.65],[0,0,3.1],truss);
    for(const side of [-1,1]){
      brake.girder([0,0,1],[side*1.8,0,3.3],.13,.18,truss);
      for(let j=0;j<7;j++)brake.box([.12,.075,.72],[side*(.23+j*.22),-.09,3.25],lightHull,[0,side*.2,0]);
    }
    brake.add(new THREE.CylinderGeometry(.28,.28,.8,12),truss,[0,0,0],[0,0,Math.PI/2]);
    for(const t of [-.51,.51]){
      const bearing:V3=[Math.sin(a)*2.3+Math.cos(a)*t,-7.6,Math.cos(a)*2.3-Math.sin(a)*t];
      shieldCore.box([.22,.62,.64],bearing,lightHull,[0,a,0]);
      shieldCore.girder([Math.sin(a)*1.3+Math.cos(a)*t,-7.08,Math.cos(a)*1.3-Math.sin(a)*t],bearing,.2,.23,dark);
    }
    hinge.add(brake.finish('ice-shield'));pivot.add(hinge);shieldAssembly.add(pivot);airBrakes.push(hinge);
  }
  shieldAssembly.add(shieldCore.finish('ice-shield'));
  function setShield(amount:number){
    shieldAssembly.position.y=-1.25*amount;
    for(const wing of shieldWings)wing.rotation.x=-amount*.55;
    for(const brake of airBrakes)brake.rotation.x=amount*.38;
    for(const rod of liftRods){
      rod.scale.y=1+amount*1.25/.85;
      rod.position.y=-5.375-amount*.625;
    }
  }
  const plumes=new THREE.Group();
  const plumeMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},strength:{value:.6}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; uniform float time; uniform float strength; void main(){float f=pow(vUv.y,1.6)*(0.7+0.25*sin(vUv.y*54.0-time*20.0)); vec3 c=mix(vec3(1.,0.24,0.035),vec3(0.75,0.91,1.),pow(vUv.y,3.));gl_FragColor=vec4(c,f*strength);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  for(const x of [-8,8])for(const z of [-4.5,4.5]){
    const g=new THREE.ConeGeometry(.65,9,20,1,true);g.rotateZ(Math.PI);const mesh=new THREE.Mesh(g,plumeMaterial);mesh.position.set(x,-10,z);plumes.add(mesh);
  }climber.add(plumes);

  // Open orbital ring with radial spines, interrupted decks and the long lower
  // counterweight/docking spindle. No solid saucer or toy solar-panel wings.
  const station=new Builder();const sy=DIMENSIONS.terminal;
  for(const r of [24,29,37,43,47])station.ring(r,r===47?.5:.28,sy,truss,144);
  for(const r of [29,43,47])station.ring(r,.28,sy-2.8,dark,144);
  annulus(station,25,28,sy-.4,.55,dark,96);annulus(station,36.5,38.7,sy-.4,.42,hull,128);
  for(let i=0;i<48;i++){
    const a=i*Math.PI/24,c=Math.cos(a),s=Math.sin(a),b=a+Math.PI/24;
    station.beam([c*21,sy,s*21],[c*49,sy,s*49],.15,truss);
    station.beam([c*29,sy-2.8,s*29],[Math.cos(b)*43,sy,Math.sin(b)*43],.10,truss);
    station.beam([c*47,sy-2.8,s*47],[Math.cos(b)*47,sy,Math.sin(b)*47],.10,truss);
    if(i%3!==0){station.box([8,.35,2.2],[c*42,sy+.25,s*42],i%2?hull:truss,[0,-a,0]);}
    if(i%4===0){
      station.box([.35,.3,.35],[c*47,sy+.6,s*47],light);
    }
    if(i%6===0){
      station.box([21,.4,3],[c*49,sy+.3,s*49],dark,[0,-a,0]);
      for(let j=0;j<5;j++)station.box([3.5,.12,2.5],[c*(40+j*4),sy+.65,s*(40+j*4)],hull,[0,-a,0]);
      station.beam([c*38,sy-4,s*38],[c*59,sy,s*59],.1,truss);
    }
  }
  annulus(station,10,13,sy-2,4,dark,64);
  annulus(station,10.6,14,sy+2,.32,dark,64);
  for(const r of [10.7,13.9])for(const y of [2.4,3.8])station.ring(r,.14,sy+y,truss,80);
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,next=a+Math.PI/12,c=Math.cos(a),s=Math.sin(a);
    station.girder([c*13.9,sy+2.4,s*13.9],[Math.cos(next)*13.9,sy+3.8,Math.sin(next)*13.9],.1,.13,truss);
    station.girder([c*10.6,sy+2,s*10.6],[c*14,sy+2,s*14],.16,.18,truss);
  }
  for(const [towerIndex,tower] of STATION_TOWERS.entries()){
    const a=tower.angle,[x,,z]=tower.at(0,sy),rotation=tower.rotation;
    plate(station,6.4,24,5.8,tower.at(0,sy+11.5),dark,.4,rotation);
    for(const face of [-1,1])
      station.box([5.25,22,.55],tower.at(0,sy+11.5,face*3),hull,rotation);
    for(const side of [-1,1])
      station.box([.3,22,4.8],tower.at(side*3.26,sy+11.5),hull,rotation);
    plate(station,7.1,.8,6.4,tower.at(0,sy+24),truss,.4,rotation);
    for(const guide of CABLE_GUIDES.filter(g=>g.tower===towerIndex)){
      station.box([1.8,.55,1.5],tower.at(guide.tangent,sy+24.65),dark,rotation);
      for(let j=-2;j<=2;j++)station.add(new THREE.TorusGeometry(j===0?.155:.085,j===0?.015:.02,6,16),truss,
        tower.at(guide.tangent+guide.strandDirection*j*.31,sy+25.02),[Math.PI/2,0,0]);
    }
    station.beam([x,sy+22,z],[Math.cos(a)*39,sy,Math.sin(a)*39],.09,truss);
    const footProfile=new THREE.Shape();
    footProfile.moveTo(-2,.8);footProfile.lineTo(10,.8);footProfile.lineTo(2.5,7.6);footProfile.lineTo(-2,7.6);footProfile.closePath();
    const foot=new THREE.ExtrudeGeometry(footProfile,{depth:5.7,bevelEnabled:false});
    foot.translate(0,0,-2.85);station.add(foot,hull,[x,sy,z],[0,-a,0]);
    for(const side of [-1,1])station.girder(
      [Math.cos(a)*26-Math.sin(a)*side*3,sy+1,Math.sin(a)*26+Math.cos(a)*side*3],
      [Math.cos(a)*19-Math.sin(a)*side*3,sy+7.5,Math.sin(a)*19+Math.cos(a)*side*3],.25,.28,truss);
    station.cylinder(2.1,2.2,.65,[Math.cos(a)*24,sy+3.2,Math.sin(a)*24],dark,24);
    station.cylinder(2.12,2.12,.15,[Math.cos(a)*24,sy+3.63,Math.sin(a)*24],lightHull,24);
    plate(station,6.1,57,5.5,tower.at(0,sy-32),dark,.4,rotation);
    for(const face of [-1,1])
      station.box([5.1,51,.45],tower.at(0,sy-29,face*2.85),hull,rotation);
    for(const side of [-1,1])
      station.box([.3,51,4.5],tower.at(side*3.12,sy-29),hull,rotation);
    for(let j=0;j<12;j++){
      const y=sy-52+j*4.6;
      station.box([5.5,.28,5.8],tower.at(0,y),truss,rotation);
      station.beam(tower.at(-2.6,y,2.9),tower.at(2.6,y+4.6,2.9),.07,truss);
      if(j%4===0)station.box([1.4,.14,.2],tower.at(0,y+.3,3),blue,rotation);
    }
    station.beam([Math.cos(a)*43,sy,Math.sin(a)*43],[x,sy-48,z],.08,truss);
  }
  // An uneven sequence of service modules, open transfer frames and a narrow
  // maintenance head replaces identical cylinder/ring stacks.
  const modules=[
    {y:24,h:5,r:3.1},{y:13,h:6,r:4.6},{y:-10,h:10,r:6.1},
    {y:-27,h:12,r:5.3},{y:-44,h:12,r:4.3},{y:-60,h:9,r:3.25},{y:-73,h:7,r:2.1}
  ];
  station.cylinder(1.7,1.7,111,[0,sy-28,0],dark,12);
  for(const [j,module] of modules.entries()){
    const {y,h,r}=module;
    station.cylinder(r,r*.94,h,[0,sy+y,0],j%2?dark:truss,12);
    for(const yy of [y-h/2,y+h/2])station.ring(r+.25,.22,sy+yy,lightHull,48);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a);
      station.box([1.4,h*.68,.24],[c*(r+.1),sy+y,s*(r+.1)],hull,[0,Math.PI/2-a,0]);
      station.beam([c*r,sy+y+h/2,s*r],[c*r*.82,sy+y+h/2+3,s*r*.82],.15,truss);
    }
  }
  for(const y of [-18,-36,-53,8,20]){
    annulus(station,5,8,sy+y,.45,dark,48);
    for(const tower of STATION_TOWERS){
      station.girder(tower.at(0,sy+y,-11),tower.at(0,sy+y),.6,1.7,truss);
      station.beam(tower.at(0,sy+y-3,-12),tower.at(0,sy+y,-1),.24,dark);
    }
  }
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
    station.girder([c*2,sy-73,s*2],[c*4.4,sy-84,s*4.4],.44,.5,truss);
    plate(station,1.65,3.9,1.8,[c*3.3,sy-87,s*3.3],hull,.25);
    station.beam([c*2.5,sy-84,s*2.5],[c*10,sy-83,s*10],.2,truss);
    station.cylinder(.35,.35,5.3,[c*2.7-s*.7,sy-87,s*2.7+c*.7],truss,10);
    station.girder([c*4.4,sy-84,s*4.4],[c*2,sy-91,s*2],.22,.26,dark);
  }
  station.cylinder(2.3,1.75,5.8,[0,sy-89,0],dark,8);
  station.ring(2.45,.3,sy-91.5,truss,32);
  for(const y of [7,14,21]){
    const radius=y===21?6:8;station.ring(radius,.18,sy+y,truss,48);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      station.girder([Math.cos(a)*3,sy+y,Math.sin(a)*3],[Math.cos(a)*radius,sy+y,Math.sin(a)*radius],.13,.16,dark);
    }
  }
  detailStation(station,materials,sy);
  const terminal=station.finish('station');
  const root=new THREE.Group();root.add(baseGroup,cableGroup,climber,terminal);
  const pickable=[...baseGroup.children,...climber.children,...terminal.children].filter(o=>o.userData.part);
  return {root,climber,pickable,base:baseGroup,station:terminal,plumes,plumeMaterial,setShield};
}

export async function buildEarth(onProgress:(percent:number)=>void){
  const earth=new THREE.Group(),loader=new THREE.TextureLoader();
  const results=await Promise.allSettled([loader.loadAsync(`${import.meta.env.BASE_URL}textures/earth.png`),loader.loadAsync(`${import.meta.env.BASE_URL}textures/clouds.png`)]);onProgress(85);
  const surfaceMap=results[0].status==='fulfilled'?results[0].value:undefined,cloudMap=results[1].status==='fulfilled'?results[1].value:undefined;
  if(surfaceMap){surfaceMap.colorSpace=THREE.SRGBColorSpace;surfaceMap.anisotropy=8;}
  const globe=new THREE.Mesh(new THREE.SphereGeometry(DIMENSIONS.groundRadius,160,96),new THREE.MeshPhongMaterial({map:surfaceMap,color:surfaceMap?0xa1bac2:0x214958,specular:0x192b31,shininess:24}));globe.position.y=DIMENSIONS.groundCenter;globe.rotation.set(.85,.45,-.38);earth.add(globe);
  if(cloudMap){
    cloudMap.anisotropy=8;cloudMap.colorSpace=THREE.SRGBColorSpace;
    const clouds=new THREE.Mesh(new THREE.SphereGeometry(DIMENSIONS.groundRadius+2.8,128,80),new THREE.MeshPhongMaterial({map:cloudMap,transparent:true,opacity:.92,depthWrite:false,color:0xc7d3d6}));
    clouds.position.copy(globe.position);clouds.rotation.copy(globe.rotation);clouds.rotation.y+=.06;earth.add(clouds);
  }
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(DIMENSIONS.groundRadius+8,96,64),new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color(0x6798af)}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 color;varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),4.);gl_FragColor=vec4(color,f*.46);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));atmosphere.position.copy(globe.position);earth.add(atmosphere);
  const waterCanvas=document.createElement('canvas');waterCanvas.width=waterCanvas.height=256;
  const wc=waterCanvas.getContext('2d')!;const pixels=wc.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const a=x/256*Math.PI*2,b=y/256*Math.PI*2;
    const n=128+Math.sin(a*11+Math.sin(b*7)*1.5)*19+Math.sin(b*17+a*3)*12+Math.cos(a*31-b*23)*6;
    const i=(y*256+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;
  }
  wc.putImageData(pixels,0,0);const waves=new THREE.CanvasTexture(waterCanvas);waves.wrapS=waves.wrapT=THREE.RepeatWrapping;waves.repeat.set(120,120);
  waves.repeat.set(55,55);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(5500,5500),new THREE.MeshStandardMaterial({color:0x29454d,roughness:.3,metalness:.58,bumpMap:waves,bumpScale:.14}));sea.rotation.x=-Math.PI/2;sea.position.y=-2.6;sea.receiveShadow=true;sea.visible=false;
  return {earth,sea,degraded:results.some(r=>r.status==='rejected')};
}
export function buildStars(){
  let seed=17;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const points:number[]=[],colors:number[]=[];
  for(let i=0;i<1100;i++){const theta=rand()*Math.PI*2,phi=Math.acos(2*rand()-1),r=2600+rand()*1000;points.push(Math.sin(phi)*Math.cos(theta)*r,Math.cos(phi)*r,Math.sin(phi)*Math.sin(theta)*r);const b=.13+rand()*.43;colors.push(b*.8,b*.88,b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return new THREE.Points(geo,new THREE.PointsMaterial({size:1.05,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.62,depthWrite:false}));
}
