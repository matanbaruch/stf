import {create} from 'zustand'
import {v4 as uuidv4} from 'uuid'
import type {Device} from '@/core/devices/types'

export interface ForwardRow {
  id: string
  devicePort: string
  targetHost: string
  targetPort: string
  enabled: boolean
  pending: boolean
}

type DeviceForward = NonNullable<Device['reverseForwards']>[number]

function defaults(id: string): ForwardRow {
  return {
    id
    , targetHost: 'localhost'
    , targetPort: '8080'
    , devicePort: '8080'
    , enabled: false
    , pending: false
  }
}

const initialRows = [defaults('_default')]

interface PortForwardsState {
  rows: Record<string, ForwardRow[]>
}

export const usePortForwardsStore = create<PortForwardsState>(() => ({rows: {}}))

export function forwardRows(state: PortForwardsState, serial: string): ForwardRow[] {
  return state.rows[serial] || initialRows
}

function setRows(serial: string, next: (rows: ForwardRow[]) => ForwardRow[]) {
  usePortForwardsStore.setState((state) => ({
    rows: {...state.rows, [serial]: next(forwardRows(state, serial))}
  }))
}

export function addForwardRow(serial: string) {
  setRows(serial, (rows) => rows.concat(defaults(uuidv4())))
}

export function removeForwardRow(serial: string, id: string) {
  setRows(serial, (rows) => rows.filter((row) => row.id !== id))
}

export function updateForwardRow(serial: string, id: string, patch: Partial<ForwardRow>) {
  setRows(serial, (rows) => rows.map((row) => (row.id === id ? {...row, ...patch} : row)))
}

export function syncForwardRows(serial: string, forwards: DeviceForward[]) {
  const byId = new Map(forwards.map((forward) => [forward.id, forward]))
  setRows(serial, (rows) => {
    const known = new Set(rows.map((row) => row.id))
    const synced = rows.map((row) => {
      const deviceForward = byId.get(row.id)
      if (row.pending) {
        return row
      }
      if (deviceForward) {
        return {...row, enabled: deviceForward.devicePort === Number(row.devicePort)}
      }
      return row.enabled ? {...row, enabled: false} : row
    })
    const added = forwards
      .filter((forward) => !known.has(forward.id))
      .map((forward) => ({
        id: forward.id
        , devicePort: String(forward.devicePort)
        , targetHost: forward.targetHost
        , targetPort: String(forward.targetPort)
        , enabled: true
        , pending: false
      }))
    return synced.concat(added)
  })
}
