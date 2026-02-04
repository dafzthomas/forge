import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IPC_CHANNELS } from '../../shared/ipc-types'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

describe('IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register all handlers', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('../ipc/handlers')

    registerIpcHandlers()

    // Verify that handle was called for each channel
    expect(ipcMain.handle).toHaveBeenCalled()

    // Check specific channels are registered
    const handleMock = vi.mocked(ipcMain.handle)
    const registeredChannels = handleMock.mock.calls.map((call) => call[0])

    expect(registeredChannels).toContain(IPC_CHANNELS.GET_PROJECTS)
    expect(registeredChannels).toContain(IPC_CHANNELS.ADD_PROJECT)
    expect(registeredChannels).toContain(IPC_CHANNELS.REMOVE_PROJECT)
    expect(registeredChannels).toContain(IPC_CHANNELS.CREATE_TASK)
    expect(registeredChannels).toContain(IPC_CHANNELS.GET_TASKS)
    expect(registeredChannels).toContain(IPC_CHANNELS.GET_SETTINGS)
    expect(registeredChannels).toContain(IPC_CHANNELS.UPDATE_SETTINGS)
    expect(registeredChannels).toContain(IPC_CHANNELS.TEST_PROVIDER)
  })

  it('should register the correct number of handlers', async () => {
    const { ipcMain } = await import('electron')
    const { registerIpcHandlers } = await import('../ipc/handlers')

    registerIpcHandlers()

    // Count expected handlers (8 channels defined in spec)
    const handleMock = vi.mocked(ipcMain.handle)
    expect(handleMock.mock.calls.length).toBeGreaterThanOrEqual(8)
  })
})
