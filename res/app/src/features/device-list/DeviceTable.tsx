import {memo, useMemo} from 'react'
import {Group, Table, UnstyledButton} from '@mantine/core'
import {IconArrowDown, IconArrowUp} from '@tabler/icons-react'
import {
  columnOrderingFeature
  , columnVisibilityFeature
  , createSortedRowModel
  , rowSortingFeature
  , tableFeatures
  , useTable
  , type ColumnDef
} from '@tanstack/react-table'
import type {Device} from '@/core/devices/types'
import {useTranslation} from '@/core/i18n'
import {columnDefinition, defaultColumns, type CellContext, type ColumnSetting} from './columns'
import {sortEntries, type SortSetting} from './list-model'
import classes from './DeviceList.module.css'

const features = tableFeatures({
  rowSortingFeature
  , sortedRowModel: createSortedRowModel()
  , columnVisibilityFeature
  , columnOrderingFeature
})

const tableColumns: Array<ColumnDef<typeof features, Device>> = defaultColumns.map(({name}) => ({
  id: name
  , accessorFn: (device: Device) => device
  , sortFn: (rowA, rowB) => columnDefinition(name)?.compare(rowA.original, rowB.original) || 0
}))

const DeviceRow = memo(function DeviceRow({device, columnIds, context}: {
  device: Device
  columnIds: string[]
  context: CellContext
}) {
  return (
    <Table.Tr className={device.usable ? undefined : `device-not-usable ${classes.notUsable}`}>
      {columnIds.map((id) => (
        <Table.Td key={id} className={id === 'name' || id === 'operator' ? classes.wrapCell : undefined}>
          {columnDefinition(id)?.render(device, context)}
        </Table.Td>
      ))}
    </Table.Tr>
  )
})

export function DeviceTable({devices, columns, sort, onSort, context}: {
  devices: Device[]
  columns: ColumnSetting[]
  sort: SortSetting
  onSort: (name: string, multiple: boolean) => void
  context: CellContext
}) {
  const {t} = useTranslation()
  const sorting = useMemo(
    () => sortEntries(sort).map((entry) => ({id: entry.name, desc: entry.order === 'desc'}))
    , [sort]
  )
  const columnVisibility = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.name, column.selected]))
    , [columns]
  )
  const columnOrder = useMemo(() => columns.map((column) => column.name), [columns])

  const table = useTable({
    features
    , columns: tableColumns
    , data: devices
    , getRowId: (device) => device.serial
    , state: {sorting, columnVisibility, columnOrder}
  })

  const headers = table.getHeaderGroups()[0]?.headers || []
  const visibleIds = headers.map((header) => header.column.id)
  const columnIds = useMemo(() => visibleIds, [visibleIds.join('|')])

  return (
    <Table
      stickyHeader
      highlightOnHover
      verticalSpacing={6}
      className={`device-list-details-content ${classes.table}`}
    >
      <Table.Thead>
        <Table.Tr>
          {headers.map((header) => {
            const sorted = header.column.getIsSorted()
            const title = columnDefinition(header.column.id)?.title || header.column.id
            return (
              <Table.Th
                key={header.id}
                className={`sortable sort-${sorted || 'none'} ${classes.sortable}`}
                onClick={(event) => onSort(header.column.id, event.shiftKey)}
              >
                <UnstyledButton className={classes.sortButton}>
                  <Group gap={4} wrap='nowrap'>
                    <span>{t(title)}</span>
                    {sorted === 'asc' && <IconArrowUp size={12} />}
                    {sorted === 'desc' && <IconArrowDown size={12} />}
                  </Group>
                </UnstyledButton>
              </Table.Th>
            )
          })}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {table.getRowModel().rows.map((row) => (
          <DeviceRow key={row.id} device={row.original} columnIds={columnIds} context={context} />
        ))}
      </Table.Tbody>
    </Table>
  )
}
