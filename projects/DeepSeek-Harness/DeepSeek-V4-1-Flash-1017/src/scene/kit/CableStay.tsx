import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

type CableStayProps = {
  start: [number, number, number]
  end: [number, number, number]
  sag?: number
  color?: string
  width?: number
  opacity?: number
  segments?: number
}

export function CableStay({
  start,
  end,
  sag = 8,
  color = '#111820',
  width = 1.2,
  opacity = 0.9,
  segments = 32,
}: CableStayProps) {
  const points = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const mid = a.clone().lerp(b, 0.5)
    mid.y -= sag
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    return curve.getPoints(segments)
  }, [start, end, sag, segments])

  return <Line points={points} color={color} lineWidth={width} transparent opacity={opacity} />
}
