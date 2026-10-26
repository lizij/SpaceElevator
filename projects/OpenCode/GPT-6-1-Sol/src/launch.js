import * as THREE from 'three';
import { createAssembly, chamferedBox } from './geometry.js';

export const LAUNCH = Object.freeze({ charge: 2.4, release: 3.2, boost: 6.2, duration: 15, parkedY: 17, exitY: 47, finalY: 175 });
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function sampleLaunch(seconds, started = true) {
  const time = Math.max(0, Math.min(LAUNCH.duration, seconds));
  let phase = !started ? 'ready' : time < LAUNCH.charge ? 'charge' : time < LAUNCH.release ? 'release' : time < LAUNCH.boost ? 'boost' : time < LAUNCH.duration ? 'climb' : 'complete';
  let height = LAUNCH.parkedY;
  let speed = 0;
  if (time >= LAUNCH.release && time < LAUNCH.boost) {
    const t = (time - LAUNCH.release) / (LAUNCH.boost - LAUNCH.release);
    height += (LAUNCH.exitY - LAUNCH.parkedY) * t * t;
    speed = 2 * (LAUNCH.exitY - LAUNCH.parkedY) * t / (LAUNCH.boost - LAUNCH.release);
  } else if (time >= LAUNCH.boost) {
    const duration = LAUNCH.duration - LAUNCH.boost;
    const t = (time - LAUNCH.boost) / duration;
    const distance = LAUNCH.finalY - LAUNCH.exitY;
    const tangent = 20 * duration;
    height = LAUNCH.exitY + (-2 * t ** 3 + 3 * t ** 2) * distance + (t ** 3 - 2 * t ** 2 + t) * tangent;
    speed = ((-6 * t ** 2 + 6 * t) * distance + (3 * t ** 2 - 4 * t + 1) * tangent) / duration;
  }
  const arm = smooth((time - LAUNCH.charge) / (LAUNCH.release - LAUNCH.charge));
  const thrust = phase === 'boost' ? smooth((time - LAUNCH.release) / .3) : phase === 'climb' ? 1 - smooth((time - LAUNCH.boost) / 1.1) : 0;
  return { time, phase, height, speed, arm, thrust, charge: started ? smooth(time / LAUNCH.charge) : 0, progress: time / LAUNCH.duration };
}

export function createLaunchController() {
  let time = 0;
  let started = false;
  let playing = false;
  return {
    start() { time = 0; started = playing = true; },
    reset() { time = 0; started = playing = false; },
    seek(value) { time = Math.max(0, Math.min(LAUNCH.duration, Number.isFinite(value) ? value : 0)); started = true; playing = false; },
    setPlaying(value) { playing = started && time < LAUNCH.duration && value; },
    update(delta) {
      if (playing && Number.isFinite(delta) && delta > 0) time = Math.min(LAUNCH.duration, time + delta);
      if (time === LAUNCH.duration) playing = false;
      return this.inspect();
    },
    inspect() { return { ...sampleLaunch(time, started), playing, started }; },
  };
}

