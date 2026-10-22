import { create } from 'zustand'

export type ViewId = 'orbit' | 'base' | 'cabin' | 'station' | 'counterweight' | 'interior'
export type Mode = 'film' | 'engineering'
export type LaunchPhase = 'idle' | 'ignition' | 'climb' | 'complete'

type SceneState = {
  view: ViewId
  mode: Mode
  selected: string | null
  transitioning: boolean
  tour: boolean
  introDone: boolean
  launchActive: boolean
  launchPhase: LaunchPhase
  launchStartedAt: number
  startLaunch: () => void
  setLaunchPhase: (phase: LaunchPhase) => void
  endLaunch: () => void
  cancelLaunch: () => void
  navigate: (next: ViewId, keepTour?: boolean) => void
  setMode: (mode: Mode) => void
  toggleMode: () => void
  select: (id: string | null) => void
  setTour: (tour: boolean) => void
  toggleTour: () => void
  dismissIntro: () => void
}

let swapTimer: number | undefined
let endTimer: number | undefined

const VIEWS: ViewId[] = ['orbit', 'base', 'cabin', 'station', 'counterweight', 'interior']
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const requestedView = params.get('view') as ViewId | null
const initialView = requestedView && VIEWS.includes(requestedView) ? requestedView : 'base'
const initialMode: Mode = params.get('mode') === 'engineering' ? 'engineering' : 'film'
const initialIntroDone = params.get('intro') === '0'

export const useSceneStore = create<SceneState>((set, get) => ({
  view: initialView,
  mode: initialMode,
  selected: null,
  transitioning: false,
  tour: false,
  introDone: initialIntroDone,
  launchActive: false,
  launchPhase: 'idle',
  launchStartedAt: 0,

  navigate: (next, keepTour = false) => {
    const state = get()
    if (state.transitioning || next === state.view) return

    window.clearTimeout(swapTimer)
    window.clearTimeout(endTimer)

    set({
      transitioning: true,
      selected: null,
      tour: keepTour ? state.tour : false,
      launchActive: false,
      launchPhase: 'idle',
    })

    swapTimer = window.setTimeout(() => {
      set({ view: next })
    }, 300)

    endTimer = window.setTimeout(() => {
      set({ transitioning: false })
    }, 620)
  },

  setMode: (mode) => set({ mode }),
  toggleMode: () => set((s) => ({ mode: s.mode === 'film' ? 'engineering' : 'film' })),
  select: (id) => set({ selected: id }),
  setTour: (tour) => set({ tour }),
  toggleTour: () => set((s) => ({ tour: !s.tour })),
  startLaunch: () =>
    set({
      launchActive: true,
      launchPhase: 'ignition',
      launchStartedAt: performance.now(),
      selected: null,
      tour: false,
      introDone: true,
    }),
  setLaunchPhase: (phase) => set({ launchPhase: phase }),
  endLaunch: () => set({ launchActive: false, launchPhase: 'idle' }),
  cancelLaunch: () => set({ launchActive: false, launchPhase: 'idle' }),
  dismissIntro: () => set({ introDone: true }),
}))
