import type { LaunchState } from '../scene/BaseScene';

export type ViewMode = 'base' | 'orbit';
export type BasePreset = 'overview' | 'base' | 'car';
export type OrbitPreset = 'system' | 'earth' | 'station' | 'counterweight';

export interface HudHandlers {
  onBasePreset: (preset: BasePreset) => void;
  onOrbitPreset: (preset: OrbitPreset) => void;
  onLaunch: () => void;
  onOrbitToggle: () => void;
  onTheme: () => void;
  onSound: () => void;
  onFullscreen: () => void;
  onAutoRotate: () => void;
}

export interface Telemetry {
  mode: ViewMode;
  altitude: number;
  launchState: LaunchState;
  launchProgress: number;
  presetLabel: string;
  orbitPreset: OrbitPreset;
  altitudeUnit: 'm' | 'km';
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function altitudeText(alt: number, unit: 'm' | 'km'): string {
  if (unit === 'km') return `${formatNumber(alt)} km`;
  if (alt >= 10000) return `${(alt / 1000).toFixed(1)} km`;
  return `${formatNumber(alt)} m`;
}

export class Hud {
  private root: HTMLElement;
  private loading: HTMLElement;
  private fill: HTMLElement;
  private pct: HTMLElement;
  private loaderText: HTMLElement;
  private mode: ViewMode = 'base';
  private handlers: HudHandlers;
  private toastEl: HTMLElement;
  private hints: HTMLElement;
  private modal: HTMLElement;
  private labelEls = new Map<string, HTMLElement>();
  private ruler: HTMLElement;
  private rulerMark: HTMLElement;
  private telAlt: HTMLElement;
  private telScale: HTMLElement;
  private telCam: HTMLElement;
  private telProgress: HTMLElement;
  private launchBtn: HTMLButtonElement;
  private launchLabel: HTMLElement;
  private orbitBtn: HTMLElement;
  private orbitLabel: HTMLElement;
  private rotateBtn: HTMLElement;
  private themeLabel: HTMLElement;
  private soundLabel: HTMLElement;
  private basePresets: HTMLElement;
  private orbitPresets: HTMLElement;
  private activeBase: BasePreset = 'overview';
  private activeOrbit: OrbitPreset = 'system';
  private toastTimer = 0;

  constructor(handlers: HudHandlers) {
    this.handlers = handlers;
    this.root = document.getElementById('app') as HTMLElement;
    this.loading = document.getElementById('loading') as HTMLElement;
    this.fill = document.getElementById('loader-fill') as HTMLElement;
    this.pct = document.getElementById('loader-pct') as HTMLElement;
    this.loaderText = document.getElementById('loader-text') as HTMLElement;
    this.toastEl = document.getElementById('toast') as HTMLElement;
    this.hints = document.getElementById('hints') as HTMLElement;
    this.modal = document.getElementById('modal') as HTMLElement;
    this.ruler = document.getElementById('ruler') as HTMLElement;
    this.rulerMark = document.getElementById('ruler-mark') as HTMLElement;
    this.telAlt = document.getElementById('tel-alt') as HTMLElement;
    this.telScale = document.getElementById('tel-scale') as HTMLElement;
    this.telCam = document.getElementById('tel-cam') as HTMLElement;
    this.telProgress = document.getElementById('tel-progress') as HTMLElement;
    this.launchBtn = document.getElementById('btn-launch') as HTMLButtonElement;
    this.launchLabel = this.launchBtn.querySelector('span') as HTMLElement;
    this.orbitBtn = document.getElementById('btn-orbit') as HTMLElement;
    this.orbitLabel = this.orbitBtn.querySelector('span') as HTMLElement;
    this.rotateBtn = document.getElementById('btn-rotate') as HTMLElement;
    this.themeLabel = document.getElementById('theme-label') as HTMLElement;
    this.soundLabel = document.getElementById('sound-label') as HTMLElement;
    this.basePresets = document.querySelector('.segment[data-group="base"]') as HTMLElement;
    this.orbitPresets = document.querySelector('.segment[data-group="orbit"]') as HTMLElement;

    for (const el of document.querySelectorAll<HTMLElement>('.map-label')) {
      this.labelEls.set(el.dataset.label ?? '', el);
    }

    this.bind();
    window.setTimeout(() => this.hints.classList.add('gone'), 11000);
  }

