import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../../../state/useSceneStore'
import { HOTSPOTS } from '../../../data/specs'
import { Hotspot } from '../Hotspot'
import { SpaceBackdrop } from '../SpaceBackdrop'
import { Sun } from '../Sun'
import {
  blueEmissive,
  darkMaterial,
  goldMaterial,
  lightMaterial,
  orangeEmissive,
  panelLineMaterial,
  redMaterial,
  steelMaterial,
  warmEmissive,
  windowMaterial,
} from '../../kit/materials'
import { getGlowTexture, makeDecalTexture } from '../../kit/textures'
import { getPanelMaterial } from '../../kit/panelTexture'
import { CabinGreebles } from '../../kit/Greebles'
import { BeamInstances, type Beam } from '../../kit/BeamInstances'

const HALF_W = 220
const HALF_D = 150
const BODY_H = 170
const CORNER_X = 238
const CORNER_Z = 152

const cabinPanelMaterial = getPanelMaterial('white', { repeatX: 8, repeatY: 3, bumpScale: 0.35 })
const modulePanelMaterial = getPanelMaterial('white', { repeatX: 2, repeatY: 2, bumpScale: 0.28 })

const iceShieldMaterial = new THREE.MeshStandardMaterial({
  color: '#46525b',
  metalness: 0.35,
  roughness: 0.72,
})

const podDecal = makeDecalTexture(['UEG', 'CLAMP A'], { width: 512, height: 256, fontSize: 56, color: '#24313b' })

const iceShieldEdgeMaterial = new THREE.MeshStandardMaterial({
  color: '#6f7c85',
  metalness: 0.3,
  roughness: 0.65,
})

