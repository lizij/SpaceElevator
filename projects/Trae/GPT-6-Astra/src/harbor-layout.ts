import { BASE_TOWERS } from './station-layout';

// Interpreted shoreline, not surveyed terrain: a narrow rear quay and two
// broader bridge landings. The inner toe stays outside the anchor channel.
export const HARBOR_SHORES = [
  [[-.48,91],[-.25,93],[0,96],[.22,93],[.48,92],[.7,94]],
  [[-.54,98],[-.32,110],[-.1,123],[.12,121],[.34,105],[.56,96]],
  [[-.4,94],[-.22,108],[.02,130],[.26,120],[.53,101],[.76,93]],
] as const;

export function harborShore(sector:number,delta:number) {
  const knots=HARBOR_SHORES[sector];
  let outer=knots[0][1] as number;
  for(let i=1;i<knots.length;i++){
    const [a,r]=knots[i],previous=knots[i-1];
    if(delta<=a){
      const t=Math.max(0,Math.min(1,(delta-previous[0])/(a-previous[0])));
      outer=previous[1]+(r-previous[1])*t;break;
    }
    outer=r;
  }
  return {inner:85,outer,foot:outer+5.5,top:.72};
}

// Conservative footprint clearance, including rotated cargo ribs and barriers.
// Box local X points radially and local Z tangentially at `angle`.
export function crossesHarborRoad(x:number,z:number,radialHalf=0,tangentHalf=0,angle=0) {
  return BASE_TOWERS.some(tower=>{
    const c=Math.cos(tower.angle),s=Math.sin(tower.angle),delta=angle-tower.angle;
    const r=x*c+z*s,t=-x*s+z*c;
    const dr=Math.abs(Math.cos(delta))*radialHalf+Math.abs(Math.sin(delta))*tangentHalf;
    const dt=Math.abs(Math.sin(delta))*radialHalf+Math.abs(Math.cos(delta))*tangentHalf;
    return r+dr>=42 && r-dr<=96 && Math.abs(t)<=5.8+dt;
  });
}

export function harborRoadHeight(radius:number) {
  if(radius<=48.25)return 2.47;
  if(radius>=54.25)return 1.04;
  return 2.47-(radius-48.25)*1.43/6;
}
