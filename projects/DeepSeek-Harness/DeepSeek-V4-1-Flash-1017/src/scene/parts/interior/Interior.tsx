import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three-stdlib'
import { useSceneStore } from '../../../state/useSceneStore'
import { HOTSPOTS } from '../../../data/specs'
import { Hotspot } from '../Hotspot'
import {
  blueEmissive,
  darkMaterial,
  lightMaterial,
  panelLineMaterial,
  redMaterial,
  steelMaterial,
  warmEmissive,
  whiteMaterial,
  windowMaterial,
} from '../../kit/materials'
import { getWindowTexture, makeTextTexture } from '../../kit/textures'

const CABIN_H = 48
const SEAT_ROWS = 12
const SEAT_COLUMNS = [-48, -32, -17, 17, 32, 48]
const ROW_START = -120
const ROW_PITCH = 20

export function InteriorLayer() {
  const mode = useSceneStore((s) => s.mode)
  const screen = useMemo(
    () =>
      makeTextTexture(['SPACE ELEVATOR', 'UEG GABON', 'CABIN 03 / CLIMB'], {
        width: 1024,
        height: 512,
        fontSize: 70,
        color: '#cfe8ff',
        background: 'rgba(4,12,20,0.96)',
        border: 'rgba(100,180,230,0.5)',
        lineHeight: 1.18,
      }),
    [],
  )

  return (
    <group>
      <color attach="background" args={['#04070b']} />
      <InteriorShell screen={screen} />
      <SeatField />
      <Console />
      <CargoBay />

      <hemisphereLight args={['#dbe9f5', '#2a3037', 0.8]} />
      <ambientLight intensity={mode === 'film' ? 0.45 : 0.7} />
      <pointLight position={[0, 42, -100]} intensity={52} distance={240} color="#d9ecff" />
      <pointLight position={[0, 42, 30]} intensity={52} distance={240} color="#e8f1ff" />
      <pointLight position={[0, 42, 150]} intensity={42} distance={220} color="#ffdcb0" />
      <pointLight position={[0, 18, -198]} intensity={30} distance={120} color="#6fbde8" />
      <pointLight position={[-48, 26, -70]} intensity={20} distance={110} color="#4c9ed8" />
      <pointLight position={[48, 26, 80]} intensity={20} distance={110} color="#4c9ed8" />
      <pointLight position={[-50, 28, -120]} intensity={24} distance={100} color="#4c9ed8" />
      <pointLight position={[50, 28, 120]} intensity={24} distance={100} color="#4c9ed8" />
      <directionalLight position={[-60, 50, 40]} intensity={0.35} color="#9bc8e8" />

      {HOTSPOTS.filter((spot) => spot.view === 'interior').map((spot) => (
        <Hotspot key={spot.id} spot={spot} />
      ))}
    </group>
  )
}

