import type {ReactElement} from 'react'
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
import {useStandalone} from '@/ui/modes'
import {notifyFailure} from '@/ui/notify'

function rotatedLeft(rotation: number): number {
  return rotation === 270 ? 0 : rotation + 90
}

function rotatedRight(rotation: number): number {
  return rotation === 0 ? 270 : rotation - 90
}

export function DeviceContextMenu({device, control, onStopUsing, disabled, children}: {
  device: Device
  control: Control
  onStopUsing: () => void
  disabled?: boolean
  children: ReactElement
}) {
  const {t} = useTranslation()
  const standalone = useStandalone()
  const rotation = device.display?.rotation || 0

  function rotate(angle: number) {
    control.rotate(angle)
    if (standalone) {
      window.resizeTo(window.outerHeight, window.outerWidth)
    }
  }

  function saveScreenshot() {
    control.screenshot()
      .then((result) => {
        window.location.href = `${result.body.href}?download`
      })
      .catch((error) => notifyFailure(error, t('Save ScreenShot')))
  }

  return (
    <Menu shadow='md' width={200} withinPortal>
      <Menu.ContextMenu disabled={disabled}>
        {children}
      </Menu.ContextMenu>
      <Menu.Dropdown className='stf-device-context-menu'>
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
        <Menu.Item leftSection={<IconRotate size={16} />} onClick={() => rotate(rotatedLeft(rotation))}>
          {t('Rotate Left')}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconRotateClockwise size={16} />}
          onClick={() => rotate(rotatedRight(rotation))}
        >
          {t('Rotate Right')}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconCamera size={16} />} onClick={saveScreenshot}>
          {t('Save ScreenShot')}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color='red'
          leftSection={<IconLogout size={16} />}
          onClick={() => (standalone ? window.close() : onStopUsing())}
        >
          {t('Stop Using')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
