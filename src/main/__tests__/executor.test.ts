import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { EventEmitter } from 'events'
import type {
  AgentContext,
  AgentResult,
  AgentEvent,
  AgentTool,
  AgentEventType,
  AgentStartedEventData,
  AgentCompletedEventData,
  AgentErrorEventData,
  AgentToolUseEventData,
} from '../agents/types'
import type { ModelProvider, ChatMessage, ChatResponse, ChatStreamChunk } from '../providers/types'
import { AgentExecutor } from '../agents/executor'

/**
 * Create a mock model provider for testing
 */
function createMockProvider(overrides?: Partial<ModelProvider>): ModelProvider {
  return {
    id: 'mock-provider',
    type: 'claude',
    testConnection: vi.fn().mockResolvedValue({ success: true, models: ['mock-model'] }),
    chat: vi.fn().mockResolvedValue({
      content: 'Mock response',
      model: 'mock-model',
      usage: { inputTokens: 10, outputTokens: 5 },
      stopReason: 'end_turn',
    } as ChatResponse),
    chatStream: vi.fn().mockImplementation(async function* () {
      yield { content: 'Mock', done: false }
      yield { content: ' response', done: false }
      yield { content: '', done: true }
    }),
    ...overrides,
  }
}

/**
 * Create a mock agent context for testing
 */
function createMockContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    taskId: 'task-123',
    projectId: 'project-456',
    projectPath: '/path/to/project',
    workingDir: '/path/to/project',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    ...overrides,
  }
}

/**
 * Create a mock tool for testing
 */
function createMockTool(overrides?: Partial<AgentTool>): AgentTool {
  return {
    name: 'mock_tool',
    description: 'A mock tool for testing',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
    },
    execute: vi.fn().mockResolvedValue('Tool executed successfully'),
    ...overrides,
  }
}

