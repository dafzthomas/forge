import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc/handlers'
import { initAutoUpdater } from './updater'
import path from 'path'

// Set app name for about dialog
app.setName('Forge')

// macOS: Set about panel options
if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: 'Forge',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2024',
    credits: 'Built with Electron, React, and TypeScript',
    website: 'https://github.com/dafzthomas/forge',
  })
}

app.whenReady().then(async () => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'forge.db')
  initDatabase(dbPath)

  // Register IPC handlers
  registerIpcHandlers()

  // Create main window
  const mainWindow = await createMainWindow()

  // Initialize auto-updater (only in production)
  if (!app.isPackaged) {
    console.log('Skipping auto-updater in development mode')
  } else {
    initAutoUpdater(mainWindow)
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow()
    }
  })
}).catch((error) => {
  console.error('Failed to create window:', error)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  const { closeDatabase } = require('./database')
  closeDatabase()
})
