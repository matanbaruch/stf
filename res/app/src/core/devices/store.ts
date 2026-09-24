import {useEffect, useState, useSyncExternalStore} from 'react'
import {api} from '../api'
import {mergeObject} from '../collection'
import {emit, onSocket} from '../socket'
import {enhanceDevice} from './enhance'
import type {Device} from './types'

type Filter = (device: Device) => boolean

interface DeviceEvent {
  important?: boolean
  data: Partial<Device> & {serial: string}
}

interface GroupDevicesEvent {
  important?: boolean
  devices: string[]
}

function merged(device: Device, data: Partial<Device>): Device {
  return enhanceDevice(mergeObject(device, data))
}

export async function loadDevice(serial: string): Promise<Device> {
  const response = await api.get<{device: Device}>(`/api/v1/devices/${serial}`)
  return response.device
}

export async function loadDevices(url: string): Promise<Device[]> {
  const response = await api.get<{devices: Device[]}>(url)
  return response.devices || []
}

export function updateDeviceNote(serial: string, note: string): void {
  emit('device.note', {serial, note})
}

export class DeviceTracker {
  private devices: Device[] = []
  private bySerial = new Map<string, number>()
  private snapshot: Device[] = []
  private listeners = new Set<() => void>()
  private unsubscribers: Array<() => void> = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private frame: number | null = null
  private lastFlush = 0

  constructor(private filter: Filter) {
    this.unsubscribers.push(
      onSocket('device.add', (event: DeviceEvent) => this.onAdd(event))
      , onSocket('device.remove', (event: DeviceEvent) => this.onChange(event))
      , onSocket('device.change', (event: DeviceEvent) => this.onChange(event))
      , onSocket('device.addGroupDevices', (event: GroupDevicesEvent) =>
        this.onAddGroupDevices(event))
      , onSocket('device.removeGroupDevices', (event: GroupDevicesEvent) =>
        this.onRemoveGroupDevices(event))
      , onSocket('device.updateGroupDevice', (event: DeviceEvent) => this.onUpdate(event))
    )
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): Device[] => this.snapshot

  get(serial: string): Device | undefined {
    const index = this.bySerial.get(serial)
    return index === undefined ? undefined : this.devices[index]
  }

  add(device: Device): void {
    this.onAdd({important: true, data: device})
  }

  destroy(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.unsubscribers = []
    if (this.timer) {
      clearTimeout(this.timer)
    }
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame)
    }
    this.listeners.clear()
  }

  private flush = () => {
    this.timer = null
    this.frame = null
    this.lastFlush = Date.now()
    this.snapshot = this.devices.slice()
    this.listeners.forEach((listener) => listener())
  }

  private notify(important?: boolean) {
    if (important) {
      if (this.frame === null) {
        this.frame = requestAnimationFrame(this.flush)
      }
      return
    }
    if (this.timer || this.frame !== null) {
      return
    }
    const delta = Date.now() - this.lastFlush
    if (delta > 1000) {
      this.frame = requestAnimationFrame(this.flush)
    }
    else {
      this.timer = setTimeout(this.flush, 1000 - delta)
    }
  }

  private insert(data: Partial<Device>): Device {
    const device = this.build(data)
    this.bySerial.set(device.serial, this.devices.push(device) - 1)
    return device
  }

  private build(data: Partial<Device>): Device {
    return enhanceDevice(mergeObject({}, data) as Device)
  }

  private replace(device: Device, data: Partial<Device>): Device {
    const next = merged(device, data)
    const index = this.bySerial.get(device.serial)
    if (index !== undefined) {
      this.devices[index] = next
    }
    return next
  }

  private remove(serial: string) {
    const index = this.bySerial.get(serial)
    if (index === undefined) {
      return
    }
    this.devices.splice(index, 1)
    this.bySerial.delete(serial)
    for (const [key, value] of this.bySerial) {
      if (value > index) {
        this.bySerial.set(key, value - 1)
      }
    }
  }

  private onChange(event: DeviceEvent) {
    const device = this.get(event.data.serial)
    if (!device) {
      return
    }
    if (event.data.likelyLeaveReason === 'status_change' &&
        device.statusTimeStamp && event.data.statusTimeStamp &&
        device.statusTimeStamp > event.data.statusTimeStamp) {
      return
    }
    const next = this.replace(device, event.data)
    if (!this.filter(next)) {
      this.remove(next.serial)
    }
    this.notify(event.important)
  }

  private onAdd(event: DeviceEvent) {
    const device = this.get(event.data.serial)
    if (device) {
      this.replace(device, event.data)
      this.notify(event.important)
    }
    else if (this.filter(this.build(event.data))) {
      this.insert(event.data)
      this.notify(event.important)
    }
  }

  private onUpdate(event: DeviceEvent) {
    const device = this.get(event.data.serial)
    if (device) {
      this.replace(device, event.data)
      this.notify(event.important)
    }
  }

  private async onAddGroupDevices(event: GroupDevicesEvent) {
    const devices = await Promise.all(event.devices.map((serial) =>
      loadDevice(serial).catch(() => null)))
    for (const device of devices) {
      if (device && !this.bySerial.has(device.serial)) {
        this.insert(device)
        this.notify(event.important)
      }
    }
  }

  private onRemoveGroupDevices(event: GroupDevicesEvent) {
    for (const serial of event.devices) {
      if (this.bySerial.has(serial)) {
        this.remove(serial)
        this.notify(event.important)
      }
    }
  }
}

