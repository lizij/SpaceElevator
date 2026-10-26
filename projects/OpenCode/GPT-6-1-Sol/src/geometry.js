import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function chamferedBox(width, height, depth, bevel = .12, bevelSegments = 1) {
  const cut = Math.min(bevel, width * .2, depth * .2);
  const x = width / 2;
  const z = depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-x + cut, -z);
  shape.lineTo(x - cut, -z);
  shape.lineTo(x, -z + cut);
  shape.lineTo(x, z - cut);
  shape.lineTo(x - cut, z);
  shape.lineTo(-x + cut, z);
  shape.lineTo(-x, z - cut);
  shape.lineTo(-x, -z + cut);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(.01, height - cut * 2), bevelEnabled: true,
    bevelSize: cut * .35, bevelThickness: cut, bevelSegments, steps: 1, curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -(height - cut * 2) / 2, 0);
  return geometry;
}

export function taperedBox(bottomWidth, topWidth, height, depth) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const upper = positions.getY(i) > 0;
    positions.setXYZ(i, positions.getX(i) * (upper ? topWidth : bottomWidth), positions.getY(i) * height, positions.getZ(i) * depth);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createAssembly() {
  const group = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const components = {};
  function add(geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0], name = 'detail') {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    if (rotation instanceof THREE.Quaternion) mesh.quaternion.copy(rotation);
    else mesh.rotation.set(...rotation);
    group.add(mesh);
    components[name] = (components[name] || 0) + 1;
    return mesh;
  }
  const box = (material, position, scale, rotation, name) => add(cube, material, position, scale, rotation, name);
  const round = (material, position, radius, height, rotation, name) => add(cylinder, material, position, [radius, height, radius], rotation, name);
  function beam(material, a, b, width = .1, name = 'truss') {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    return add(cube, material, start.add(end).multiplyScalar(.5).toArray(), [width, direction.length(), width],
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()), name);
  }
  function finish(instanced = false) {
    const entries = new Map();
    for (const mesh of group.children) {
      mesh.updateMatrix();
      const key = instanced ? `${mesh.geometry.uuid}/${mesh.material.uuid}` : mesh.material.uuid;
      if (!entries.has(key)) entries.set(key, { material: mesh.material, geometry: mesh.geometry, meshes: [] });
      entries.get(key).meshes.push(mesh);
    }
    group.clear();
    for (const { material, geometry, meshes } of entries.values()) {
      let mesh;
      if (instanced) {
        mesh = new THREE.InstancedMesh(geometry, material, meshes.length);
        meshes.forEach((item, i) => mesh.setMatrixAt(i, item.matrix));
        mesh.computeBoundingSphere();
      } else {
        const geometries = meshes.map(item => {
          const transformed = item.geometry.clone().applyMatrix4(item.matrix);
          if (!transformed.index) return transformed;
          const expanded = transformed.toNonIndexed();
          transformed.dispose();
          return expanded;
        });
        mesh = new THREE.Mesh(mergeGeometries(geometries), material);
        geometries.forEach(item => item.dispose());
      }
      mesh.castShadow = material.emissiveIntensity < 1;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    group.userData.components = components;
    return group;
  }
  return { add, box, round, beam, finish, components };
}
