import {useMemo, useState} from 'react'
import {
  Anchor
  , Badge
  , Button
  , Center
  , Group
  , Loader
  , Paper
  , Table
  , Text
  , Tooltip
  , UnstyledButton
} from '@mantine/core'
import {
  IconChevronDown
  , IconChevronUp
  , IconLayoutGrid
  , IconMail
  , IconSelector
} from '@tabler/icons-react'
import orderBy from 'lodash/orderBy'
import {getClassName, getDuration} from '@/core/common'
import {formatDate, useDateFormat} from '@/core/date-format'
import {useTranslation} from '@/core/i18n'
import {useSetting} from '@/core/settings'
import {currentUser} from '@/core/user'
import {errorMessage} from '@/ui/modals'
import {ColumnChoice} from '@/ui/ColumnChoice'
import {mailTo} from '@/ui/mail'
import {NothingToShow} from '@/ui/NothingToShow'
import {usePageTitle} from '@/ui/page-title'
import {Pager, useItemsPerPage, usePaged} from '@/ui/Pager'
import {searchFilter} from '@/ui/paging'
import {
  defaultGroupData
  , groupColumns
  , groupStatus
  , normalizeGroupData
  , selectColumns
  , sortGroupData
  , sortKey
  , statusColors
  , statusLabels
  , type GroupData
  , type GroupRow
} from './columns'
import {GroupDevicesButton, GroupUsersButton} from './GroupMembers'
import {GroupQuotaStats, GroupStats} from './GroupStats'
import {useQuotaUser, useViewGroups} from './use-view-groups'
import classes from './GroupListPage.module.css'

function GroupCell({index, row}: {index: number, row: GroupRow}) {
  const {t} = useTranslation()
  const {group} = row

  switch (index) {
    case 0:
      return row.status ? (
        <Badge variant='light' color={statusColors[row.status]} radius='sm' className='group-status'>
          {t(statusLabels[row.status])}
        </Badge>
      ) : null
    case 1:
      return (
        <Group gap='xs' wrap='nowrap' className='selectable'>
          <IconLayoutGrid size={16} className={classes.groupIcon} />
          <Text size='sm' fw={500} className='group-list-name'>{group.name}</Text>
        </Group>
      )
    case 2:
      return <Text size='xs' ff='monospace' className='selectable'>{group.id}</Text>
    case 3:
      return <Anchor size='sm' href={`mailto:${group.owner?.email}`}>{group.owner?.name}</Anchor>
    case 4:
      return <GroupDevicesButton group={group} />
    case 5:
      return <GroupUsersButton group={group} />
    case 6:
      return <>{getClassName(group.class)}</>
    case 7:
      return <>{group.repetitions}</>
    case 8:
      return <>{typeof group.duration === 'number' ? getDuration(group.duration) : ''}</>
    case 9:
      return <Text size='sm' className={classes.nowrap}>{row.startTime}</Text>
    default:
      return <Text size='sm' className={classes.nowrap}>{row.stopTime}</Text>
  }
}

function SortIcon({active, reverse}: {active: boolean, reverse: boolean}) {
  if (!active) {
    return <IconSelector size={14} className={classes.sortIdle} />
  }
  return reverse ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />
}

export default function GroupListPage() {
  const {t} = useTranslation()
  const groups = useViewGroups()
  const quotaUser = useQuotaUser()
  const dateFormat = useDateFormat()
  const [storedGroupData, setGroupData] = useSetting<unknown>('groupData', defaultGroupData)
  const [perPage, setPerPage] = useItemsPerPage('groupViewItemsPerPage')
  const [search, setSearch] = useState('')
  const groupData = normalizeGroupData(storedGroupData)

  usePageTitle(t('Groups'))

  const rows = useMemo<GroupRow[]>(() => (groups.data || []).map((group) => ({
    group
    , status: groupStatus(group)
    , startTime: formatDate(group.dates?.[0]?.start, dateFormat)
    , stopTime: formatDate(group.dates?.[0]?.stop, dateFormat)
  })), [groups.data, dateFormat])

  const filtered = useMemo(() => {
    const column = groupColumns[groupData.sort.index]
    const sorted = orderBy(
      rows
      , [(row: GroupRow) => sortKey(column.sortValue(row))]
      , [groupData.sort.reverse ? 'desc' : 'asc']
    )
    return searchFilter(sorted, search)
  }, [rows, groupData.sort.index, groupData.sort.reverse, search])

  const paged = usePaged(filtered, perPage)
  const visibleColumns = groupData.columns
    .map((column, index) => ({column, index}))
    .filter(({column}) => column.selected)

  function update(data: GroupData) {
    setGroupData(data)
  }

  function renderGroups() {
    if (groups.isPending) {
      return <Center py={64}><Loader /></Center>
    }
    if (groups.isError) {
      return <NothingToShow message={errorMessage(groups.error)} />
    }
    if (!rows.length) {
      return <NothingToShow icon={<IconLayoutGrid size={30} />} message={t('No Groups')} />
    }
    return (
      <>
        <Group className={`${classes.toolbar} groups-header group-list-header`} justify='space-between' gap='sm'>
          <Group gap='sm' wrap='wrap'>
            <Pager
              searchLabel={t('Group selection')}
              search={search}
              onSearchChange={(value) => {
                setSearch(value)
                paged.setPage(1)
              }}
              perPage={perPage}
              onPerPageChange={(value) => {
                setPerPage(value)
                paged.setPage(1)
              }}
              page={paged.page}
              pageCount={paged.pageCount}
              onPageChange={paged.setPage}
              total={filtered.length}
            />
            <ColumnChoice
              items={groupData.columns.map((column) => ({
                id: column.name
                , label: t(column.name)
                , selected: column.selected
              }))}
              onChange={(items) => update(selectColumns(groupData, items.map((item) => item.selected)))}
              onReset={() => update(JSON.parse(JSON.stringify(defaultGroupData)))}
            />
          </Group>
          <Tooltip label={t('Write an email to the group owner selection')}>
            <Button
              size='xs'
              leftSection={<IconMail size={14} />}
              disabled={!filtered.length}
              onClick={() => mailTo(filtered.map((row) => row.group.owner.email))}
              className='contact-owners'
            >
              {t('Contact Owners')}
            </Button>
          </Tooltip>
        </Group>
        <Table.ScrollContainer minWidth={960} type='native'>
          <Table highlightOnHover verticalSpacing='sm' className={`${classes.table} groups-table`}>
            <Table.Thead>
              <Table.Tr>
                {visibleColumns.map(({column, index}) => (
                  <Table.Th key={column.name} className={classes.th}>
                    <UnstyledButton
                      className={classes.sortButton}
                      onClick={() => update(sortGroupData(groupData, index))}
                    >
                      <span>{t(column.name)}</span>
                      <SortIcon active={groupData.sort.index === index} reverse={groupData.sort.reverse} />
                    </UnstyledButton>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paged.items.map((row) => (
                <Table.Tr key={row.group.id}>
                  {visibleColumns.map(({column, index}) => (
                    <Table.Td key={column.name}>
                      <GroupCell index={index} row={row} />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {!filtered.length && (
          <Text size='sm' c='dimmed' ta='center' py='lg'>{t('No results')}</Text>
        )}
      </>
    )
  }

  return (
    <div className={`${classes.page} stf-group-list stf-groups`}>
      <div className={classes.inner}>
        <GroupStats groups={groups.data || []} />
        <GroupQuotaStats user={quotaUser.data || currentUser} />
        <Paper withBorder className={`${classes.tableCard} group-list`}>
          {renderGroups()}
        </Paper>
      </div>
    </div>
  )
}
