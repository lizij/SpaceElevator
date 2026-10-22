import * as THREE from 'three';
import type { Builder } from './model';
import { BASE_TOWERS, STATION_TOWERS } from './station-layout';
import { crossesHarborRoad, harborRoadHeight, HARBOR_SHORES, harborShore } from './harbor-layout';
import { stationEquipment } from './station-equipment';
import { GUIDE_SPACING } from './cable-layout';

export type Palette = Record<'hull' | 'lightHull' | 'dark' | 'truss' | 'black' | 'brass' | 'glass' | 'light' | 'blue' | 'warning' | 'slab', THREE.Material>;
type V3 = [number, number, number];

// All details are original geometry. The public plates guide the arrangement;
// small fasteners, pipe routes and unseen service structures are interpretive.
function pipe(b: Builder, points: V3[], radius: number, material: THREE.Material) {
  for (let i = 1; i < points.length; i++) b.beam(points[i - 1], points[i], radius, material);
}
function rail(b: Builder, a: V3, c: V3, material: THREE.Material, height = .65) {
  b.beam([a[0], a[1] + height, a[2]], [c[0], c[1] + height, c[2]], .035, material);
  const count = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[2] - a[2]) / 1.2));
  for (let i = 0; i <= count; i++) {
    const t = i / count, x = THREE.MathUtils.lerp(a[0], c[0], t), z = THREE.MathUtils.lerp(a[2], c[2], t);
    b.beam([x, a[1], z], [x, a[1] + height, z], .027, material);
  }
}

function harborDeck(b: Builder, m: Palette, start: number, end: number, inner: number, outer: number) {
  const shape=new THREE.Shape(),steps=20;
  shape.moveTo(Math.cos(start)*inner,-Math.sin(start)*inner);
  for(let i=0;i<=steps;i++){
    const a=start+(end-start)*i/steps;shape.lineTo(Math.cos(a)*outer,-Math.sin(a)*outer);
  }
  for(let i=steps;i>=0;i--){
    const a=start+(end-start)*i/steps;shape.lineTo(Math.cos(a)*inner,-Math.sin(a)*inner);
  }
  shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:1.8,bevelEnabled:false,steps:1});
  geo.rotateX(-Math.PI/2);b.add(geo,m.slab,[0,-.8,0]);
  for(let i=0;i<6;i++){
    const a=start+(end-start)*(i+.5)/6,c=Math.cos(a),s=Math.sin(a);
    b.box([2.2,1.9,1.7],[c*outer,-.1,s*outer],m.dark,[0,-a,0]);
    for(const r of [inner+2,outer-2]){
      b.cylinder(.8,1.25,3.2,[c*r,-2.4,s*r],m.slab,8);
      b.box([3.2,.28,3.1],[c*r,-.92,s*r],m.dark,[0,-a,0]);
    }
  }
}

function harborRockMaterial() {
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,metalness:0});
  material.name='harbor-rock';
  return material;
}

// A displaced, closed ridge surface: the high points run along the shore,
// while a broad submerged skirt joins the lower shelves to the main outcrop.
function rockRidge(width:number,length:number,height:number,seed:number) {
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];
  const rows=24,columns=14;
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const s=j/rows,t=i/columns,u=t*2-1,v=s*2-1;
    const edge=i===0||i===columns||j===0||j===rows;
    const drift=.13*Math.sin(s*7+seed)+.06*Math.sin(s*17+seed*.7);
    const taper=.54+.46*Math.sin(Math.PI*s)**.55;
    const x=(u*taper+drift)*width/2+(edge?0:.16*Math.sin(i*13+j*7+seed));
    const z=v*length/2+(edge?0:.24*Math.sin(i*4+j*9+seed));
    const ridge=Math.sin(Math.PI*s)**.48*Math.sin(Math.PI*t)**.62;
    const peaks=.8+.15*Math.sin(s*11+seed)+.05*Math.sin(s*23+seed*.4);
    const fracture=(edge?0:Math.min(1,height/2.5))*(.14*Math.sin(i*3+j*2+seed)+.06*Math.sin(i*9-j*4));
    const y=-5.2+(height+5.2)*ridge*peaks+fracture;
    positions.push(x,y,z);
    // Linear-space vertex colour, with a damp lower belt and broad mineral
    // variation. The colour follows the rock, independent of UVs or lighting.
    const dry=THREE.MathUtils.smoothstep(y,-2.9,.9);
    const mineral=.022*Math.sin(x*.55+z*.31+seed)+.009*Math.sin(y*2.1+z*.17);
    const tone=.042+dry*.067+mineral;
    colors.push(tone*1.06,tone,tone*.88);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const a=j*(columns+1)+i,c=a+columns+1;
    // Alternating diagonals avoid a single regular set of slanted facets.
    if((i+j)%2)indices.push(a,c,a+1,a+1,c,c+1);
    else indices.push(a,c,c+1,a,c+1,a+1);
  }
  // Bottom cap uses the same boundary vertices, below the lowest waterline.
  const boundary:number[]=[];
  for(let i=0;i<=columns;i++)boundary.push(i);
  for(let j=1;j<=rows;j++)boundary.push(j*(columns+1)+columns);
  for(let i=columns-1;i>=0;i--)boundary.push(rows*(columns+1)+i);
  for(let j=rows-1;j>0;j--)boundary.push(j*(columns+1));
  const center=positions.length/3;positions.push(0,-5.2,0);colors.push(.03,.028,.024);
  for(let i=0;i<boundary.length;i++)indices.push(center,boundary[i],boundary[(i+1)%boundary.length]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const flat=geometry.toNonIndexed(),smooth=flat.getAttribute('normal').clone();
  geometry.dispose();flat.computeVertexNormals();
  const normals=flat.getAttribute('normal'),normal=new THREE.Vector3();
  for(let i=0;i<normals.count;i++){
    normal.fromBufferAttribute(normals,i).multiplyScalar(.35)
      .addScaledVector(new THREE.Vector3().fromBufferAttribute(smooth,i),.65).normalize();
    normals.setXYZ(i,normal.x,normal.y,normal.z);
  }
  flat.userData.harborRock=true;
  return flat;
}