export function buildLaunchRig(materials, position, angle) {
  const group = new THREE.Group();
  group.name = 'animated-launch-rig';
  group.position.copy(position);
  group.rotation.y = angle;
  const staticParts = createAssembly();
  const { add, box, beam, round } = staticParts;
  const shoe = chamferedBox(3.4, 3.6, 9.2, .18);
  for (const side of [-1, 1]) {
    add(shoe, materials.dark, [side * 6.5, 6.5, 0], undefined, undefined, 'launch-foundation');
    for (const z of [-3.6, 3.6]) {
      beam(materials.steel, [side * 6.5, 8, z], [side * 6.5, 39, z], .46, 'continuous-launch-rail');
      beam(materials.panel, [side * 5.8, 8, z], [side * 5.8, 39, z], .24, 'inner-guide');
      for (let y = 9; y < 38; y += 3.6) {
        beam(materials.steel, [side * 6.5, y, z], [side * 6.5, y + 3.6, -z], .19, 'launch-diagonal');
        box(materials.dark, [side * 6.55, y + 1.7, z], [.7, 2.7, .65], undefined, 'rail-housing');
      }
      round(materials.steel, [side * 7.2, 10, z * .8], .48, 8, undefined, 'booster-cylinder');
      for (const y of [6.3, 10, 13.7]) round(materials.dark, [side * 7.2, y, z * .8], .55, .22, undefined, 'booster-band');
      beam(materials.yellow, [side * 7.75, 6.5, z], [side * 7.75, 34, z], .09, 'fuel-line');
    }
    box(materials.panel, [side * 6.5, 39, 0], [2.2, .55, 8.2], undefined, 'launch-crown');
    for (const y of [16, 24, 32]) {
      box(materials.steel, [side * 8, y, 0], [2.8, .24, 8.6], undefined, 'launch-platform');
      for (const z of [-4.2, 4.2]) {
        beam(materials.yellow, [side * 9.2, y, z], [side * 9.2, y + 1.15, z], .08);
        beam(materials.panel, [side * 9.2, y + 1.15, z], [side * 6.8, y + 1.15, z], .07);
      }
      for (let i = -3; i <= 3; i++) box(materials.dark, [side * 8, y + .15, i], [2.4, .04, .055]);
    }
    add(chamferedBox(1.2, 2.4, 2, .09), materials.panel, [side * 8.5, 7, 5.1], undefined, undefined, 'launch-control-cabinet');
  }
  group.add(staticParts.finish(true));
  const movingParts = createAssembly();
  movingParts.add(chamferedBox(6.3, .35, 4.7, .12), materials.dark, [0, 0, 0], undefined, undefined, 'launch-sled');
  for (const side of [-1, 1]) {
    for (const z of [-2.8, 2.8]) {
      movingParts.beam(materials.steel, [side * 2, -.1, z * .65], [side * 6.3, -.8, z], .2, 'sled-outrigger');
      movingParts.round(materials.dark, [side * 6.3, -.9, z], .45, .6, undefined, 'booster-nozzle');
    }
  }
  const sled = movingParts.finish();
  group.add(sled);
  const arms = [];
  for (const side of [-1, 1]) {
    for (const z of [-2, 2]) {
      const assembly = createAssembly();
      assembly.beam(materials.steel, [0, 0, 0], [-side * 3.6, 0, 0], .28, 'release-link');
      assembly.beam(materials.yellow, [0, -.4, 0], [-side * 3.2, -.14, 0], .13, 'release-piston');
      assembly.round(materials.yellow, [-side * 3.6, 0, 0], .28, .38, [Math.PI / 2, 0, 0], 'release-joint');
      const arm = assembly.finish();
      arm.position.set(side * 6.4, 14.9, z);
      arm.userData.side = side;
      arms.push(arm);
      group.add(arm);
    }
  }
  const flameMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, strength: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; uniform float time; void main(){vUv=uv; vec3 p=position; p.xz*=1.+sin(p.y*18.-time*27.)*.13; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float time; uniform float strength; void main(){float t=1.-vUv.y; float pulse=.8+.2*sin(vUv.y*70.-time*35.+vUv.x*13.); float alpha=pow(1.-t, .55)*pulse*strength; vec3 col=mix(vec3(1.,.21,.035),vec3(1.,.85,.48),pow(1.-t,3.)); gl_FragColor=vec4(col,alpha*.7);}`,
  });
  const flames = [];
  const flameGeometry = new THREE.CylinderGeometry(.18, .7, 1, 14, 6, true);
  flameGeometry.translate(0, -.5, 0);
  for (const side of [-1, 1]) for (const z of [-2.8, 2.8]) {
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.set(side * 6.3, 12.7, z);
    flames.push(flame);
    group.add(flame);
  }
  const smokeGeometry = new THREE.BufferGeometry();
  const seeds = new Float32Array(96 * 3);
  const ages = new Float32Array(96);
  for (let i = 0; i < 96; i++) {
    seeds.set([Math.sin(i * 127.1), Math.cos(i * 73.7), (i % 4) / 3], i * 3);
    ages[i] = i / 96;
  }
  smokeGeometry.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
  smokeGeometry.setAttribute('offset', new THREE.BufferAttribute(ages, 1));
  const smokeMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, strength: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: `uniform float time; uniform float pixelRatio; attribute float offset; varying float vAge; void main(){vAge=fract(time*.16+offset); vec3 p=vec3(position.x*(3.+vAge*17.), 3.+vAge*9.,position.y*(3.+vAge*17.)); vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(160.,(3.+vAge*10.)*pixelRatio*300./max(1.,-mv.z));}`,
    fragmentShader: `uniform float strength; varying float vAge; void main(){vec2 p=gl_PointCoord*2.-1.; float d=dot(p,p); float n=sin(p.x*9.+vAge*5.)*sin(p.y*7.); float a=smoothstep(1.,.1,d)*(.35+.07*n)*(1.-vAge)*strength; gl_FragColor=vec4(mix(vec3(.36,.39,.4),vec3(.66,.65,.61),vAge),a);}`,
  });
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
  smoke.frustumCulled = false;
  group.add(smoke);
  const glow = new THREE.PointLight(0xffad55, 0, 52, 2);
  glow.position.set(0, 16, 0);
  group.add(glow);
  return {
    group,
    update(sample, pixelRatio = 1) {
      sled.position.y = 14.6 + Math.min(21, sample.height - LAUNCH.parkedY);
      arms.forEach(arm => { arm.rotation.z = -arm.userData.side * sample.arm * 1.2; });
      flames.forEach(flame => {
        flame.visible = sample.thrust > .001;
        flame.position.y = sled.position.y - 1.25;
        flame.scale.setScalar(1);
        flame.scale.y = Math.max(1, flame.position.y - 1) * (.85 + .1 * Math.sin(sample.time * 23));
      });
      flameMaterial.uniforms.time.value = smokeMaterial.uniforms.time.value = sample.time;
      flameMaterial.uniforms.strength.value = sample.thrust;
      smokeMaterial.uniforms.strength.value = Math.min(1, sample.thrust + (sample.time > LAUNCH.boost ? .7 * (1 - smooth((sample.time - LAUNCH.boost) / 5)) : 0));
      smokeMaterial.uniforms.pixelRatio.value = pixelRatio;
      smoke.visible = smokeMaterial.uniforms.strength.value > .001;
      glow.intensity = sample.thrust * 65;
      glow.position.y = sled.position.y;
      group.userData.sample = sample;
    },
  };
}
