import {create} from 'zustand'

export interface Screenshot {
  id: string
  href: string
  date: string
}

export const minShotSize = 80
export const maxShotSize = 480
export const shotSizeStep = 10
export const zoomStep = 50

interface ScreenshotsState {
  shots: Record<string, Screenshot[]>
  size: number
  add: (serial: string, shot: Screenshot) => void
  clear: (serial: string) => void
  setSize: (size: number) => void
}

export const useScreenshotsStore = create<ScreenshotsState>((set) => ({
  shots: {}
  , size: 400
  , add: (serial, shot) => set((state) => ({
    shots: {...state.shots, [serial]: [shot, ...state.shots[serial] || []]}
  }))
  , clear: (serial) => set((state) => ({shots: {...state.shots, [serial]: []}}))
  , setSize: (size) => set({size: Math.min(Math.max(size, minShotSize), maxShotSize)})
}))

export function shotSizeParameter(size: number, multiplier: number): string {
  const finalSize = size * multiplier
  return finalSize === maxShotSize * multiplier ? '' : `?crop=${finalSize}x`
}
