import { useMemo } from 'react'
import * as THREE from 'three'
import { makeTextTexture } from '../../kit/textures'
import { getPanelMaterial } from '../../kit/panelTexture'
import { getDeckMaterial } from '../../kit/deckTexture'
import { HarborGreebles } from '../../kit/Greebles'
import { BeamInstances, type Beam } from '../../kit/BeamInstances'
import { getGlowTexture } from '../../kit/textures'
import { useFrame } from '@react-three/fiber'
import React, { useRef } from 'react'
import {
  concreteMaterial,
  darkMaterial,
  lightMaterial,
  orangeEmissive,
  redMaterial,
  steelMaterial,
  warmEmissive,
  whiteMaterial,
} from '../../kit/materials'

const outerRadius = 150
const innerRadius = 110
const warehousePanelMaterial = getPanelMaterial('steel', { repeatX: 3, repeatY: 1, bumpScale: 0.2 })
const deckMaterial = getDeckMaterial(10, 2)

const bridgeAngles = [0, 60, 120, 180, 240, 300]
const warehouseAngles = [18, 42, 78, 102, 138, 162, 198, 222, 258, 282, 318, 342]
const craneAngles = [48, 108, 168, 228, 288, 348]
const shipAngles = [12, 52, 132, 172, 252, 292]

