import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'

// Configure logging
autoUpdater.logger = log
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

export interface UpdateStatus {
  available: boolean
  version?: string
  releaseNotes?: string
  downloading: boolean
  downloadProgress?: number
  downloaded: boolean
  error?: string
}

let updateStatus: UpdateStatus = {
  available: false,
  downloading: false,
  downloaded: false,
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // Send status updates to renderer
  function sendStatus() {
    mainWindow.webContents.send('updater:status', updateStatus)
  }

  // Update available
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    updateStatus = {
      available: true,
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : info.releaseNotes?.map(n => n.note).join('\n'),
      downloading: false,
      downloaded: false,
    }
    sendStatus()
    log.info('Update available:', info.version)
  })

  // Update not available
  autoUpdater.on('update-not-available', () => {
    updateStatus = {
      available: false,
      downloading: false,
      downloaded: false,
    }
    sendStatus()
    log.info('No update available')
  })

  // Download progress
  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    updateStatus = {
      ...updateStatus,
      downloading: true,
      downloadProgress: progress.percent,
    }
    sendStatus()
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`)
  })

  // Update downloaded
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    updateStatus = {
      ...updateStatus,
      downloading: false,
      downloadProgress: 100,
      downloaded: true,
    }
    sendStatus()
    log.info('Update downloaded:', info.version)
  })

  // Error
  autoUpdater.on('error', (error: Error) => {
    updateStatus = {
      ...updateStatus,
      downloading: false,
      error: error.message,
    }
    sendStatus()
    log.error('Auto-updater error:', error)
  })

  // IPC handlers
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, updateInfo: result?.updateInfo }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
    return { success: true }
  })

  ipcMain.handle('updater:getStatus', () => {
    return updateStatus
  })

  // Check for updates on startup (after a short delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Initial update check failed:', err)
    })
  }, 5000)
}

export function checkForUpdates(): Promise<void> {
  return autoUpdater.checkForUpdates().then(() => {})
}
