import { useMemo } from 'react'
import { makeDecalTexture } from '../../kit/textures'
import { BeamInstances, type Beam } from '../../kit/BeamInstances'
import { getPanelMaterial } from '../../kit/panelTexture'
import {
  darkMaterial,
  goldMaterial,
  lightMaterial,
  orangeEmissive,
  redMaterial,
  steelMaterial,
  warmEmissive,
  whiteMaterial,
} from '../../kit/materials'

type MainTowerProps = {
  position: [number, number, number]
  rotationY: number
  seed?: number
}

const HEIGHT = 200
const WIDTH = 21
const HALF = WIDTH / 2
const towerPanelMaterial = getPanelMaterial('white', { repeatX: 3, repeatY: 7, bumpScale: 0.48 })

type Face = { axis: 'x' | 'z'; sign: number }

const FACES: Face[] = [
  { axis: 'z', sign: 1 },
  { axis: 'z', sign: -1 },
  { axis: 'x', sign: 1 },
  { axis: 'x', sign: -1 },
]



export function MainTower({ position, rotationY, seed = 1 }: MainTowerProps) {
  const variant = seed % 2
  const decal = useMemo(
    () =>
      makeDecalTexture(['UEG', 'GABON', '02'], {
        width: 256,
        height: 256,
        fontSize: 56,
        color: '#293641',
        align: 'center',
      }),
    [],
  )

  const braces = useMemo<Beam[]>(() => {
    const list: Beam[] = []
    for (const face of FACES) {
      for (const gap of [
        [42, 54],
        [94, 106],
        [146, 158],
      ]) {
        const [y0, y1] = gap
        const p = (u: number, y: number): [number, number, number] =>
          face.axis === 'z'
            ? [u, y, face.sign * (HALF + 0.9)]
            : [face.sign * (HALF + 0.9), y, u]
        list.push({ a: p(-8, y0), b: p(8, y1), r: 0.28 })
        list.push({ a: p(8, y0), b: p(-8, y1), r: 0.28 })
      }
      for (const y of [10, 34, 58, 82, 106, 130, 154, 178]) {
        const p = (u: number): [number, number, number] =>
          face.axis === 'z' ? [u, y, face.sign * (HALF + 0.55)] : [face.sign * (HALF + 0.55), y, u]
        list.push({ a: p(-9.4), b: p(9.4), r: 0.22 })
      }
    }
    return list
  }, [])

  const ladders = useMemo<Beam[]>(() => {
    const list: Beam[] = []
    for (const [x, z] of [
      [-HALF - 1.2, 4],
      [HALF + 1.2, 4],
    ]) {
      list.push({ a: [x, 6, z], b: [x, 194, z], r: 0.16 })
      list.push({ a: [x, 6, z + 1.7], b: [x, 194, z + 1.7], r: 0.16 })
      for (let y = 10; y < 194; y += 7) {
        list.push({ a: [x, y, z], b: [x, y, z + 1.7], r: 0.12 })
      }
    }
    return list
  }, [])

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={[0.9, 1, 0.9]}>
      {/* central service core visible through the open bays */}
      <mesh position={[0, HEIGHT / 2, 0]} material={darkMaterial} castShadow>
        <boxGeometry args={[11, HEIGHT - 6, 11]} />
      </mesh>
      <mesh position={[0, HEIGHT / 2, 0]} material={steelMaterial}>
        <boxGeometry args={[7.5, HEIGHT - 8, 7.5]} />
      </mesh>

      {/* four corner columns */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}-${sz}`}>
            <mesh position={[sx * (HALF - 1.2), HEIGHT / 2, sz * (HALF - 1.2)]} material={lightMaterial} castShadow>
              <boxGeometry args={[3.2, HEIGHT, 3.2]} />
            </mesh>
            <mesh position={[sx * (HALF - 1.2), HEIGHT / 2, sz * (HALF - 1.2)]} material={darkMaterial}>
              <boxGeometry args={[1.3, HEIGHT - 2, 1.3]} />
            </mesh>
          </group>
        )),
      )}

      {/* floor slabs */}
      {Array.from({ length: 12 }).map((_, i) => {
        const y = 8 + i * 17
        return (
          <mesh key={`slab-${i}`} position={[0, y, 0]} material={i % 3 === 0 ? whiteMaterial : steelMaterial}>
            <boxGeometry args={[WIDTH - 1.2, i % 3 === 0 ? 1.2 : 0.65, WIDTH - 1.2]} />
          </mesh>
        )
      })}

      {/* continuous white armor faces with a deep central service shaft */}
      {FACES.map((face) => {
        const offset = HALF + 1.05
        return (
          <group key={`armor-${face.axis}-${face.sign}`}>
            {[-5.8, 5.8].map((u) => {
              const pos: [number, number, number] =
                face.axis === 'z' ? [u, 86, face.sign * offset] : [face.sign * offset, 86, u]
              return (
                <group key={u}>
                  <mesh position={pos} material={towerPanelMaterial} castShadow>
                    {face.axis === 'z' ? <boxGeometry args={[8.4, 186, 2.4]} /> : <boxGeometry args={[2.4, 186, 8.4]} />}
                  </mesh>
                  {[22, 56, 90, 124, 158].map((y) => (
                    <mesh
                      key={y}
                      position={[
                        pos[0] + (face.axis === 'z' ? 0 : face.sign * 0.85),
                        y,
                        pos[2] + (face.axis === 'z' ? face.sign * 0.85 : 0),
                      ]}
                      material={darkMaterial}
                    >
                      {face.axis === 'z' ? <boxGeometry args={[8.6, 1.2, 0.5]} /> : <boxGeometry args={[0.5, 1.2, 8.6]} />}
                    </mesh>
                  ))}
                  {[24, 66, 108, 150].map((y, pi) => (
                    <group key={`raised-${y}`}>
                      <mesh
                        position={[
                          pos[0] + (face.axis === 'z' ? 0 : face.sign * 1.05),
                          y,
                          pos[2] + (face.axis === 'z' ? face.sign * 1.05 : 0),
                        ]}
                        material={darkMaterial}
                      >
                        {face.axis === 'z' ? <boxGeometry args={[6.1, 22, 0.6]} /> : <boxGeometry args={[0.6, 22, 6.1]} />}
                      </mesh>
                      <mesh
                        position={[
                          pos[0] + (face.axis === 'z' ? 0 : face.sign * 1.35),
                          y,
                          pos[2] + (face.axis === 'z' ? face.sign * 1.35 : 0),
                        ]}
                        material={pi % 2 ? lightMaterial : towerPanelMaterial}
                      >
                        {face.axis === 'z' ? <boxGeometry args={[5.4, 19.5, 0.7]} /> : <boxGeometry args={[0.7, 19.5, 5.4]} />}
                      </mesh>
                    </group>
                  ))}
                  {[30, 74, 118, 154].map((y) => (
                    <mesh
                      key={`box-${y}`}
                      position={[
                        pos[0] + (face.axis === 'z' ? (u > 0 ? 1.4 : -1.4) : face.sign * 1.1),
                        y,
                        pos[2] + (face.axis === 'z' ? face.sign * 1.1 : (u > 0 ? 1.4 : -1.4)),
                      ]}
                      material={steelMaterial}
                    >
                      <boxGeometry args={[2.2, 3.8, 1.2]} />
                    </mesh>
                  ))}
                </group>
              )
            })}
            {[30, 70, 110, 150, 188].map((y) => (
              <mesh
                key={`tie-${y}`}
                position={face.axis === 'z' ? [0, y, face.sign * (HALF + 0.55)] : [face.sign * (HALF + 0.55), y, 0]}
                material={y === 110 ? whiteMaterial : steelMaterial}
              >
                {face.axis === 'z' ? <boxGeometry args={[5.2, 1.6, 1.2]} /> : <boxGeometry args={[1.2, 1.6, 5.2]} />}
              </mesh>
            ))}

            {/* central shaft frame */}
            {[8, 34, 60, 86, 112, 138, 164, 190].map((y) => (
              <mesh
                key={`shaft-${y}`}
                position={face.axis === 'z' ? [0, y, face.sign * (HALF + 0.45)] : [face.sign * (HALF + 0.45), y, 0]}
                material={steelMaterial}
              >
                {face.axis === 'z' ? <boxGeometry args={[8.8, 0.55, 0.5]} /> : <boxGeometry args={[0.5, 0.55, 8.8]} />}
              </mesh>
            ))}
          </group>
        )
      })}

      {/* maintenance platforms and edge lights */}
      {[36, 82, 128, 168].map((y) => (
        <group key={`platform-${y}`} position={[0, y, 0]}>
          <mesh material={steelMaterial}>
            <boxGeometry args={[WIDTH + 10, 0.9, WIDTH + 10]} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (HALF + 4.7), 0.9, 0]} material={warmEmissive}>
              <boxGeometry args={[0.7, 0.5, 8]} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={`z${side}`} position={[0, 0.9, side * (HALF + 4.7)]} material={warmEmissive}>
              <boxGeometry args={[8, 0.5, 0.7]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* diagonal bracing in the open bays */}
      <BeamInstances beams={braces} material={steelMaterial} radius={0.24} />
      <BeamInstances beams={ladders} material={steelMaterial} radius={0.16} />

      {/* cable guide arms */}
      {[58, 122].map((y) => (
        <group key={`arm-${y}`}>
          <mesh position={[0, y, HALF + 12]} material={lightMaterial}>
            <boxGeometry args={[3.6, 2.2, 24]} />
          </mesh>
          <mesh position={[0, y, -HALF - 12]} material={lightMaterial}>
            <boxGeometry args={[3.6, 2.2, 24]} />
          </mesh>
          <mesh position={[0, y, 0]} material={darkMaterial}>
            <boxGeometry args={[4.5, 1.5, HALF * 2 + 24]} />
          </mesh>
        </group>
      ))}

      {/* painted decal on a solid panel */}
      <mesh position={[0, 118, HALF + 2.1]}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial map={decal} transparent toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* internal equipment and pipes visible in the open gaps */}
      {[48, 100, 152].map((y, i) => (
        <group key={`inner-${y}`} position={[0, y, 0]}>
          <mesh position={[i % 2 ? 6 : -6, 0, 5]} material={i % 2 ? goldMaterial : steelMaterial}>
            <cylinderGeometry args={[1.5, 1.5, 10, 8]} />
          </mesh>
          <mesh position={[0, 0, -6]} material={darkMaterial}>
            <boxGeometry args={[8, 4, 3]} />
          </mesh>
        </group>
      ))}

      {/* asymmetric side equipment */}
      <group position={[variant ? 13.2 : -13.2, 96, 0]}>
        <mesh material={darkMaterial}>
          <boxGeometry args={[7, 92, 12]} />
        </mesh>
        <mesh position={[variant ? 3 : -3, 8, 0]} material={steelMaterial}>
          <cylinderGeometry args={[1.7, 1.7, 70, 8]} />
        </mesh>
        <mesh position={[variant ? 3 : -3, 38, 0]} material={goldMaterial}>
          <cylinderGeometry args={[1.1, 1.1, 42, 8]} />
        </mesh>
        {[-32, 0, 32].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={warmEmissive}>
            <boxGeometry args={[8, 0.5, 1]} />
          </mesh>
        ))}
      </group>

      {/* flared base buttresses */}
      {[-1, 1].map((side) => (
        <group key={`flare-z-${side}`}>
          <mesh position={[0, 18, side * (HALF + 7)]} rotation={[side * 0.5, 0, 0]} material={lightMaterial} castShadow>
            <boxGeometry args={[WIDTH + 8, 8, 30]} />
          </mesh>
          <mesh position={[0, 6, side * (HALF + 10)]} material={darkMaterial}>
            <boxGeometry args={[WIDTH + 2, 12, 10]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`flare-x-${side}`}>
          <mesh position={[side * (HALF + 7), 18, 0]} rotation={[0, 0, side * -0.5]} material={lightMaterial} castShadow>
            <boxGeometry args={[30, 8, WIDTH + 8]} />
          </mesh>
          <mesh position={[side * (HALF + 10), 6, 0]} material={darkMaterial}>
            <boxGeometry args={[10, 12, WIDTH + 2]} />
          </mesh>
        </group>
      ))}

      {/* tall layered buttresses above the flared foot */}
      {[-1, 1].map((side) => (
        <group key={`buttress-z-${side}`}>
          <mesh position={[0, 34, side * 15]} rotation={[side * 0.24, 0, 0]} material={lightMaterial} castShadow>
            <boxGeometry args={[7.5, 62, 20]} />
          </mesh>
          <mesh position={[0, 34, side * 15.8]} rotation={[side * 0.24, 0, 0]} material={darkMaterial}>
            <boxGeometry args={[4.2, 54, 2.2]} />
          </mesh>
          <mesh position={[0, 8, side * 16]} material={steelMaterial}>
            <boxGeometry args={[16, 3, 12]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`buttress-x-${side}`}>
          <mesh position={[side * 15, 34, 0]} rotation={[0, 0, side * -0.24]} material={lightMaterial} castShadow>
            <boxGeometry args={[20, 62, 7.5]} />
          </mesh>
          <mesh position={[side * 15.8, 34, 0]} rotation={[0, 0, side * -0.24]} material={darkMaterial}>
            <boxGeometry args={[2.2, 54, 4.2]} />
          </mesh>
          <mesh position={[side * 16, 8, 0]} material={steelMaterial}>
            <boxGeometry args={[12, 3, 16]} />
          </mesh>
        </group>
      ))}

      {/* plinth / crown / top machinery */}
      <mesh position={[0, 6, 0]} material={darkMaterial} castShadow receiveShadow>
        <boxGeometry args={[35, 12, 35]} />
      </mesh>
      <mesh position={[0, 12, 0]} material={steelMaterial}>
        <boxGeometry args={[29, 2.5, 29]} />
      </mesh>
      <mesh position={[0, HEIGHT + 4, 0]} material={lightMaterial}>
        <boxGeometry args={[28, 9, 28]} />
      </mesh>
      <mesh position={[0, HEIGHT + 10, 0]} material={darkMaterial}>
        <boxGeometry args={[23, 4, 23]} />
      </mesh>
      <mesh position={[0, HEIGHT + 16, 0]} material={steelMaterial}>
        <cylinderGeometry args={[2.1, 2.6, 8, 10]} />
      </mesh>
      <mesh position={[0, HEIGHT + 22, 0]} material={redMaterial}>
        <sphereGeometry args={[1.1, 12, 8]} />
      </mesh>

      {/* crown machinery / railing */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={`crown-post-${i}`} position={[Math.cos(a) * 13, HEIGHT + 8, Math.sin(a) * 13]} material={steelMaterial}>
            <boxGeometry args={[0.3, 6, 0.3]} />
          </mesh>
        )
      })}
      {[-1, 1].map((side) => (
        <mesh key={`crown-box-${side}`} position={[side * 8, HEIGHT + 6, 0]} material={darkMaterial}>
          <boxGeometry args={[6, 4, 7]} />
        </mesh>
      ))}
      <mesh position={[0, HEIGHT + 8, 0]} rotation={[Math.PI / 2, 0, 0]} material={warmEmissive}>
        <torusGeometry args={[12, 0.2, 4, 32]} />
      </mesh>

      {variant === 0 && (
        <group position={[0, HEIGHT + 26, 0]}>
          <mesh material={steelMaterial}>
            <cylinderGeometry args={[1.2, 2, 14, 8]} />
          </mesh>
          <mesh position={[0, 14, 0]} rotation={[0.5, 0.4, 0]} material={lightMaterial}>
            <sphereGeometry args={[9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
          </mesh>
          <mesh position={[0, 5, 0]} material={warmEmissive}>
            <sphereGeometry args={[1.1, 8, 6]} />
          </mesh>
        </group>
      )}

      {/* top crane */}
      <group position={[0, HEIGHT + 4, 0]}>
        <mesh position={[variant ? -18 : 18, 0, 0]} material={steelMaterial}>
          <boxGeometry args={[40, 1.6, 2.2]} />
        </mesh>
        <mesh position={[variant ? -38 : 38, 1, 0]} material={goldMaterial}>
          <boxGeometry args={[5, 4, 5]} />
        </mesh>
        <mesh position={[variant ? -36 : 36, -10, 0]} material={darkMaterial}>
          <boxGeometry args={[0.4, 22, 0.4]} />
        </mesh>
        <mesh position={[variant ? -36 : 36, -21, 0]} material={orangeEmissive}>
          <boxGeometry args={[3, 3, 3]} />
        </mesh>
      </group>

      {/* warm strip lights on the inner core */}
      {[40, 76, 112, 148, 184].map((y) => (
        <mesh key={`strip-${y}`} position={[0, y, 6]} material={warmEmissive}>
          <boxGeometry args={[5, 0.4, 0.6]} />
        </mesh>
      ))}
    </group>
  )
}