function breakwater(b:Builder,m:Palette,sector:number,rockMaterial=harborRockMaterial()) {
  const angle=BASE_TOWERS[sector].angle,knots=HARBOR_SHORES[sector];
  const start=knots[0][0],endAngle=knots[knots.length-1][0];
  // Sample the actual corners as well as subdivisions: widen the outer shore
  // without narrowing the inner water channel or smoothing away its bays.
  const samples:number[]=[];
  for(let k=0;k<knots.length-1;k++)for(let j=0;j<8;j++)
    samples.push(THREE.MathUtils.lerp(knots[k][0],knots[k+1][0],j/8));
  samples.push(endAngle);
  const positions:number[]=[],indices:number[]=[],steps=samples.length-1;
  for(const delta of samples){
    const a=angle+delta,{inner,outer,foot,top}=harborShore(sector,delta);
    const section=[[81.5,-4],[inner,top],[outer,top],[foot,-4]];
    for(const [r,y] of section)positions.push(Math.cos(a)*r,y,Math.sin(a)*r);
  }
  for(let i=0;i<steps;i++)for(let j=0;j<4;j++){
    const a=i*4+j,d=i*4+(j+1)%4;
    indices.push(a,a+4,d,d,a+4,d+4);
  }
  indices.push(0,1,2,0,2,3);
  const end=steps*4;indices.push(end,end+2,end+1,end,end+3,end+2);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);
  const flat=geo.toNonIndexed();geo.dispose();flat.computeVertexNormals();
  // UVs are required when batching this surface with the existing concrete.
  flat.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(flat.getAttribute('position').count*2),2));
  b.add(flat,m.slab);
  const c=Math.cos(angle),s=Math.sin(angle);
  // Union footprint avoids a floating-point crack at the bridge/landing seam.
  const road=new THREE.Shape();
  road.moveTo(38,-5.5);road.lineTo(82,-5.5);road.lineTo(82,-11);road.lineTo(96,-11);
  road.lineTo(96,11);road.lineTo(82,11);road.lineTo(82,5.5);road.lineTo(38,5.5);road.closePath();
  const deck=new THREE.ExtrudeGeometry(road,{depth:2,bevelEnabled:false});
  deck.rotateX(-Math.PI/2);b.add(deck,m.slab,[0,-.96,0],[0,-angle,0]);
  b.box([14,1.7,22],[c*89,-1.81,s*89],m.slab,[0,-angle,0]);
  // Protection is concentrated on exposed quay sections, with working gaps.
  for(let i=0;i<30;i++){
    const delta=start+.025+(endAngle-start-.05)*i/29,a=angle+delta;
    if((sector===1&&delta<-.25)||(sector===2&&delta>.48))continue;
    const r=harborShore(sector,delta).outer+1.05;
    b.box([1.6,1.05,2.8],[Math.cos(a)*r,-.25,Math.sin(a)*r],m.slab,[0,-a,0]);
  }
  for(const da of [start+.055,endAngle-.055]){
    const shore=harborShore(sector,da),r=(shore.inner+shore.outer)/2;
    const x=Math.cos(angle+da)*r,z=Math.sin(angle+da)*r;
    b.cylinder(.6,.9,1.4,[x,1.4,z],m.hull,8);
    b.cylinder(.43,.43,.22,[x,2.21,z],m.warning,8);
  }
  // Four local rock heads. Broad unequal ridges replace the former 3×3 piles;
  // their low shelves overlap below water and meet the sloped concrete toe.
  const rockZones=sector===0?[[-.42,7,3.5],[.62,6,2.7]]:
    sector===1?[[-.43,14,5.8]]:[[.65,10,4.4]];
  rockZones.forEach(([delta,span,height],zone)=>{
    const a=angle+delta,r=harborShore(sector,delta).outer+4.2,c=Math.cos(a),s=Math.sin(a);
    const masses=[
      [0,0,12,span*1.7,height+1.2,.04],
      [3.8,-span*.32,8,span*1.15,height*.56,-.24],
      [4.3,span*.4,7.4,span*.83,height*.42,.36],
      [6.8,-span*.64,4.9,span*.48,.75,-.41],
      [7.8,span*.16,4.8,span*.52,1.05,.54],
    ];
    masses.forEach(([dr,t,width,length,h,yaw],index)=>{
      const rock=rockRidge(width,length,h,sector*7+zone*3+index*.83+1);
      rock.userData.rockZone=`${sector}-${zone}`;rock.userData.rockMass=index;
      b.add(rock,rockMaterial,[c*(r+dr)-s*t,0,s*(r+dr)+c*t],[0,-a+yaw,0]);
    });
  });
  // Three narrow jib cranes on the rear quay; broad shore landings instead
  // carry low service buildings. All equipment is grounded in the crest.
  if(sector===0)for(const [delta,height,reach] of [[.28,8,10],[.43,9.5,12],[.56,7.5,9]]){
    const a=angle+delta,r=harborShore(sector,delta).inner+3.2;
    const at=(dr:number,y:number,t=0):V3=>[Math.cos(a)*(r+dr)-Math.sin(a)*t,y,Math.sin(a)*(r+dr)+Math.cos(a)*t];
    b.box([3.7,.55,3.5],at(0,.97),m.slab,[0,-a,0]);
    for(const t of [-1.15,1.15]){
      b.girder(at(1,1.245,t),at(0,height,t*.45),.19,.24,m.truss);
      b.girder(at(-1,1.245,t),at(0,height,t*.45),.19,.24,m.truss);
      b.beam(at(0,height,t*.45),at(0,height+2,t*.45),.12,m.truss);
      b.beam(at(0,height,t*.45),at(-reach,height+3,t*.3),.13,m.truss);
      b.beam(at(0,height+2,t*.45),at(-reach,height+3,t*.3),.075,m.truss);
    }
    b.beam(at(-reach,height+3,-.345),at(-reach,height+3,.345),.1,m.truss);
    b.beam(at(0,height,-.518),at(0,height,.518),.16,m.truss);
    b.box([2.4,1.1,1.6],at(1.8,height-.35),m.hull,[0,-a,0]);
    b.beam(at(0,height),at(3.3,height),.18,m.truss);
    b.beam(at(-reach,height+3),at(-reach,3),.035,m.dark);
    b.box([.25,.4,.25],at(-reach,2.85),m.warning);
  }
  if(sector>0)for(const [delta,length] of (sector===1?[[-.22,9],[.26,5]]:[[-.19,6],[.3,11]])){
    const a=angle+delta,r=harborShore(sector,delta).outer-8.5;
    const at=(dr:number,y:number,t=0):V3=>[Math.cos(a)*(r+dr)-Math.sin(a)*t,y,Math.sin(a)*(r+dr)+Math.cos(a)*t];
    b.box([6,.45,length+1],at(0,.93),m.slab,[0,-a,0]);
    b.box([4.4,1.9,length],at(0,2.08),m.dark,[0,-a,0]);
    b.box([4.7,.16,length+.3],at(0,3.11),m.hull,[0,-a,0]);
    for(let i=0;i<3;i++)b.box([1.4,.5,.9],at(.5,3.44,(i-1)*length*.25),m.truss,[0,-a,0]);
  }
}

