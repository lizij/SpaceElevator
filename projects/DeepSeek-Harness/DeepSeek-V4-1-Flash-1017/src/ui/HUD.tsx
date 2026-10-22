import { HOTSPOT_BY_ID, VIEW_META, VIEW_ORDER } from '../data/specs'
import { useSceneStore } from '../state/useSceneStore'
import { useIsMobile } from '../hooks/useMedia'
import { InfoPanel } from './InfoPanel'

const ALTITUDE_TICKS = [
  { label: '90,000', sub: '配重', top: 0 },
  { label: '36,000', sub: 'GEO', top: 42 },
  { label: '2', sub: '基座', top: 88 },
  { label: '0', sub: '海平面', top: 100 },
]

export function HUD() {
  const view = useSceneStore((s) => s.view)
  const mode = useSceneStore((s) => s.mode)
  const selected = useSceneStore((s) => s.selected)
  const select = useSceneStore((s) => s.select)
  const navigate = useSceneStore((s) => s.navigate)
  const toggleMode = useSceneStore((s) => s.toggleMode)
  const tour = useSceneStore((s) => s.tour)
  const toggleTour = useSceneStore((s) => s.toggleTour)
  const launchActive = useSceneStore((s) => s.launchActive)
  const startLaunch = useSceneStore((s) => s.startLaunch)
  const cancelLaunch = useSceneStore((s) => s.cancelLaunch)
  const mobile = useIsMobile()

  const meta = VIEW_META[view]
  const spot = selected ? HOTSPOT_BY_ID[selected] : null

  const screenshot = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const url = (canvas as HTMLCanvasElement).toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `space-elevator-${view}.png`
    link.click()
  }

  const fullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => undefined)
    } else {
      document.exitFullscreen?.().catch(() => undefined)
    }
  }

  return (
    <div className="hud">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark" aria-hidden>
            <svg viewBox="0 0 42 42" fill="none">
              <circle cx="21" cy="21" r="13.5" stroke="currentColor" strokeWidth="1.1" />
              <circle cx="21" cy="21" r="7.5" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
              <path d="M21 2.5v37M7.6 14.5h26.8M7.6 27.5h26.8" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
              <path d="M21 10.5v21" stroke="currentColor" strokeWidth="2.2" />
              <circle cx="21" cy="21" r="2.4" fill="currentColor" />
            </svg>
          </div>
          <div className="brand__text">
            <div className="brand__title">太空电梯</div>
            <div className="brand__sub">THE SPACE ELEVATOR <span>/</span> UEG GABON</div>
          </div>
        </div>

        <div className="topbar__right">
          <div className="live">
            <span className="live__dot" />
            <span>REALTIME / WEBGL</span>
          </div>
          <div className="topbar__index">
            <span>{meta.index}</span>
            <span>{meta.en}</span>
          </div>
        </div>
      </header>

      <nav className={`view-nav ${mobile ? 'view-nav--mobile' : ''}`} aria-label="视图层级">
        {VIEW_ORDER.map((id) => {
          const item = VIEW_META[id]
          return (
            <button
              key={id}
              type="button"
              className={`view-nav__item ${view === id ? 'is-active' : ''}`}
              onClick={() => navigate(id)}
            >
              <span className="view-nav__index">{item.index}</span>
              <span className="view-nav__label">{item.label}</span>
              <span className="view-nav__en">{item.en}</span>
              <span className="view-nav__line" />
            </button>
          )
        })}
      </nav>

      {!mobile && (
        <aside className="altitude" aria-label="高度">
          <div className="altitude__head">
            <span>ALTITUDE</span>
            <span>km</span>
          </div>
          <div className="altitude__body">
            <div className="altitude__line" />
            {ALTITUDE_TICKS.map((tick) => (
              <div
                key={tick.label}
                className={`altitude__tick ${
                  (view === 'orbit' && tick.label === '90,000') ||
                  (view === 'station' && tick.label === '36,000') ||
                  (view === 'counterweight' && tick.label === '90,000') ||
                  (view === 'base' && tick.label === '2')
                    ? 'is-active'
                    : ''
                }`}
                style={{ top: `${tick.top}%` }}
              >
                <span className="altitude__tick-line" />
                <span className="altitude__tick-label">{tick.label}</span>
                <span className="altitude__tick-sub">{tick.sub}</span>
              </div>
            ))}
          </div>
          <div className="altitude__now">{meta.altitude}</div>
        </aside>
      )}

      <div className="context">
        <div className="context__kicker">{meta.kicker}</div>
        <div className="context__title">{meta.label}</div>
        <div className="context__en">{meta.en}</div>
        <p>{meta.blurb}</p>
        <div className="context__hint">
          <span>拖动旋转</span>
          <span>滚轮 / 双指缩放</span>
          <span>点击热点</span>
        </div>
      </div>

      <div className={`info-layer ${spot ? 'is-open' : ''}`}>
        {spot && <InfoPanel spot={spot} onClose={() => select(null)} />}
      </div>

      <div className="bottom-bar">
        <div className="mode-toggle" role="group" aria-label="显示模式">
          <button
            type="button"
            className={mode === 'film' ? 'is-active' : ''}
            onClick={() => mode !== 'film' && toggleMode()}
          >
            电影模式
          </button>
          <button
            type="button"
            className={mode === 'engineering' ? 'is-active' : ''}
            onClick={() => mode !== 'engineering' && toggleMode()}
          >
            工程模式
          </button>
        </div>

        <div className="bottom-actions">
          <button type="button" className={tour ? 'is-active' : ''} onClick={toggleTour}>
            <span className="action-dot" />
            {tour ? '停止巡游' : '自动巡游'}
          </button>
          {view === 'base' && (
            <button
              type="button"
              className={`launch-action ${launchActive ? 'is-active' : ''}`}
              onClick={launchActive ? cancelLaunch : startLaunch}
            >
              <span className="action-dot" />
              {launchActive ? '取消演示' : '发射演示'}
            </button>
          )}
          <button type="button" onClick={() => navigate('base')}>
            重置
          </button>
          <button type="button" className="screenshot-action" onClick={screenshot}>
            截图
          </button>
          <button type="button" onClick={fullscreen} className="hide-mobile">
            全屏
          </button>
        </div>

        <div className="bottom-meta">
          <span>拖动旋转</span>
          <span className="bottom-meta__sep">/</span>
          <span>滚轮缩放</span>
          <span className="bottom-meta__sep">/</span>
          <span>双击热点聚焦</span>
        </div>
      </div>

      <div className="disclaimer">
        非官方同人作品 · 设定参考公开美术资料 · 不包含官方模型与贴图
      </div>
    </div>
  )
}