function loftGeometry(
  width: number,
  depth: number,
  levels: { y: number; scale: number }[],
  cut: number,
) {
  const hw = width / 2
  const hd = depth / 2
  const outline: [number, number][] = [
    [-hw + cut, -hd],
    [hw - cut, -hd],
    [hw, -hd + cut],
    [hw, hd - cut],
    [hw - cut, hd],
    [-hw + cut, hd],
    [-hw, hd - cut],
    [-hw, -hd + cut],
  ]
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const perimeter = outline.length
  levels.forEach((level) => {
    outline.forEach(([x, z], i) => {
      positions.push(x * level.scale, level.y, z * level.scale)
      uvs.push(i / perimeter, (level.y + 90) / 180)
    })
  })
  for (let j = 0; j < levels.length - 1; j++) {
    for (let i = 0; i < perimeter; i++) {
      const a = j * perimeter + i
      const b = j * perimeter + ((i + 1) % perimeter)
      const c = b + perimeter
      const e = a + perimeter
      indices.push(a, e, b, b, e, c)
    }
  }
  const bottom = 0
  const top = (levels.length - 1) * perimeter
  for (let i = 1; i < perimeter - 1; i++) {
    indices.push(bottom, bottom + i, bottom + i + 1)
    indices.push(top, top + i + 1, top + i)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function CabinLayer() {
  const mode = useSceneStore((s) => s.mode)

  return (
    <group>
      <color attach="background" args={['#03060a']} />
      <SpaceBackdrop starRadius={7000} starCount={4500} earth earthY={-15000} earthZ={-8200} />
      <Sun position={[720, 520, -540]} scale={42} color="#fff0d5" opacity={0.95} />

      <group>
        <CabinBody />
        <ClampTower x={CORNER_X} z={CORNER_Z} />
        <ClampTower x={-CORNER_X} z={CORNER_Z} />
        <ClampTower x={CORNER_X} z={-CORNER_Z} />
        <ClampTower x={-CORNER_X} z={-CORNER_Z} />
        <CableBundles />
        <IceShield />
        <Thrusters />
        <TopDeck />
      </group>

      <hemisphereLight args={['#aac8e5', '#141d27', mode === 'film' ? 0.55 : 0.9]} />
      <ambientLight intensity={mode === 'film' ? 0.22 : 0.5} />
      <directionalLight position={[520, 620, -420]} intensity={mode === 'film' ? 2.7 : 2.0} color="#fff2df" />
      <directionalLight position={[-300, -160, 280]} intensity={0.7} color="#4c8fc9" />
      <pointLight position={[0, -150, 0]} intensity={14} distance={180} color="#ff9b52" />
      <pointLight position={[0, 115, 0]} intensity={8} distance={160} color="#9ed3ff" />

      {HOTSPOTS.filter((spot) => spot.view === 'cabin').map((spot) => (
        <Hotspot key={spot.id} spot={spot} />
      ))}
    </group>
  )
}

function CabinBody() {
  const sideDecal = useMemo(
    () =>
      makeDecalTexture(['SEP 03', 'UEG / SPACE ELEVATOR', 'CABIN / CLIMB'], {
        width: 768,
        height: 320,
        fontSize: 52,
        color: '#18232c',
      }),
    [],
  )
  const lightDecal = useMemo(
    () => makeDecalTexture(['UEG / CLIMB 03', 'AIRLOCK  A'], { width: 640, height: 220, fontSize: 54, color: '#d9e6f2' }),
    [],
  )
  const warnDecal = useMemo(
    () => makeDecalTexture(['ICE SHIELD', 'DO NOT STEP'], { width: 640, height: 220, fontSize: 58, color: '#c77a4a' }),
    [],
  )
  const bodyGeometry = useMemo(
    () =>
      loftGeometry(440, 300, [
        { y: -85, scale: 0.82 },
        { y: -58, scale: 0.96 },
        { y: 0, scale: 1 },
        { y: 52, scale: 0.98 },
        { y: 78, scale: 0.88 },
        { y: 85, scale: 0.82 },
      ], 16),
    [],
  )

  return (
    <group>
      {/* wide, flat lifting body */}
      <mesh geometry={bodyGeometry} material={cabinPanelMaterial} castShadow receiveShadow />

      {/* raised dark roof panel with white chamfered hood */}
      <mesh position={[0, 89, 0]} material={darkMaterial} castShadow>
        <boxGeometry args={[376, 7, 246]} />
      </mesh>
      <mesh position={[0, 86, 0]} material={lightMaterial}>
        <boxGeometry args={[402, 4, 268]} />
      </mesh>
      <mesh position={[0, 76, 123]} rotation={[0.38, 0, 0]} material={cabinPanelMaterial}>
        <boxGeometry args={[438, 9, 56]} />
      </mesh>
      <mesh position={[0, 76, -123]} rotation={[-0.38, 0, 0]} material={cabinPanelMaterial}>
        <boxGeometry args={[438, 9, 56]} />
      </mesh>
      <mesh position={[193, 76, 0]} rotation={[0, 0, -0.38]} material={cabinPanelMaterial}>
        <boxGeometry args={[56, 9, 288]} />
      </mesh>
      <mesh position={[-193, 76, 0]} rotation={[0, 0, 0.38]} material={cabinPanelMaterial}>
        <boxGeometry args={[56, 9, 288]} />
      </mesh>
      {/* darker shoulder recess under the sloped hood */}
      <mesh position={[0, 69, 144]} material={darkMaterial}>
        <boxGeometry args={[400, 7, 5]} />
      </mesh>
      <mesh position={[0, 69, -144]} material={darkMaterial}>
        <boxGeometry args={[400, 7, 5]} />
      </mesh>
      <mesh position={[214, 69, 0]} material={darkMaterial}>
        <boxGeometry args={[5, 7, 266]} />
      </mesh>
      <mesh position={[-214, 69, 0]} material={darkMaterial}>
        <boxGeometry args={[5, 7, 266]} />
      </mesh>

      {/* side equipment modules / recessed outriggers */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 214, -4, 0]}>
          <mesh material={modulePanelMaterial} castShadow>
            <boxGeometry args={[50, 74, 168]} />
          </mesh>
          <mesh position={[side * 30, 0, 0]} material={darkMaterial}>
            <boxGeometry args={[4, 44, 118]} />
          </mesh>
          <mesh position={[side * 32.5, 4, 0]} material={windowMaterial}>
            <boxGeometry args={[0.8, 7, 82]} />
          </mesh>
          <mesh position={[0, 42, 0]} material={steelMaterial}>
            <boxGeometry args={[54, 6, 174]} />
          </mesh>
          <mesh position={[0, -42, 0]} material={darkMaterial}>
            <boxGeometry args={[52, 5, 172]} />
          </mesh>
          {[-70, 0, 70].map((z) => (
            <mesh key={z} position={[side * 31, -26, z]} material={steelMaterial}>
              <boxGeometry args={[3, 8, 8]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* side armor shoulder panels */}
      {[-1, 1].map((side) => (
        <group key={`shoulder-${side}`}>
          <mesh position={[side * 206, 46, 0]} rotation={[0, 0, side * -0.12]} material={cabinPanelMaterial}>
            <boxGeometry args={[26, 44, 262]} />
          </mesh>
          <mesh position={[side * 214, 28, 0]} material={darkMaterial}>
            <boxGeometry args={[4, 5, 230]} />
          </mesh>
          <mesh position={[side * 210, -60, 0]} rotation={[0, 0, side * 0.18]} material={steelMaterial}>
            <boxGeometry args={[22, 9, 250]} />
          </mesh>
        </group>
      ))}

      {/* front / rear window bands and white sloped nose */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 2, side * 151]}>
          <mesh material={darkMaterial}>
            <boxGeometry args={[270, 36, 7]} />
          </mesh>
          {[-93, 93].map((x) => (
            <mesh key={x} position={[x, 4, side * 4]} material={windowMaterial}>
              <boxGeometry args={[58, 9, 1]} />
            </mesh>
          ))}
          <mesh position={[0, -24, side * 4]} material={redMaterial}>
            <boxGeometry args={[220, 4, 1.2]} />
          </mesh>
          <mesh position={[0, 28, side * 3]} rotation={[side * -0.24, 0, 0]} material={cabinPanelMaterial}>
            <boxGeometry args={[380, 16, 30]} />
          </mesh>
          <mesh position={[0, -28, side * 3]} rotation={[side * 0.22, 0, 0]} material={steelMaterial}>
            <boxGeometry args={[370, 9, 26]} />
          </mesh>
          <mesh position={[0, -30, side * 2]} rotation={[side * 0.16, 0, 0]} material={steelMaterial}>
            <boxGeometry args={[350, 7, 20]} />
          </mesh>
        </group>
      ))}

      {/* panel seams */}
      {[-62, -22, 22, 62].map((y) => (
        <mesh key={y} position={[0, y, 151.2]} material={panelLineMaterial}>
          <boxGeometry args={[426, 1.2, 1.1]} />
        </mesh>
      ))}
      {[-160, -80, 0, 80, 160].map((x) => (
        <mesh key={x} position={[x, 0, 151.2]} material={panelLineMaterial}>
          <boxGeometry args={[1.2, 160, 1.1]} />
        </mesh>
      ))}

      {/* side warning strips */}
      {[-1, 1].map((side) => (
        <group key={`stripe-${side}`}>
          <mesh position={[side * 220.5, -66, 72]} material={orangeEmissive}>
            <boxGeometry args={[1.2, 9, 62]} />
          </mesh>
          <mesh position={[side * 220.5, -66, -72]} material={orangeEmissive}>
            <boxGeometry args={[1.2, 9, 62]} />
          </mesh>
        </group>
      ))}

      {/* painted decals */}
      {[-1, 1].map((side) => (
        <mesh key={`decal-${side}`} position={[side * 247.8, 10, 62]} rotation={[0, (side * Math.PI) / 2, 0]}>
          <planeGeometry args={[82, 28]} />
          <meshBasicMaterial map={sideDecal} transparent toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
      <mesh position={[0, 46, 154.9]}>
        <planeGeometry args={[108, 24]} />
        <meshBasicMaterial map={sideDecal} transparent toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <mesh position={[0, -4, 154.7]}>
        <planeGeometry args={[62, 14]} />
        <meshBasicMaterial map={lightDecal} transparent toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <mesh position={[0, -87, 151.8]}>
        <planeGeometry args={[58, 8]} />
        <meshBasicMaterial map={warnDecal} transparent toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* lower hull shoulder */}
      <mesh position={[0, -74, 139]} rotation={[-0.28, 0, 0]} material={cabinPanelMaterial}>
        <boxGeometry args={[430, 8, 34]} />
      </mesh>
      <mesh position={[0, -74, -139]} rotation={[0.28, 0, 0]} material={cabinPanelMaterial}>
        <boxGeometry args={[430, 8, 34]} />
      </mesh>

      {/* lower hull side taper */}
      {[-1, 1].map((side) => (
        <group key={`lower-taper-${side}`}>
          <mesh position={[side * 202, -78, 0]} rotation={[0, 0, side * -0.26]} material={cabinPanelMaterial}>
            <boxGeometry args={[34, 9, 258]} />
          </mesh>
          <mesh position={[0, -78, side * 141]} rotation={[side * 0.26, 0, 0]} material={cabinPanelMaterial}>
            <boxGeometry args={[420, 9, 34]} />
          </mesh>
          <mesh position={[side * 217, -58, 0]} material={darkMaterial}>
            <boxGeometry args={[5, 10, 246]} />
          </mesh>
        </group>
      ))}

      {/* lower hull and skirt */}
      <mesh position={[0, -94, 0]} material={darkMaterial}>
        <boxGeometry args={[416, 26, 278]} />
      </mesh>
      <mesh position={[0, -109, 0]} material={steelMaterial}>
        <boxGeometry args={[390, 7, 258]} />
      </mesh>
      {[-150, -90, -30, 30, 90, 150].map((x) => (
        <mesh key={x} position={[x, -102, 145]} material={orangeEmissive}>
          <boxGeometry args={[38, 6, 1.6]} />
        </mesh>
      ))}

      {/* front airlock */}
      <group position={[0, 0, 154]}>
        <mesh material={darkMaterial}>
          <boxGeometry args={[92, 64, 6]} />
        </mesh>
        <mesh position={[0, 35, 3]} material={orangeEmissive}>
          <boxGeometry args={[96, 4, 1.4]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 31, 0, 3.5]} material={windowMaterial}>
            <boxGeometry args={[16, 18, 1]} />
          </mesh>
        ))}
      </group>

      {/* shoulder guide fins and lower chine plates */}
      {[-1, 1].map((side) => (
        <group key={`fin-${side}`}>
          <mesh position={[side * 208, 34, 0]} rotation={[0, 0, side * -0.35]} material={darkMaterial} castShadow>
            <boxGeometry args={[10, 42, 118]} />
          </mesh>
          <mesh position={[side * 208, 34, 0]} rotation={[0, 0, side * -0.35]} material={steelMaterial}>
            <boxGeometry args={[3, 36, 122]} />
          </mesh>
          <mesh position={[side * 188, -62, 0]} rotation={[0, 0, side * 0.28]} material={modulePanelMaterial} castShadow>
            <boxGeometry args={[12, 8, 96]} />
          </mesh>
        </group>
      ))}

      {/* roof suction cup / docking bell */}
      <group position={[0, 12, 0]}>
        <mesh material={darkMaterial} castShadow>
          <cylinderGeometry args={[24, 30, 9, 24]} />
        </mesh>
        <mesh position={[0, 5, 0]} material={steelMaterial}>
          <cylinderGeometry args={[18, 22, 4, 24]} />
        </mesh>
        <mesh position={[0, 7.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
          <torusGeometry args={[19, 2.2, 6, 32]} />
        </mesh>
        <mesh position={[0, 8.8, 0]} material={darkMaterial}>
          <cylinderGeometry args={[10, 13, 3, 20]} />
        </mesh>
      </group>

      {/* body-side hydraulic pump units and hoses feeding the four clamps */}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <group key={`pump-${sx}-${sz}`} position={[sx * 176, -38, sz * 112]}>
          <mesh material={darkMaterial} castShadow>
            <boxGeometry args={[20, 26, 24]} />
          </mesh>
          <mesh position={[-sx * 8, 0, 0]} material={goldMaterial}>
            <cylinderGeometry args={[4.2, 4.2, 18, 10]} />
          </mesh>
          <mesh position={[-sx * 20, 6, -sz * 8]} rotation={[0, 0, Math.PI / 2]} material={steelMaterial}>
            <cylinderGeometry args={[1.6, 1.6, 48, 8]} />
          </mesh>
          <mesh position={[-sx * 34, 12, -sz * 10]} rotation={[0.4, 0, 0.2]} material={goldMaterial}>
            <cylinderGeometry args={[0.7, 0.7, 54, 6]} />
          </mesh>
          <mesh position={[-sx * 5, 14, 0]} material={warmEmissive}>
            <boxGeometry args={[3, 0.5, 8]} />
          </mesh>
        </group>
      )))}

      {/* top service crane */}
      <group position={[158, 110, -78]}>
        <mesh material={steelMaterial}>
          <cylinderGeometry args={[2.2, 3.2, 34, 8]} />
        </mesh>
        <mesh position={[0, 18, 0]} material={goldMaterial}>
          <boxGeometry args={[48, 3, 3]} />
        </mesh>
        <mesh position={[20, 6, 0]} material={darkMaterial}>
          <boxGeometry args={[0.7, 24, 0.7]} />
        </mesh>
        <mesh position={[20, -6, 0]} material={redMaterial}>
          <boxGeometry args={[4, 3, 4]} />
        </mesh>
      </group>

      {/* side service tanks */}
      {[-1, 1].map((side) => (
        <group key={`tank-${side}`} position={[side * 248, -48, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={steelMaterial}>
            <cylinderGeometry args={[10, 10, 76, 12]} />
          </mesh>
          <mesh position={[0, 0, 36]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
            <cylinderGeometry args={[2.8, 2.8, 24, 8]} />
          </mesh>
          <mesh position={[0, 0, -36]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
            <cylinderGeometry args={[2.8, 2.8, 24, 8]} />
          </mesh>
        </group>
      ))}

      {/* side panel seams and service details */}
      {[-1, 1].map((side) => (
        <group key={`detail-${side}`}>
          {[-64, -24, 24, 64].map((y) => (
            <mesh key={y} position={[side * 220.2, y, 0]} material={panelLineMaterial}>
              <boxGeometry args={[1.2, 1.3, 270]} />
            </mesh>
          ))}
          {[-105, -55, 55, 105].map((z) => (
            <mesh key={z} position={[side * 220.2, 0, z]} material={panelLineMaterial}>
              <boxGeometry args={[1.2, 158, 1.2]} />
            </mesh>
          ))}
          <mesh position={[side * 222, -81, 0]} material={steelMaterial}>
            <boxGeometry args={[5, 10, 116]} />
          </mesh>
          <mesh position={[side * 223, -68, 0]} material={darkMaterial}>
            <boxGeometry args={[3, 12, 82]} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[side * 224, -68, -36 + i * 14]} material={orangeEmissive}>
              <boxGeometry args={[1, 10, 1]} />
            </mesh>
          ))}
          <mesh position={[side * 222, 62, 42]} material={blueEmissive}>
            <boxGeometry args={[3, 8, 14]} />
          </mesh>
          <mesh position={[side * 222, 62, -42]} material={blueEmissive}>
            <boxGeometry args={[3, 8, 14]} />
          </mesh>
        </group>
      ))}

      {/* top antennas */}
      {[
        [-170, -116],
        [170, -116],
        [-170, 116],
        [170, 116],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 100, z]}>
          <mesh material={steelMaterial}>
            <cylinderGeometry args={[1.2, 1.8, 16, 6]} />
          </mesh>
          <mesh position={[0, 10, 0]} material={redMaterial}>
            <sphereGeometry args={[1.2, 8, 6]} />
          </mesh>
        </group>
      ))}

      <CabinGreebles />

      {/* underside cargo door */}
      <mesh position={[0, -111, 0]} material={darkMaterial}>
        <boxGeometry args={[142, 5, 82]} />
      </mesh>
      <mesh position={[0, -114, 0]} material={steelMaterial}>
        <boxGeometry args={[156, 2, 92]} />
      </mesh>
    </group>
  )
}

