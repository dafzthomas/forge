import { contextBridge, ipcRenderer } from 'electron'
import type { IpcChannel } from '../shared/ipc-types'

// Define the API that will be exposed to the renderer process
const forgeAPI = {
  invoke: (channel: IpcChannel, ...args: unknown[]) => {
    return ipcRenderer.invoke(channel, ...args)
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('forge', forgeAPI)

// Export the type for use in renderer process
export type ForgeAPI = typeof forgeAPI