export function detailBase(b: Builder, m: Palette) {
  const rockMaterial=harborRockMaterial();
  for(let sector=0;sector<3;sector++){
    const a=BASE_TOWERS[sector].angle;
    breakwater(b,m,sector,rockMaterial);
    harborDeck(b,m,a+.08,a+.61,47,69.5);
    harborDeck(b,m,sector*Math.PI*2/3+.14,sector*Math.PI*2/3+1.08,47,60);
    // Causeway spans have piers; each anchor block has a foot below water.
    for(const r of [54,68,80])for(const side of [-3.6,3.6]){
      const x=Math.cos(a)*r-Math.sin(a)*side,z=Math.sin(a)*r+Math.cos(a)*side;
      b.cylinder(.65,1.05,3.6,[x,-2.8,z],m.slab,8);
      b.box([2,.3,3],[x,-1.15,z],m.dark,[0,-a,0]);
    }
    for(const da of [-.2,.2]){
      const x=Math.cos(a+da)*76,z=Math.sin(a+da)*76;
      b.cylinder(1.6,2.1,3.3,[x,-1.9,z],m.slab,8);
    }
  }
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12;
    b.cylinder(.85,1.2,3.5,[Math.cos(a)*44,-3,Math.sin(a)*44],m.slab,8);
  }
  // Twelve launch towers in three groups of four, inside the main pylons.
  for (let sector = 0; sector < 3; sector++) {
    const frame=BASE_TOWERS[sector],rotation=frame.rotation;
    for (let tower = 0; tower < 4; tower++) {
      const side = (tower - 1.5) * 4.3, radial = 16.7-26;
      const top = 22 + (tower % 2) * 3;
      for (const dx of [-1, 1]) {
        b.box([.36, top, 2.1], frame.at(side+dx*1.02,top/2+3,radial), m.hull,rotation);
        b.box([.16, top, .24], frame.at(side+dx*.68,top/2+3,radial+1.15), m.brass,rotation);
      }
      b.box([2.4, .5, 2.7], frame.at(side,top+3,radial), m.dark,rotation);
      for (let j = 0; j < 9; j++) {
        const y = 3 + j * top / 9;
        b.beam(frame.at(side-.8,y,radial-.9), frame.at(side+.8,y+top/9,radial-.9), .09, m.truss);
        b.box([2.3, .14, 2.4], frame.at(side,y,radial), m.dark,rotation);
      }
      b.box([3.5, 1, 4.5], frame.at(side,3.5,radial), m.dark,rotation);
      b.beam(frame.at(side,8,radial), frame.at(side,13,radial-4.4), .29, m.truss);
      b.beam(frame.at(side,11,radial), frame.at(side,14,radial-4.4), .13, m.brass);
      b.box([2.7, .65, 2.7], frame.at(side,14,radial-4.4), m.hull,rotation);
    }
    // Broad tapered tower shoulders. The old pencil-like pylons lacked these.
    for (const side of [-1, 1]) {
      const tangent=side*4.25;
      for (let j = 0; j < 3; j++) {
        const y = 34.25 + j * 13.6;
        b.box([.57, 13.45, 8.25], frame.at(tangent,y), m.hull,rotation);
        b.box([.59, .055, 8.3], frame.at(tangent,y+6.75), m.truss,rotation);
        for (const dz of [-3.95, 3.95]) {
          b.box([.62, 13.38, .12], frame.at(tangent,y,dz), m.lightHull,rotation);
          for(const dy of [-5.9,5.9])b.box([.65,.18,.2],frame.at(tangent,y+dy,dz),m.truss,rotation);
        }
      }
    }
    for (let y = 9; y < 66; y += 6) {
      b.box([9.2, .2, 1.7], frame.at(0,y,4.8), m.dark,rotation);
      rail(b, frame.at(-4.5,y,5.5), frame.at(4.5,y,5.5), m.truss);
    }
    for (let j = 0; j < 70; j++) b.box([.9, .055, .08], frame.at(4.6,5+j*.88,4.8), m.truss,rotation);
    for (const dx of [4.12, 5.08]) b.beam(frame.at(dx,5,4.8), frame.at(dx,67,4.8), .035, m.truss);
    // Continuous crown guides are built with the long cable bundle in model.ts.
    for (let j = 0; j < 6; j++) {
      const yy = 8 + j * 2.5;
      pipe(b, [frame.at(-4,yy,5.5),frame.at(-7,yy,5.5),frame.at(-7,3,7+j*.5)], .12, j % 2 ? m.truss : m.brass);
    }
  }
  // Underside deck trusses, perimeter barriers and repeating utility bays.
  for (let i = 0; i < 96; i++) {
    const a = i * Math.PI / 48, next = a + Math.PI / 48;
    const x = Math.cos(a) * 46.8, z = Math.sin(a) * 46.8;
    b.beam([x, .1, z], [Math.cos(next) * 46.8, 2.4, Math.sin(next) * 46.8], .095, m.truss);
    const mid=(a+next)/2;
    if(!crossesHarborRoad(Math.cos(mid)*46.8,Math.sin(mid)*46.8,.05,46.8*Math.PI/96+.05,mid)){
      b.beam([x, 2.6, z], [x, 3.4, z], .04, m.truss);
      b.beam([x, 3.4, z], [Math.cos(next) * 46.8, 3.4, Math.sin(next) * 46.8], .045, m.truss);
    }
    if (i % 4 === 0) {
      b.box([2.7, .7, 1.8], [Math.cos(a) * 41.5, 3.4, Math.sin(a) * 41.5], m.dark, [0, -a, 0]);
      for (let k = 0; k < 6; k++) b.box([.13, .08, 1.6], [Math.cos(a) * 41.5 - 1 + k * .4, 3.79, Math.sin(a) * 41.5], m.truss);
    }
  }
  // Cargo rows and lane markings give the circular harbor an inhabited scale.
  for (let sector = 0; sector < 3; sector++) {
    const a = sector * Math.PI * 2 / 3 + .2;
    for (let i = 0; i < 30; i++) {
      const angle = a + (i % 10) * .09, r = 51 + Math.floor(i / 10) * 3.2;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      if(crossesHarborRoad(x,z,1.05,2.075,angle))continue;
      b.box([2.1, 1.3, 4.1], [x, 1.65, z], i % 5 === 0 ? m.warning : i % 3 ? m.hull : m.dark, [0, -angle, 0]);
      for (let j = 0; j < 5; j++) {
        const offset = -.8 + j * .4;
        b.box([.06, 1.32, 4.15], [x + Math.cos(angle) * offset, 1.65, z + Math.sin(angle) * offset], m.truss, [0, -angle, 0]);
      }
    }
    const road=BASE_TOWERS[sector].angle,c=Math.cos(road),s=Math.sin(road);
    // The ramp remains above the solid inner port until beyond radius 48.
    const profile=new THREE.Shape();
    profile.moveTo(46.4,.6);profile.lineTo(54.25,.6);profile.lineTo(54.25,1.04);
    profile.lineTo(48.25,2.47);profile.lineTo(46.4,2.47);profile.closePath();
    const ramp=new THREE.ExtrudeGeometry(profile,{depth:11,bevelEnabled:false});
    ramp.translate(0,0,-5.5);b.add(ramp,m.slab,[0,0,0],[0,-road,0]);
    for(const [start,end] of [[46.4,48.25],[48.25,54.25],[54.25,95.5]]){
      const y0=harborRoadHeight(start),y1=harborRoadHeight(end),r=(start+end)/2;
      for(const side of [-2.6,2.6]){
        const marking=new THREE.BoxGeometry(.13,.018,Math.hypot(end-start,y1-y0));
        marking.rotateX(Math.atan2(y0-y1,end-start));
        b.add(marking,m.warning,[c*r-s*side,(y0+y1)/2+.025,s*r+c*side],[0,Math.PI/2-road,0]);
      }
    }
    for (let i = 0; i < 24; i++) {
      const r=47+i*2,marking=new THREE.BoxGeometry(.14,.018,.85);
      if(r>48.25&&r<54.25)marking.rotateX(Math.atan(1.43/6));
      b.add(marking,m.lightHull,[c*r,harborRoadHeight(r)+.025,s*r],[0,Math.PI/2-road,0]);
    }
  }
}

