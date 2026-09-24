import {useEffect} from 'react'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import type {User} from '@/core/app-state'
import {deviceSettingsEvents} from '@/core/devices-api'
import {groupsApi, type Group} from '@/core/groups-api'
import {onSocket, useSocketEvent} from '@/core/socket'
import {currentUser, getUser} from '@/core/user'

const groupsKey = ['group-list', 'groups']
const userKey = ['group-list', 'user']
export const groupDevicesKey = (id: string) => ['group-list', 'devices', id]
export const groupUsersKey = (id: string) => ['group-list', 'users', id]

interface GroupMessage {
  group: Group
  users?: string[]
  devices?: string[]
}

function upsert(groups: Group[] | undefined, group: Group): Group[] | undefined {
  if (!groups) {
    return groups
  }
  const index = groups.findIndex((candidate) => candidate.id === group.id)
  if (index === -1) {
    return [...groups, group]
  }
  const next = [...groups]
  next[index] = {...groups[index], ...group}
  return next
}

function remove(groups: Group[] | undefined, id: string): Group[] | undefined {
  return groups?.filter((group) => group.id !== id)
}

export function useViewGroups() {
  const queryClient = useQueryClient()

  const groups = useQuery({
    queryKey: groupsKey
    , queryFn: async() => (await groupsApi.getGroups()).groups
    , staleTime: 0
  })

  function setGroups(update: (groups: Group[] | undefined) => Group[] | undefined) {
    queryClient.setQueryData<Group[]>(groupsKey, update)
  }

  useSocketEvent('user.view.groups.created', (message: GroupMessage) => {
    setGroups((current) => upsert(current, message.group))
  })

  useSocketEvent('user.view.groups.deleted', (message: GroupMessage) => {
    setGroups((current) => remove(current, message.group.id))
  })

  useSocketEvent('user.view.groups.updated', (message: GroupMessage) => {
    if (!message.group.users.includes(currentUser.email)) {
      setGroups((current) => remove(current, message.group.id))
      return
    }
    setGroups((current) => upsert(current, message.group))
    if (message.devices?.length) {
      queryClient.invalidateQueries({queryKey: groupDevicesKey(message.group.id)})
    }
    if (message.users?.length) {
      queryClient.invalidateQueries({queryKey: groupUsersKey(message.group.id)})
    }
  })

  useEffect(() => {
    const invalidateUsers = () => queryClient.invalidateQueries({queryKey: ['group-list', 'users']})
    const invalidateDevices = () => queryClient.invalidateQueries({queryKey: ['group-list', 'devices']})
    const unsubscribers = [
      onSocket('user.settings.users.created', invalidateUsers)
      , onSocket('user.settings.users.deleted', invalidateUsers)
      , ...deviceSettingsEvents.map((event) => onSocket(event, invalidateDevices))
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [queryClient])

  return groups
}

export function useQuotaUser() {
  const queryClient = useQueryClient()

  const user = useQuery({
    queryKey: userKey
    , queryFn: async() => (await getUser()).user
    , staleTime: 0
  })

  useSocketEvent('user.view.users.updated', (message: {user: User}) => {
    if (message.user?.email === currentUser.email) {
      queryClient.setQueryData(userKey, message.user)
    }
  })

  return user
}