function ClampTower({ x, z }: { x: number; z: number }) {
  const inwardX = x > 0 ? -1 : 1
  const inwardZ = z > 0 ? -1 : 1
  const arms = useMemo<Beam[]>(
    () => [
      { a: [0, 98, 0], b: [inwardX * -62, 58, inwardZ * 10], r: 4.6 },
      { a: [0, 62, 0], b: [inwardX * -50, 12, inwardZ * 28], r: 3.4 },
      { a: [0, 98, inwardZ * -18], b: [inwardX * -40, 48, inwardZ * -46], r: 3.0 },
    ],
    [inwardX, inwardZ],
  )

  return (
    <group position={[x, 0, z]}>
      {/* compact boxy outrigger pod */}
      {/* open fork frame: central spine + four corner posts, no solid box */}
      <mesh position={[0, 4, 0]} material={modulePanelMaterial} castShadow>
        <boxGeometry args={[28, 176, 48]} />
      </mesh>
      <mesh position={[0, 4, 0]} material={darkMaterial}>
        <boxGeometry args={[10, 148, 20]} />
      </mesh>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <group key={`frame-${sx}-${sz}`}>
          <mesh position={[sx * 24, 4, sz * 30]} material={modulePanelMaterial} castShadow>
            <boxGeometry args={[9, 176, 9]} />
          </mesh>
          <mesh position={[sx * 24, 4, sz * 30]} material={darkMaterial}>
            <boxGeometry args={[3.5, 154, 3.5]} />
          </mesh>
        </group>
      )))}
      <mesh position={[0, 90, 0]} material={steelMaterial}>
        <boxGeometry args={[70, 12, 82]} />
      </mesh>
      <mesh position={[0, -82, 0]} material={steelMaterial}>
        <boxGeometry args={[70, 12, 82]} />
      </mesh>
      {/* cross braces across the open frame */}
      {[-1, 1].map((side) => (
        <group key={`brace-${side}`}>
          <mesh position={[0, 4, side * 30]} rotation={[0, 0, 0.12]} material={steelMaterial}>
            <boxGeometry args={[52, 4, 4]} />
          </mesh>
          <mesh position={[side * 24, 4, 0]} rotation={[0.12, 0, 0]} material={steelMaterial}>
            <boxGeometry args={[4, 4, 62]} />
          </mesh>
        </group>
      ))}
      <mesh position={[inwardX * 37.5, 4, 0]} material={darkMaterial}>
        <boxGeometry args={[4, 150, 46]} />
      </mesh>
      <mesh position={[0, 4, inwardZ * 43.5]} material={darkMaterial}>
        <boxGeometry args={[50, 150, 3]} />
      </mesh>
      <mesh position={[0, 98, 0]} material={steelMaterial}>
        <boxGeometry args={[84, 8, 94]} />
      </mesh>
      <mesh position={[0, -90, 0]} material={steelMaterial}>
        <boxGeometry args={[84, 8, 94]} />
      </mesh>
      <mesh position={[0, 104, 0]} material={redMaterial}>
        <sphereGeometry args={[1.3, 8, 6]} />
      </mesh>

      {/* upper/lower open fork jaws */}
      {[-1, 1].map((jy) => (
        <group key={`jaw-${jy}`} position={[0, jy * 61, 0]}>
          <mesh position={[inwardX * -15, 0, inwardZ * 12]} rotation={[0, 0, inwardX * 0.18]} material={darkMaterial} castShadow>
            <boxGeometry args={[34, 12, 26]} />
          </mesh>
          <mesh position={[inwardX * -29, jy * 4, inwardZ * 12]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
            <cylinderGeometry args={[3.2, 3.2, 18, 8]} />
          </mesh>
          <mesh position={[inwardX * -29, jy * 4, inwardZ * 12]} rotation={[Math.PI / 2, 0, 0]} material={steelMaterial}>
            <torusGeometry args={[9, 2.2, 6, 18]} />
          </mesh>
          <mesh position={[inwardX * -38, jy * 10, inwardZ * 12]} material={steelMaterial}>
            <boxGeometry args={[10, 4, 22]} />
          </mesh>
        </group>
      ))}
      {/* fork guide rails running vertically outside the frame */}
      {[-1, 1].map((sx) => (
        <mesh key={`fork-rail-${sx}`} position={[sx * 31, 4, 0]} material={steelMaterial}>
          <boxGeometry args={[3, 170, 5]} />
        </mesh>
      ))}

      {/* gold hydraulic arms */}
      <mesh position={[inwardX * 47, 52, inwardZ * 18]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
        <cylinderGeometry args={[5, 5, 68, 10]} />
      </mesh>
      <mesh position={[inwardX * 26, 52, inwardZ * 40]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
        <cylinderGeometry args={[4.4, 4.4, 58, 10]} />
      </mesh>
      <mesh position={[inwardX * 47, 52, inwardZ * 18]} material={darkMaterial}>
        <boxGeometry args={[20, 12, 24]} />
      </mesh>
      <mesh position={[inwardX * 74, 30, inwardZ * 4]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
        <cylinderGeometry args={[3.2, 3.2, 34, 8]} />
      </mesh>

      {/* large external piston and rollers */}
      <mesh position={[inwardX * 40, 4, 0]} material={goldMaterial}>
        <cylinderGeometry args={[4.2, 4.2, 150, 8]} />
      </mesh>
      {[82, 26, -34, -88].map((y) => (
        <mesh key={y} position={[inwardX * 40.5, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkMaterial}>
          <torusGeometry args={[12, 3, 6, 18]} />
        </mesh>
      ))}

      {/* connectors back into the hull */}
      <mesh position={[inwardX * 37, 36, 0]} material={lightMaterial}>
        <boxGeometry args={[62, 8, 26]} />
      </mesh>
      <mesh position={[0, 36, inwardZ * 37]} material={lightMaterial}>
        <boxGeometry args={[30, 8, 62]} />
      </mesh>
      <mesh position={[inwardX * 37, -52, 0]} material={steelMaterial}>
        <boxGeometry args={[60, 6, 20]} />
      </mesh>
      <mesh position={[0, -52, inwardZ * 37]} material={steelMaterial}>
        <boxGeometry args={[24, 6, 60]} />
      </mesh>

      <BeamInstances beams={arms} material={goldMaterial} radius={4.2} />
      <mesh position={[0, 96, 0]} material={darkMaterial}>
        <sphereGeometry args={[12, 10, 8]} />
      </mesh>
      <mesh position={[inwardX * 58, 62, inwardZ * 22]} material={steelMaterial}>
        <boxGeometry args={[18, 14, 18]} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={`podframe-${side}`}>
          <mesh position={[inwardX * -29, 4, side * 38]} material={steelMaterial}>
            <boxGeometry args={[6, 174, 6]} />
          </mesh>
          <mesh position={[inwardX * -29, 4, side * 38]} material={darkMaterial}>
            <boxGeometry args={[3, 150, 3]} />
          </mesh>
        </group>
      ))}

      {/* outboard clamp mechanism */}
      <mesh position={[inwardX * -41, 2, 0]} material={darkMaterial}>
        <boxGeometry args={[12, 176, 66]} />
      </mesh>
      <mesh position={[inwardX * -49, 4, 0]} material={goldMaterial}>
        <cylinderGeometry args={[5.6, 5.6, 132, 10]} />
      </mesh>
      <mesh position={[inwardX * -49, 4, 0]} material={darkMaterial}>
        <boxGeometry args={[18, 28, 34]} />
      </mesh>
      {[-52, 54].map((y) => (
        <mesh key={y} position={[inwardX * -50, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMaterial}>
          <torusGeometry args={[15, 2.6, 6, 18]} />
        </mesh>
      ))}
      <mesh position={[inwardX * -42, 92, 0]} material={orangeEmissive}>
        <boxGeometry args={[2.4, 8, 12]} />
      </mesh>
      <mesh position={[inwardX * -45, 38, 30]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
        <cylinderGeometry args={[3.6, 3.6, 74, 8]} />
      </mesh>
      <mesh position={[inwardX * -45, 38, -30]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
        <cylinderGeometry args={[3.6, 3.6, 74, 8]} />
      </mesh>
      <mesh position={[inwardX * -45, -34, 30]} rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
        <cylinderGeometry args={[3.0, 3.0, 60, 8]} />
      </mesh>
      {[-72, 68, 86, -44].map((y) => (
        <mesh key={`roll2-${y}`} position={[inwardX * -38, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkMaterial}>
          <torusGeometry args={[17, 3.2, 6, 20]} />
        </mesh>
      ))}
      <mesh position={[0, 94, 0]} material={steelMaterial}>
        <boxGeometry args={[86, 5, 94]} />
      </mesh>
      <mesh position={[0, -88, 0]} material={steelMaterial}>
        <boxGeometry args={[82, 6, 92]} />
      </mesh>
      <mesh position={[inwardX * -30, -78, 0]} material={steelMaterial}>
        <boxGeometry args={[28, 10, 42]} />
      </mesh>
      <mesh position={[inwardX * -45, -82, 0]} rotation={[0, 0, inwardX * 0.18]} material={goldMaterial}>
        <boxGeometry args={[8, 48, 18]} />
      </mesh>

      <mesh position={[inwardX * -39.5, 38, 0]} rotation={[0, (inwardX * Math.PI) / 2, 0]}>
        <planeGeometry args={[44, 20]} />
        <meshBasicMaterial map={podDecal} transparent toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* cable guide rings */}
      {[104, 52, 0, -52, -104].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={y === 104 ? goldMaterial : steelMaterial}>
          <torusGeometry args={[22, y === 104 ? 3 : 2.2, 6, 20]} />
        </mesh>
      ))}
    </group>
  )
}

function CableBundles() {
  const lines = useMemo(() => {
    const result: { points: THREE.Vector3[]; color: string; width: number }[] = []
    for (const x of [CORNER_X, -CORNER_X]) {
      for (const z of [CORNER_Z, -CORNER_Z]) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          const ox = Math.cos(a) * 9
          const oz = Math.sin(a) * 9
          result.push({
            points: [new THREE.Vector3(x + ox, -360, z + oz), new THREE.Vector3(x + ox, 420, z + oz)],
            color: '#0b1015',
            width: 1.3,
          })
        }
      }
    }
    return result
  }, [])

  return (
    <group>
      {lines.map((line, i) => (
        <Line key={i} points={line.points} color={line.color} lineWidth={line.width} transparent opacity={0.95} />
      ))}
      {[
        [CORNER_X, CORNER_Z],
        [-CORNER_X, CORNER_Z],
        [CORNER_X, -CORNER_Z],
        [-CORNER_X, -CORNER_Z],
      ].map(([x, z], i) => (
        <Line
          key={`h${i}`}
          points={[new THREE.Vector3(x, -360, z), new THREE.Vector3(x, 420, z)]}
          color="#b9d7f2"
          lineWidth={0.7}
          transparent
          opacity={0.28}
        />
      ))}
    </group>
  )
}