export function detailClimber(b: Builder, m: Palette) {
  // Pressure-hatch hinges, inset seal and boarding handholds on the end faces.
  for (const side of [-1, 1]) {
    for (const z of [-1.76, 1.76]) {
      b.box([.07, 2.43, .085], [side * 12.04, -.91, z], m.dark);
      for (const y of [-1.65, -.25]) {
        b.box([.18, .24, .27], [side * 12.09, y, z], m.truss);
        b.cylinder(.07, .07, .32, [side * 12.19, y, z], m.dark, 12);
      }
    }
    for (const y of [-2.1, .24]) b.box([.07, .07, 3.58], [side * 12.04, y, 0], m.dark);
    for (const z of [-2.15, 2.15]) {
      b.beam([side * 12.32, -1.75, z], [side * 12.32, -.45, z], .055, m.truss);
      for (const y of [-1.75, -.45]) b.beam([side * 11.98, y, z], [side * 12.32, y, z], .05, m.truss);
    }
    b.box([.45, .10, 3.6], [side * 12.05, -2.27, 0], m.truss);
  }
  // Three broad roof plates, with narrow joints and folded outer edges.
  for (const x of [-5.58, 0, 5.58]) {
    b.box([5.49, .055, 10.95], [x, 4.46, 0], m.black);
    for (const s of [-1, 1]) {
      b.box([5.3, .075, .075], [x, 4.5, s * 5.5], m.dark);
      for (const dx of [-2.5, 2.5]) b.cylinder(.045, .045, .08, [x + dx, 4.53, s * 5.3], m.truss, 6);
    }
  }
  for (const s of [-1, 1]) {
    for (const x of [-5.6, 5.6]) {
      b.box([4.5, .09, 1.22], [x, 3.77, s * 7.28], m.dark, [s * .54, 0, 0]);
      for (let j = 0; j < 15; j++) b.box([.055, .13, 1.12], [x - 2.03 + j * .29, 3.82, s * 7.28], m.truss, [s * .54, 0, 0]);
    }
    // Two continuous rails, cargo doors, raised gasket frames and tiny latches.
    for (const y of [-2.48, -2.26, 1.25]) b.box([20.25, .045, .07], [0, y, s * 8.86], m.truss);
    for (const x of [-9.9, -3.3, 3.3, 9.9]) {
      b.box([.035, 1.9, .07], [x + .12, -.72, s * 9.01], m.dark);
      for (const y of [-1.62, .12]) {
        b.box([.25, .12, .10], [x + .2, y, s * 8.98], m.truss);
        b.box([.06, .055, .12], [x + .2, y, s * 9.03], m.dark);
      }
    }
    for (const x of [-9.65, 9.65]) {
      b.box([.7, .65, .12], [x, .63, s * 8.86], m.lightHull);
      b.box([.39, .4, .14], [x, .65, s * 8.94], m.black);
      b.box([.12, .13, .16], [x, .65, s * 9.02], m.glass);
    }
    for (let i = 0; i < 18; i++) {
      const x = -10.1 + i * 1.18;
      b.box([.035, .04, .08], [x, 1.19, s * 8.96], m.dark);
      b.box([.035, .04, .08], [x, -2.18, s * 8.85], m.dark);
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * GUIDE_SPACING.x, z = sz * GUIDE_SPACING.z;
    // Roller collars have a through-hole: the cable is visibly gripped.
    for (const y of [3.53, 5.75]) {
      const collar=new THREE.LatheGeometry([
        new THREE.Vector2(.78,-.1),new THREE.Vector2(1.08,-.1),
        new THREE.Vector2(1.08,.04),new THREE.Vector2(1.02,.1),
        new THREE.Vector2(.78,.1),new THREE.Vector2(.78,-.1)
      ],40);
      b.add(collar,m.truss,[x,y,z]);
      for (let j = 0; j < 8; j++) {
        const a = j * Math.PI / 4;
        b.cylinder(.045, .045, .055, [x + Math.cos(a) * .95, y + .12, z + Math.sin(a) * .95], m.dark, 6);
      }
    }
    // Radiator and guide share the long pod axis, at opposite ends of its cap.
    const fx = x, fz = z + sz * 3.0, fanScale=1.55;
    const fanBase=new THREE.Shape();
    const outline=[[-.26,-.77],[.26,-.77],[.77,-.26],[.77,.26],[.26,.77],[-.26,.77],[-.77,.26],[-.77,-.26]];
    outline.forEach(([xx,zz],i)=>i?fanBase.lineTo(xx,zz):fanBase.moveTo(xx,zz));fanBase.closePath();
    const base=new THREE.ExtrudeGeometry(fanBase,{depth:.16,bevelEnabled:false});
    base.rotateX(-Math.PI/2);base.scale(fanScale,1,fanScale);b.add(base,m.dark,[fx,3.445,fz]);
    // A continuous clipped shroud has an actual aperture, with the dark rotor
    // recessed below its lip. The grille is carried by four anchored crossbars.
    const opening=new THREE.Path();opening.absarc(0,0,.62,0,Math.PI*2,true);
    fanBase.holes.push(opening);
    const shroud=new THREE.ExtrudeGeometry(fanBase,{depth:.19,bevelEnabled:false,curveSegments:16});
    shroud.rotateX(-Math.PI/2);shroud.scale(fanScale,1,fanScale);b.add(shroud,m.truss,[fx,3.59,fz]);
    b.cylinder(.60*fanScale,.60*fanScale,.06,[fx,3.635,fz],m.black,32);
    for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4;
      b.box([.53*fanScale,.018,.12*fanScale],[fx+Math.cos(a)*.28*fanScale,3.682,fz+Math.sin(a)*.28*fanScale],m.dark,[0,-a-.35,0]);
    }
    b.cylinder(.12*fanScale,.12*fanScale,.066,[fx,3.678,fz],m.dark,16);
    for(const r of [.12,.22,.32,.42,.52,.615])
      b.add(new THREE.TorusGeometry(r*fanScale,.009,4,40),m.truss,[fx,3.81,fz],[Math.PI/2,0,0]);
    for(let j=0;j<4;j++){
      const a=j*Math.PI/4;
      b.box([1.34*fanScale,.018,.021],[fx,3.822,fz],m.truss,[0,-a,0]);
      for(const side of [-1,1]){
        const xx=fx+side*Math.cos(a)*.66*fanScale,zz=fz+side*Math.sin(a)*.66*fanScale;
        b.box([.09,.048,.07],[xx,3.799,zz],m.truss,[0,-a,0]);
        b.cylinder(.017,.017,.014,[xx,3.837,zz],m.dark,6);
      }
    }
    // Short slotted partition behind the fan, on two feet outside its rotor.
    // Tangent/radial coordinates keep the four mirrored crowns consistent.
    const at=(t:number,y:number,r:number):V3=>[x+sz*t,y,z+sz*r];
    const rotation:V3=[0,sz<0?Math.PI:0,0];
    const partition=new THREE.Shape();
    partition.moveTo(-1.30,3.94);partition.lineTo(1.30,3.94);
    partition.lineTo(1.30,4.32);partition.lineTo(1.08,4.48);
    partition.lineTo(-1.08,4.48);partition.lineTo(-1.30,4.32);partition.closePath();
    const wall=new THREE.ExtrudeGeometry(partition,{depth:.12,bevelEnabled:false});
    wall.translate(0,0,-.06);b.add(wall,m.dark,at(0,0,1.30),rotation);
    b.box([2.28,.055,.16],at(0,4.47,1.30),m.truss,rotation);
    b.box([2.66,.07,.17],at(0,3.97,1.30),m.truss,rotation);
    for(let j=0;j<16;j++){
      const t=(j-7.5)*.145;
      b.box([.09,Math.abs(t)>1?.30:.39,.03],at(t,4.2,1.378),m.truss,rotation);
    }
    for(const side of [-1,1]){
      b.box([.18,.085,.50],at(side*1.28,3.4875,1.30),m.dark,rotation);
      b.girder(at(side*1.28,3.50,1.50),at(side*1.22,4.34,1.30),.10,.13,m.truss);
      // Low folded side covers, separated from the sleeve and fan guard.
      const cover=new THREE.Shape();
      cover.moveTo(-.17,0);cover.lineTo(.17,0);cover.lineTo(.17,.34);
      cover.lineTo(.08,.50);cover.lineTo(-.17,.50);cover.closePath();
      const coverGeo=new THREE.ExtrudeGeometry(cover,{depth:.50,bevelEnabled:false});
      coverGeo.translate(0,0,-.25);
      b.add(coverGeo,m.hull,at(side*1.42,3.445,1.72),rotation);
      b.box([.38,.06,.54],at(side*1.42,3.475,1.72),m.truss,rotation);
      for(const r of [1.57,1.72,1.87])b.box([.19,.018,.035],at(side*1.42,3.954,r),m.dark,rotation);
      pipe(b,[at(side*1.23,4.09,1.30),at(side*1.41,4.09,1.72),
        at(side*1.42,4.03,1.72),at(side*1.42,3.92,1.72)],.035,m.black);
    }
    // Curved access panels remain within one removable upper shell sector.
    // Closed radial sections keep the hatch edges seated along the cylinder.
    const accessAngle=Math.atan2(sx,sz);
    const curvedPatch=(inner:number,outer:number,low:number,high:number,span:number,material:THREE.Material)=>{
      const positions:number[]=[],indices:number[]=[],steps=12;
      for(let i=0;i<=steps;i++){
        const a=accessAngle-span/2+span*i/steps;
        for(const [r,y] of [[inner,low],[outer,low],[outer,high],[inner,high]])
          positions.push(x+Math.sin(a)*r,y,z+Math.cos(a)*r);
      }
      for(let i=0;i<steps;i++)for(let j=0;j<4;j++){
        const a=i*4+j,d=i*4+(j+1)%4;
        indices.push(a,a+4,d,d,a+4,d+4);
      }
      indices.push(0,1,2,0,2,3);
      const end=steps*4;indices.push(end,end+2,end+1,end,end+3,end+2);
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);
      const flat=geo.toNonIndexed();geo.dispose();flat.computeVertexNormals();
      flat.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(flat.getAttribute('position').count*2),2));
      b.add(flat,material);
    };
    curvedPatch(.974,1.015,4.72,5.34,.56,m.truss);
    for(const y of [4.82,5.22])curvedPatch(1.011,1.045,y-.024,y+.024,.38,m.dark);
    curvedPatch(1.014,1.020,5.02,5.075,.22,m.dark);
    // Small service connectors terminate on the inner side of the sleeve.
    for(const dx of [-.3,.3]){
      pipe(b,[[x+dx,4.46,z-sz*.94],[x+dx,4.46,z-sz*1.18],[x+dx,3.47,z-sz*1.48]],.045,m.black);
      b.box([.22,.1,.28],[x+dx,3.46,z-sz*1.48],m.truss);
    }
    // Pivot chambers at the pod roots; the open fork lives in model.ts.
    for (const y of [-1.6, 1.4]) {
      b.add(new THREE.CylinderGeometry(.35, .35, .45, 16), m.truss, [x - sx * 1.99, y, z], [Math.PI / 2, 0, 0]);
    }
    // Pressure-case fittings are clustered at the upper shoulder. The lower
    // return follows the mounting saddle instead of crossing the access cover.
    for(const zz of [1.88,2.32,2.76]){
      b.cylinder(.11,.11,.38,[x+sx*2.60,1.48,z+sz*zz],m.truss,10);
      b.cylinder(.14,.14,.10,[x+sx*2.60,1.65,z+sz*zz],m.dark,10);
      pipe(b,[[x+sx*2.60,1.66,z+sz*zz],[x+sx*2.60,1.93,z+sz*zz],
        [x+sx*2.30,1.93,z+sz*zz],[x+sx*2.30,1.82,z+sz*zz]],.037,m.truss);
    }
    for(const zz of [1.67,2.97])
      pipe(b,[[x+sx*2.51,-1.55,z+sz*zz],[x+sx*2.67,-1.72,z+sz*zz],
        [x+sx*2.67,-1.91,z+sz*zz],[x+sx*2.54,-1.91,z+sz*zz]],.045,m.truss);
    b.beam([x+sx*2.67,-1.72,z+sz*1.67],[x+sx*2.67,-1.72,z+sz*2.97],.05,m.truss);
    pipe(b,[[x+sx*2.35,1.49,z+sz*1.09],[x+sx*2.54,1.49,z+sz*1.09],
      [x+sx*2.54,.83,z+sz*1.09],[x+sx*2.51,.83,z+sz*1.55]],.045,m.black);
    // Protected hydraulic runs bridge the exposed actuator and pressure pod.
    for (const offset of [-.22, .22]) {
      pipe(b, [[x - sx * 3.8, .9, z + offset], [x - sx * 3.1, 1.35, z + offset],
        [x - sx * 2.18, 1.35, z + offset], [x - sx * 2.18, 2.2, z + offset]], .065, m.black);
      b.cylinder(.10, .10, .2, [x - sx * 2.18, 2.14, z + offset], m.truss, 10);
    }
    for (const dz of [-2.5, 2.5]) for (const yy of [-2.3, 2.3]) {
      b.box([.14, .23, .3], [x + sx * 2.33, yy, z + sz*1.2 + dz], m.truss);
      b.box([.17, .075, .08], [x + sx * 2.38, yy, z + sz*1.2 + dz], m.dark);
    }
  }
}

