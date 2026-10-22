import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loopbackTestUrl } from './test-url.mjs';
const out=join(tmpdir(),'ascent-verification-v4')+'/';
await mkdir(out,{recursive:true});
const base=loopbackTestUrl(process.env.TEST_URL);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const result={checks:[],errors:[],desktop:null,mobile:null,views:{},stability:[],output:out};
const state=p=>p.evaluate(()=>window.__ASCENT__.getState());
const distance=s=>Math.hypot(...s.camera.map((n,i)=>n-s.target[i]));
function check(name,passed){assert.ok(passed,name);result.checks.push(name);console.log('PASS '+name);}
async function load(context){
  const p=await context.newPage();
  p.on('pageerror',e=>result.errors.push(e.message));
  p.on('console',msg=>{
    // ANGLE reports invalid framebuffer operations as warnings, not errors.
    if(msg.type()==='error'||/GL_INVALID|GL_OUT_OF_MEMORY|FRAMEBUFFER_INCOMPLETE/.test(msg.text()))
      result.errors.push(msg.text());
  });
  await p.goto(base,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__ASCENT__?.getState().ready,null,{timeout:60000});
  await p.locator('#loader').waitFor({state:'attached'});return p;
}
try {
  const desktop=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  const p=await load(desktop);
  check('Desktop WebGL scene initializes',(await state(p)).ready);
  check('Earth and cloud textures resolve',await p.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/textures\/(earth|clouds)\.png/.test(e.name)&&e.responseEnd>0).length===2));
  await p.locator('#play').click(); const paused=(await state(p)).progress;
  await p.waitForTimeout(450);check('Pause freezes cabin animation',(await state(p)).progress===paused);
  await p.locator('#progress').fill('42');await p.locator('#progress').dispatchEvent('input');
  check('Journey slider updates cabin position',Math.abs((await state(p)).progress-.42)<.001);
  await p.screenshot({path:out+'desktop-hero.png'});
  await p.locator('[data-view=overview]').click();await p.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);await p.screenshot({path:out+'desktop-overview.png'});
  for(const v of ['base','climber','station']){
    await p.locator(`[data-view=${v}]`).click();await p.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);
    check(`Focus ${v} selects camera and panel`,(await state(p)).view===v&&await p.locator(`[data-view=${v}]`).getAttribute('aria-pressed')==='true');
    result.views[v]=await state(p);
    await p.screenshot({path:out+`desktop-${v}.png`});
  }
  await p.locator('[data-view=climber]').click();await p.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);
  await p.locator('#shield').click();await p.waitForFunction(()=>window.__ASCENT__.getState().shieldAmount===1);
  check('Ice shield opens all the way',(await state(p)).shieldOpen);
  check('Ice shield presents underside',(await state(p)).camera[1]<(await state(p)).target[1]);
  await p.screenshot({path:out+'desktop-shield.png'});
  await p.locator('#shield').click();await p.waitForFunction(()=>window.__ASCENT__.getState().shieldAmount===0);
  check('Ice shield retracts',!(await state(p)).shieldOpen);
  const filmCalls=(await state(p)).calls;
  await p.locator('#lighting').click();await p.waitForFunction(()=>!window.__ASCENT__.getState().cinematic);
  await p.screenshot({path:out+'desktop-structure.png'});
  check('Structure lighting reduces postprocessing',(await state(p)).calls<filmCalls);
  await p.locator('#lighting').click();
  const beforeDrag=await state(p);
  await p.mouse.move(860,390);await p.mouse.down();await p.mouse.move(1060,430,{steps:12});await p.mouse.up();await p.waitForTimeout(650);
  check('Mouse drag rotates camera',Math.abs((await state(p)).camera[0]-beforeDrag.camera[0])>1);
  const beforeZoom=distance(await state(p));await p.mouse.wheel(0,-420);await p.waitForTimeout(600);
  check('Mouse wheel zooms in',distance(await state(p))<beforeZoom);
  const beforePan=await state(p);
  await p.mouse.move(950,380);await p.mouse.down({button:'right'});await p.mouse.move(1030,410,{steps:8});await p.mouse.up({button:'right'});
  check('Right drag pans target',Math.hypot(...(await state(p)).target.map((v,i)=>v-beforePan.target[i]))>.1);
  await p.locator('#reset').click();await p.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);check('Reset returns to overview',(await state(p)).view==='overview');
  await p.locator('#rotate').click();const orbitBefore=await state(p);
  await p.waitForFunction(x=>Math.abs(window.__ASCENT__.getState().camera[0]-x)>.2,orbitBefore.camera[0]);
  check('Automatic orbit moves camera',(await state(p)).autoRotate&&Math.abs((await state(p)).camera[0]-orbitBefore.camera[0])>.2);
  await p.locator('#rotate').click();
  await p.locator('#follow').click();await p.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);const followBefore=await state(p);await p.waitForTimeout(700);const followAfter=await state(p);
  check('Follow tracks moving cabin',followAfter.following&&followAfter.playing&&followAfter.target[1]>followBefore.target[1]);
  check('Shadow projection follows the vehicle',Math.abs((followAfter.shadowAnchor[1]-followBefore.shadowAnchor[1])-(followAfter.target[1]-followBefore.target[1]))<1e-6);
  check('Exterior close-up retains depth precision',followAfter.near===1&&followAfter.far===7000);
  await p.mouse.move(910,370);await p.mouse.down();await p.mouse.move(950,380,{steps:5});await p.mouse.up();
  check('Manual drag exits follow',!(await state(p)).following);
  await p.locator('#quality').click();check('Quality toggle changes rendering budget',(await state(p)).quality==='low');
  for(let i=0;i<4;i++)await p.locator('#quality').click();
  check('Repeated quality switching preserves scene',(await state(p)).ready&&(await state(p)).quality==='low');
  await p.locator('#help').click();check('Help dialog opens',await p.locator('#help-dialog').isVisible());await p.keyboard.press('Escape');check('Escape closes help',!await p.locator('#help-dialog').isVisible());
  const downloadPromise=p.waitForEvent('download');await p.locator('#capture').click();const download=await downloadPromise;await download.saveAs(out+'model-export.png');check('Model screenshot downloads',download.suggestedFilename().endsWith('.png'));
  await p.locator('#fullscreen').click();await p.waitForFunction(()=>Boolean(document.fullscreenElement));check('Fullscreen enters',await p.evaluate(()=>Boolean(document.fullscreenElement)));
  await p.locator('#fullscreen').click();await p.waitForFunction(()=>!document.fullscreenElement);check('Fullscreen exits',await p.evaluate(()=>!document.fullscreenElement));
  await p.locator('#viewport').focus();await p.keyboard.press('4');await p.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);
  check('Keyboard selects orbital station',(await state(p)).view==='station');
  await p.keyboard.press('r');check('Keyboard reset selects overview',(await state(p)).view==='overview');
  await p.keyboard.press('5');
  check('Keyboard enters cabin',(await state(p)).view==='cabin');
  if((await state(p)).playing)await p.locator('#play').click();
  await p.locator('#quality').click();
  for(const preset of ['aisle','seat','control','cutaway']){
    await p.locator(`[data-cabin=${preset}]`).click();
    const s=await state(p);result.views[`cabin-${preset}`]=s;
    check(`Cabin ${preset} selects interior layer`,s.view==='cabin'&&s.cabinView===preset&&s.cameraLayer===2&&s.near===.04&&s.far===100&&s.seatCount===44);
    await p.screenshot({path:out+`desktop-cabin-${preset}.png`});
  }
  const cutawayDistance=distance(await state(p));
  await p.mouse.move(900,380);await p.mouse.wheel(0,-250);await p.waitForTimeout(500);
  check('Cutaway allows inspection zoom',distance(await state(p))<cutawayDistance);
  await p.locator('[data-cabin=aisle]').click();
  const eyeBefore=await state(p);
  await p.mouse.move(850,380);await p.mouse.down();await p.mouse.move(1030,440,{steps:12});await p.mouse.up();await p.waitForTimeout(650);
  const eyeAfter=await state(p);
  const direction=s=>s.target.map((v,i)=>(v-s.camera[i])/distance(s));
  check('Interior drag looks around at a fixed position',Math.hypot(...direction(eyeAfter).map((v,i)=>v-direction(eyeBefore)[i]))>.1&&Math.hypot(...eyeAfter.localCamera.map((v,i)=>v-eyeBefore.localCamera[i]))<.11);
  await p.mouse.wheel(0,-500);
  check('Interior wheel cannot leave the room',distance(await state(p))<.061);
  await p.locator('[data-cabin=aisle]').click();
  const localBefore=(await state(p)).localCamera;
  await p.locator('#progress').fill('81');await p.locator('#progress').dispatchEvent('input');
  check('Cabin slider preserves local viewpoint',Math.hypot(...(await state(p)).localCamera.map((v,i)=>v-localBefore[i]))<1e-6);
  await p.locator('#play').click();const rideBefore=await state(p);
  // Software rendering can take longer than 700 ms when capture jobs overlap.
  // Wait for a real animation frame, retaining the same local-camera assertion.
  await p.waitForFunction(before=>window.__ASCENT__.getState().progress>before,rideBefore.progress,{timeout:15000});
  const rideAfter=await state(p);
  check('Interior camera rides with the vehicle',rideAfter.progress>rideBefore.progress&&Math.hypot(...rideAfter.localCamera.map((v,i)=>v-rideBefore.localCamera[i]))<1e-6);
  await p.locator('#play').click();
  const cabinDownloadPromise=p.waitForEvent('download');await p.locator('#capture').click();const cabinDownload=await cabinDownloadPromise;await cabinDownload.saveAs(out+'cabin-export.png');
  check('Interior screenshot exports',cabinDownload.suggestedFilename()==='天梯-cabin.png');
  await p.locator('#enter-cabin').click();
  check('Return restores exterior camera and controls',(await state(p)).view==='climber'&&(await state(p)).cameraLayer===1&&!(await p.locator('#follow').isDisabled())&&!await p.locator('#cabin-views').isVisible());
  await p.locator('#progress').fill('42');await p.locator('#progress').dispatchEvent('input');
  await p.locator('#follow').click();await p.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);
  for(let i=0;i<6;i++){
    await p.waitForTimeout(700);result.stability.push(await state(p));
    await p.screenshot({path:out+`stability-${i}.png`});
  }
  check('Following keeps the camera and shadow fixed relative to the hull',result.stability.every(s=>Math.abs(s.camera[1]-s.shadowAnchor[1]-22)<1e-6));
  await p.locator('#enter-cabin').click();await p.locator('#reset').click();
  check('Reset exits cabin and re-enables exterior layers',(await state(p)).view==='overview'&&(await state(p)).cameraLayer===1);
  result.desktop=await state(p);
  await desktop.close();
  const mobile=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const m=await load(mobile);
  await m.locator('#play').tap();await m.screenshot({path:out+'mobile-hero.png'});await m.locator('[data-view=overview]').tap();await m.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);await m.screenshot({path:out+'mobile-overview.png'});
  check('Mobile layout has no horizontal overflow',await m.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  check('Touch gesture instructions shown',(await m.locator('#gesture-hint').textContent()).includes('单指'));
  await m.locator('[data-view=climber]').tap();await m.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);await m.screenshot({path:out+'mobile-climber.png'});
  check('Mobile tap selects part',(await state(m)).view==='climber');
  check('Primary mobile controls stay within viewport',await m.evaluate(()=>['#progress','#play','#follow','#lighting','#shield','#enter-cabin',...Array.from(document.querySelectorAll('[data-view]')).map(e=>`[data-view="${e.dataset.view}"]`)].every(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})));
  await m.locator('#shield').tap();await m.waitForFunction(()=>window.__ASCENT__.getState().shieldAmount===1);
  check('Mobile ice-shield control works',(await state(m)).shieldOpen);await m.locator('#shield').tap();
  const session=await mobile.newCDPSession(m),mobileBefore=await state(m);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:205,y:330,id:1}]});
  for(let x=205;x<=275;x+=10)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:340,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.waitForTimeout(500);
  check('Single-finger touch rotates camera',Math.abs((await state(m)).camera[0]-mobileBefore.camera[0])>.2);
  const pinchBefore=distance(await state(m));
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:165,y:330,id:1},{x:235,y:330,id:2}]});
  for(let d=0;d<=40;d+=5)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:165-d,y:330,id:1},{x:235+d,y:330,id:2}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.waitForTimeout(500);
  check('Two-finger pinch zooms in',distance(await state(m))<pinchBefore);
  const touchPanBefore=await state(m);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:330,id:1},{x:230,y:330,id:2}]});
  for(let d=0;d<=40;d+=8)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:140+d,y:330+d,id:1},{x:230+d,y:330+d,id:2}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check('Two-finger drag pans target',Math.hypot(...(await state(m)).target.map((v,i)=>v-touchPanBefore.target[i]))>.1);
  await m.locator('#enter-cabin').tap();
  check('Mobile cabin controls fit and are reachable',await m.evaluate(()=>['#enter-cabin','#lighting',...Array.from(document.querySelectorAll('[data-cabin]')).map(e=>`[data-cabin="${e.dataset.cabin}"]`)].every(s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})));
  for(const preset of ['aisle','seat','control','cutaway']){
    await m.locator(`[data-cabin=${preset}]`).tap();check(`Mobile cabin ${preset} opens`,(await state(m)).cabinView===preset);
    await m.screenshot({path:out+`mobile-cabin-${preset}.png`});
  }
  await m.locator('[data-cabin=aisle]').tap();const touchLook=await state(m);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:205,y:330,id:1}]});
  for(let step=1;step<=7;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:205+step*10,y:330+step*30/7,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await m.waitForFunction(before=>{
    const s=window.__ASCENT__.getState(),d=Math.hypot(...s.target.map((v,i)=>v-s.camera[i]));
    return Math.hypot(...s.target.map((v,i)=>(v-s.camera[i])/d-before[i]))>.1;
  },direction(touchLook),{timeout:15000});
  const touchAfter=await state(m);
  result.touchLook={before:touchLook,after:touchAfter};
  check('Touch looks around inside cabin',Math.hypot(...direction(touchAfter).map((v,i)=>v-direction(touchLook)[i]))>.1);
  await m.locator('#enter-cabin').tap();check('Mobile returns outside',(await state(m)).view==='climber');
  result.mobile=await state(m);
  check('No page JavaScript exceptions',result.errors.length===0);
  // Intentionally lose the GPU context to verify a recoverable user-facing state.
  await m.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await m.waitForTimeout(200);check('GPU context loss has reload UI',await m.locator('#error').isVisible());
  await mobile.close();
  const reduced=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const r=await load(reduced);check('Reduced motion starts with animation paused',!(await state(r)).playing);
  await r.locator('#shield').click();await r.waitForFunction(()=>window.__ASCENT__.getState().shieldAmount===1);
  check('Reduced motion opens shield without transition',(await state(r)).shieldAmount===1);
  await r.locator('#enter-cabin').click();check('Reduced motion enters cabin immediately',!(await state(r)).transitioning&&!(await state(r)).playing);await reduced.close();
  const unavailable=await browser.newContext();
  await unavailable.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:getContext.call(this,type,...args);};});
  const f=await unavailable.newPage();await f.goto(base);await f.locator('#error').waitFor({state:'visible'});
  check('WebGL unavailable shows recovery UI',await f.locator('#reload').isVisible());await unavailable.close();
  check('No rendering or JavaScript errors',result.errors.length===0);
  console.log(JSON.stringify(result,null,2));
} finally {await writeFile(out+'verification.json',JSON.stringify(result,null,2));await browser.close();}