  private bind(): void {
    document.querySelectorAll<HTMLButtonElement>('.segment[data-group="base"] button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset as BasePreset;
        this.setBasePreset(preset);
        this.handlers.onBasePreset(preset);
      });
    });
    document.querySelectorAll<HTMLButtonElement>('.segment[data-group="orbit"] button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset as OrbitPreset;
        this.setOrbitPreset(preset);
        this.handlers.onOrbitPreset(preset);
      });
    });

    this.launchBtn.addEventListener('click', () => this.handlers.onLaunch());
    this.orbitBtn.addEventListener('click', () => this.handlers.onOrbitToggle());
    this.rotateBtn.addEventListener('click', () => this.handlers.onAutoRotate());

    document.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
      const action = el.dataset.action;
      el.addEventListener('click', () => {
        if (action === 'theme') this.handlers.onTheme();
        else if (action === 'sound') this.handlers.onSound();
        else if (action === 'fullscreen') this.handlers.onFullscreen();
        else if (action === 'help') this.modal.hidden = false;
        else if (action === 'close-modal') this.modal.hidden = true;
      });
    });

    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) this.modal.hidden = true;
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.modal.hidden = true;
    });
  }

  setBasePreset(preset: BasePreset): void {
    this.activeBase = preset;
    this.basePresets.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });
  }

  setOrbitPreset(preset: OrbitPreset): void {
    this.activeOrbit = preset;
    this.orbitPresets.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });
  }

  setMode(mode: ViewMode): void {
    this.mode = mode;
    this.root.classList.toggle('orbit-mode', mode === 'orbit');
    this.basePresets.hidden = mode !== 'base';
    this.orbitPresets.hidden = mode !== 'orbit';
    this.ruler.hidden = mode !== 'orbit';
    this.ruler.classList.toggle('visible', mode === 'orbit');
    this.orbitLabel.textContent = mode === 'orbit' ? '返回地面' : '轨道视角';
    (document.getElementById('labels') as HTMLElement).classList.toggle('visible', mode === 'orbit');
    this.hints.classList.add('gone');
  }

  setThemeLabel(label: string): void {
    this.themeLabel.textContent = label;
  }

  setSoundLabel(on: boolean): void {
    this.soundLabel.textContent = on ? '声音' : '静音';
  }

  setAutoRotate(on: boolean): void {
    this.rotateBtn.classList.toggle('active', on);
  }

  setLoading(progress: number, text?: string): void {
    const p = Math.max(0, Math.min(1, progress));
    this.fill.style.width = `${p * 100}%`;
    this.pct.textContent = `${Math.round(p * 100)}%`;
    if (text) this.loaderText.textContent = text;
  }

  finishLoading(): void {
    this.setLoading(1, '建立同步轨道链接…');
    window.setTimeout(() => this.loading.classList.add('done'), 650);
  }

  showFatal(message: string): void {
    this.loading.classList.add('done');
    const fatal = document.getElementById('fatal') as HTMLElement;
    fatal.hidden = false;
    (document.getElementById('fatal-text') as HTMLElement).textContent = message;
  }

  toast(message: string, duration = 2600): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), duration);
  }

  updateTelemetry(t: Telemetry): void {
    if (t.mode === 'orbit') {
      const alt = t.orbitPreset === 'earth' || t.orbitPreset === 'system' ? 0 : t.orbitPreset === 'station' ? 36000 : 90000;
      this.telAlt.textContent = alt === 0 ? '地表 / 0 km' : `${formatNumber(alt)} km`;
      this.telScale.textContent = '行星尺度';
      this.telCam.textContent = t.presetLabel;
      const p = t.orbitPreset === 'earth' || t.orbitPreset === 'system' ? 0 : t.orbitPreset === 'station' ? 0.4 : 1;
      this.telProgress.style.width = `${p * 100}%`;
      this.rulerMark.style.top = `${(1 - p) * 100}%`;
      (this.ruler.querySelector('.ruler-fill') as HTMLElement).style.height = `${p * 100}%`;
      return;
    }

    this.telAlt.textContent = altitudeText(t.altitude, t.altitudeUnit);
    this.telScale.textContent = '基地视图';
    this.telCam.textContent = t.presetLabel;
    const p = t.launchState === 'idle' ? Math.max(0.004, t.altitude / 90000) : Math.max(0.01, t.launchProgress);
    this.telProgress.style.width = `${p * 100}%`;
  }

  setLaunchState(state: LaunchState): void {
    this.launchBtn.classList.toggle('running', state !== 'idle');
    this.launchLabel.textContent = state === 'climbing' ? '爬升中' : state === 'topped' ? '回收轿厢' : '点火升空';
    this.launchBtn.disabled = state === 'climbing';
  }

  updateLabels(positions: Array<{ key: string; x: number; y: number; visible: boolean }>): void {
    for (const pos of positions) {
      const el = this.labelEls.get(pos.key);
      if (!el) continue;
      const w = el.offsetWidth || 240;
      const margin = 12;
      const reserve = this.mode === 'orbit' && window.innerWidth >= 900 ? 270 : margin;
      const rightLimit = window.innerWidth - reserve;
      const canRight = pos.x + 16 + w <= rightLimit;
      const canLeft = pos.x - 16 - w >= margin;
      const y = Math.min(Math.max(pos.y, 96), window.innerHeight - 112);
      let tx = '16px';
      let ty = '-50%';
      if (!canRight && canLeft) {
        tx = 'calc(-100% - 16px)';
      } else if (!canRight && !canLeft) {
        tx = '-50%';
        ty = y < 150 ? '16px' : 'calc(-100% - 16px)';
      }
      el.style.transform = `translate3d(${pos.x}px, ${y}px, 0) translate(${tx}, ${ty})`;
      el.classList.toggle('flip', tx.startsWith('calc(-100%'));
      el.classList.toggle('on', pos.visible);
    }
  }

  get currentBasePreset(): BasePreset {
    return this.activeBase;
  }

  get currentOrbitPreset(): OrbitPreset {
    return this.activeOrbit;
  }

  get viewMode(): ViewMode {
    return this.mode;
  }
}