function IceShield() {
  const hinges = useMemo<Beam[]>(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const a = (i / 4) * Math.PI * 2
      return {
        a: [Math.cos(a) * 102, 30, Math.sin(a) * 102] as [number, number, number],
        b: [Math.cos(a) * 188, 10, Math.sin(a) * 188] as [number, number, number],
        r: 3.4,
      }
    })
  }, [])
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const gap = 0.045
    const inner = 32
    const outer = 202
    shape.moveTo(inner, 0)
    shape.absarc(0, 0, outer, gap, Math.PI / 2 - gap, false)
    shape.lineTo(inner * Math.cos(Math.PI / 2 - gap), inner * Math.sin(Math.PI / 2 - gap))
    shape.absarc(0, 0, inner, Math.PI / 2 - gap, gap, true)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 8, bevelEnabled: false, curveSegments: 18 })
  }, [])

  return (
    <group position={[0, -146, 0]}>
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={i} rotation={[0.16, (i * Math.PI) / 2, 0]}>
          <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} material={i % 2 ? iceShieldMaterial : iceShieldEdgeMaterial} />
          <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -9, 0]} scale={[0.97, 0.97, 0.6]} material={i % 2 ? iceShieldEdgeMaterial : iceShieldMaterial} />
          <mesh position={[120, 8, 26]} rotation={[0, 0.06, 0]} material={iceShieldEdgeMaterial}>
            <boxGeometry args={[128, 1.2, 2.2]} />
          </mesh>
          <mesh position={[176, 8, 10]} material={steelMaterial}>
            <boxGeometry args={[20, 4, 8]} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <group key={`seam-${i}`} rotation={[0, a, 0]}>
            <mesh position={[112, 6, 0]} material={steelMaterial}>
              <boxGeometry args={[180, 2.4, 2.2]} />
            </mesh>
            <mesh position={[192, 7, 0]} material={goldMaterial}>
              <boxGeometry args={[8, 5, 5]} />
            </mesh>
            <mesh position={[204, 3, 0]} material={darkMaterial}>
              <boxGeometry args={[5, 9, 12]} />
            </mesh>
            <mesh position={[204, 8, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMaterial}>
              <cylinderGeometry args={[3, 3, 14, 8]} />
            </mesh>
          </group>
        )
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]} material={steelMaterial}>
        <torusGeometry args={[201, 5.2, 6, 72]} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={`hinge-${i}`} position={[Math.cos(a) * 150, 8, Math.sin(a) * 150]} rotation={[0, -a, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={goldMaterial}>
              <cylinderGeometry args={[5.5, 5.5, 44, 10]} />
            </mesh>
            <mesh position={[0, 0, 20]} material={darkMaterial}>
              <boxGeometry args={[18, 14, 8]} />
            </mesh>
            <mesh position={[0, 8, 0]} rotation={[0, 0, 0.4]} material={goldMaterial}>
              <cylinderGeometry args={[3.2, 3.2, 30, 8]} />
            </mesh>
          </group>
        )
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={`rim-${i}`} position={[Math.cos(a) * 196, 8, Math.sin(a) * 196]} material={warmEmissive}>
            <boxGeometry args={[4, 1.2, 2]} />
          </mesh>
        )
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6, 0]} material={steelMaterial}>
        <torusGeometry args={[142, 1.5, 6, 56]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]} material={iceShieldEdgeMaterial}>
        <torusGeometry args={[196, 2.2, 6, 72]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, 0]} material={iceShieldEdgeMaterial}>
        <torusGeometry args={[84, 1.6, 6, 40]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7, 0]} material={steelMaterial}>
        <torusGeometry args={[174, 1.3, 6, 64]} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={`rib-${i}`} position={[Math.cos(a) * 124, 7, Math.sin(a) * 124]} rotation={[0, -a, 0]} material={i % 2 ? steelMaterial : iceShieldEdgeMaterial}>
            <boxGeometry args={[156, 1.3, 1.6]} />
          </mesh>
        )
      })}
      <mesh position={[0, 4, 0]} material={steelMaterial}>
        <cylinderGeometry args={[58, 68, 20, 20]} />
      </mesh>
      <mesh position={[0, 16, 0]} material={darkMaterial}>
        <cylinderGeometry args={[36, 52, 10, 20]} />
      </mesh>
      <mesh position={[0, 22, 0]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
        <torusGeometry args={[38, 2, 6, 32]} />
      </mesh>
      <mesh position={[0, 22, 0]} material={darkMaterial}>
        <cylinderGeometry args={[18, 26, 6, 12]} />
      </mesh>
    </group>
  )
}

