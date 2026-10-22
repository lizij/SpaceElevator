import { useEffect } from 'react'
import { useSceneStore } from '../state/useSceneStore'

export function Intro() {
  const introDone = useSceneStore((s) => s.introDone)
  const dismiss = useSceneStore((s) => s.dismissIntro)
  const navigate = useSceneStore((s) => s.navigate)

  useEffect(() => {
    if (introDone) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss, introDone])

  if (introDone) return null

  const go = (view: 'base' | 'orbit' | 'interior') => {
    dismiss()
    navigate(view)
  }

  return (
    <div className="intro">
      <div className="intro__grain" />
      <div className="intro__frame">
        <div className="intro__topline">
          <span>FAN-MADE 3D RECONSTRUCTION</span>
          <span>2026 / WEBGL</span>
        </div>

        <div className="intro__main">
          <div className="intro__eyebrow">
            <span className="intro__line" />
            <span>THE WANDERING EARTH II / UEG GABON</span>
          </div>
          <h1>
            太空电梯
            <span>THE SPACE ELEVATOR</span>
          </h1>
          <p>
            从赤道海面到 90,000 km 末端配重。
            <br />
            三座主塔、十二组发射塔、216 根缆索、九部轿厢。
          </p>
          <div className="intro__stats">
            <div>
              <strong>90,000</strong>
              <span>km / 总高</span>
            </div>
            <div>
              <strong>216</strong>
              <span>根 / 碳纳米缆索</span>
            </div>
            <div>
              <strong>36,000</strong>
              <span>km / GEO 空间站</span>
            </div>
          </div>
        </div>

        <div className="intro__actions">
          <button type="button" className="intro__primary" onClick={() => go('base')}>
            <span>进入基座</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <button type="button" className="intro__secondary" onClick={() => go('orbit')}>
            先看全景
          </button>
          <button type="button" className="intro__secondary" onClick={() => go('interior')}>
            轿厢内景
          </button>
        </div>

        <div className="intro__foot">
          <span>非官方同人作品 / 仅供学习与展示</span>
          <span>设定参考《流浪地球2》公开美术资料</span>
        </div>
      </div>
    </div>
  )
}
