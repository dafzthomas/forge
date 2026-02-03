import { contextBridge } from 'electron'

// Define the API that will be exposed to the renderer process
const forgeAPI = {
  // IPC methods will be added in Task 1.7
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('forge', forgeAPI)

// Export the type for use in renderer process
export type ForgeAPI = typeof forgeAPI

// Augment the Window interface for TypeScript
declare global {
  interface Window {
    forge: ForgeAPI
  }
}
