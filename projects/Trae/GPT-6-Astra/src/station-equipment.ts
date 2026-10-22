import * as THREE from 'three';
import type { Builder } from './model';
import type { Palette } from './detail';
type V3 = [number, number, number];

// Three service bays between each pair of tower feet. Both the machines and
// outboard transfer lines use the same flange plane; no buried pipe ends.
export const STATION_BANKS = Array.from({length:12},(_,n)=>n*4)
  .filter(i=>i%16!==4).map(i=>({
    index:i, angle:i*Math.PI/24,
    kind:([0,8,12].indexOf(i%16)) as 0|1|2,
    inner:28.45, flange:34.35, end:43.8, pipeY:1.6, offsets:[-.72,.72],
  }));

export const TANGENTIAL_BANKS = [
  {angle:Math.PI/6, vesselEnd:1.1, caseStart:-1.3, caseEnd:3.3},
  {angle:5*Math.PI/6, vesselEnd:.7, caseStart:-1.7, caseEnd:2.9},
  {angle:3*Math.PI/2, vesselEnd:1.4, caseStart:-.9, caseEnd:3.4},
];

export const INNER_BANKS = [
  {angle:Math.PI/2, start:-4.8, end:3.6, height:2.65},
  {angle:7*Math.PI/6, start:-3.9, end:3.2, height:3.05},
  {angle:11*Math.PI/6, start:-4.5, end:2.6, height:2.3},
];

// Heavy service cases on the inner side of the walkway. The transverse frames
// bridge real radial spines at ±15°, leaving the central platform and towers open.
export function innerEquipment(b:Builder,m:Palette,sy:number) {
  for(const [index,bank] of INNER_BANKS.entries()){
    const {angle:a,start,end,height}=bank,c=Math.cos(a),s=Math.sin(a);
    const at=(r:number,y:number,t=0):V3=>[c*r-s*t,sy+y,s*r+c*t];
    const rotation:V3=[0,-a,0];
    const box=(size:V3,r:number,y:number,t=0,mat=m.truss)=>b.box(size,at(r,y,t),mat,rotation);
    const along=(r:number,y:number,t0:number,t1:number,radius:number,mat=m.truss)=>
      b.beam(at(r,y,t0),at(r,y,t1),radius,mat,24);
    for(const r of [21.25,22.5]){
      const footT=r*Math.tan(Math.PI/12);
      for(const t of [-footT,footT]){
        box([.5,.34,.55],r,.27,t,m.dark);
        box([.28,.4,.32],r,.63,t,m.truss);
      }
      box([.45,.3,footT*2+.55],r,.94,0,m.dark);
      for(const t of [start+.8,end-.8])box([.72,.28,.6],r,1.23,t,m.truss);
    }
    const outline=new THREE.Shape();
    outline.moveTo(-1.3,0);outline.lineTo(1.3,0);outline.lineTo(1.6,.3);
    outline.lineTo(1.6,height-.55);outline.lineTo(1.05,height);
    outline.lineTo(-1.05,height);outline.lineTo(-1.6,height-.55);
    outline.lineTo(-1.6,.3);outline.closePath();
    b.add(new THREE.ExtrudeGeometry(outline,{depth:end-start,bevelEnabled:false}),
      m.hull,at(21.85,1.35,start),rotation);
    // Separate face plates, ribs and roof panels follow the shell facets.
    for(const side of [-1,1]){
      box([.075,height-1.15,end-start-.7],21.85+side*1.62,1.35+height/2-.12,
        (start+end)/2,m.dark);
      for(let j=0;j<4;j++){
        const t=start+.55+j*(end-start-1.1)/3;
        box([.12,height-.9,.14],21.85+side*1.68,1.35+height/2-.1,t,m.truss);
      }
    }
    const panels=index===1?3:4;
    for(let j=0;j<panels;j++){
      const length=(end-start-.5)/panels;
      box([1.85,.1,length-.12],21.85,1.35+height+.045,start+.25+(j+.5)*length,m.lightHull);
    }
    for(const t of [start-.085,end+.085]){
      along(21.85,2.65,t-.07,t+.07,1.18,m.truss);
      along(21.85,2.65,t-.085,t+.085,.99,m.dark);
      along(21.85,2.65,t-.10,t+.10,.72,m.lightHull);
      along(21.85,2.65,t-.115,t+.115,.23,m.dark);
    }
    // Twin outlets turn into a short manifold beyond the pressure-case end.
    // Its stanchion is seated on a crosshead joining both transverse frames.
    box([1.7,.18,.4],21.875,1.18,5.25,m.truss);
    box([.35,1.24,.35],21.85,1.87,5.25,m.dark);
    for(const r of [21.12,22.58]){
      along(r,2.4,end+.12,5.25,.17,m.truss);
      along(r,2.4,end+.04,end+.24,.29,m.lightHull);
      b.add(new THREE.SphereGeometry(.17,12,8),m.truss,at(r,2.4,5.25));
    }
    b.beam(at(21.12,2.4,5.25),at(22.58,2.4,5.25),.2,m.truss,16);
    b.cylinder(.27,.27,.18,at(21.85,2.61,5.25),m.brass,16);
    // One bay has a low accessory mounted on its unused end of the frame.
    if(index===2){
      box([1.8,.18,.9],21.875,1.18,3.85,m.dark);
      box([1.25,.56,.7],21.85,1.55,3.85,m.truss);
      box([1.3,.1,.75],21.85,1.88,3.85,m.lightHull);
    }
  }
}