export function detailStation(b: Builder, m: Palette, sy: number) {
  stationEquipment(b,m,sy);
  // Dense double-layer service ring. Broad radial gaps remain legible.
  for (const r of [25.5, 31, 34, 38, 41, 45.5]) {
    b.ring(r, .10, sy + .72, m.truss, 144);
    b.ring(r, .08, sy - 1.5, m.dark, 144);
  }
  for (let i = 0; i < 48; i++) {
    const a = i * Math.PI / 24, c = Math.cos(a), s = Math.sin(a);
    // Radial equipment families alternate: exposed pipes, pressure cases,
    // open maintenance walks and lower utility racks.
    const r=42, length=4.4;
    const at = (radius: number, y: number, offset = 0): V3 => [c * radius - s * offset, sy + y, s * radius + c * offset];
    if (i % 4 === 1) {
      const width=.6,radius=.34,height=1.1;
      for (const offset of [-width, width]) {
        b.beam(at(r - length / 2, height, offset), at(r + length / 2, height, offset), radius, m.truss,16);
      }
      for (const rr of [r - length / 2 + .4, r, r + length / 2 - .4]) {
        b.box([.28,.3,width*2+radius*2],at(rr,.3),m.dark,[0,-a,0]);
        for(const t of [-width,width])b.box([.25,.31,.3],at(rr,.605,t),m.dark,[0,-a,0]);
      }
      for(const rr of [r-length/2+.2,r,r+length/2-.2]){
        for(const offset of [-width,width]){
          b.add(new THREE.TorusGeometry(radius+.045,.09,5,16),m.dark,at(rr,height,offset),[0,Math.PI/2-a,0]);
          b.beam(at(rr-.16,height,offset),at(rr+.16,height,offset),radius+.09,m.lightHull,16);
        }
      }
      b.box([1.3,.65,1.4],at(r+.7,1.75),m.dark,[0,-a,0]);
      b.box([1.05,.12,1.2],at(r+.7,2.135),m.hull,[0,-a,0]);
      pipe(b,[at(r-2,height+radius,.4),at(r,height+radius+.35,.4),at(r+1,height+radius+.35,.4),at(r+1,.9,.4)],.09,m.truss);
    } else if (i % 4 === 2) {
      // Split utility cassette: short enclosures flank an exposed service bay.
      const h=1.15+(i%3)*.22;
      for(const offset of [-1,1]){
        b.box([6.5,.42,.16],at(42,.45,offset),m.dark,[0,-a,0]);
        for(const rr of [41.2,42.8])b.box([.13,1.85,.13],at(rr,1.57,offset),m.truss,[0,-a,0]);
        b.box([1.73,.13,.13],at(42,2.52,offset),m.truss,[0,-a,0]);
      }
      for(const rr of [39.3,44.3]){
        b.box([.35,.3,2.25],at(rr,.3),m.dark,[0,-a,0]);
        b.box([.4,.19,2.1],at(rr,.755),m.truss,[0,-a,0]);
      }
      for(const rr of [39.95,44]){
        b.box([rr===44?2:2.2,h,1.8],at(rr,.85+h/2),m.hull,[0,-a,0]);
        for(const t of [-.93,.93])b.box([.8,.5,.08],at(rr,1.25,t),m.dark,[0,-a,0]);
      }
      for(const t of [-.47,.47]){
        b.beam(at(41.05,1.48,t),at(43,1.48,t),.34,m.truss,12);
        for(const rr of [41.3,42.7]){
          b.add(new THREE.TorusGeometry(.37,.065,5,12),m.dark,at(rr,1.48,t),[0,Math.PI/2-a,0]);
          b.box([.18,.49,.45],at(rr,.905,t),m.dark,[0,-a,0]);
        }
      }
    } else if(i%4===3) {
      for (const offset of [-.8, .8]) b.girder(at(28, -.7, offset), at(48, -.7, offset), .3, .35, m.dark);
      for (let j = 0; j < 6; j++) b.box([.45, .28, 2], at(29 + j * 3.4, -.5), m.truss, [0, -a, 0]);
    }
    if (i % 5 === 0) {
      b.box([5.6, 1.8, 2.5], at(41, -3.2), m.dark, [0, -a, 0]);
      for (const offset of [-.9, .9]) b.beam(at(38, -1, offset), at(43, -4, offset), .15, m.truss);
      b.box([3.5,.2,2.2],at(41,-4.22),m.truss,[0,-a,0]);
      for(const offset of [-.7,.7])b.beam(at(38.7,-3.15,offset),at(43.3,-3.15,offset),.33,m.truss,12);
    }
    if (i % 3 === 0) {
      b.beam([c * 25, sy - 2, s * 25], [c * 47, sy - 2, s * 47], .11, m.truss);
      b.beam([c * 37, sy - 2, s * 37], [c * 43, sy + .1, s * 43], .08, m.truss);
    }
    if (i % 6 === 0) {
      b.box([7, .35, 1.6], [c * 51, sy - .1, s * 51], m.truss, [0, -a, 0]);
      for (let j = 0; j < 7; j++) b.box([.05, .06, 1.4], [c * (48 + j), sy + .14, s * (48 + j)], m.dark, [0, -a, 0]);
      b.beam([c * 54, sy, s * 54], [c * 54, sy + 3.2, s * 54], .045, m.truss);
      b.box([.12, .14, .12], [c * 54, sy + 3.2, s * 54], m.light);
    }
  }
  // Transfer decks, tanks, external ducts and docking equipment along the axis.
  for (const [j, level] of [-44, -27, -10, 13].entries()) {
    const y = sy + level, radius = [4.5, 5.55, 6.35, 4.85][j];
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9, x = Math.cos(a) * radius, z = Math.sin(a) * radius;
      b.cylinder(.46, .46, 3.2, [x, y, z], j % 2 ? m.truss : m.hull, 10);
      b.cylinder(.5, .5, .18, [x, y + 1.3, z], m.dark, 10);
      if (i % 3 === 0) b.box([1.4, .16, .14], [x, y + 2.5, z], m.blue, [0, -a, 0]);
    }
  }
  // Service cages connect the stepped central modules. Keep the open bays
  // between this machinery and the three outer pylons.
  const spans=[
    {bottom:-68,top:-49,r0:2.8,r1:4.8},
    {bottom:-49,top:-33,r0:4.8,r1:5.9},
    {bottom:-33,top:-15,r0:5.9,r1:6.7},
    {bottom:-15,top:5,r0:6.7,r1:5.8},
    {bottom:5,top:22,r0:5.8,r1:4.1},
  ];
  for(const [j,span] of spans.entries()){
    const {bottom,top,r0,r1}=span;
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,c=Math.cos(a),s=Math.sin(a);
      const lower:V3=[c*r0,sy+bottom,s*r0],upper:V3=[c*r1,sy+top,s*r1];
      b.beam(lower,upper,i%2?.14:.24,i%2?m.dark:m.truss,8);
      for(const t of [.18,.5,.82]){
        const y=bottom+(top-bottom)*t,r=r0+(r1-r0)*t;
        b.box([.72,.18,.6],[c*r,sy+y,s*r],m.dark,[0,-a,0]);
      }
      if((i+j)%3===0){
        const y=(bottom+top)/2,r=(r0+r1)/2+.5;
        b.box([1.5,2.5+(j%2),1.25],[c*r,sy+y,s*r],m.dark,[0,-a,0]);
        b.box([1.54,.25,1.3],[c*r,sy+y+1.3+(j%2)*.5,s*r],m.lightHull,[0,-a,0]);
        b.cylinder(.3,.3,2.9,[c*r-s*.96,sy+y,s*r+c*.96],m.truss,12);
      }
    }
    const mid=(bottom+top)/2,r=(r0+r1)/2;
    for(const yy of [mid-.8,mid+.8])b.ring(r+.28,.13,sy+yy,m.truss,48);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,next=a+Math.PI/4;
      b.beam([Math.cos(a)*(r+.28),sy+mid-.8,Math.sin(a)*(r+.28)],
        [Math.cos(next)*(r+.28),sy+mid+.8,Math.sin(next)*(r+.28)],.075,m.dark);
    }
  }
  for(const y of [7,14,21]){
    const r=y===21?6:8;
    b.ring(r,.08,sy+y+.9,m.truss,48);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      b.beam([Math.cos(a)*r,sy+y,Math.sin(a)*r],[Math.cos(a)*r,sy+y+.9,Math.sin(a)*r],.065,m.truss);
    }
  }
  for (const tower of STATION_TOWERS) {
    for (const level of [-57, -43, -29, -15, 4, 13, 21]) {
      const y = sy + level;
      const height=Math.min(level>0?7.3:10.8,23.3-level-.2);
      b.box([6.5, .13, 6.2], tower.at(0,y), m.truss,tower.rotation);
      b.box([5.3, height, .18], tower.at(0,y+.2+height/2,3.14), m.hull,tower.rotation);
      b.box([.72, .78, .1], tower.at(1.8,y+1.4,3.27), m.lightHull,tower.rotation);
      const innerFace=level>0?-3.38:-3.18;
      for (const dx of [-3.35, 3.35]) b.beam(tower.at(dx,y,innerFace),tower.at(dx,y+Math.min(4.65,height),innerFace), .08, m.brass);
    }
    for (const sign of [-1, 1]) {
      b.beam(tower.at(sign*3.6,sy+3),tower.at(sign*3.6,sy+23), .11, m.truss);
      b.beam(tower.at(sign*3.6,sy-57),tower.at(sign*3.6,sy-4), .09, m.truss);
    }
  }
}
