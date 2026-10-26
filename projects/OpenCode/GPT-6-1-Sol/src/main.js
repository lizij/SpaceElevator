import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildElevator } from './model.js';
import { createEnvironment } from './environment.js';
import { createLaunchController } from './launch.js';
import { buildInterior, CABIN_VIEWS } from './interior.js';
import { createCinema } from './cinema.js';

const $ = selector => document.querySelector(selector);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { view: 'overview', cabin: 'passenger', motion: !reducedMotion, auto: false, night: false, annotations: false, time: 0 };
let renderer;
let frame;

for (const name of ['about', 'structure']) {
  const dialog = $(`#${name}-dialog`);
  $(`#${name}-open`).addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
}

try {
  initialize();
} catch (error) {
  console.error('Unable to initialize WebGL scene:', error);
  $('#loading').classList.add('done');
  $('#error').hidden = false;
}

function initialize() {
  const mobile = window.innerWidth <= 700;
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  $('#scene').appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '拖动旋转太空电梯，滚轮或双指缩放，右键或双指平移');
  renderer.domElement.tabIndex = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, .2, 4500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.minDistance = 6;
  controls.maxDistance = 630;
  controls.maxPolarAngle = Math.PI * .485;
  controls.zoomSpeed = .8;
  controls.rotateSpeed = .65;
  controls.panSpeed = .8;
  controls.autoRotateSpeed = .45;
  controls.target.set(0, 43, 0);

  const model = buildElevator();
  scene.add(model.root);
  const environment = createEnvironment(scene, renderer, mobile);
  const cinema = createCinema(renderer);
  cinema.resize();
  function refineTextures(root) {
    const textures = new Set();
    root.traverse(object => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) if (material) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    });
    textures.forEach(texture => { texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); });
  }
  refineTextures(model.root);
  const launchController = createLaunchController();
  let launchSample = launchController.inspect();
  let interior = null;
  const interiorScene = new THREE.Scene();
  interiorScene.background = new THREE.Color(0x101e24);
  interiorScene.environment = scene.environment;
  interiorScene.environmentIntensity = .32;
  const primaryClimber = model.climbers[2];
  const launch = model.launchPositions[1];
  const focus = new THREE.Vector3();
  let transition = null;
  let lastTime = performance.now();
  let hidden = document.hidden;

  const views = {
    overview: { target: [0, 45, 0], position: [205, 153, 233], caption: '赤道海上基座', detail: '三塔结构 / 地表端' },
    tower: { target: [13, 62, 12], position: [111, 84, 116], caption: '主塔与环形连接桥', detail: '结构细节 / 约 2 KM' },
    launch: { target: [launch.x, 19, launch.z], position: [launch.x + 8.5, 37, launch.z + 45.3], caption: '轿厢发射装置', detail: '塔侧助推 / 硬质连杆解锁' },
    climber: { target: [primaryClimber.position.x, primaryClimber.position.y, primaryClimber.position.z], position: [primaryClimber.position.x - 17, primaryClimber.position.y + 9, primaryClimber.position.z + 14], caption: '四角驱动电梯轿厢', detail: '低空运行演示 / 非实际速度' },
    interior: { target: CABIN_VIEWS.passenger.target, position: CABIN_VIEWS.passenger.camera, caption: '乘客舱 / 约束座椅与中央通道', detail: '公开设定重建 / 非精确尺寸' },
  };
  function updateComposition() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.clearViewOffset();
    if (w > 700 && state.view !== 'interior') {
      camera.setViewOffset(w, h, -w * .075, 0, w, h);
    } else if (state.view === 'overview') {
      camera.setViewOffset(w, h, -w * .07, -h * .09, w, h);
    }
    camera.updateProjectionMatrix();
  }
  function setView(view, immediate = false) {
    if (!Object.hasOwn(views, view)) return;
    const changingScene = (state.view === 'interior') !== (view === 'interior');
    state.view = view;
    document.documentElement.dataset.view = view;
    const inside = view === 'interior';
    camera.fov = inside ? 64 : 43;
    camera.near = inside ? .045 : .2;
    controls.minDistance = inside ? .45 : 6;
    controls.maxDistance = inside ? 13 : 630;
    controls.maxPolarAngle = Math.PI * (inside ? .9 : .485);
    $('#interior-controls').hidden = !inside;
    if (inside) {
      if (!interior) { interior = buildInterior(); interiorScene.add(interior.root); refineTextures(interior.root); }
      interior.setRoom(state.cabin);
      interior.setNight(state.night);
      views.interior.target = CABIN_VIEWS[state.cabin].target;
      views.interior.position = CABIN_VIEWS[state.cabin].camera;
      views.interior.caption = `${CABIN_VIEWS[state.cabin].title} / 公开内饰设定重建`;
    }
    if (view === 'launch') {
      views.launch.target = [launch.x, launchSample.height + 2, launch.z];
      views.launch.position = [launch.x + 8.5, launchSample.height + 20, launch.z + 45.3];
    }
    if (view === 'climber') {
      views.climber.target = primaryClimber.position.toArray();
      views.climber.position = primaryClimber.position.clone().add(new THREE.Vector3(-15, 6.5, 16)).toArray();
    }
    const preset = views[view];
    const target = new THREE.Vector3(...preset.target);
    const position = new THREE.Vector3(...preset.position);
    if (window.innerWidth <= 700 && view === 'overview') {
      position.set(246, 173, 277);
      target.set(0, 44, 0);
    }
    if (window.innerWidth <= 700 && view === 'tower') position.set(174, 104, 172);
    if (window.innerWidth <= 700 && view === 'launch') position.copy(target).add(new THREE.Vector3(13.3, 25, 68.9));
    if (window.innerWidth <= 700 && view === 'climber') position.copy(target).add(new THREE.Vector3(-24, 12, 26));
    if (immediate || reducedMotion || changingScene) {
      transition = null;
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
    } else {
      transition = { fromPosition: camera.position.clone(), toPosition: position, fromTarget: controls.target.clone(), toTarget: target, started: performance.now(), duration: 1300 };
    }
    document.querySelectorAll('button[data-view]').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#caption-title').textContent = preset.caption;
    $('#caption-detail').textContent = preset.detail;
    updateComposition();
  }
  controls.addEventListener('start', () => { transition = null; });
  renderer.domElement.addEventListener('wheel', () => { transition = null; }, { passive: true });
  document.querySelectorAll('button[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#enter-cabin').addEventListener('click', () => setView('interior'));
  document.querySelectorAll('button[data-cabin]').forEach(button => button.addEventListener('click', () => {
    state.cabin = button.dataset.cabin;
    document.querySelectorAll('button[data-cabin]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    setView('interior', true);
  }));
  $('#reset').addEventListener('click', () => setView(state.view));
  $('#auto').addEventListener('click', () => {
    state.auto = !state.auto;
    controls.autoRotate = state.auto;
    $('#auto').setAttribute('aria-pressed', String(state.auto));
  });
  function syncMotion() {
    $('#motion').setAttribute('aria-pressed', String(state.motion));
    $('#motion-icon').textContent = state.motion ? 'Ⅱ' : '▷';
    $('#motion-text').textContent = state.motion ? '暂停' : '运行';
    $('#motion').title = state.motion ? '暂停轿厢运行' : '启动轿厢运行';
  }
  syncMotion();
  $('#motion').addEventListener('click', () => { state.motion = !state.motion; launchController.setPlaying(state.motion); syncMotion(); });
  const phaseLabels = { ready: '准备就绪', charge: '01 / 蓄压与系统检查', release: '02 / 硬质连杆解锁', boost: '03 / 塔侧助推上升', climb: '04 / 沿缆索爬升', complete: '演示完成 · 可重播' };
  function syncLaunch() {
    const sample = launchController.inspect();
    $('#launch-controls').hidden = !sample.started;
    document.documentElement.dataset.launchStarted = String(sample.started);
    document.documentElement.dataset.launchPhase = sample.phase;
    if ($('#launch-phase').textContent !== phaseLabels[sample.phase]) $('#launch-phase').textContent = phaseLabels[sample.phase];
    $('#launch-time').textContent = `${sample.time.toFixed(1).padStart(4, '0')} / 15.0 S`;
    if (document.activeElement !== $('#launch-seek')) $('#launch-seek').value = sample.time;
    const triggerText = sample.started ? '重新发射' : '发射演示';
    if (!$('#launch-trigger').textContent.includes(triggerText)) $('#launch-trigger').innerHTML = `${triggerText} <span>↗</span>`;
  }
  $('#launch-trigger').addEventListener('click', () => {
    launchController.start();
    launchSample = launchController.inspect();
    model.launchClimber.position.y = launchSample.height;
    state.motion = true;
    state.auto = controls.autoRotate = false;
    $('#auto').setAttribute('aria-pressed', 'false');
    syncMotion(); syncLaunch(); setView('launch');
  });
  $('#launch-reset').addEventListener('click', () => {
    launchController.reset();
    launchSample = launchController.inspect();
    model.launchClimber.position.y = launchSample.height;
    state.motion = false;
    syncMotion(); syncLaunch();
    if (state.view === 'launch') setView('launch', true);
  });
  $('#launch-seek').addEventListener('input', event => {
    launchController.seek(Number(event.target.value));
    const sample = launchController.inspect();
    const difference = sample.height - model.launchClimber.position.y;
    model.launchClimber.position.y = sample.height;
    launchSample = sample;
    if (state.view === 'launch' && $('#launch-follow').checked) {
      if (transition) setView('launch', true);
      else { camera.position.y += difference; controls.target.y += difference; }
    }
    state.motion = false;
    syncMotion(); syncLaunch();
  });
  $('#launch-follow').addEventListener('change', event => {
    if (event.target.checked && state.view === 'launch') setView('launch', true);
  });
  syncLaunch();
  $('#light').addEventListener('click', () => {
    state.night = !state.night;
    environment.setNight(state.night);
    interior?.setNight(state.night);
    interiorScene.environment = scene.environment;
    model.materials.glow.emissiveIntensity = state.night ? 4 : 1.7;
    $('#light').setAttribute('aria-pressed', String(state.night));
  });
  $('#annotations').addEventListener('click', () => {
    state.annotations = !state.annotations;
    $('#annotations').setAttribute('aria-pressed', String(state.annotations));
  });
  $('#fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch { $('#fullscreen').title = '当前浏览器不允许全屏'; }
  });
  if (!document.documentElement.requestFullscreen) $('#fullscreen').hidden = true;
  renderer.domElement.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'r') setView(state.view);
    if (event.key === '+' || event.key === '=') camera.position.lerp(controls.target, .12);
    if (event.key === '-') camera.position.sub(controls.target).multiplyScalar(1.12).add(controls.target);
  });
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth <= 700 ? 1.5 : 1.75));
    cinema.resize();
    updateComposition();
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    $('#error').hidden = false;
    $('#error p').textContent = '图形上下文已丢失。关闭其他占用显卡的页面后，请重新尝试。';
  });
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    lastTime = performance.now();
    if (!hidden) frame = requestAnimationFrame(animate);
    else cancelAnimationFrame(frame);
  });

  const annotations = [
    { title: '主塔', detail: 'MAIN TOWER', position: new THREE.Vector3(21.65, 89, 12.5) },
    { title: '环形连接桥', detail: 'STRUCTURAL RING', position: new THREE.Vector3(-18, 37, 17) },
    { title: '弹射塔', detail: 'LAUNCH SYSTEM', position: new THREE.Vector3(launch.x, 24, launch.z) },
    { title: '海面基座', detail: 'FOUNDATION · Ø 3 KM', position: new THREE.Vector3(59, 4, 44) },
    { title: '电梯轿厢', detail: 'CLIMBER / DEMONSTRATION', position: primaryClimber.position },
  ].map(item => {
    const element = document.createElement('div');
    element.className = 'model-label';
    const small = document.createElement('small');
    element.append(document.createTextNode(item.title), small);
    small.textContent = item.detail;
    $('#labels').append(element);
    return { ...item, element };
  });
  function updateLabels() {
    for (const annotation of annotations) {
      focus.copy(annotation.position).project(camera);
      const visible = state.annotations && state.view !== 'interior' && focus.z > -1 && focus.z < 1 && Math.abs(focus.x) < .85 && Math.abs(focus.y) < .85;
      annotation.element.hidden = !visible;
      if (visible) {
        annotation.element.style.left = `${(focus.x * .5 + .5) * window.innerWidth}px`;
        annotation.element.style.top = `${(-focus.y * .5 + .5) * window.innerHeight}px`;
      }
    }
  }

  const query = new URLSearchParams(window.location.search);
  const requestedView = query.get('view');
  if (Object.hasOwn(CABIN_VIEWS, query.get('cabin'))) {
    state.cabin = query.get('cabin');
    document.querySelectorAll('button[data-cabin]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cabin === state.cabin)));
  }
  if (query.has('launch') && Number.isFinite(Number(query.get('launch')))) {
    launchController.seek(Number(query.get('launch')));
    launchSample = launchController.inspect();
    model.launchClimber.position.y = launchSample.height;
    syncLaunch();
  }
  if (query.get('motion') === '0') { state.motion = false; syncMotion(); }
  if (query.get('night') === '1') {
    state.night = true;
    environment.setNight(true);
    interiorScene.environment = scene.environment;
    $('#light').setAttribute('aria-pressed', 'true');
  }
  setView(Object.hasOwn(views, requestedView) ? requestedView : 'overview', true);
  model.launchRig.update(launchSample, renderer.getPixelRatio());
  function animate(now) {
    if (hidden) return;
    const delta = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (state.motion) {
      state.time += delta;
      model.climbers.forEach((climber, i) => {
        if (climber === model.launchClimber) return;
        const previous = climber.position.y;
        climber.position.y = 24 + ((climber.userData.initialY - 24 + state.time * (.65 + i * .055)) % 190);
        if (climber === primaryClimber && state.view === 'climber' && !transition) {
          const difference = climber.position.y - previous;
          controls.target.y += difference;
          camera.position.y += difference;
        }
      });
    }
    const previousLaunchHeight = model.launchClimber.position.y;
    launchSample = launchController.update(delta);
    model.launchClimber.position.y = launchSample.height;
    model.launchRig.update(launchSample, renderer.getPixelRatio());
    if (state.view === 'launch' && $('#launch-follow').checked) {
      const difference = launchSample.height - previousLaunchHeight;
      if (transition) {
        transition.toPosition.y += difference;
        transition.toTarget.y += difference;
      } else {
        camera.position.y += difference;
        controls.target.y += difference;
      }
    }
    syncLaunch();
    environment.update(reducedMotion || !state.motion ? 0 : state.time);
    if (transition) {
      const t = Math.min((now - transition.started) / transition.duration, 1);
      const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
      controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
      if (t === 1) transition = null;
    }
    controls.update(delta);
    if (state.view === 'interior') {
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -3.95, 3.95);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, .35, 3.2);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -6.3, 6.3);
    }
    updateLabels();
    cinema.render(state.view === 'interior' ? interiorScene : scene, camera);
    frame = requestAnimationFrame(animate);
  }
  cinema.render(state.view === 'interior' ? interiorScene : scene, camera);
  $('#loading').classList.add('done');
  document.documentElement.dataset.sceneReady = 'true';
  if (import.meta.env.DEV || query.get('test') === '1') {
    const raycaster = new THREE.Raycaster();
    function visibleWindows() {
      return [-1, 1].map(side => {
        const target = primaryClimber.localToWorld(new THREE.Vector3(0, .19, side * 2.79));
        raycaster.set(camera.position, target.sub(camera.position).normalize());
        const hit = raycaster.intersectObject(primaryClimber, true)[0];
        return hit?.object.material === model.materials.window;
      }).filter(Boolean).length;
    }
    function visibleLaunch() {
      return [[0, 0, 0], [0, .19, 2.79], [-4.35, 0, 2.8], [4.35, 0, -2.8]].filter(point => {
        const target = model.launchClimber.localToWorld(new THREE.Vector3(...point));
        raycaster.set(camera.position, target.sub(camera.position).normalize());
        const hit = raycaster.intersectObject(model.root, true)[0];
        return hit?.object.parent === model.launchClimber;
      }).length;
    }
    window.__ELEVATOR__ = {
      state, counts: model.root.userData.counts,
      inspect: () => ({ camera: camera.position.toArray(), target: controls.target.toArray(), distance: camera.position.distanceTo(controls.target), climberY: primaryClimber.position.y, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, visibleWindows: state.view === 'interior' ? 0 : visibleWindows(), launch: launchController.inspect(), launchHeight: model.launchClimber.position.y, visibleLaunch: state.view === 'launch' ? visibleLaunch() : 0, interior: state.view === 'interior' ? interior?.inspect() : null }),
      setInspectionCamera: (position, target) => { transition = null; camera.position.fromArray(position); controls.target.fromArray(target); controls.update(); },
      setView,
    };
  }
  frame = requestAnimationFrame(animate);
}