// Low transverse machinery occupies the free area outboard of each tower foot.
// The two crossbeams land on adjacent radial spines, above the existing ring pipes.
export function tangentialEquipment(b:Builder,m:Palette,sy:number) {
  for(const bank of TANGENTIAL_BANKS){
    const {angle:a,vesselEnd,caseStart,caseEnd}=bank,c=Math.cos(a),s=Math.sin(a);
    const at=(r:number,y:number,t=0):V3=>[c*r-s*t,sy+y,s*r+c*t];
    const rotation:V3=[0,-a,0];
    const box=(size:V3,r:number,y:number,t=0,mat=m.truss)=>b.box(size,at(r,y,t),mat,rotation);
    const along=(r:number,y:number,t0:number,t1:number,radius:number,mat=m.truss)=>
      b.beam(at(r,y,t0),at(r,y,t1),radius,mat,20);
    const line=(points:V3[],radius:number,mat=m.truss)=>{
      for(let i=1;i<points.length;i++)b.beam(at(...points[i-1]),at(...points[i]),radius,mat,12);
      for(const point of points.slice(1,-1))b.add(new THREE.SphereGeometry(radius,12,8),mat,at(...point));
    };
    for(const r of [30.2,32.55]){
      const footT=r*Math.tan(Math.PI/24);
      for(const t of [-footT,footT]){
        box([.55,.18,.55],r,.19,t,m.dark);
        box([.25,.72,.28],r,.59,t,m.dark);
      }
      box([.38,.3,footT*2+.6],r,1.1,0,m.dark);
    }
    // The longer cylindrical case has separate hoop bands and recessed covers.
    along(30.2,2.14,-3.35,vesselEnd,.8,m.hull);
    for(const t of [-3.25,-1.6,vesselEnd-.1]){
      along(30.2,2.14,t-.075,t+.075,.87,m.truss);
    }
    for(const t of [-3.4,vesselEnd+.05]){
      along(30.2,2.14,t-.07,t+.07,.86,m.lightHull);
      along(30.2,2.14,t-.08,t+.08,.62,m.dark);
      along(30.2,2.14,t-.09,t+.09,.43,m.truss);
    }
    for(const t of [-2.65,.3])box([1.2,.33,.38],30.2,1.405,t,m.dark);
    for(const r of [29.7,30.7])box([.09,.09,vesselEnd+2.9],r,2.8,(vesselEnd-2.9)/2,m.truss);
    // A shorter chamfered enclosure leaves the service manifold visible at its end.
    const profile=new THREE.Shape();
    profile.moveTo(-.55,0);profile.lineTo(.55,0);profile.lineTo(.73,.18);
    profile.lineTo(.73,1.05);profile.lineTo(.46,1.4);profile.lineTo(-.46,1.4);
    profile.lineTo(-.73,1.05);profile.lineTo(-.73,.18);profile.closePath();
    const casing=new THREE.ExtrudeGeometry(profile,{depth:caseEnd-caseStart,bevelEnabled:false});
    b.add(casing,m.hull,at(32.55,1.35,caseStart),rotation);
    for(const t of [caseStart+.35,caseEnd-.35]){
      box([1.4,.2,.28],32.55,1.3,t,m.dark);
      box([1.5,.1,.12],32.55,2.38,t,m.truss);
    }
    for(const t of [caseStart-.06,caseEnd+.06]){
      along(32.55,2.02,t-.075,t+.075,.58,m.truss);
      along(32.55,2.02,t-.09,t+.09,.44,m.dark);
      along(32.55,2.02,t-.105,t+.105,.25,m.lightHull);
    }
    for(let j=0;j<7;j++)box([.74,.035,.07],32.55,2.769,caseStart+.6+j*.4,m.dark);
    // Two explicit paths link the end covers; their different elevations remain
    // readable between the machines rather than continuing through solid shells.
    line([[30.2,2.14,vesselEnd+.15],[30.2,2.14,2.05],[31.45,2.14,2.05],
      [31.45,2.14,caseStart-.5],[32.55,2.14,caseStart-.5],[32.55,2.02,caseStart-.16]],.11);
    line([[30.2,2.14,-3.5],[30.2,2.14,-3.85],[31.45,2.14,-3.85],
      [31.45,3.06,-3.85],[31.45,3.06,caseEnd+.45],[32.55,3.06,caseEnd+.45],
      [32.55,2.02,caseEnd+.45],[32.55,2.02,caseEnd+.17]],.085,m.dark);
    for(const t of [-2.65,1.9]){
      box([2.55,.14,.2],31.375,1.25,t,m.dark);
      box([.16,1.72,.16],31.45,2.18,t,m.truss);
      box([.42,.1,.3],31.45,3.04,t,m.truss);
    }
    // Local control manifold on a cantilever tied to the outer crossbeam.
    for(const t of [-.5,.5])box([1.48,.14,.2],33.18,1.25,t,m.dark);
    box([.65,.72,1.45],33.64,1.68,0,m.dark);
    box([.68,.1,1.5],33.64,2.09,0,m.lightHull);
    for(const t of [-.45,.45]){
      line([[33.27,1.75,t],[33.06,1.75,t],[33.06,1.1,t],[32.55,1.1,t]],.07,m.brass);
      b.cylinder(.15,.15,.13,at(33.64,2.205,t),m.brass,12);
    }
  }
}

