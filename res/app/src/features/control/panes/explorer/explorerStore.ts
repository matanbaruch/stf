import {create} from 'zustand'

export const useExplorerStore = create<{paths: Record<string, string>}>(() => ({paths: {}}))

export function setExplorerPath(serial: string, path: string) {
  useExplorerStore.setState((state) => ({paths: {...state.paths, [serial]: path}}))
}
