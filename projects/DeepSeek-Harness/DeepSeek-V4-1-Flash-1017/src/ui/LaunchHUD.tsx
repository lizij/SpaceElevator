import { useEffect, useState } from 'react'
import { useSceneStore } from '../state/useSceneStore'

const PHASES: Record<string, string> = {
  ignition: '连杆对接 / 点火',
  climb: '轿厢爬升',
  complete: '入轨段',
}

export function LaunchHUD() {
  const active = useSceneStore((s) => s.launchActive)
  const phase = useSceneStore((s) => s.launchPhase)
  const startedAt = useSceneStore((s) => s.launchStartedAt)
  const cancel = useSceneStore((s) => s.cancelLaunch)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setElapsed(Math.max(0, (performance.now() - startedAt) / 1000))
    }, 100)
    return () => window.clearInterval(id)
  }, [active, startedAt])

  if (!active) return null

  const progress = Math.min(100, (elapsed / 12) * 100)

  return (
    <div className="launch-hud" role="status" aria-live="polite">
      <div className="launch-hud__head">
        <div>
          <div className="launch-hud__kicker">LAUNCH SEQUENCE</div>
          <div className="launch-hud__title">太空电梯 · 发射演示</div>
        </div>
        <button type="button" className="launch-hud__cancel" onClick={cancel}>
          取消
        </button>
      </div>
      <div className="launch-hud__meta">
        <span>{PHASES[phase] ?? '准备'}</span>
        <span>T+{elapsed.toFixed(1)} / 12.0 s</span>
      </div>
      <div className="launch-hud__bar">
        <div style={{ width: `${progress}%` }} />
      </div>
      <div className="launch-hud__stages">
        <span className={phase === 'ignition' ? 'is-active' : ''}>01 点火</span>
        <span className={phase === 'climb' ? 'is-active' : ''}>02 爬升</span>
        <span className={phase === 'complete' ? 'is-active' : ''}>03 入轨</span>
      </div>
    </div>
  )
}