interface SharedTracker {
  tracker: DeviceTracker
  refs: number
  ready: Promise<void>
  loaded: boolean
  error: unknown
}

const shared = new Map<string, SharedTracker>()

function acquire(key: string, filter: Filter, load: () => Promise<Device[]>): SharedTracker {
  let entry = shared.get(key)
  if (!entry) {
    const tracker = new DeviceTracker(filter)
    const created: SharedTracker = {
      tracker
      , refs: 0
      , loaded: false
      , error: null
      , ready: Promise.resolve()
    }
    created.ready = load()
      .then((devices) => {
        devices.forEach((device) => tracker.add(device))
      })
      .catch((error) => {
        created.error = error
      })
      .finally(() => {
        created.loaded = true
      })
    entry = created
    shared.set(key, entry)
  }
  entry.refs += 1
  return entry
}

function release(key: string): void {
  const entry = shared.get(key)
  if (!entry) {
    return
  }
  entry.refs -= 1
  if (entry.refs <= 0) {
    entry.tracker.destroy()
    shared.delete(key)
  }
}

const emptyDevices: Device[] = []
const emptySubscribe = () => () => undefined

export interface TrackedDevices {
  devices: Device[]
  loading: boolean
  error: unknown
}

function useTracker(
  key: string | null
, filter: Filter
, load: () => Promise<Device[]>
): TrackedDevices {
  const [entry, setEntry] = useState<SharedTracker | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!key) {
      return undefined
    }
    const acquired = acquire(key, filter, load)
    setEntry(acquired)
    setLoading(!acquired.loaded)
    let active = true
    acquired.ready.then(() => {
      if (active) {
        setLoading(false)
      }
    })
    return () => {
      active = false
      release(key)
    }
  }, [key])

  const devices = useSyncExternalStore(
    entry ? entry.tracker.subscribe : emptySubscribe
    , entry ? entry.tracker.getSnapshot : () => emptyDevices
  )

  return {devices, loading: !entry || loading, error: entry?.error ?? null}
}

export function useDevices(): TrackedDevices {
  return useTracker('all', () => true, () => loadDevices('/api/v1/devices'))
}

export function useUserDevices(): TrackedDevices {
  return useTracker(
    'user'
    , (device) => Boolean(device.using)
    , () => loadDevices('/api/v1/user/devices')
  )
}

export function useDevice(serial: string | undefined): {
  device: Device | undefined
  loading: boolean
  error: unknown
} {
  const {devices, loading, error} = useTracker(
    serial ? `serial:${serial}` : null
    , (device) => device.serial === serial
    , async() => (serial ? [await loadDevice(serial)] : [])
  )
  return {device: devices[0], loading, error}
}