function InteriorShell({ screen }: { screen: THREE.Texture }) {
  const windows = useMemo(() => {
    const list: { z: number }[] = []
    for (let i = 0; i < 10; i++) list.push({ z: -180 + i * 40 })
    return list
  }, [])

  return (
    <group>
      <mesh position={[0, -1, 0]} material={darkMaterial} receiveShadow>
        <boxGeometry args={[120, 2, 440]} />
      </mesh>
      <mesh position={[0, 0.1, 0]} material={panelLineMaterial}>
        <boxGeometry args={[26, 0.15, 420]} />
      </mesh>
      <mesh position={[0, CABIN_H + 1, 0]} material={darkMaterial}>
        <boxGeometry args={[120, 2, 440]} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 60, CABIN_H / 2, 0]} material={lightMaterial}>
            <boxGeometry args={[2, CABIN_H, 440]} />
          </mesh>
          {windows.map(({ z }, i) => (
            <group key={`${side}-${i}`} position={[side * 58.7, 28, z]}>
              <mesh rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
                <planeGeometry args={[26, 12]} />
                <meshBasicMaterial map={getWindowTexture()} toneMapped={false} />
              </mesh>
              {[
                [0, 7.2, 0, 0.9, 1.2, 29],
                [0, -7.2, 0, 0.9, 1.2, 29],
                [0, 0, 14.2, 0.9, 15, 1.2],
                [0, 0, -14.2, 0.9, 15, 1.2],
              ].map(([ox, oy, oz, w, h, d], frameIndex) => (
                <mesh
                  key={frameIndex}
                  position={[-side * 0.5 + ox, oy, oz]}
                  material={lightMaterial}
                >
                  <boxGeometry args={[w, h, d]} />
                </mesh>
              ))}
            </group>
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <group key={`bin-${side}-${i}`} position={[side * 45, 37, -172 + i * 48]}>
              <mesh material={whiteMaterial}>
                <boxGeometry args={[24, 7, 42]} />
              </mesh>
              <mesh position={[side * -12, -1.5, 0]} material={darkMaterial}>
                <boxGeometry args={[1.2, 3, 40]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {[-30, 30].map((x) => (
        <mesh key={x} position={[x, CABIN_H - 1.4, 0]} material={warmEmissive}>
          <boxGeometry args={[2.4, 0.55, 390]} />
        </mesh>
      ))}
      <mesh position={[0, CABIN_H - 1.4, 0]} material={warmEmissive}>
        <boxGeometry args={[6, 0.28, 388]} />
      </mesh>

      {/* ceiling ribs and under-bin lights */}
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={`rib-${i}`} position={[0, CABIN_H - 0.35, -200 + i * 40]} material={darkMaterial}>
          <boxGeometry args={[118, 1.4, 3]} />
        </mesh>
      ))}
      {[-1, 1].map((side) =>
        Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`under-${side}-${i}`} position={[side * 45, 33.2, -172 + i * 48]} material={warmEmissive}>
            <boxGeometry args={[18, 0.35, 2]} />
          </mesh>
        )),
      )}

      {/* longitudinal ceiling service pipes and cable trays */}
      {[-1, 1].map((side) => (
        <group key={`ceiling-pipe-${side}`}>
          <mesh position={[side * 43, CABIN_H - 3.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMaterial}>
            <cylinderGeometry args={[1.5, 1.5, 420, 8]} />
          </mesh>
          <mesh position={[side * 50, CABIN_H - 5.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkMaterial}>
            <cylinderGeometry args={[0.9, 0.9, 420, 6]} />
          </mesh>
          <mesh position={[side * 36, CABIN_H - 2.6, 0]} material={steelMaterial}>
            <boxGeometry args={[5, 1.2, 418]} />
          </mesh>
        </group>
      ))}
      {/* side wall structural ribs */}
      {[-1, 1].map((side) =>
        Array.from({ length: 12 }).map((_, i) => (
          <mesh key={`side-rib-${side}-${i}`} position={[side * 57.2, CABIN_H / 2, -198 + i * 36]} material={darkMaterial}>
            <boxGeometry args={[1.6, CABIN_H - 3, 2.2]} />
          </mesh>
        )),
      )}
      {/* floor panel joints and aisle edge lights */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`floor-joint-${i}`} position={[0, 0.25, -198 + i * 36]} material={panelLineMaterial}>
          <boxGeometry args={[116, 0.12, 0.5]} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`aisle-light-${side}`} position={[side * 13, 0.4, 0]} material={warmEmissive}>
          <boxGeometry args={[0.7, 0.2, 400]} />
        </mesh>
      ))}

      {/* front bulkhead */}
      <group position={[0, 0, -220]}>
        <mesh position={[0, CABIN_H / 2, 0]} material={darkMaterial}>
          <boxGeometry args={[120, CABIN_H, 6]} />
        </mesh>
        <mesh position={[0, 31, 4]} material={panelLineMaterial}>
          <boxGeometry args={[82, 22, 2]} />
        </mesh>
        <mesh position={[0, 34, 6]}>
          <planeGeometry args={[54, 14]} />
          <meshBasicMaterial map={screen} transparent toneMapped={false} />
        </mesh>
        <group position={[0, 42, 6]}>
          <mesh rotation={[0, 0, 0]}>
            <planeGeometry args={[76, 10]} />
            <meshBasicMaterial map={getWindowTexture()} toneMapped={false} />
          </mesh>
          <mesh position={[0, 5.4, 0.6]} material={steelMaterial}>
            <boxGeometry args={[80, 0.8, 1]} />
          </mesh>
          <mesh position={[0, -5.4, 0.6]} material={steelMaterial}>
            <boxGeometry args={[80, 0.8, 1]} />
          </mesh>
        </group>
        {[-30, 30].map((x) => (
          <mesh key={x} position={[x, 23, 6]} material={windowMaterial}>
            <boxGeometry args={[20, 8, 1]} />
          </mesh>
        ))}
        <mesh position={[0, 9, 6]} material={steelMaterial}>
          <boxGeometry args={[88, 1.4, 2]} />
        </mesh>
      </group>

      {/* rear bulkhead */}
      <group position={[0, 0, 220]}>
        <mesh position={[0, CABIN_H / 2, 0]} material={darkMaterial}>
          <boxGeometry args={[120, CABIN_H, 6]} />
        </mesh>
        <mesh position={[0, 26, -4]} material={panelLineMaterial}>
          <boxGeometry args={[70, 18, 2]} />
        </mesh>
        <mesh position={[0, 38, -6]} material={warmEmissive}>
          <boxGeometry args={[58, 2, 1]} />
        </mesh>
      </group>

      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={i} position={[0, 0.25, -195 + i * 28]} material={i % 2 ? blueEmissive : warmEmissive}>
          <boxGeometry args={[4, 0.18, 0.65]} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 52, 35, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMaterial}>
          <cylinderGeometry args={[0.6, 0.6, 390, 6]} />
        </mesh>
      ))}
    </group>
  )
}