function Thrusters() {
  return (
    <group>
      {[
        [-120, -100],
        [120, -100],
        [-120, 100],
        [120, 100],
      ].map(([x, z], i) => (
        <group key={i} position={[x, -102, z]}>
          <mesh material={steelMaterial}>
            <cylinderGeometry args={[14, 10, 16, 14]} />
          </mesh>
          <mesh position={[0, -12, 0]} rotation={[Math.PI, 0, 0]} material={orangeEmissive}>
            <coneGeometry args={[11, 18, 14, 1, true]} />
          </mesh>
          <sprite position={[0, -22, 0]} scale={[32, 32, 1]}>
            <spriteMaterial
              map={getGlowTexture()}
              color="#ffb26b"
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        </group>
      ))}
    </group>
  )
}

function TopDeck() {
  return (
    <group>
      <mesh position={[0, 92, 0]} material={darkMaterial}>
        <boxGeometry args={[364, 7, 234]} />
      </mesh>
      {[-120, -40, 40, 120].map((x) => (
        <mesh key={x} position={[x, 96, 0]} material={panelLineMaterial}>
          <boxGeometry args={[1.4, 0.8, 216]} />
        </mesh>
      ))}
      {[-72, 0, 72].map((z) => (
        <mesh key={z} position={[0, 96, z]} material={panelLineMaterial}>
          <boxGeometry args={[344, 0.8, 1.4]} />
        </mesh>
      ))}
      {[-110, 0, 110].map((x) =>
        [-72, 72].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 98, z]} material={blueEmissive}>
            <cylinderGeometry args={[6, 6, 1.2, 18]} />
          </mesh>
        )),
      )}

      {/* docking interface */}
      <mesh position={[0, 104, 0]} rotation={[Math.PI / 2, 0, 0]} material={lightMaterial}>
        <torusGeometry args={[58, 4.2, 8, 32]} />
      </mesh>
      <mesh position={[0, 104, 0]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
        <torusGeometry args={[45, 1.3, 6, 32]} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 70, 102, Math.sin(a) * 70]} material={steelMaterial}>
            <cylinderGeometry args={[4, 5.5, 5, 8]} />
          </mesh>
        )
      })}
    </group>
  )
}
