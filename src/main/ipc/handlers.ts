import { app, ipcMain, dialog } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { getProjectService } from '../projects'
import { getTaskQueueService } from '../tasks'
import { registerReviewIpcHandlers } from '../review/ipc'
import { registerPRIpcHandlers } from '../pr/ipc'
import { registerWatcherIpcHandlers } from '../watcher/ipc'
import { registerSkillsIpcHandlers } from '../skills/ipc'
import { registerHistoryIpcHandlers } from '../history/ipc'
import type { ProjectUpdate } from '../../shared/project-types'
import type { CreateTaskInput } from '../../shared/task-types'

export function registerIpcHandlers(): void {
  const projectService = getProjectService()

  // App metadata
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_NAME, () => {
    return app.getName()
  })

  // Dialog
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Project Folder',
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, data: null }
    }
    return { success: true, data: result.filePaths[0] }
  })

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
  const taskQueueService = getTaskQueueService()

  ipcMain.handle(IPC_CHANNELS.CREATE_TASK, (_event, input: CreateTaskInput) => {
    try {
      return { success: true, data: taskQueueService.createTask(input) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_TASKS, (_event, projectId?: string) => {
    try {
      return { success: true, data: taskQueueService.getTasks(projectId) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_TASK, (_event, id: string) => {
    try {
      return { success: true, data: taskQueueService.getTask(id) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CANCEL_TASK, (_event, id: string) => {
    try {
      return { success: true, data: taskQueueService.cancelTask(id) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
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

  // Register review handlers
  registerReviewIpcHandlers()

  // Register PR handlers
  registerPRIpcHandlers()

  // Register watcher handlers
  registerWatcherIpcHandlers()

  // Register skills handlers
  registerSkillsIpcHandlers()

  // Register history handlers
  registerHistoryIpcHandlers()
}