export function Harbor() {
  const signTexture = useMemo(
    () =>
      makeTextTexture(['SPACE ELEVATOR', 'JOINT RESEARCH BASE  UEG GABON'], {
        width: 1024,
        height: 256,
        fontSize: 58,
        background: 'rgba(8,14,20,0.92)',
        border: 'rgba(190,206,220,0.35)',
        color: '#dbe8f5',
      }),
    [],
  )

  return (
    <group>
      <HarborGreebles />

      {/* central artificial island under the tower cluster */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.62, 0]} receiveShadow material={deckMaterial}>
        <circleGeometry args={[60, 128]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={steelMaterial}>
        <cylinderGeometry args={[60, 60, 1.4, 128, 1, true]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.82, 0]} material={lightMaterial}>
        <ringGeometry args={[55.5, 60, 128]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.9, 0]} material={darkMaterial}>
        <ringGeometry args={[28, 56, 128]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.3, 0]} material={lightMaterial}>
        <torusGeometry args={[59, 0.28, 4, 128]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.3, 0]} material={lightMaterial}>
        <torusGeometry args={[59, 0.24, 4, 128]} />
      </mesh>
      {Array.from({ length: 32 }).map((_, i) => {
        const a = (i / 32) * Math.PI * 2
        return (
          <mesh key={`central-post-${i}`} position={[Math.cos(a) * 59, 4.2, Math.sin(a) * 59]} material={steelMaterial}>
            <boxGeometry args={[0.22, 5, 0.22]} />
          </mesh>
        )
      })}

      {/* central island support buildings */}
      {[18, 138, 258].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        return (
          <group key={`central-bldg-${angle}`} position={[Math.cos(rad) * 45, 4.2, Math.sin(rad) * 45]} rotation={[0, -rad, 0]}>
            <mesh material={i % 2 ? warehousePanelMaterial : concreteMaterial} castShadow receiveShadow>
              <boxGeometry args={[20, 7.5, 11]} />
            </mesh>
            <mesh position={[0, 4.2, 0]} material={darkMaterial}>
              <boxGeometry args={[21, 0.55, 11.8]} />
            </mesh>
            <mesh position={[0, 3.1, 5.6]} material={warmEmissive}>
              <boxGeometry args={[12, 0.18, 0.28]} />
            </mesh>
          </group>
        )
      })}

      {/* central island container stacks and floodlights */}
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2 + 0.2
        const r = 37 + (i % 4) * 4
        return (
          <group key={`cc-${i}`} position={[Math.cos(a) * r, 3.2 + (i % 3) * 3.2, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            <mesh material={i % 3 === 0 ? darkMaterial : i % 3 === 1 ? steelMaterial : warehousePanelMaterial} castShadow>
              <boxGeometry args={[8, 3.2, 4]} />
            </mesh>
            <mesh position={[0, 1.8, 0]} material={i % 5 === 0 ? orangeEmissive : lightMaterial}>
              <boxGeometry args={[5.5, 0.12, 0.35]} />
            </mesh>
          </group>
        )
      })}
      {[20, 140, 260].map((angle) => {
        const rad = (angle * Math.PI) / 180
        return (
          <group key={`flood-${angle}`} position={[Math.cos(rad) * 42, 0, Math.sin(rad) * 42]}>
            <mesh position={[0, 20, 0]} material={steelMaterial}>
              <cylinderGeometry args={[0.4, 0.7, 40, 6]} />
            </mesh>
            <mesh position={[0, 40, 0]} material={orangeEmissive}>
              <boxGeometry args={[3, 1.4, 1.4]} />
            </mesh>
            <sprite position={[0, 40, 0]} scale={[12, 12, 1]}>
              <spriteMaterial map={getGlowTexture()} color="#ffd0a0" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
          </group>
        )
      })}

      {/* central island cranes for scale */}
      {[30, 150, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        return (
          <group key={`central-crane-${angle}`} position={[Math.cos(rad) * 43, 0, Math.sin(rad) * 43]} rotation={[0, -rad + 0.3, 0]}>
            <mesh position={[0, 14, 0]} material={steelMaterial} castShadow>
              <cylinderGeometry args={[0.8, 1.3, 28, 6]} />
            </mesh>
            <mesh position={[8, 27, 0]} material={orangeEmissive}>
              <boxGeometry args={[20, 0.9, 0.9]} />
            </mesh>
            <mesh position={[-6, 27, 0]} material={darkMaterial}>
              <boxGeometry args={[8, 1, 1]} />
            </mesh>
            <mesh position={[16, 23, 0]} material={darkMaterial}>
              <boxGeometry args={[0.18, 10, 0.18]} />
            </mesh>
          </group>
        )
      })}

      {/* central island roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.02, 0]} material={darkMaterial}>
        <ringGeometry args={[53, 57, 128]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.03, 0]} material={lightMaterial}>
        <ringGeometry args={[54.4, 55.2, 128]} />
      </mesh>
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180
        return (
          <group key={`road-${angle}`} position={[Math.cos(rad) * 40, 2.02, Math.sin(rad) * 40]} rotation={[0, -rad, 0]}>
            <mesh material={darkMaterial}>
              <boxGeometry args={[22, 0.12, 4.5]} />
            </mesh>
            <mesh position={[0, 0.08, 0]} material={warmEmissive}>
              <boxGeometry args={[19, 0.06, 0.2]} />
            </mesh>
          </group>
        )
      })}
      {[30, 150, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        return (
          <group key={`central-wh-${angle}`} position={[Math.cos(rad) * 41, 3.8, Math.sin(rad) * 41]} rotation={[0, -rad + 0.25, 0]}>
            <mesh material={warehousePanelMaterial} castShadow>
              <boxGeometry args={[13, 6.5, 9]} />
            </mesh>
            <mesh position={[0, 3.6, 0]} material={darkMaterial}>
              <boxGeometry args={[13.6, 0.5, 9.6]} />
            </mesh>
            <mesh position={[0, 1.8, 4.6]} material={warmEmissive}>
              <boxGeometry args={[7, 0.15, 0.3]} />
            </mesh>
          </group>
        )
      })}
      {[8, 128, 248].map((angle) => {
        const rad = (angle * Math.PI) / 180
        return (
          <group key={`boat-${angle}`} position={[Math.cos(rad) * 86, 1.0, Math.sin(rad) * 86]} rotation={[0, -rad + Math.PI / 2, 0]}>
            <mesh material={whiteMaterial}>
              <boxGeometry args={[12, 2.2, 4]} />
            </mesh>
            <mesh position={[1, 1.8, 0]} material={steelMaterial}>
              <boxGeometry args={[4, 2.2, 3]} />
            </mesh>
            <mesh position={[-2, 1.4, 0]} material={warmEmissive}>
              <boxGeometry args={[2, 0.2, 1]} />
            </mesh>
          </group>
        )
      })}

      {/* inner approach bridges */}
      {bridgeAngles.map((angle) => {
        const rad = (angle * Math.PI) / 180
        return (
          <group key={`inner-${angle}`} position={[Math.cos(rad) * 85, 1.15, Math.sin(rad) * 85]} rotation={[0, -rad, 0]}>
            <mesh material={concreteMaterial} receiveShadow>
              <boxGeometry args={[50, 1.7, 8.5]} />
            </mesh>
            <mesh position={[0, 1.05, 4.1]} material={lightMaterial}>
              <boxGeometry args={[50, 0.4, 0.3]} />
            </mesh>
            <mesh position={[0, 1.05, -4.1]} material={lightMaterial}>
              <boxGeometry args={[50, 0.4, 0.3]} />
            </mesh>
          </group>
        )
      })}

      {/* circular staging platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, 0]} receiveShadow material={deckMaterial}>
        <ringGeometry args={[innerRadius, outerRadius, 128]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} material={steelMaterial}>
        <cylinderGeometry args={[outerRadius, outerRadius, 1.6, 128, 1, true]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.9, 0]} material={lightMaterial}>
        <ringGeometry args={[outerRadius - 1.7, outerRadius, 128]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.95, 0]} material={darkMaterial}>
        <ringGeometry args={[innerRadius, innerRadius + 1.4, 128]} />
      </mesh>

      {/* radial bridges */}
      {bridgeAngles.map((angle) => {
        const rad = (angle * Math.PI) / 180
        const r = 142
        return (
          <group key={angle} position={[Math.cos(rad) * r, 1.2, Math.sin(rad) * r]} rotation={[0, -rad, 0]}>
            <mesh material={concreteMaterial} receiveShadow>
              <boxGeometry args={[52, 1.8, 11]} />
            </mesh>
            <mesh position={[0, 1.15, 5.1]} material={lightMaterial}>
              <boxGeometry args={[52, 0.45, 0.35]} />
            </mesh>
            <mesh position={[0, 1.15, -5.1]} material={lightMaterial}>
              <boxGeometry args={[52, 0.45, 0.35]} />
            </mesh>
            {[-22, -8, 8, 22].map((x) => (
              <mesh key={x} position={[x, 0.9, 0]} material={darkMaterial}>
                <boxGeometry args={[0.8, 2.7, 11.5]} />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* warehouses and support buildings */}
      {warehouseAngles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const r = 132
        const width = i % 2 === 0 ? 25 : 19
        return (
          <group key={angle} position={[Math.cos(rad) * r, 4.2, Math.sin(rad) * r]} rotation={[0, -rad, 0]}>
            <mesh material={i % 2 === 0 ? warehousePanelMaterial : concreteMaterial} castShadow receiveShadow>
              <boxGeometry args={[width, 8.4, 13]} />
            </mesh>
            <mesh position={[0, 4.5, 0]} material={darkMaterial}>
              <boxGeometry args={[width + 1, 0.6, 13.8]} />
            </mesh>
            {[-width * 0.28, 0, width * 0.28].map((x) => (
              <mesh key={x} position={[x, 0, 6.6]} material={darkMaterial}>
                <boxGeometry args={[3.2, 3.5, 0.25]} />
              </mesh>
            ))}
            <mesh position={[0, 5.2, 0]} material={warmEmissive}>
              <boxGeometry args={[width * 0.55, 0.18, 0.3]} />
            </mesh>
          </group>
        )
      })}

      {/* cranes */}
      {craneAngles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const r = 136
        return (
          <group key={angle} position={[Math.cos(rad) * r, 0, Math.sin(rad) * r]} rotation={[0, -rad + (i - 1) * 0.3, 0]}>
            <mesh position={[0, 20, 0]} material={steelMaterial} castShadow>
              <cylinderGeometry args={[1.1, 1.8, 40, 6]} />
            </mesh>
            <mesh position={[12, 39, 0]} material={orangeEmissive}>
              <boxGeometry args={[30, 1.1, 1.2]} />
            </mesh>
            <mesh position={[-10, 39, 0]} material={darkMaterial}>
              <boxGeometry args={[14, 1.3, 1.2]} />
            </mesh>
            <mesh position={[24, 32, 0]} material={darkMaterial}>
              <boxGeometry args={[0.18, 14, 0.18]} />
            </mesh>
            <mesh position={[24, 24.6, 0]} material={redMaterial}>
              <boxGeometry args={[1.8, 0.8, 0.8]} />
            </mesh>
          </group>
        )
      })}

      {/* ships for scale */}
      {shipAngles.map((angle) => {
        const rad = (angle * Math.PI) / 180
        const r = 180
        return (
          <group key={angle} position={[Math.cos(rad) * r, 0, Math.sin(rad) * r]} rotation={[0, -rad + Math.PI / 2, 0]}>
            <mesh position={[0, 2.4, 0]} material={darkMaterial} castShadow>
              <boxGeometry args={[36, 4.2, 9]} />
            </mesh>
            <mesh position={[4, 6.8, 0]} material={whiteMaterial}>
              <boxGeometry args={[9, 5.2, 7]} />
            </mesh>
            <mesh position={[-4, 5.0, 0]} material={steelMaterial}>
              <boxGeometry args={[16, 1.2, 6]} />
            </mesh>
            <mesh position={[8, 8.0, 0]} material={warmEmissive}>
              <boxGeometry args={[2.4, 0.4, 4.5]} />
            </mesh>
          </group>
        )
      })}

      {/* warning lights along the ring */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * (outerRadius - 2.2), 4.0, Math.sin(a) * (outerRadius - 2.2)]} material={i % 3 === 0 ? orangeEmissive : redMaterial}>
            <sphereGeometry args={[0.55, 8, 6]} />
          </mesh>
        )
      })}

      {/* cable anchors */}
      {[70, 110, 190, 230, 310, 350].map((degrees) => {
        const rad = (degrees * Math.PI) / 180
        return (
          <group key={degrees} position={[Math.cos(rad) * 166, 0, Math.sin(rad) * 166]} rotation={[0, -rad, 0]}>
            <mesh position={[0, 4.5, 0]} material={concreteMaterial}>
              <boxGeometry args={[20, 9, 16]} />
            </mesh>
            <mesh position={[0, 11, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMaterial}>
              <cylinderGeometry args={[5.5, 5.5, 18, 12]} />
            </mesh>
            <mesh position={[0, 13, 0]} material={orangeEmissive}>
              <boxGeometry args={[4, 1.6, 2.4]} />
            </mesh>
          </group>
        )
      })}

      {/* outer breakwater blocks */}
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i / 36) * Math.PI * 2
        return (
          <mesh key={`breakwater-${i}`} position={[Math.cos(a) * 153, 2.4, Math.sin(a) * 153]} rotation={[0, -a, 0]} material={i % 3 === 0 ? concreteMaterial : darkMaterial}>
            <boxGeometry args={[7.5, 4.5, 5.5]} />
          </mesh>
        )
      })}

      {/* outer railing */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.4, 0]} material={lightMaterial}>
        <torusGeometry args={[149, 0.28, 4, 128]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.4, 0]} material={lightMaterial}>
        <torusGeometry args={[149, 0.24, 4, 128]} />
      </mesh>
      <RailingPosts />
      <SteamPlumes />

      {/* base sign */}
      <mesh position={[0, 18, 152]} material={new THREE.MeshBasicMaterial({ map: signTexture, transparent: true })}>
        <planeGeometry args={[40, 10]} />
      </mesh>

    </group>
  )
}

