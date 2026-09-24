import {useEffect, useMemo, useState} from 'react'
import {addItem, addItems, listOf, removeItem, updateItem, type Collection} from '@/core/collection'
import {devicesApi, deviceSettingsEvents} from '@/core/devices-api'
import {useSocketEvent} from '@/core/socket'

export interface SettingsDevice {
  serial: string
  model?: string
  manufacturer?: string
  marketName?: string
  version?: string
  sdk?: string | number
  abi?: string
  cpuPlatform?: string
  openGLESVersion?: string
  display?: {width?: number, height?: number}
  displayStr?: string
  phone?: {imei?: string}
  provider?: {name?: string}
  group?: {originName?: string}
}

interface DeviceChange {
  device: Record<string, any>
  timeStamp: number
}

const deviceFields = [
  'model'
  , 'serial'
  , 'version'
  , 'display.height'
  , 'display.width'
  , 'manufacturer'
  , 'sdk'
  , 'abi'
  , 'cpuPlatform'
  , 'openGLESVersion'
  , 'marketName'
  , 'phone.imei'
  , 'provider.name'
  , 'group.originName'
].join(',')

const [createdEvent, deletedEvent, updatedEvent] = deviceSettingsEvents

function publishDevice(device: Record<string, any>): SettingsDevice {
  const published: Record<string, any> = {}
  for (const [key, value] of Object.entries(device)) {
    published[key] = value === null ? '' : value
  }
  if (published.model) {
    published.displayStr = `${published.display?.width}x${published.display?.height}`
  }
  else {
    published.display = {}
  }
  return published as SettingsDevice
}

export function useSettingsDevices() {
  const [collection, setCollection] = useState<Collection<SettingsDevice>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const devices = useMemo(() => listOf(collection), [collection])

  useEffect(() => {
    let cancelled = false
    devicesApi.getDevices('user', deviceFields)
      .then((response) => {
        if (cancelled) {
          return
        }
        const loaded = (response.devices || []).map((raw) => publishDevice(raw as unknown as Record<string, any>))
        setCollection((current) => addItems(current, loaded, (device) => device.serial, -1))
        setLoading(false)
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useSocketEvent(createdEvent, (message: DeviceChange) => {
    const device = publishDevice(message.device)
    setCollection((current) => addItem(current, device.serial, device, message.timeStamp).collection)
  })
  useSocketEvent(deletedEvent, (message: DeviceChange) => {
    setCollection((current) => removeItem(current, message.device.serial, message.timeStamp).collection)
  })
  useSocketEvent(updatedEvent, (message: DeviceChange) => {
    const device = publishDevice(message.device)
    setCollection((current) => updateItem(current, device.serial, device, message.timeStamp).collection)
  })

  return {devices, loading, error}
}
