import * as THREE from 'three'

export const COLORS = {
  white: '#d7dee7',
  whiteWarm: '#c9d0d8',
  light: '#aeb8c3',
  mid: '#77828d',
  dark: '#2b333c',
  darkest: '#111820',
  black: '#070b0f',
  steel: '#4b5662',
  gold: '#b58a4a',
  orange: '#e37b32',
  red: '#b43b33',
  blue: '#5fa9dc',
  ice: '#a8dcff',
  warm: '#ffd8a2',
  concrete: '#626b73',
  sea: '#15313f',
}

export const whiteMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.white,
  roughness: 0.42,
  metalness: 0.32,
})

export const lightMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.light,
  roughness: 0.48,
  metalness: 0.3,
})

export const darkMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.dark,
  roughness: 0.5,
  metalness: 0.62,
})

export const steelMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.steel,
  roughness: 0.55,
  metalness: 0.68,
})

export const ringMaterial = new THREE.MeshStandardMaterial({
  color: '#8b97a2',
  roughness: 0.5,
  metalness: 0.7,
})

export const gantryMaterial = new THREE.MeshStandardMaterial({
  color: '#3f4952',
  roughness: 0.55,
  metalness: 0.62,
})

export const goldMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.gold,
  roughness: 0.26,
  metalness: 0.95,
})

export const concreteMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.concrete,
  roughness: 0.9,
  metalness: 0.05,
})

export const redMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.red,
  roughness: 0.45,
  metalness: 0.4,
})

export const warmEmissive = new THREE.MeshStandardMaterial({
  color: '#20180d',
  emissive: COLORS.warm,
  emissiveIntensity: 2.6,
  roughness: 0.4,
})

export const blueEmissive = new THREE.MeshStandardMaterial({
  color: '#06131d',
  emissive: COLORS.blue,
  emissiveIntensity: 2.4,
  roughness: 0.35,
})

export const orangeEmissive = new THREE.MeshStandardMaterial({
  color: '#1d0d05',
  emissive: COLORS.orange,
  emissiveIntensity: 2.8,
  roughness: 0.35,
})

export const iceMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.ice,
  emissive: '#2d7fae',
  emissiveIntensity: 0.55,
  transparent: true,
  opacity: 0.38,
  roughness: 0.12,
  metalness: 0.15,
  side: THREE.DoubleSide,
  depthWrite: false,
})

export const glassMaterial = new THREE.MeshStandardMaterial({
  color: '#8fc6e8',
  emissive: '#1c5f87',
  emissiveIntensity: 0.85,
  transparent: true,
  opacity: 0.36,
  roughness: 0.08,
  metalness: 0.2,
  side: THREE.DoubleSide,
  depthWrite: false,
})

export const windowMaterial = new THREE.MeshStandardMaterial({
  color: '#0a1a28',
  emissive: '#b9e2ff',
  emissiveIntensity: 1.25,
  roughness: 0.35,
})

export const panelLineMaterial = new THREE.MeshStandardMaterial({
  color: '#3a444f',
  roughness: 0.6,
  metalness: 0.5,
})