export function stationEquipment(b:Builder,m:Palette,sy:number) {
  innerEquipment(b,m,sy);
  tangentialEquipment(b,m,sy);
  for(const bank of STATION_BANKS){
    const {angle:a,kind,inner,flange,end,pipeY,offsets}=bank,c=Math.cos(a),s=Math.sin(a);
    const at=(r:number,y:number,t=0):V3=>[c*r-s*t,sy+y,s*r+c*t];
    const rotation:V3=[0,-a,0];
    const box=(size:V3,r:number,y:number,t=0,mat=m.truss)=>b.box(size,at(r,y,t),mat,rotation);
    const tube=(r0:number,r1:number,y:number,t:number,radius:number,mat=m.truss)=>
      b.beam(at(r0,y,t),at(r1,y,t),radius,mat,16);
    const flangeAt=(r:number,y:number,t:number,radius:number)=>{
      tube(r-.075,r+.075,y,t,radius,m.lightHull);
      b.add(new THREE.TorusGeometry(radius-.04,.045,6,16),m.dark,at(r+.085,y,t),[0,Math.PI/2-a,0]);
    };
    // Crossheads sit directly on the radial spine; rails and machine saddles
    // provide a continuous load path instead of a floating decorative frame.
    for(const r of [29,34]){
      box([.35,.3,3.65],r,.3,0,m.dark);
    }
    for(const t of [-1.45,1.45])box([6.2,.5,.22],31.35,.4,t,m.dark);
    for(const r of [inner+.4,29.75,30.8,32.1,32.65,33.7])box([.3,.18,3.1],r,.74);
    if(kind===0){
      // Short chamfered pressure case, followed by exposed twin compressor heads.
      const shape=new THREE.Shape();
      shape.moveTo(-1.15,-1.45);shape.lineTo(1.15,-1.45);shape.lineTo(1.4,-1.2);
      shape.lineTo(1.4,1.2);shape.lineTo(1.15,1.45);shape.lineTo(-1.15,1.45);
      shape.lineTo(-1.4,1.2);shape.lineTo(-1.4,-1.2);shape.closePath();
      const body=new THREE.ExtrudeGeometry(shape,{depth:1.9,bevelEnabled:false});
      body.rotateX(-Math.PI/2);b.add(body,m.hull,at(30.25,.83),rotation);
      for(const t of [-1.48,1.48]){
        box([1.1,.78,.07],30.15,1.85,t,m.dark);
        for(const r of [29.3,31.15])box([.1,1.65,.08],r,1.8,t,m.truss);
      }
      box([.9,.12,1.25],30.4,2.79,0,m.lightHull);
      for(const t of offsets){
        tube(31.65,33.55,pipeY,t,.48);
        flangeAt(31.8,pipeY,t,.55);flangeAt(33.4,pipeY,t,.55);
        box([.35,.3,.65],32.65,.98,t,m.dark);
      }
    }else if(kind===1){
      // Exposed radial pressure vessel with end cones and a removable cage.
      tube(29.05,31.4,1.93,0,1.08,m.hull);
      for(const [r,r0,r1] of [[28.9,.76,1.08],[31.55,1.08,.76]]){
        const cap=new THREE.CylinderGeometry(r1,r0,.3,20);cap.rotateZ(-Math.PI/2);
        b.add(cap,m.hull,at(r,1.93),rotation);
      }
      for(const r of [29.3,31.1])flangeAt(r,1.93,0,1.15);
      for(const r of [29.3,31.1]){
        box([.32,.18,3.1],r,.74);
        for(const t of [-.65,.65])box([.35,.4,.34],r,1.03,t,m.dark);
      }
      for(const t of [-1.45,1.45]){
        for(const r of [28.8,33.9])box([.13,2.7,.13],r,2,t);
        box([5.25,.13,.13],31.35,3.4,t);
      }
      for(const r of [28.8,33.9])box([.13,.13,3],r,3.4);
      box([1.55,.4,1.8],32.75,1.5,0,m.dark);
      for(const t of [-.6,.6])box([.25,.48,.22],32.65,1.07,t,m.dark);
      tube(31.7,32.75,1.93,0,.3);
      for(const t of offsets)tube(32.75,33.55,pipeY,t,.22);
    }else{
      // A bank of upright accumulators and a separate low controller, not
      // another copy of the enclosed radial pressure case.
      for(const t of [-.94,0,.94]){
        b.cylinder(.39,.39,1.8,at(29.75,1.78,t),m.truss,16);
        b.cylinder(.26,.39,.22,at(29.75,2.79,t),m.lightHull,16);
        for(const y of [1.16,2.35])b.cylinder(.43,.43,.13,at(29.75,y,t),m.dark,16);
        box([.85,.12,.8],29.75,.84,t,m.dark);
        b.beam(at(29.75,2.9,t),at(31.15,2.9,t),.075,m.brass,10);
        b.beam(at(31.15,2.9,t),at(31.15,pipeY,t),.075,m.brass,10);
      }
      b.beam(at(31.15,pipeY,-.94),at(31.15,pipeY,.94),.18,m.dark,12);
      box([1.4,1.25,1.1],32.1,1.455,0,m.hull);
      box([.09,.7,.85],32.85,1.55,0,m.dark);
      for(const t of offsets)tube(31.15,33.55,pipeY,t,.14);
    }
    for(const t of offsets){
      tube(33.55,flange,pipeY,t,.23);
      flangeAt(flange,pipeY,t,.43);
      tube(flange+.075,35.5,pipeY,t,.35);
      b.beam(at(35.5,pipeY,t),at(35.5,-1.05,t),.35,m.truss,16);
      tube(35.5,39.65,-1.05,t,.35);
      b.beam(at(39.65,-1.05,t),at(39.65,pipeY,t),.35,m.truss,16);
      tube(39.65,end,pipeY,t,.35);
      // Welded elbows stay below the walking surface across the annular deck.
      for(const r of [35.5,39.65])for(const y of [-1.05,pipeY])
        b.add(new THREE.SphereGeometry(.35,12,8),m.truss,at(r,y,t));
      for(const r of [35.1,40.2,43.4])flangeAt(r,pipeY,t,.43);
      // The terminal manifold joins both lines; the branch turns down to the
      // lower utility level rather than disappearing inside a pressure case.
      tube(end,end+.2,pipeY,t,.39,m.dark);
    }
    for(const r of [35.1,40.2,43.4]){
      box([.34,.3,2.55],r,.3,0,m.dark);
      for(const t of offsets)box([.28,.8,.35],r,.85,t,m.dark);
    }
    b.beam(at(end+.2,pipeY,-.72),at(end+.2,pipeY,.72),.24,m.truss,12);
    b.beam(at(end+.2,pipeY,0),at(end+.2,-1.5,0),.18,m.dark,12);
    b.beam(at(end+.2,-1.5,0),at(45.5,-1.5,0),.18,m.dark,12);
    box([.75,.2,.8],end+.2,-1.5,0,m.truss);
    b.beam(at(33.6,pipeY,-.72),at(33.6,pipeY,.72),.22,m.dark,12);
    box([.65,.5,.75],33.6,2.05,0,m.dark);
    b.cylinder(.25,.25,.12,at(33.6,2.36),m.brass,12);
  }
}
