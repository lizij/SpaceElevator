import * as THREE from 'three';
import { seededRandom, radialPoint } from './model.js';
import { createPBRSurface } from './surfaces.js';
import { createAssembly, chamferedBox } from './geometry.js';

export function createEnvironment(scene, renderer, mobile) {
  const skyUniforms = {
    topColor: { value: new THREE.Color(0x63818d) },
    horizonColor: { value: new THREE.Color(0xdccab1) },
    night: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyUniforms,
    vertexShader: `varying vec3 vPosition; void main(){vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vPosition; uniform vec3 topColor; uniform vec3 horizonColor; uniform float night;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){return noise(p)*.52+noise(p*2.03)*.27+noise(p*4.07)*.14+noise(p*8.1)*.07;}
      void main(){vec3 d=normalize(vPosition); float h=max(d.y,0.); vec3 col=mix(horizonColor,topColor,pow(h,.38));
      float alignment=max(dot(d,normalize(vec3(-.7,.55,.45))),0.);
      col+=vec3(1.,.65,.3)*(pow(alignment,800.)*8.+pow(alignment,14.)*.18)*(1.-night);
      vec2 p=d.xz/max(.08,d.y)*1.25; float clouds=smoothstep(.47,.73,fbm(p+fbm(p*.7)));
      clouds*=smoothstep(.01,.13,h)*(1.-smoothstep(.6,1.,h));
      col=mix(col,mix(vec3(.79,.8,.75),vec3(.047,.07,.1),night),clouds*.72);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);
  const generator = new THREE.PMREMGenerator(renderer);
  const reflectionScene = new THREE.Scene();
  reflectionScene.add(sky.clone());
  const dayReflection = generator.fromScene(reflectionScene, .04);
  skyUniforms.night.value = 1;
  skyUniforms.topColor.value.set(0x081625);
  skyUniforms.horizonColor.value.set(0x263d4b);
  const nightReflection = generator.fromScene(reflectionScene, .06);
  skyUniforms.night.value = 0;
  skyUniforms.topColor.value.set(0x63818d);
  skyUniforms.horizonColor.value.set(0xdccab1);
  generator.dispose();
  scene.environment = dayReflection.texture;
  scene.environmentIntensity = .75;
  scene.fog = new THREE.FogExp2(0xa3b3b5, .0013);
  const hemi = new THREE.HemisphereLight(0xc8dfed, 0x425457, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe3bb, 3.7);
  sun.position.set(-140, 115, 85);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sun.shadow.camera.left = -125;
  sun.shadow.camera.right = 125;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -125;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 550;
  sun.shadow.normalBias = .07;
  sun.shadow.bias = -.0003;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb1d6f0, .65);
  fill.position.set(150, 50, 100);
  scene.add(fill);

  const coasts = Array.from({ length: 8 }, () => new THREE.Vector4(10000, 10000, 1, 1));
  const waterUniforms = { time: { value: 0 }, color: { value: new THREE.Color(0x183d40) }, night: { value: 0 }, coasts: { value: coasts } };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000, mobile ? 64 : 128, mobile ? 64 : 128), new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: `uniform float time; varying vec3 vWorld; varying float vWave;
      void main(){ vec3 p=position; float wave=sin(p.x*.038+p.y*.017+time*.45)*.16+sin(p.x*.09-p.y*.041+time*.65)*.08;
      p.z+=wave*.08; vWave=wave; vWorld=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.); }`,
    fragmentShader: `uniform float time; uniform vec3 color; uniform float night; uniform vec4 coasts[8]; varying vec3 vWorld; varying float vWave;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){ vec2 uv=vWorld.xz; vec3 viewDir=normalize(cameraPosition-vWorld);
      float n=noise(uv*.08+vec2(time*.027,0.)); float detail=noise(uv*.38+time*.04);
      float dx=cos(uv.x*.38-uv.y*.17+time*.45)*.025+cos(uv.x*.61+uv.y*.49+time*.71)*.012;
      float dz=cos(uv.x*.38-uv.y*.17+time*.45)*-.012+cos(uv.x*.61+uv.y*.49+time*.71)*.009;
      dx+=(noise(uv*.38+vec2(.08,0.)+time*.04)-detail)*.1;
      dz+=(noise(uv*.38+vec2(0.,.08)+time*.04)-detail)*.1;
      vec3 normal=normalize(vec3(-dx,1.,-dz));
      float fresnel=.02+.98*pow(1.-max(dot(normal,viewDir),0.),5.);
      vec3 reflected=reflect(-viewDir,normal); float h=max(reflected.y,0.);
      vec3 sky=mix(vec3(.61,.63,.57),vec3(.29,.43,.49),pow(h,.4)); sky=mix(sky,vec3(.019,.045,.072),night);
      vec3 col=color*(.88+n*.16)+vec3(.006,.025,.024); col=mix(col,sky,fresnel);
      vec3 halfDir=normalize(viewDir+normalize(vec3(-.7,.55,.45))); float ndh=max(dot(normal,halfDir),0.);
      float glint=pow(ndh,720.)*.4+pow(ndh,80.)*.008;
      col+=vec3(1.,.78,.52)*glint*(1.-night);
      float foam=0.; for(int i=0;i<8;i++){float r=length((uv-coasts[i].xy)/coasts[i].zw); foam=max(foam,(1.-smoothstep(.96,1.15,r))*smoothstep(.78,.91,r));}
      float baseRing=abs(length(uv)-75.); foam=max(foam,1.-smoothstep(.2,2.5,baseRing));
      col=mix(col,vec3(.55,.63,.6),foam*(.27+detail*.15)*(1.-night*.9));
      float fog=1.-exp(-length(cameraPosition-vWorld)*.00075); col=mix(col,mix(vec3(.32,.41,.42),vec3(.036,.07,.105),night),fog);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -.8;
  water.name = 'procedural-ocean';
  scene.add(water);

  const random = seededRandom(171);
  const islandMaterial = new THREE.MeshStandardMaterial({ color: 0x8a9282, roughness: .98, vertexColors: true, ...createPBRSurface(281, 'concrete', 512) });
  const islands = new THREE.Group();
  for (let i = 0; i < 25; i++) {
    const a = i * .71;
    const r = i < 8 ? 165 + random() * 105 : 330 + random() * 500;
    const p = radialPoint(r, a);
    const geo = new THREE.PlaneGeometry(2, 2, mobile ? 20 : 32, mobile ? 20 : 32);
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position;
    const colors = [];
    const width = 16 + random() * 38;
    const height = 8 + random() * 21;
    const depth = width * (.65 + random() * .7);
    for (let j = 0; j < positions.count; j++) {
      const x = positions.getX(j);
      const z = positions.getZ(j);
      const r = Math.sqrt(x * x + z * z);
      const shape = .83 + Math.sin(Math.atan2(z, x) * 5 + i) * .09;
      const falloff = Math.max(0, 1 - r / shape);
      const ridges = .58 + Math.sin(x * 9 + i) * Math.cos(z * 7 - i) * .17 + Math.sin(x * 22 + z * 15) * .05;
      const y = Math.pow(falloff, 1.25) * height * ridges - 1.15;
      positions.setXYZ(j, x * width, y, z * depth);
      const c = new THREE.Color(y < .4 ? 0x778077 : y < height * .24 ? 0x3f5145 : 0x737b6b);
      const shade = .88 + Math.sin(x * 34 + z * 17) * .09;
      c.multiplyScalar(shade);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const island = new THREE.Mesh(geo, islandMaterial);
    island.position.set(p.x, 0, p.z);
    if (i < 8) coasts[i].set(p.x, p.z, width * .72, depth * .72);
    island.castShadow = true;
    island.receiveShadow = true;
    islands.add(island);
  }
  scene.add(islands);

  const shipMaterial = new THREE.MeshStandardMaterial({ color: 0x626d6b, metalness: .35, roughness: .75 });
  const hull = chamferedBox(3.2, 1.5, 14, .55);
  for (let i = 0; i < 4; i++) {
    const ship = createAssembly();
    ship.add(hull, shipMaterial, [0, 0, 0]);
    ship.add(chamferedBox(2.4, 1.7, 3.3, .2), shipMaterial, [0, 1.25, 3.6]);
    ship.box(shipMaterial, [0, 2.15, 3.6], [2.7, .14, 3.6]);
    for (const x of [-1.05, 1.05]) ship.beam(shipMaterial, [x, .8, -5.8], [x, 1.4, -5.8], .06);
    ship.beam(shipMaterial, [0, 2.2, 4], [0, 4.2, 4], .08);
    const vessel = ship.finish();
    vessel.position.copy(radialPoint(118 + i * 20, .6 + i * 1.9, .1));
    vessel.rotation.y = i * 1.4;
    scene.add(vessel);
  }
  function setNight(enabled) {
    const n = enabled ? 1 : 0;
    skyUniforms.night.value = n;
    skyUniforms.topColor.value.set(enabled ? 0x081625 : 0x63818d);
    skyUniforms.horizonColor.value.set(enabled ? 0x263d4b : 0xdccab1);
    scene.fog.color.set(enabled ? 0x132b3b : 0xa3b3b5);
    hemi.intensity = enabled ? .8 : 1.5;
    sun.intensity = enabled ? .45 : 3.7;
    sun.color.set(enabled ? 0xa5c8ef : 0xffdfb0);
    fill.intensity = enabled ? .5 : .65;
    scene.environment = enabled ? nightReflection.texture : dayReflection.texture;
    scene.environmentIntensity = enabled ? .5 : .75;
    waterUniforms.color.value.set(enabled ? 0x0e2538 : 0x183d40);
    waterUniforms.night.value = n;
    renderer.toneMappingExposure = enabled ? 1.12 : .92;
  }
  return { water, setNight, update: time => { waterUniforms.time.value = time; } };
}
