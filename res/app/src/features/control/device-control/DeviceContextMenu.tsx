import {useState, type MouseEvent, type ReactNode} from 'react'
import {Menu} from '@mantine/core'
import {
  IconArrowBackUp
  , IconCamera
  , IconHome
  , IconLogout
  , IconRotate
  , IconRotateClockwise
  , IconSquare
} from '@tabler/icons-react'
import type {Control} from '@/core/control'
import type {Device} from '@/core/devices/types'
import {useTranslation} from '@/core/i18n'
import type {DeviceActions} from './use-device-actions'
import classes from './DeviceControlPanel.module.css'

interface MenuPosition {
  x: number
  y: number
}

export function DeviceContextMenu({device, control, actions, children}: {
  device: Device
  control: Control
  actions: DeviceActions
  children: ReactNode
}) {
  const {t} = useTranslation()
  const [position, setPosition] = useState<MenuPosition | null>(null)

  function openMenu(event: MouseEvent) {
    event.preventDefault()
    setPosition({x: event.clientX, y: event.clientY})
  }

  function close() {
    setPosition(null)
  }

  return (
    <div className={`${classes.contextArea} stf-device-context-menu`} onContextMenu={openMenu}>
      {children}
      <Menu
        opened={position !== null}
        onChange={(opened) => !opened && close()}
        position='bottom-start'
        offset={2}
        shadow='md'
        width={210}
        withinPortal
      >
        <Menu.Target>
          <div
            className={classes.contextAnchor}
            style={position ? {left: position.x, top: position.y} : undefined}
          />
        </Menu.Target>
        <Menu.Dropdown className='context-menu'>
          <Menu.Item leftSection={<IconArrowBackUp size={16} />} onClick={() => control.back()}>
            {t('Back')}
          </Menu.Item>
          <Menu.Item leftSection={<IconHome size={16} />} onClick={() => control.home()}>
            {t('Home')}
          </Menu.Item>
          <Menu.Item leftSection={<IconSquare size={16} />} onClick={() => control.appSwitch()}>
            {t('Recents')}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item leftSection={<IconRotate size={16} />} onClick={actions.rotateRight}>
            {t('Rotate Left')}
          </Menu.Item>
          <Menu.Item leftSection={<IconRotateClockwise size={16} />} onClick={actions.rotateLeft}>
            {t('Rotate Right')}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item leftSection={<IconCamera size={16} />} onClick={actions.saveScreenShot}>
            {t('Save ScreenShot')}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            color='red'
            leftSection={<IconLogout size={16} />}
            onClick={() => (actions.standalone ? window.close() : actions.stopUsing(device))}
          >
            {t('Stop Using')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  )
}
