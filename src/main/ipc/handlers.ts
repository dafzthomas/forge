import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { getProjectService } from '../projects'
import type { ProjectUpdate } from '../../shared/project-types'

export function registerIpcHandlers(): void {
  const projectService = getProjectService()

  // Projects
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, () => {
    try {
      return { success: true, data: projectService.getProjects() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT, (_event, id: string) => {
    try {
      return { success: true, data: projectService.getProject(id) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.ADD_PROJECT, (_event, path: string, name?: string) => {
    try {
      return { success: true, data: projectService.addProject(path, name) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.REMOVE_PROJECT, (_event, id: string) => {
    try {
      return { success: true, data: projectService.removeProject(id) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT, (_event, id: string, updates: ProjectUpdate) => {
    try {
      return { success: true, data: projectService.updateProject(id, updates) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_EXISTS_AT_PATH, (_event, path: string) => {
    try {
      return { success: true, data: projectService.projectExistsAtPath(path) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
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
