import type {UserGroups} from '@/core/app-state'

export interface SettingsDevice {
  serial: string
  model?: string
  version?: string
  operator?: string
  network?: {type?: string, subtype?: string}
  display?: {width?: number, height?: number}
  manufacturer?: string
  sdk?: string
  abi?: string
  cpuPlatform?: string
  openGLESVersion?: string
  marketName?: string
  phone?: {imei?: string}
  provider?: {name?: string}
  group?: {id?: string, origin?: string, originName?: string, class?: string}
}

export interface SettingsUser {
  email: string
  name: string
  privilege: string
  groups?: UserGroups
}

export interface ConflictRow {
  serial: string
  startDate: string
  stopDate: string
  start: number
  stop: number
  group: string
  ownerName: string
  ownerEmail: string
}

export interface ServerConflict {
  devices: string[]
  date: {start: string, stop: string}
  group: string
  owner: {name: string, email: string}
}

export const deviceFields = [
  'serial'
  , 'model'
  , 'version'
  , 'operator'
  , 'network.type'
  , 'network.subtype'
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

export const userFields = [
  'email'
  , 'name'
  , 'privilege'
  , 'groups.subscribed'
  , 'groups.quotas'
].join(',')