function RailingPosts() {
  const beams = React.useMemo<Beam[]>(() => {
    const list: Beam[] = []
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2
      list.push({
        a: [Math.cos(a) * 149, 2.2, Math.sin(a) * 149],
        b: [Math.cos(a) * 149, 7.2, Math.sin(a) * 149],
        r: 0.16,
      })
    }
    return list
  }, [])
  return <BeamInstances beams={beams} material={steelMaterial} radius={0.18} />
}

function SteamPuffs() {
  const refs = useRef<THREE.Sprite[]>([])
  useFrame(({ clock }) => {
    refs.current.forEach((sprite, i) => {
      if (!sprite) return
      const t = (clock.elapsedTime * 0.08 + i * 0.17) % 1
      sprite.position.y = 5 + t * 58
      sprite.scale.setScalar(22 + t * 46)
      const material = sprite.material as THREE.SpriteMaterial
      material.opacity = 0.11 * (1 - t) * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 0.7 + i))
    })
  })
  return (
    <group>
      {[
        [18, 5, 34],
        [-34, 5, 8],
        [0, 5, -46],
        [50, 5, -18],
        [-48, 5, -20],
        [0, 5, 54],
      ].map(([x, y, z], i) => (
        <sprite
          key={i}
          ref={(el) => {
            if (el) refs.current[i] = el
          }}
          position={[x, y, z]}
          scale={[28, 28, 1]}
        >
          <spriteMaterial
            map={getGlowTexture()}
            color="#c7d3dc"
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  )
}

function SteamPlumes() {
  return <SteamPuffs />
}