describe('AgentExecutor', () => {
  let executor: AgentExecutor
  let mockProvider: ModelProvider

  beforeEach(() => {
    vi.clearAllMocks()
    executor = new AgentExecutor()
    mockProvider = createMockProvider()
  })

  describe('constructor', () => {
    it('should create an executor instance', () => {
      expect(executor).toBeInstanceOf(AgentExecutor)
    })

    it('should extend EventEmitter', () => {
      expect(executor).toBeInstanceOf(EventEmitter)
    })

    it('should have no running agents initially', () => {
      expect(executor.getRunningTaskIds()).toHaveLength(0)
    })
  })

  describe('registerTool', () => {
    it('should register a tool', () => {
      const tool = createMockTool()
      executor.registerTool(tool)
      // Tool is registered - we can verify by using it in execution
      expect(() => executor.registerTool(tool)).not.toThrow()
    })

    it('should allow registering multiple tools', () => {
      const tool1 = createMockTool({ name: 'tool1' })
      const tool2 = createMockTool({ name: 'tool2' })

      executor.registerTool(tool1)
      executor.registerTool(tool2)

      // Both tools should be registered
      expect(() => {
        executor.registerTool(createMockTool({ name: 'tool3' }))
      }).not.toThrow()
    })

    it('should overwrite tool if registered with same name', () => {
      const tool1 = createMockTool({ name: 'same_name', description: 'First' })
      const tool2 = createMockTool({ name: 'same_name', description: 'Second' })

      executor.registerTool(tool1)
      executor.registerTool(tool2)

      // Should not throw, second tool overwrites first
      expect(() => executor.registerTool(tool1)).not.toThrow()
    })
  })

  describe('execute', () => {
    it('should emit started event at the beginning', async () => {
      const context = createMockContext()
      const events: AgentEvent[] = []

      executor.on('started', (event: AgentEvent) => events.push(event))

      await executor.execute(context, mockProvider, 'You are a helpful assistant.')

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('started')
      expect(events[0].taskId).toBe('task-123')
      expect(events[0].timestamp).toBeInstanceOf(Date)
      expect((events[0].data as AgentStartedEventData).context).toEqual(context)
    })

    it('should emit completed event on successful execution', async () => {
      const context = createMockContext()
      const events: AgentEvent[] = []

      executor.on('completed', (event: AgentEvent) => events.push(event))

      const result = await executor.execute(context, mockProvider, 'You are a helpful assistant.')

      expect(result.success).toBe(true)
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('completed')
      expect(events[0].taskId).toBe('task-123')
      expect((events[0].data as AgentCompletedEventData).result.success).toBe(true)
    })

    it('should return agent result with output', async () => {
      const context = createMockContext()

      const result = await executor.execute(context, mockProvider, 'You are a helpful assistant.')

      expect(result.success).toBe(true)
      expect(result.output).toBe('Mock response')
      expect(result.tokensUsed).toEqual({ input: 10, output: 5 })
    })

    it('should emit error event on provider failure', async () => {
      const context = createMockContext()
      const errorProvider = createMockProvider({
        chat: vi.fn().mockRejectedValue(new Error('API Error')),
      })
      const events: AgentEvent[] = []

      executor.on('error', (event: AgentEvent) => events.push(event))

      const result = await executor.execute(context, errorProvider, 'You are a helpful assistant.')

      expect(result.success).toBe(false)
      expect(result.error).toBe('API Error')
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('error')
      expect((events[0].data as AgentErrorEventData).error).toBe('API Error')
    })

    it('should handle non-Error exceptions', async () => {
      const context = createMockContext()
      const errorProvider = createMockProvider({
        chat: vi.fn().mockRejectedValue('String error'),
      })

      // Add error listener to prevent EventEmitter from throwing
      executor.on('error', () => {
        /* handle error event */
      })

      const result = await executor.execute(context, errorProvider, 'You are a helpful assistant.')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should pass system prompt and task context to provider', async () => {
      const context = createMockContext()
      const systemPrompt = 'You are a helpful coding assistant.'

      await executor.execute(context, mockProvider, systemPrompt)

      expect(mockProvider.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system', content: systemPrompt }),
        ]),
        expect.objectContaining({ model: context.model })
      )
    })

    it('should use maxTokens from context', async () => {
      const context = createMockContext({ maxTokens: 2000 })

      await executor.execute(context, mockProvider, 'System prompt')

      expect(mockProvider.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ maxTokens: 2000 })
      )
    })

    it('should track running state during execution', async () => {
      const context = createMockContext()
      let wasRunning = false

      // Create a provider that lets us check running state mid-execution
      const slowProvider = createMockProvider({
        chat: vi.fn().mockImplementation(async () => {
          wasRunning = executor.isRunning(context.taskId)
          return {
            content: 'Response',
            model: 'mock-model',
            usage: { inputTokens: 10, outputTokens: 5 },
          }
        }),
      })

      await executor.execute(context, slowProvider, 'System prompt')

      expect(wasRunning).toBe(true)
      expect(executor.isRunning(context.taskId)).toBe(false)
    })

    it('should emit message event when assistant responds', async () => {
      const context = createMockContext()
      const events: AgentEvent[] = []

      executor.on('message', (event: AgentEvent) => events.push(event))

      await executor.execute(context, mockProvider, 'You are a helpful assistant.')

      // Should have at least one message event
      const messageEvents = events.filter((e) => e.type === 'message')
      expect(messageEvents.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('cancel', () => {
    it('should return false when task is not running', () => {
      const result = executor.cancel('non-existent-task')
      expect(result).toBe(false)
    })

    it('should return true when cancelling a running task', async () => {
      const context = createMockContext()

      // Add error listener to prevent EventEmitter from throwing
      executor.on('error', () => {
        /* handle error event */
      })

      // Create a provider that takes a long time
      const slowProvider = createMockProvider({
        chat: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(
                () =>
                  resolve({
                    content: 'Response',
                    model: 'mock-model',
                    usage: { inputTokens: 10, outputTokens: 5 },
                  }),
                1000
              )
            })
        ),
      })

      // Start execution but don't await
      const executionPromise = executor.execute(context, slowProvider, 'System prompt')

      // Wait a tick for execution to start
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Cancel should succeed
      const cancelled = executor.cancel(context.taskId)
      expect(cancelled).toBe(true)

      // Wait for execution to complete (it should be cancelled)
      const result = await executionPromise
      expect(result.success).toBe(false)
      expect(result.error).toContain('cancelled')
    })

    it('should emit error event when cancelled', async () => {
      const context = createMockContext()
      const events: AgentEvent[] = []

      executor.on('error', (event: AgentEvent) => events.push(event))

      const slowProvider = createMockProvider({
        chat: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(
                () =>
                  resolve({
                    content: 'Response',
                    model: 'mock-model',
                    usage: { inputTokens: 10, outputTokens: 5 },
                  }),
                1000
              )
            })
        ),
      })

      const executionPromise = executor.execute(context, slowProvider, 'System prompt')
      await new Promise((resolve) => setTimeout(resolve, 10))

      executor.cancel(context.taskId)

      await executionPromise

      const errorEvents = events.filter((e) => e.type === 'error')
      expect(errorEvents.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('isRunning', () => {
    it('should return false for non-existent task', () => {
      expect(executor.isRunning('non-existent')).toBe(false)
    })

    it('should return true for running task', async () => {
      const context = createMockContext()
      let checkDone = false

      const slowProvider = createMockProvider({
        chat: vi.fn().mockImplementation(async () => {
          // Wait until we've checked the running state
          while (!checkDone) {
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
          return {
            content: 'Response',
            model: 'mock-model',
            usage: { inputTokens: 10, outputTokens: 5 },
          }
        }),
      })

      const executionPromise = executor.execute(context, slowProvider, 'System prompt')
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(executor.isRunning(context.taskId)).toBe(true)

      checkDone = true
      await executionPromise

      expect(executor.isRunning(context.taskId)).toBe(false)
    })
  })

  describe('getRunningTaskIds', () => {
    it('should return empty array when no tasks running', () => {
      expect(executor.getRunningTaskIds()).toEqual([])
    })

    it('should return array of running task IDs', async () => {
      const context1 = createMockContext({ taskId: 'task-1' })
      const context2 = createMockContext({ taskId: 'task-2' })
      let checkDone = false

      const slowProvider = createMockProvider({
        chat: vi.fn().mockImplementation(async () => {
          while (!checkDone) {
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
          return {
            content: 'Response',
            model: 'mock-model',
            usage: { inputTokens: 10, outputTokens: 5 },
          }
        }),
      })

      const promise1 = executor.execute(context1, slowProvider, 'System prompt')
      const promise2 = executor.execute(context2, slowProvider, 'System prompt')
      await new Promise((resolve) => setTimeout(resolve, 10))

      const runningIds = executor.getRunningTaskIds()
      expect(runningIds).toContain('task-1')
      expect(runningIds).toContain('task-2')
      expect(runningIds).toHaveLength(2)

      checkDone = true
      await Promise.all([promise1, promise2])

      expect(executor.getRunningTaskIds()).toHaveLength(0)
    })
  })

  describe('tool execution', () => {
    it('should execute tool when response contains tool call pattern', async () => {
      const context = createMockContext()
      const tool = createMockTool({ name: 'read_file' })
      executor.registerTool(tool)

      // Provider returns a response with tool call, then a final response
      const mockChat = vi
        .fn()
        .mockResolvedValueOnce({
          content: '<tool>read_file</tool><params>{"path": "/test.txt"}</params>',
          model: 'mock-model',
          usage: { inputTokens: 10, outputTokens: 15 },
        })
        .mockResolvedValueOnce({
          content: 'Task completed successfully.',
          model: 'mock-model',
          usage: { inputTokens: 20, outputTokens: 10 },
        })

      const toolProvider = createMockProvider({ chat: mockChat })

      const events: AgentEvent[] = []
      executor.on('tool_use', (event: AgentEvent) => events.push(event))

      await executor.execute(context, toolProvider, 'System prompt')

      // Tool should have been called
      expect(tool.execute).toHaveBeenCalledWith({ path: '/test.txt' }, context)

      // Should emit tool_use event
      const toolEvents = events.filter((e) => e.type === 'tool_use')
      expect(toolEvents.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle tool execution errors gracefully', async () => {
      const context = createMockContext()
      const tool = createMockTool({
        name: 'failing_tool',
        execute: vi.fn().mockRejectedValue(new Error('Tool failed')),
      })
      executor.registerTool(tool)

      const mockChat = vi
        .fn()
        .mockResolvedValueOnce({
          content: '<tool>failing_tool</tool><params>{}</params>',
          model: 'mock-model',
          usage: { inputTokens: 10, outputTokens: 15 },
        })
        .mockResolvedValueOnce({
          content: 'I encountered an error but handled it.',
          model: 'mock-model',
          usage: { inputTokens: 20, outputTokens: 10 },
        })

      const toolProvider = createMockProvider({ chat: mockChat })

      // Should not throw, should handle gracefully
      const result = await executor.execute(context, toolProvider, 'System prompt')

      // The execution should still complete
      expect(result).toBeDefined()
    })

    it('should respect max iterations to prevent infinite loops', async () => {
      const context = createMockContext()
      const tool = createMockTool()
      executor.registerTool(tool)

      // Provider always returns tool calls (would cause infinite loop without limit)
      const mockChat = vi.fn().mockResolvedValue({
        content: '<tool>mock_tool</tool><params>{}</params>',
        model: 'mock-model',
        usage: { inputTokens: 10, outputTokens: 15 },
      })

      const toolProvider = createMockProvider({ chat: mockChat })

      const result = await executor.execute(context, toolProvider, 'System prompt')

      // Should eventually complete due to max iterations
      expect(result).toBeDefined()
      // Should have been called multiple times but not infinitely
      expect(mockChat.mock.calls.length).toBeLessThanOrEqual(11) // Max 10 iterations + 1
    })
  })

  describe('token tracking', () => {
    it('should accumulate tokens across multiple calls', async () => {
      const context = createMockContext()
      const tool = createMockTool()
      executor.registerTool(tool)

      const mockChat = vi
        .fn()
        .mockResolvedValueOnce({
          content: '<tool>mock_tool</tool><params>{}</params>',
          model: 'mock-model',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: 'Done!',
          model: 'mock-model',
          usage: { inputTokens: 150, outputTokens: 30 },
        })

      const toolProvider = createMockProvider({ chat: mockChat })

      const result = await executor.execute(context, toolProvider, 'System prompt')

      expect(result.tokensUsed).toEqual({
        input: 250, // 100 + 150
        output: 80, // 50 + 30
      })
    })
  })
})
