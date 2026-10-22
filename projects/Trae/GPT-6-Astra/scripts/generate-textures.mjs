import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const output=fileURLToPath(new URL('../public/textures/',import.meta.url));
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=data=>{let c=0xffffffff;for(const byte of data)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(name,data)=>{const type=Buffer.from(name);const size=Buffer.alloc(4);size.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([size,type,data,crc]);};

function png(width,height,pixel){
  const raw=Buffer.alloc((width*4+1)*height);
  for(let y=0;y<height;y++){
    const row=y*(width*4+1);raw[row]=0;
    for(let x=0;x<width;x++){
      const color=pixel(x,y,width,height),offset=row+1+x*4;
      raw[offset]=color[0];raw[offset+1]=color[1];raw[offset+2]=color[2];raw[offset+3]=color[3];
    }
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  return Buffer.concat([signature,chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}

const fade=t=>t*t*(3-2*t);
const mix=(a,b,t)=>a+(b-a)*t;
function hash3(x,y,z){
  let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1442695041);
  h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;
}
function noise3(x,y,z){
  const x0=Math.floor(x),y0=Math.floor(y),z0=Math.floor(z),tx=fade(x-x0),ty=fade(y-y0),tz=fade(z-z0);
  const a=mix(hash3(x0,y0,z0),hash3(x0+1,y0,z0),tx),b=mix(hash3(x0,y0+1,z0),hash3(x0+1,y0+1,z0),tx);
  const c=mix(hash3(x0,y0,z0+1),hash3(x0+1,y0,z0+1),tx),d=mix(hash3(x0,y0+1,z0+1),hash3(x0+1,y0+1,z0+1),tx);
  return mix(mix(a,b,ty),mix(c,d,ty),tz);
}
function fbm(x,y,z,octaves=6){let value=0,weight=.5,total=0;for(let i=0;i<octaves;i++){value+=noise3(x,y,z)*weight;total+=weight;x=x*2.03+7.1;y=y*2.03-3.7;z=z*2.03+5.4;weight*=.5;}return value/total;}
const clamp=value=>Math.max(0,Math.min(255,Math.round(value)));
const smoothstep=(a,b,value)=>{const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);};
const sphere=(x,y,width,height)=>{const lon=x/width*Math.PI*2,lat=(.5-y/(height-1))*Math.PI,c=Math.cos(lat);return [c*Math.cos(lon),Math.sin(lat),c*Math.sin(lon),lat];};

function earthPixel(x,y,width,height){
  const [sx,sy,sz,lat]=sphere(x,y,width,height),continental=fbm(sx*1.75+2.1,sy*1.75-1.4,sz*1.75+.8),detail=fbm(sx*7-4,sy*7+2,sz*7+5,4);
  const elevation=continental+detail*.16,ice=smoothstep(1.18,1.48,Math.abs(lat));
  let color;
  if(elevation>.585){
    const high=smoothstep(.585,.78,elevation),dry=smoothstep(.1,.95,Math.abs(lat))*smoothstep(.54,.72,detail);
    color=[38+53*dry+38*high,57+28*(1-dry)+32*high,48+16*(1-dry)+28*high];
  }else{
    const depth=smoothstep(.35,.585,elevation);color=[7+9*depth,23+21*depth,34+29*depth];
  }
  return [clamp(mix(color[0],226,ice)),clamp(mix(color[1],237,ice)),clamp(mix(color[2],240,ice)),255];
}
function cloudPixel(x,y,width,height){
  const [sx,sy,sz,lat]=sphere(x,y,width,height);
  // Spherical domain warping keeps the seam closed and creates layered fronts,
  // thin cirrus and broken cloud banks instead of a flat patchy veil.
  const warp=fbm(sx*3+19,sy*3-7,sz*3+4,4);
  const curl=lat*5+warp*3;
  const wx=sx*Math.cos(curl)-sz*Math.sin(curl),wz=sx*Math.sin(curl)+sz*Math.cos(curl);
  const density=fbm(wx*7+8,sy*10-3,wz*7+1,7);
  const detail=fbm(wx*31,sy*38+7,wz*31,4);
  const front=.055*Math.sin(lat*24+warp*9);
  const alpha=smoothstep(.43,.65,density+front)*232+smoothstep(.58,.78,detail)*24;
  const shade=220+detail*32;
  return [clamp(shade),clamp(shade+4),clamp(shade+8),clamp(alpha)];
}

await mkdir(output,{recursive:true});
await Promise.all([
  writeFile(`${output}earth.png`,png(2048,1024,earthPixel)),
  writeFile(`${output}clouds.png`,png(2048,1024,cloudPixel)),
]);
console.log('Generated public/textures/earth.png and public/textures/clouds.png');
