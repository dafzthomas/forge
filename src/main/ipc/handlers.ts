import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'

export function registerIpcHandlers(): void {
  // Projects
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, async () => {
    // TODO: Implement with database
    return []
  })

  ipcMain.handle(IPC_CHANNELS.ADD_PROJECT, async (_event, project) => {
    // TODO: Implement with database
    return project
  })

  ipcMain.handle(IPC_CHANNELS.REMOVE_PROJECT, async () => {
    // TODO: Implement with database
    // Args: _event, id
    return true
  })

  // Tasks
  ipcMain.handle(IPC_CHANNELS.CREATE_TASK, async (_event, task) => {
    // TODO: Implement with task queue
    return task
  })

  ipcMain.handle(IPC_CHANNELS.GET_TASKS, async () => {
    // TODO: Implement with database
    // Args: _event, projectId
    return []
  })

  ipcMain.handle(IPC_CHANNELS.CANCEL_TASK, async () => {
    // TODO: Implement task cancellation
    // Args: _event, id
    return true
  })

  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    // TODO: Implement
    return {}
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, async (_event, settings) => {
    // TODO: Implement
    return settings
  })

  // Providers
  ipcMain.handle(IPC_CHANNELS.TEST_PROVIDER, async () => {
    // TODO: Implement provider testing
    // Args: _event, config
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.GET_PROVIDERS, async () => {
    // TODO: Implement provider listing
    return []
  })
}
