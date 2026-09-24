import {gettext} from '@/core/i18n'
import type {Group} from '@/core/groups-api'

export type GroupStatus = 'Active' | 'Pending' | 'Waiting' | 'Ready'

export interface GroupRow {
  group: Group
  status: GroupStatus | ''
  startTime: string
  stopTime: string
}

export interface StoredColumn {
  name: string
  selected: boolean
  sort: 'none' | 'sort-asc' | 'sort-desc'
}

export interface GroupData {
  columns: StoredColumn[]
  sort: {index: number, reverse: boolean}
}

export interface ColumnDefinition {
  name: string
  sortValue: (row: GroupRow) => unknown
}

export const groupColumns: ColumnDefinition[] = [
  {name: gettext('Status'), sortValue: (row) => row.status}
  , {name: gettext('Name'), sortValue: (row) => row.group.name}
  , {name: gettext('Identifier'), sortValue: (row) => row.group.id}
  , {name: gettext('Owner'), sortValue: (row) => row.group.owner?.name}
  , {name: gettext('Devices'), sortValue: (row) => row.group.devices.length}
  , {name: gettext('Users'), sortValue: (row) => row.group.users.length}
  , {name: gettext('Class'), sortValue: (row) => row.group.class}
  , {name: gettext('Repetitions'), sortValue: (row) => row.group.repetitions}
  , {name: gettext('Duration'), sortValue: (row) => row.group.duration}
  , {name: gettext('Starting Date'), sortValue: (row) => row.group.dates?.[0]?.start}
  , {name: gettext('Expiration Date'), sortValue: (row) => row.group.dates?.[0]?.stop}
]

const hiddenByDefault = new Set(['Identifier'])

export const defaultGroupData: GroupData = {
  columns: groupColumns.map((column) => ({
    name: column.name
    , selected: !hiddenByDefault.has(column.name)
    , sort: column.name === 'Name' ? 'sort-asc' : 'none'
  }))
  , sort: {index: 1, reverse: false}
}

export function normalizeGroupData(stored: unknown): GroupData {
  const data = stored as GroupData | undefined
  const valid = Array.isArray(data?.columns) &&
    data.columns.length === groupColumns.length &&
    data.columns.every((column, index) => column?.name === groupColumns[index].name) &&
    typeof data.sort?.index === 'number' &&
    data.sort.index >= 0 &&
    data.sort.index < groupColumns.length
  return valid ? data : defaultGroupData
}

export function sortGroupData(data: GroupData, index: number): GroupData {
  if (index !== data.sort.index) {
    return {
      columns: data.columns.map((column, position) => {
        if (position === index) {
          return {...column, sort: 'sort-asc'}
        }
        return position === data.sort.index ? {...column, sort: 'none'} : column
      })
      , sort: {index, reverse: false}
    }
  }
  const reverse = !data.sort.reverse
  return {
    columns: data.columns.map((column, position) =>
      (position === index ? {...column, sort: reverse ? 'sort-desc' : 'sort-asc'} : column))
    , sort: {index, reverse}
  }
}

export function selectColumns(data: GroupData, selected: boolean[]): GroupData {
  return {
    ...data
    , columns: data.columns.map((column, index) => ({...column, selected: selected[index]}))
  }
}

export function sortKey(value: unknown): unknown {
  return typeof value === 'string' ? value.toLowerCase() : value
}

const statusNames: Record<string, GroupStatus> = {pending: 'Pending', waiting: 'Waiting', ready: 'Ready'}

export function groupStatus(group: Group): GroupStatus | '' {
  if (group.isActive) {
    return 'Active'
  }
  return statusNames[group.state || ''] || ''
}

export const statusColors: Record<string, string> = {
  Active: 'green'
  , Pending: 'red'
  , Ready: 'orange'
  , Waiting: 'gray'
}

export const statusLabels: Record<GroupStatus, string> = {
  Active: gettext('Active')
  , Pending: gettext('Pending')
  , Waiting: gettext('Waiting')
  , Ready: gettext('Ready')
}
