import type {Control} from '@/core/control'
import {createDeviceStore} from '@/core/device-store'
import {TransactionError, type TransactionResult} from '@/core/transaction'
import {errorMessage} from '@/ui/modals'

export interface ShellState {
  command: string
  lastCommand: string | null
  output: string
  running: boolean
  settled: boolean
  error: string | null
  history: string[]
  runId: number
}

const historyLimit = 50

export const shellStore = createDeviceStore<ShellState>({
  command: ''
  , lastCommand: null
  , output: ''
  , running: false
  , settled: false
  , error: null
  , history: []
  , runId: 0
})

let runCounter = 0

function joinOutput(result: TransactionResult): string {
  return result.data.join('')
}

export function setShellCommand(serial: string, command: string) {
  shellStore.update(serial, (state) => ({...state, command}))
}

export function clearShell(serial: string) {
  shellStore.update(serial, (state) => ({
    ...state
    , command: ''
    , lastCommand: null
    , output: ''
    , running: false
    , settled: false
    , error: null
    , runId: 0
  }))
}

export function runShell(control: Control, command: string) {
  const serial = control.target.serial

  if (command === 'clear') {
    clearShell(serial)
    return
  }

  runCounter += 1
  const runId = runCounter

  shellStore.update(serial, (state) => ({
    ...state
    , command: ''
    , lastCommand: command
    , output: ''
    , running: true
    , settled: false
    , error: null
    , runId
    , history: [...state.history.filter((entry) => entry !== command), command].slice(-historyLimit)
  }))

  function apply(delta: Partial<ShellState>) {
    shellStore.update(serial, (state) => (state.runId === runId ? {...state, ...delta} : state))
  }

  control.shell(command)
    .progressed((result) => apply({output: joinOutput(result)}))
    .then((result) => apply({output: joinOutput(result), running: false, settled: true}))
    .catch((error: unknown) => {
      if (error instanceof TransactionError) {
        apply({output: joinOutput(error.result), running: false, settled: true, error: String(error.code)})
      }
      else {
        apply({running: false, settled: true, error: errorMessage(error)})
      }
    })
}
