import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc/handlers'
import path from 'path'

app.whenReady().then(async () => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'forge.db')
  initDatabase(dbPath)

  // Register IPC handlers
  registerIpcHandlers()

  // Create main window
  await createMainWindow()

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
