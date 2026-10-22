import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildEarth, buildElevator, buildStars, DIMENSIONS, type View } from './model';
import { ExhibitionRenderer, buildHarborSky } from './rendering';
import { buildCabin, CABIN_VIEWS, type CabinView } from './cabin';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const compact = () => innerWidth <= 760;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800);
}
function fail(message: string) {
  $('loader').classList.add('done'); $('error-text').textContent = message; $('error').hidden = false;
}
$('reload').addEventListener('click', () => location.reload());
const help = $<HTMLDialogElement>('help-dialog');
$('help').onclick = () => help.showModal();
$('close-help').onclick = $('start-exploring').onclick = () => help.close();
help.addEventListener('click', e => { if (e.target === help) { const r=help.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)help.close(); } });

async function start() {
  const viewport = $('viewport');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x060e17, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = !compact(); renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', '交互式太空电梯模型');
  viewport.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); renderer.setAnimationLoop(null); fail('图形上下文已中断。请关闭占用图形资源的页面后，重新加载。'); });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .5, 7000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .075;
  controls.rotateSpeed = .55; controls.zoomSpeed = .85; controls.panSpeed = .65;
  controls.minDistance = 12; controls.maxDistance = 660;
  controls.maxPolarAngle = Math.PI * .52; controls.minPolarAngle = .12;
  controls.autoRotateSpeed = .38; controls.screenSpacePanning = true;
  controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment(); const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture; scene.environmentIntensity = .55; room.dispose(); pmrem.dispose();
  const fill = new THREE.HemisphereLight(0xb4c9d1, 0x242b29, .65);fill.layers.enable(1);scene.add(fill);
  const sun = new THREE.DirectionalLight(0xfff2df, 3.5); sun.position.set(-160, 240, 160); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias = -.00015; sun.shadow.normalBias = .055; sun.shadow.camera.near = 1; sun.shadow.camera.far = 950; scene.add(sun,sun.target);
  const rim = new THREE.DirectionalLight(0x8bb5c5, 1.8); rim.position.set(100, 120, -100); scene.add(rim);
  sun.layers.enable(1);rim.layers.enable(1);
  const stars=buildStars();scene.add(stars);
  const sky=buildHarborSky();sky.visible=false;scene.add(sky);
  const pipeline=new ExhibitionRenderer(renderer,scene,camera);
  $('loading-progress').style.width = '25%';
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  const model = buildElevator(); scene.add(model.root);
  const cabin = buildCabin();model.climber.add(cabin.root);
  $('loading-progress').style.width = '62%';
  $('loading-text').textContent = '加载地球 · 校准轨道';
  const { earth, sea, degraded } = await buildEarth(p => $('loading-progress').style.width = `${p}%`);
  scene.add(earth,sea);

  let view: View = 'overview';
  let progress = .42, direction = 1, playing = !reducedMotion, following = false;
  let highQuality = !compact(), contextLost = false;
  let cinematic = true, shieldOpen = false, shieldAmount = 0;
  let cabinView: CabinView = 'aisle';
  let transition: { from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3; elapsed: number; duration: number } | null = null;
  let last = performance.now(), lastUI = 0, dirty = true;
  const slider = $<HTMLInputElement>('progress');
  const anchors = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-anchor]'));
  const selections = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-view]'));
  const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
  const mobileOffsets = { overview: new THREE.Vector3(610, 260, 780), base: new THREE.Vector3(175, 115, 230), climber: new THREE.Vector3(82, 45, 108), station: new THREE.Vector3(190, 100, 245), cabin:new THREE.Vector3() };
  const desktopOffsets = { overview: new THREE.Vector3(490, 220, 600), base: new THREE.Vector3(152, 65, 194), climber: new THREE.Vector3(45, 22, 61), station: new THREE.Vector3(145, 65, 170), cabin:new THREE.Vector3() };
  const descriptions: Record<View, { index:string; title:string; description:string; meta:string }> = {
    overview:{index:'00 / OVERVIEW',title:'连接天地的超级工程',description:'三座导向塔柱托起成束缆索，轿厢驶向开放式轨道环。依据公开美术设定重建关键结构。',meta:'全景视角'},
    base:{index:'01 / GROUND COMPLEX',title:'一切远行，从这里开始',description:'三座主塔与十二组弹射塔立于海面。检修栈桥、液压助推臂与环形货运港区，支撑每一次出发。',meta:'地面基地 · 3 主塔 / 12 弹射塔'},
    climber:{index:'02 / ASCENT VEHICLE',title:'驶向星空的列车',description:'折面舱体、顶部吸盘与四角抱缆单元。展开舱底冰盾，观察冷却翼、支架和液压连杆。',meta:'SEV–03 · 运载轿厢'},
    station:{index:'03 / ORBITAL TERMINAL',title:'地球之外，新的港口',description:'双层环形桁架连接设备舱、径向栈桥与停靠平台。沿中央轴线向下，观察分层储罐与维护结构。',meta:'轨道船坞 · 开放环形结构'},
    cabin:{index:'04 / CABIN INTERIOR',title:'落座，准备上行',description:'沿右侧过道穿过抗荷座椅，走近前端操控区。抬头观察悬挂设备、开放管线和侧肩灯带。',meta:'乘员舱 · 42 座 / 2 操控席'}
  };
  const climberY = () => DIMENSIONS.journeyStart + progress * DIMENSIONS.journeySpan;
  function targetFor(v: View) { return v==='overview'?new THREE.Vector3(0,215,0):v==='base'?new THREE.Vector3(0,28,0):v==='station'?new THREE.Vector3(0,DIMENSIONS.terminal-14,0):new THREE.Vector3(0,climberY(),0); }
  function layout() {
    const width=viewport.clientWidth,height=viewport.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, highQuality?1.75:1));
    renderer.shadowMap.enabled=highQuality;renderer.shadowMap.needsUpdate=true;
    renderer.setSize(width,height);
    camera.aspect=width/height;
    // Shift the optical center into the open canvas space beside the editorial
    // panel, retaining a full-size gesture surface and correct ray projection.
    const shiftX=view==='cabin'?0:compact()?(view==='overview'?-.17:-.025):-.115;
    const shiftY=view==='cabin'?0:compact()?(view==='overview'?.035:.09):.04;
    camera.setViewOffset(width,height,width*shiftX,height*shiftY,width,height);
    camera.updateProjectionMatrix();pipeline.resize(width,height,highQuality);dirty=true;
  }
  function syncButtons() {
    $('play').setAttribute('aria-pressed',String(playing));
    $('play').setAttribute('aria-label',playing?'暂停轿厢运行':'继续轿厢运行');
    $('play-icon').innerHTML=playing?'<path d="M8 5v14M16 5v14"/>':'<path d="m8 5 11 7-11 7Z"/>';
    $('follow').setAttribute('aria-pressed',String(following));
    $('follow').innerHTML=following?'正在跟随 <span>↗</span>':'跟随轿厢 <span>↗</span>';
    $('rotate').setAttribute('aria-pressed',String(controls.autoRotate));
    $('rotate').setAttribute('aria-label',controls.autoRotate?'关闭自动环绕':'开启自动环绕');
    $('quality').innerHTML=highQuality?'高清 <span>◈</span>':'流畅 <span>◇</span>';
    $('quality').setAttribute('aria-label',highQuality?'当前高清画质，切换为流畅':'当前流畅画质，切换为高清');
    $('lighting').setAttribute('aria-pressed',String(cinematic));
    $('lighting').textContent=cinematic?'光照 · 电影':'光照 · 结构';
    $('shield').setAttribute('aria-pressed',String(shieldOpen));
    $('shield').textContent=shieldOpen?'收拢冰盾':'展开冰盾';
    $('shield').hidden=view!=='climber';
    $('enter-cabin').textContent=view==='cabin'?'返回舱外':'进入舱内';
    $('enter-cabin').setAttribute('aria-pressed',String(view==='cabin'));
    $('cabin-views').hidden=view!=='cabin';
    $<HTMLButtonElement>('follow').disabled=view==='cabin';
    $<HTMLButtonElement>('rotate').disabled=view==='cabin'&&cabinView!=='cutaway';
    document.querySelectorAll<HTMLButtonElement>('[data-cabin]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cabin===cabinView)));
    $('gesture-hint').textContent=view==='cabin'&&cabinView!=='cutaway'
      ?'拖动环顾 · 切换位置探索舱内'
      :matchMedia('(pointer: coarse)').matches?'单指旋转 · 双指缩放 / 平移':'拖动旋转 · 滚轮缩放 · 右键平移';
    dirty=true;
  }
  function updateLook(){
    scene.environmentIntensity=cinematic?.42:.8;
    fill.intensity=view==='cabin'?(cinematic?.9:1.5):(cinematic?.52:1.35);
    sun.intensity=cinematic?4.2:3;
    sun.color.set(cinematic?0xffe6c4:0xf1f5fa);
    rim.intensity=cinematic?1.25:1.8;
    renderer.toneMappingExposure=cinematic?1.03:1.15;
    pipeline.setLook(cinematic,view==='cabin'?.22:view==='climber'?.65:view==='base'?1.6:2.1);
    dirty=true;
  }
  function focus(next:View, immediate=false, preserveFollow=false) {
    const wasInterior=view==='cabin';
    view=next;
    if(!preserveFollow) following=false;
    controls.autoRotate=false;
    // Drain drag/pan inertia before a preset takes ownership of the camera.
    // Otherwise a right-drag can keep moving the target after follow begins.
    const previousPosition=camera.position.clone(),previousTarget=controls.target.clone();
    controls.enableDamping=false;controls.update();controls.enableDamping=true;
    camera.position.copy(previousPosition);controls.target.copy(previousTarget);
    let target=targetFor(next);
    const interior=next==='cabin',cutaway=interior&&cabinView==='cutaway';
    model.climber.position.y=climberY();cabin.setCutaway(cutaway);
    camera.layers.set(interior?1:0);sun.shadow.camera.layers.set(interior?1:0);
    const shadowSpan=interior?17:next==='overview'?270:next==='base'?130:next==='station'?95:36;
    sun.shadow.camera.left=-shadowSpan;sun.shadow.camera.right=shadowSpan;sun.shadow.camera.top=shadowSpan;sun.shadow.camera.bottom=-shadowSpan;sun.shadow.camera.updateProjectionMatrix();
    scene.background=interior?new THREE.Color(0x060d13):null;sky.visible=next==='base';stars.visible=next!=='base'&&!interior;earth.visible=next!=='base'&&!interior;sea.visible=next==='base';scene.fog=next==='base'?new THREE.Fog(0x829597,210,1400):null;
    const offset=(compact()?mobileOffsets:desktopOffsets)[next].clone();
    // Portrait needs extra camera distance to keep the wide orbital ring in view.
    if(compact()&&next==='station') offset.multiplyScalar(1.25);
    let destination=target.clone().add(offset);
    controls.enablePan=!interior||cutaway;controls.enableZoom=!interior||cutaway;
    controls.minPolarAngle=interior?.08:.12;
    controls.minDistance=interior?(cutaway?12:.04):next==='overview'?160:next==='climber'?30:45;
    controls.maxDistance=interior?(cutaway?65:.06):next==='overview'?2000:next==='climber'?420:1200;
    controls.maxPolarAngle=interior?Math.PI-.08:(next==='climber'||next==='station')?Math.PI*.82:Math.PI*.52;
    camera.fov=interior?(cutaway?48:compact()&&cabinView==='control'?96:76):42;
    // Tight interior clipping; exterior near plane raised tenfold to retain
    // depth precision between layered panels while keeping the Earth visible.
    camera.near=interior?.04:next==='overview'?2:1;
    camera.far=interior?100:7000;
    if(interior){
      const preset=CABIN_VIEWS[cabinView];
      destination=cabin.point(preset.eye);target=cabin.point(preset.look);
      if(!cutaway)target.copy(destination).add(cabin.point(preset.look).sub(destination).normalize().multiplyScalar(.05));
    }
    if(immediate||reducedMotion||interior||wasInterior){
      camera.position.copy(destination);controls.target.copy(target);transition=null;
    }
    else transition={from:camera.position.clone(),to:destination,targetFrom:controls.target.clone(),targetTo:target,elapsed:0,duration:1.35};
    const detail=descriptions[next];
    $('detail-index').textContent=detail.index; $('detail-title').textContent=detail.title;
    $('detail-description').textContent=detail.description; $('detail-meta').textContent=detail.meta;
    selections.forEach(button=>{const active=button.dataset.view===next;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $('app').classList.toggle('focused',next!=='overview');
    $('app').classList.toggle('interior',interior);
    syncButtons();layout();updateLook();
  }
  function togglePlay(){playing=!playing;syncButtons();}
  selections.forEach(button=>button.onclick=()=>focus(button.dataset.view as View));
  anchors.forEach(button=>button.onclick=()=>focus(button.dataset.anchor as View));
  $('explore').onclick=()=>focus('climber');
  $('reset').onclick=()=>{focus('overview');toast('已回到整体视角');};
  $('play').onclick=togglePlay;
  $('follow').onclick=()=>{
    following=!following;
    if(following){playing=true;focus('climber',false,true);toast('已跟随轿厢 · 拖动视角可退出跟随');}
    syncButtons();
  };
  $('rotate').onclick=()=>{transition=null;following=false;controls.autoRotate=!controls.autoRotate;syncButtons();};
  $('quality').onclick=()=>{highQuality=!highQuality;layout();syncButtons();toast(highQuality?'高清画质 · 优先细节':'流畅画质 · 降低像素渲染负担');};
  $('lighting').onclick=()=>{cinematic=!cinematic;updateLook();syncButtons();};
  $('enter-cabin').onclick=()=>focus(view==='cabin'?'climber':'cabin');
  document.querySelectorAll<HTMLButtonElement>('[data-cabin]').forEach(button=>button.onclick=()=>{
    cabinView=button.dataset.cabin as CabinView;focus('cabin',true);
  });
  $('shield').onclick=()=>{
    shieldOpen=!shieldOpen;
    if(shieldOpen){
      controls.autoRotate=false;
      const target=targetFor('climber').add(new THREE.Vector3(0,-4,0));
      const offset=compact()?new THREE.Vector3(76,-35,98):new THREE.Vector3(44,-21,57);
      const destination=target.clone().add(offset);
      if(reducedMotion){camera.position.copy(destination);controls.target.copy(target);transition=null;}
      else transition={from:camera.position.clone(),to:destination,targetFrom:controls.target.clone(),targetTo:target,elapsed:0,duration:1.35};
    }else focus('climber',false,true);
    syncButtons();
  };
  slider.addEventListener('input',()=>{
    const previous=climberY(); progress=Number(slider.value)/100; playing=false;
    const delta=climberY()-previous;
    if(following||view==='cabin'){camera.position.y+=delta;controls.target.y+=delta;if(transition){transition.from.y+=delta;transition.to.y+=delta;transition.targetFrom.y+=delta;transition.targetTo.y+=delta;}}
    model.climber.position.y=climberY();syncButtons();updateProgress();
  });
  controls.addEventListener('start',()=>{transition=null;following=false;controls.autoRotate=false;syncButtons();});
  controls.addEventListener('change',()=>{dirty=true;});
  const down=new THREE.Vector2();let downTime=0;let activePointers=0;let multitouch=false;
  renderer.domElement.addEventListener('pointerdown',e=>{activePointers++;if(activePointers>1)multitouch=true;down.set(e.clientX,e.clientY);downTime=performance.now();});
  renderer.domElement.addEventListener('pointerup',e=>{
    activePointers=Math.max(0,activePointers-1);
    const wasMulti=multitouch;if(activePointers===0)multitouch=false;
    if(view==='cabin'||wasMulti||e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5||performance.now()-downTime>550)return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(model.pickable,false)[0];
    if(hit&&hit.object.userData.part)focus(hit.object.userData.part as View);
  });
  renderer.domElement.addEventListener('pointercancel',()=>{activePointers=0;multitouch=false;});
  $('fullscreen').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('当前浏览器不支持全屏，可添加到主屏幕浏览');}
    catch{toast('浏览器未允许全屏，请继续在当前窗口浏览');}
  };
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'进入全屏');dirty=true;});
  $('capture').onclick=()=>{
    pipeline.render();
    renderer.domElement.toBlob(blob=>{
      if(!blob){toast('截图生成失败，请重试');return;}
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`天梯-${view}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('模型截图已保存');
    },'image/png');
  };
  document.addEventListener('keydown',e=>{
    if(help.open||e.target instanceof HTMLInputElement||e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement||e.ctrlKey||e.metaKey||e.altKey)return;
    const keys:Record<string,View>={'1':'overview','2':'base','3':'climber','4':'station','5':'cabin'};
    if(keys[e.key]){e.preventDefault();focus(keys[e.key]);}
    else if(e.code==='Space'){e.preventDefault();togglePlay();}
    else if(e.key.toLowerCase()==='r')focus('overview');
  });
  if(matchMedia('(pointer: coarse)').matches)$('gesture-hint').textContent='单指旋转 · 双指缩放 / 平移';
  window.addEventListener('resize',()=>{layout();});
  const resizeObserver=new ResizeObserver(()=>layout());resizeObserver.observe(viewport);
  function updateProgress(){
    const percent=progress*100,rounded=`${Math.round(percent)}%`;
    slider.value=percent.toFixed(1);slider.style.setProperty('--progress',`${percent}%`);
    $('progress-value').textContent=rounded;$('rail-value').textContent=rounded;
    $('rail-fill').style.height=`${percent}%`;$('rail-car').style.bottom=`${percent}%`;
  }
  const projected=new THREE.Vector3();
  function updateAnnotations(){
    const width=viewport.clientWidth,height=viewport.clientHeight;
    anchors.forEach(button=>{
      const part=button.dataset.anchor as View;
      projected.copy(targetFor(part));
      if(part==='station'){projected.x=45;projected.y=DIMENSIONS.terminal;}
      if(part==='base'){projected.x=42;projected.y=26;}
      if(part==='climber'){projected.x=17;projected.z=8;}
      projected.project(camera);
      const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;
      const show=view==='overview'&&projected.z<1&&projected.z>-1&&x>20&&x<width-(compact()?95:200)&&y>95&&y<height-185;
      button.style.opacity=show?'1':'0';button.style.pointerEvents=show?'auto':'none';button.tabIndex=show?0:-1;
      button.style.transform=`translate(${x}px,${y-18}px)`;
    });
  }
  function animate(now:number){
    if(contextLost)return;
    const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.05);last=now;
    if(document.hidden)return;
    const oldY=climberY();
    if(playing&&!help.open){
      progress+=direction*dt*.007;
      if(progress>=1){progress=1;direction=-1;}else if(progress<=0){progress=0;direction=1;}
      dirty=true;
    }
    const movement=climberY()-oldY;model.climber.position.y=climberY();
    model.plumes.visible=playing;model.plumeMaterial.uniforms.time.value=now/1000;
    const shieldTarget=shieldOpen?1:0;
    if(Math.abs(shieldAmount-shieldTarget)>.001){
      shieldAmount=reducedMotion?shieldTarget:THREE.MathUtils.damp(shieldAmount,shieldTarget,5,dt);
      if(Math.abs(shieldAmount-shieldTarget)<.001)shieldAmount=shieldTarget;
      model.setShield(shieldAmount);
      dirty=true;
    }
    if(following||view==='cabin'){
      if(transition){transition.to.y+=movement;transition.targetTo.y+=movement;}
      else{camera.position.y+=movement;controls.target.y+=movement;}
      dirty=true;
    }
    if(transition){
      transition.elapsed+=elapsed;const t=Math.min(transition.elapsed/transition.duration,1);const ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
      camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,ease);
      if(t===1)transition=null;dirty=true;
    }
    controls.update(dt);
    if(controls.autoRotate)dirty=true;
    // Prevent the camera from entering the planet while orbiting a close view.
    const fromEarth=camera.position.clone().sub(new THREE.Vector3(0,DIMENSIONS.groundCenter,0));
    if(fromEarth.length()<DIMENSIONS.groundRadius+3){camera.position.copy(fromEarth.setLength(DIMENSIONS.groundRadius+3).add(new THREE.Vector3(0,DIMENSIONS.groundCenter,0)));dirty=true;}
    if(dirty){updateSun();pipeline.render();updateAnnotations();dirty=false;}
    if(now-lastUI>120){updateProgress();lastUI=now;}
  }
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden)renderer.setAnimationLoop(null);else if(!contextLost){dirty=true;renderer.setAnimationLoop(animate);}});
  renderer.domElement.addEventListener('webglcontextlost',()=>{contextLost=true;});
  function updateSun(){
    // Anchor the shadow projection to the inspected object, independent of
    // camera orbit/pan. Following the cabin keeps its local shadow coordinates
    // fixed instead of letting them crawl through world-space shadow texels.
    const anchor=view==='climber'||view==='cabin'?new THREE.Vector3(0,climberY(),0):view==='station'?new THREE.Vector3(0,DIMENSIONS.terminal,0):new THREE.Vector3(0,view==='overview'?215:28,0);
    sun.target.position.copy(anchor);sun.position.copy(anchor).add(new THREE.Vector3(-200,160,100));
  }
  focus('climber',true);model.climber.position.y=climberY();controls.update();updateProgress();
  updateSun();pipeline.render();updateAnnotations();
  $('loading-progress').style.width='100%';$('loading-text').textContent='连接完成 · 欢迎启程';
  $('loader').classList.add('done');
  renderer.setAnimationLoop(animate);
  if(degraded)toast('部分地球贴图未加载，已使用基础材质');
  // Read-only diagnostics for smoke testing and GPU budget inspection.
  Object.defineProperty(window,'__ASCENT__',{value:{
    getState:()=>({ready:true,transitioning:Boolean(transition),view,progress,playing,following,autoRotate:controls.autoRotate,quality:highQuality?'high':'low',cinematic,shieldOpen,shieldAmount,cabinView,seatCount:cabin.seatCount,near:camera.near,far:camera.far,cameraLayer:camera.layers.mask,localCamera:cabin.root.worldToLocal(camera.position.clone()).toArray(),shadowAnchor:sun.target.position.toArray(),camera:camera.position.toArray(),target:controls.target.toArray(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures})
  }});
}
start().catch(error=>{console.error('Scene initialization failed:',error);fail('3D 场景未能启动。请检查浏览器硬件加速与网络连接，然后重新加载。');});
