import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMainWindow, getMainWindow } from '../window'

// Mock Electron
vi.mock('electron', () => {
  const mockBrowserWindow = vi.fn().mockImplementation(function () {
    return {
      loadURL: vi.fn().mockResolvedValue(undefined),
      loadFile: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      webContents: { openDevTools: vi.fn() },
    }
  })
  return {
    BrowserWindow: mockBrowserWindow,
    app: {
      whenReady: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      quit: vi.fn(),
    },
  }
})

describe('window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a browser window', async () => {
    const window = await createMainWindow()
    expect(window).toBeDefined()
  })

  it('should return the main window after creation', async () => {
    await createMainWindow()
    const window = getMainWindow()
    expect(window).toBeDefined()
  })
})
