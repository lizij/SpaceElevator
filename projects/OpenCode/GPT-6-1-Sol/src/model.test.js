import test from 'node:test';
import assert from 'node:assert/strict';
import { buildElevator, seededRandom, radialPoint, DIMENSIONS } from './model.js';
import { sampleLaunch, createLaunchController, LAUNCH } from './launch.js';
import { buildInterior, CABIN_VIEWS } from './interior.js';
import * as THREE from 'three';

test('公开结构：3 主塔、12 组弹射塔、9 轿厢、216 缆索', () => {
  const model = buildElevator();
  assert.deepEqual(model.root.userData.counts, { mainTowers: 3, launchGroups: 12, cableChannels: 9, cables: 216, climbers: 9 });
  assert.equal(model.root.getObjectByName('216-carbon-nanotube-cables').geometry.attributes.position.count, 432);
  assert.equal(DIMENSIONS.radius * 2, 150);
});

test('轿厢具有四角驱动模块及完整独立近景几何', () => {
  const { climbers } = buildElevator();
  climbers.forEach(climber => {
    assert.equal(climber.name, 'four-corner-climber');
    assert.ok(climber.children.length >= 8);
    assert.ok(climber.children.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0) > 1800);
    assert.ok(climber.position.y >= LAUNCH.parkedY);
    assert.ok(climber.scale.x > 0);
    const components = climber.userData.components;
    assert.equal(components['drive-pod'], 4);
    assert.equal(components['guide-collar'], 4);
    assert.equal(components.porthole, 22);
    assert.equal(components['drive-louvre'], 24);
    assert.equal(components['roof-intake'], 4);
    assert.equal(components['bottom-diagonal'], 12);
    assert.equal(components['cable-guide-roller'], 16);
    assert.equal(components['drive-hose'], 4);
    assert.equal(components['roof-inset-tile'], 12);
  });
});

test('机械细节不是空层：液压、维修平台、拼缝和抗闪烁纹理', () => {
  const { root, materials } = buildElevator();
  const components = root.getObjectByName('industrial-detail-layer').userData.components;
  assert.equal(components['hydraulic-barrel'], 44);
  assert.equal(components['hydraulic-piston'], 44);
  assert.equal(components['launch-service-balcony'], 66);
  assert.equal(components['tower-panel-joint'], 66);
  assert.equal(components['quay-crane-mast'], 6);
  assert.equal(components['tower-layered-panel'], 216);
  for (const name of ['panel', 'white', 'steel', 'concrete']) {
    assert.equal(materials[name].map.image.width, name === 'white' ? 1024 : 512);
    assert.equal(materials[name].map.generateMipmaps, true);
    assert.ok(materials[name].normalMap !== materials[name].map);
    assert.ok(materials[name].roughnessMap !== materials[name].map);
    assert.equal(materials[name].map.colorSpace, THREE.SRGBColorSpace);
    assert.equal(materials[name].normalMap.colorSpace, THREE.NoColorSpace);
    assert.ok(materials[name].normalScale.x > 0);
  }
});

test('发射时序单调、连续、完整且助推属于塔架', () => {
  let previous = LAUNCH.parkedY;
  for (let time = 0; time <= LAUNCH.duration; time += .01) {
    const sample = sampleLaunch(time);
    assert.ok(sample.height >= previous - 1e-8);
    assert.ok(sample.arm >= 0 && sample.arm <= 1);
    assert.ok(sample.thrust >= 0 && sample.thrust <= 1);
    assert.ok(sample.speed >= -1e-8);
    previous = sample.height;
  }
  for (const boundary of [LAUNCH.charge, LAUNCH.release, LAUNCH.boost]) {
    assert.ok(Math.abs(sampleLaunch(boundary - .00001).height - sampleLaunch(boundary + .00001).height) < .001);
    assert.ok(Math.abs(sampleLaunch(boundary - .00001).speed - sampleLaunch(boundary + .00001).speed) < .001);
  }
  assert.equal(sampleLaunch(0, false).phase, 'ready');
  assert.equal(sampleLaunch(2.7).phase, 'release');
  assert.equal(sampleLaunch(4.5).phase, 'boost');
  assert.equal(sampleLaunch(9).phase, 'climb');
  assert.equal(sampleLaunch(100).height, LAUNCH.finalY);
  assert.equal(sampleLaunch(100).speed, 0);
  const model = buildElevator();
  assert.deepEqual(model.launchPositions[1].toArray(), model.cableChannels[1].toArray());
  assert.equal(model.launchClimber.userData.channel, 1);
  assert.equal(model.launchClimber.position.y, LAUNCH.parkedY);
  model.root.updateMatrixWorld(true);
  const obstacles = model.root.children.filter(object => object.name !== 'four-corner-climber');
  const ray = new THREE.Raycaster();
  for (const [x, z] of [[0, 0], [-3, 0], [3, 0], [0, -2], [0, 2]]) {
    const origin = model.launchClimber.localToWorld(new THREE.Vector3(x, 3, z));
    ray.set(origin, new THREE.Vector3(0, 1, 0));
    ray.far = LAUNCH.finalY;
    assert.equal(ray.intersectObjects(obstacles, true).length, 0, '发射主体上升路径不能穿过主塔斜撑或固定平台');
  }
  model.launchRig.update(sampleLaunch(4.5));
  assert.equal(model.launchRig.group.userData.sample.phase, 'boost');
  assert.equal(model.climbers[0].children[0].geometry, model.climbers[1].children[0].geometry);
});

