import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

export function Loading() {
  const { progress } = useProgress()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (progress >= 100) {
      const timer = window.setTimeout(() => setHidden(true), 620)
      return () => window.clearTimeout(timer)
    }
  }, [progress])

  useEffect(() => {
    const fallback = window.setTimeout(() => setHidden(true), 5200)
    return () => window.clearTimeout(fallback)
  }, [])

  if (hidden) return null

  return (
    <div className={`loading ${progress >= 100 ? 'is-done' : ''}`}>
      <div className="loading__inner">
        <div className="loading__mark">
          <span />
          <span />
          <span />
        </div>
        <div className="loading__label">正在装配缆索</div>
        <div className="loading__en">INITIALIZING CABLE ARRAY</div>
        <div className="loading__bar">
          <div style={{ width: `${Math.max(progress, 6)}%` }} />
        </div>
        <div className="loading__percent">{String(Math.round(progress)).padStart(3, '0')} %</div>
      </div>
    </div>
  )
}