function SeatField() {
  const seats = useMemo(() => {
    const list: { x: number; z: number; red: boolean }[] = []
    for (let row = 0; row < SEAT_ROWS; row++) {
      for (let col = 0; col < SEAT_COLUMNS.length; col++) {
        list.push({
          x: SEAT_COLUMNS[col],
          z: ROW_START + row * ROW_PITCH,
          red: (row + col) % 3 === 0,
        })
      }
    }
    return list
  }, [])

  return (
    <group>
      <SeatInstances seats={seats.filter((s) => s.red)} material={redSeatMaterial} />
      <SeatInstances seats={seats.filter((s) => !s.red)} material={graySeatMaterial} />
      <HeadrestInstances seats={seats} />
      <ArmrestInstances seats={seats} />
      <SeatBeltInstances seats={seats} />
    </group>
  )
}

function SeatInstances({ seats, material }: { seats: { x: number; z: number }[]; material: THREE.Material }) {
  const cushion = useRef<THREE.InstancedMesh>(null)
  const back = useRef<THREE.InstancedMesh>(null)
  const base = useRef<THREE.InstancedMesh>(null)
  const cushionGeometry = useMemo(() => new RoundedBoxGeometry(9, 2, 8, 3, 0.8), [])
  const backGeometry = useMemo(() => new RoundedBoxGeometry(9, 12, 2, 3, 0.8), [])
  const baseGeometry = useMemo(() => new RoundedBoxGeometry(5, 5, 5, 2, 0.5), [])

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3(1, 1, 1)

    seats.forEach((seat, i) => {
      position.set(seat.x, 5, seat.z)
      matrix.compose(position, quaternion, scale)
      cushion.current?.setMatrixAt(i, matrix)

      position.set(seat.x, 12, seat.z + 4)
      matrix.compose(position, quaternion, scale)
      back.current?.setMatrixAt(i, matrix)

      position.set(seat.x, 2.5, seat.z)
      matrix.compose(position, quaternion, scale)
      base.current?.setMatrixAt(i, matrix)
    })

    ;[cushion, back, base].forEach((ref) => {
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true
        ref.current.computeBoundingSphere()
      }
    })
  }, [seats])

  return (
    <group>
      <instancedMesh ref={cushion} args={[cushionGeometry, material, Math.max(seats.length, 1)]} />
      <instancedMesh ref={back} args={[backGeometry, material, Math.max(seats.length, 1)]} />
      <instancedMesh ref={base} args={[baseGeometry, darkMaterial, Math.max(seats.length, 1)]} />
    </group>
  )
}

function SeatBeltInstances({ seats }: { seats: { x: number; z: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => new RoundedBoxGeometry(7, 0.9, 0.9, 1, 0.35), [])
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    seats.forEach((seat, i) => {
      p.set(seat.x, 15, seat.z + 5.2)
      matrix.compose(p, q, new THREE.Vector3(1, 1, 1))
      ref.current?.setMatrixAt(i, matrix)
    })
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true
      ref.current.computeBoundingSphere()
    }
  }, [seats])
  return <instancedMesh ref={ref} args={[geometry, darkMaterial, Math.max(seats.length, 1)]} />
}

function HeadrestInstances({ seats }: { seats: { x: number; z: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => new RoundedBoxGeometry(7, 4, 2.5, 2, 0.7), [])
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    seats.forEach((seat, i) => {
      p.set(seat.x, 20, seat.z + 4)
      matrix.compose(p, q, new THREE.Vector3(1, 1, 1))
      ref.current?.setMatrixAt(i, matrix)
    })
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true
      ref.current.computeBoundingSphere()
    }
  }, [seats])
  return <instancedMesh ref={ref} args={[geometry, headrestMaterial, Math.max(seats.length, 1)]} />
}

function ArmrestInstances({ seats }: { seats: { x: number; z: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => new RoundedBoxGeometry(1.5, 1.5, 7, 2, 0.3), [])
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    seats.forEach((seat, i) => {
      p.set(seat.x + 5.2, 8, seat.z)
      matrix.compose(p, q, new THREE.Vector3(1, 1, 1))
      ref.current?.setMatrixAt(i * 2, matrix)
      p.set(seat.x - 5.2, 8, seat.z)
      matrix.compose(p, q, new THREE.Vector3(1, 1, 1))
      ref.current?.setMatrixAt(i * 2 + 1, matrix)
    })
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true
      ref.current.computeBoundingSphere()
    }
  }, [seats])
  return <instancedMesh ref={ref} args={[geometry, steelMaterial, Math.max(seats.length * 2, 1)]} />
}