test('发射控制器暂停、拖动、复位和重播均确定且不会循环跳回', () => {
  const controller = createLaunchController();
  controller.update(10);
  assert.equal(controller.inspect().phase, 'ready');
  controller.start();
  controller.update(4.5);
  assert.equal(controller.inspect().phase, 'boost');
  controller.setPlaying(false);
  const paused = controller.inspect();
  controller.update(2);
  assert.deepEqual(controller.inspect(), paused);
  controller.setPlaying(true);
  controller.update(30);
  assert.equal(controller.inspect().phase, 'complete');
  controller.update(30);
  assert.equal(controller.inspect().height, LAUNCH.finalY);
  controller.seek(2.8);
  assert.equal(controller.inspect().phase, 'release');
  assert.equal(controller.inspect().playing, false);
  controller.reset();
  assert.equal(controller.inspect().phase, 'ready');
  controller.start();
  assert.equal(controller.inspect().time, 0);
  assert.equal(controller.inspect().playing, true);
});

test('三舱内饰真实几何与结构：24 乘客座椅、3 操控席和货舱吊机', () => {
  const interior = buildInterior();
  assert.deepEqual(interior.seatCounts, { passenger: 24, control: 3, cargo: 0 });
  for (const type of Object.keys(CABIN_VIEWS)) {
    interior.setRoom(type);
    assert.equal(Object.values(interior.rooms).filter(room => room.visible).length, 1);
    const components = interior.rooms[type].userData.components;
    assert.equal(components['cabin-porthole'], 14);
    assert.equal(components['ceiling-luminaire'], 14);
    assert.equal(components['pressure-door-leaf'], 2);
  }
  assert.equal(interior.rooms.passenger.userData.components['restraint-strap'], 48);
  assert.equal(interior.rooms.control.userData.components['console-monitor'], 3);
  assert.equal(interior.rooms.cargo.userData.components['overhead-gantry'], 1);
  assert.equal(interior.rooms.cargo.userData.components['cargo-container'], 8);
  interior.root.traverse(object => {
    if (object.geometry) assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
    if (object.isInstancedMesh) assert.ok([...object.instanceMatrix.array].every(Number.isFinite));
  });
});

test('全部实例矩阵和顶点均为有限值', () => {
  const { root } = buildElevator();
  root.traverse(object => {
    if (object.isInstancedMesh) {
      assert.ok(object.count > 0);
      assert.ok([...object.instanceMatrix.array].every(Number.isFinite));
      assert.ok(object.boundingSphere.radius > 0);
    }
    if (object.geometry) assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
  });
});

test('径向布局与程序随机在多次构建间稳定', () => {
  const a = seededRandom(17);
  const b = seededRandom(17);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
  const p = radialPoint(33, Math.PI / 2, 8);
  assert.ok(Math.abs(p.x) < 1e-10);
  assert.equal(p.y, 8);
  assert.equal(p.z, 33);
  const first = buildElevator();
  const second = buildElevator();
  assert.deepEqual(first.launchPositions.map(p => p.toArray()), second.launchPositions.map(p => p.toArray()));
});
