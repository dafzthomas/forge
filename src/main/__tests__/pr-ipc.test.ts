import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'
import type { PRRequest, PRResult } from '../pr/types'

// Mock the service
const mockCreatePR = vi.fn()
const mockGetPR = vi.fn()
const mockListPRs = vi.fn()
const mockSyncPRStatus = vi.fn()

vi.mock('../pr/service', () => ({
  getPRService: () => ({
    createPR: mockCreatePR,
    getPR: mockGetPR,
    listPRs: mockListPRs,
    syncPRStatus: mockSyncPRStatus,
  }),
}))

// Mock electron
let ipcHandlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler)
    },
  },
}))

// Import after mocks are set up
const { registerPRIpcHandlers } = await import('../pr/ipc')
const { IPC_CHANNELS } = await import('../../shared/ipc-types')

describe('PR IPC Handlers', () => {
  beforeEach(() => {
    ipcHandlers = new Map()
    vi.clearAllMocks()
    registerPRIpcHandlers()
  })

  const mockEvent = {} as IpcMainInvokeEvent

  describe('PR_CREATE', () => {
    it('should create a PR with valid request', async () => {
      const request: PRRequest = {
        projectId: 'test-project',
        taskId: 'test-task',
        title: 'Test PR',
        description: 'Test description',
      }

      const mockResult: PRResult = {
        id: 'pr-123',
        projectId: 'test-project',
        taskId: 'test-task',
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
        title: 'Test PR',
        description: 'Test description',
        status: 'open',
        createdAt: new Date(),
      }

      mockCreatePR.mockResolvedValue(mockResult)

      const handler = ipcHandlers.get(IPC_CHANNELS.PR_CREATE)
      expect(handler).toBeDefined()

      const result = await handler!(mockEvent, request)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
      expect(mockCreatePR).toHaveBeenCalledWith(request)
    })

    it('should reject invalid request format', async () => {
      const handler = ipcHandlers.get(IPC_CHANNELS.PR_CREATE)
      const result = await handler!(mockEvent, null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid request format')
    })

    it('should reject missing projectId', async () => {
      const handler = ipcHandlers.get(IPC_CHANNELS.PR_CREATE)
      const result = await handler!(mockEvent, {
        taskId: 'test-task',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('projectId')
    })

    it('should reject missing taskId', async () => {
      const handler = ipcHandlers.get(IPC_CHANNELS.PR_CREATE)
      const result = await handler!(mockEvent, {
        projectId: 'test-project',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('taskId')
    })

    it('should reject invalid title type', async () => {
      const handler = ipcHandlers.get(IPC_CHANNELS.PR_CREATE)
      const result = await handler!(mockEvent, {
        projectId: 'test-project',
        taskId: 'test-task',
        title: 123,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('title')
    })

    it('should reject invalid draft type', async () => {
      const handler = ipcHandlers.get(IPC_CHANNELS.PR_CREATE)
      const result = await handler!(mockEvent, {
        projectId: 'test-project',
        taskId: 'test-task',
        draft: 'true',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('draft')
    })

    it('should handle service errors', async () => {
      mockCreatePR.mockRejectedValue(new Error('PR creation failed'))

      const handler = ipcHandlers.get(IPC_CHANNELS.PR_CREATE)
      const result = await handler!(mockEvent, {
        projectId: 'test-project',
        taskId: 'test-task',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('PR creation failed')
    })
  })

  describe('PR_GET', () => {
    it('should get PR by ID', async () => {
      const mockPR: PRResult = {
        id: 'pr-123',
        projectId: 'test-project',
        taskId: 'test-task',
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
        title: 'Test PR',
        description: 'Test description',
        status: 'open',
        createdAt: new Date(),
      }

      mockGetPR.mockReturnValue(mockPR)

      const handler = ipcHandlers.get(IPC_CHANNELS.PR_GET)
      expect(handler).toBeDefined()

      const result = await handler!(mockEvent, 'pr-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPR)
      expect(mockGetPR).toHaveBeenCalledWith('pr-123')
    })

    it('should reject invalid ID', async () => {
      const handler = ipcHandlers.get(IPC_CHANNELS.PR_GET)
      const result = await handler!(mockEvent, null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('id')
    })

    it('should return null for non-existent PR', async () => {
      mockGetPR.mockReturnValue(null)

      const handler = ipcHandlers.get(IPC_CHANNELS.PR_GET)
      const result = await handler!(mockEvent, 'non-existent')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })
  })

  describe('PR_LIST', () => {
    it('should list PRs for a project', async () => {
      const mockPRs: PRResult[] = [
        {
          id: 'pr-1',
          projectId: 'test-project',
          taskId: 'task-1',
          number: 1,
          url: 'https://github.com/test/repo/pull/1',
          title: 'PR 1',
          description: 'Description 1',
          status: 'open',
          createdAt: new Date(),
        },
        {
          id: 'pr-2',
          projectId: 'test-project',
          taskId: 'task-2',
          number: 2,
          url: 'https://github.com/test/repo/pull/2',
          title: 'PR 2',
          description: 'Description 2',
          status: 'merged',
          createdAt: new Date(),
        },
      ]

      mockListPRs.mockReturnValue(mockPRs)

      const handler = ipcHandlers.get(IPC_CHANNELS.PR_LIST)
      expect(handler).toBeDefined()

      const result = await handler!(mockEvent, 'test-project')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPRs)
      expect(mockListPRs).toHaveBeenCalledWith('test-project')
    })

    it('should reject invalid projectId', async () => {
      const handler = ipcHandlers.get(IPC_CHANNELS.PR_LIST)
      const result = await handler!(mockEvent, null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('projectId')
    })

    it('should return empty array for project with no PRs', async () => {
      mockListPRs.mockReturnValue([])

      const handler = ipcHandlers.get(IPC_CHANNELS.PR_LIST)
      const result = await handler!(mockEvent, 'test-project')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })
  })

  describe('PR_SYNC', () => {
    it('should sync PR status from GitHub', async () => {
      const mockPR: PRResult = {
        id: 'pr-123',
        projectId: 'test-project',
        taskId: 'test-task',
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
        title: 'Test PR',
        description: 'Test description',
        status: 'merged',
        createdAt: new Date(),
      }

      mockSyncPRStatus.mockResolvedValue(mockPR)

      const handler = ipcHandlers.get(IPC_CHANNELS.PR_SYNC)
      expect(handler).toBeDefined()

      const result = await handler!(mockEvent, 'pr-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPR)
      expect(mockSyncPRStatus).toHaveBeenCalledWith('pr-123')
    })

    it('should reject invalid ID', async () => {
      const handler = ipcHandlers.get(IPC_CHANNELS.PR_SYNC)
      const result = await handler!(mockEvent, null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('id')
    })

    it('should handle sync errors', async () => {
      mockSyncPRStatus.mockRejectedValue(new Error('Sync failed'))

      const handler = ipcHandlers.get(IPC_CHANNELS.PR_SYNC)
      const result = await handler!(mockEvent, 'pr-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Sync failed')
    })
  })
})