function Console() {
  const screenTexture = useMemo(
    () =>
      makeTextTexture(['CABIN 03', 'CLIMB 03', 'ALT  1,240 km', 'V   212 m/s', 'UEG / GABON'], {
        width: 512,
        height: 384,
        fontSize: 38,
        color: '#9fdcff',
        background: 'rgba(2,10,16,0.98)',
        border: 'rgba(80,170,220,0.55)',
        lineHeight: 1.22,
      }),
    [],
  )

  return (
    <group position={[0, 0, -198]}>
      <mesh position={[0, 12, 0]} material={darkMaterial}>
        <boxGeometry args={[92, 16, 26]} />
      </mesh>
      <mesh position={[0, 22, 0]} rotation={[-0.22, 0, 0]} material={panelLineMaterial}>
        <boxGeometry args={[88, 16, 7]} />
      </mesh>
      <mesh position={[-24, 24, 4]} rotation={[-0.22, 0, 0]}>
        <planeGeometry args={[30, 12]} />
        <meshBasicMaterial map={screenTexture} toneMapped={false} />
      </mesh>
      <mesh position={[14, 24, 4]} rotation={[-0.22, 0, 0]}>
        <planeGeometry args={[30, 12]} />
        <meshBasicMaterial map={screenTexture} toneMapped={false} />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh key={i} position={[-38 + (i % 8) * 10, 17, 13]} material={i % 3 === 0 ? redMaterial : i % 2 ? blueEmissive : warmEmissive}>
          <boxGeometry args={[2.6, 0.9, 1.6]} />
        </mesh>
      ))}
      <mesh position={[0, 35, -12]} material={warmEmissive}>
        <boxGeometry args={[60, 1.4, 1.4]} />
      </mesh>
    </group>
  )
}

function CargoBay() {
  return (
    <group position={[0, 0, 188]}>
      {[
        [-38, 9, 0, 22, 18, 24],
        [-8, 8, 4, 18, 16, 20],
        [28, 11, -2, 24, 22, 26],
        [46, 7, 12, 16, 14, 18],
        [-28, 7, 24, 18, 14, 16],
      ].map(([x, y, z, w, h, d], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh material={i % 2 === 0 ? darkBoxMaterial : lightBoxMaterial}>
            <boxGeometry args={[w, h, d]} />
          </mesh>
          <mesh position={[0, 0, d / 2 + 0.4]} material={warmEmissive}>
            <boxGeometry args={[w * 0.7, 1.0, 0.4]} />
          </mesh>
          <mesh position={[0, h / 2 + 0.2, 0]} material={steelMaterial}>
            <boxGeometry args={[w + 2, 0.6, d + 2]} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 44, -8]} material={steelMaterial}>
        <boxGeometry args={[100, 1.8, 190]} />
      </mesh>
      <group position={[0, 37, -24]}>
        <mesh material={orangeBoxMaterial}>
          <boxGeometry args={[18, 7, 14]} />
        </mesh>
        <mesh position={[0, -10, 0]} material={steelMaterial}>
          <boxGeometry args={[0.4, 14, 0.4]} />
        </mesh>
        <mesh position={[0, -18, 0]} material={darkMaterial}>
          <boxGeometry args={[6, 3.5, 4]} />
        </mesh>
      </group>

      <mesh position={[0, 0.3, 0]} material={panelLineMaterial}>
        <boxGeometry args={[90, 0.15, 4]} />
      </mesh>
    </group>
  )
}

const redSeatMaterial = new THREE.MeshStandardMaterial({ color: '#8a3b35', roughness: 0.72, metalness: 0.05 })
const graySeatMaterial = new THREE.MeshStandardMaterial({ color: '#5f6871', roughness: 0.75, metalness: 0.08 })
const headrestMaterial = new THREE.MeshStandardMaterial({ color: '#c9d2db', roughness: 0.7, metalness: 0.05 })
const darkBoxMaterial = new THREE.MeshStandardMaterial({ color: '#3a3f44', roughness: 0.7, metalness: 0.3 })
const lightBoxMaterial = new THREE.MeshStandardMaterial({ color: '#aeb6bd', roughness: 0.6, metalness: 0.3 })
const orangeBoxMaterial = new THREE.MeshStandardMaterial({ color: '#b97a2d', roughness: 0.55, metalness: 0.4 })
const ceilingPanelMaterial = new THREE.MeshStandardMaterial({ color: '#cbd7e2', emissive: '#7ea5c4', emissiveIntensity: 0.22, roughness: 0.6, metalness: 0.15 })
