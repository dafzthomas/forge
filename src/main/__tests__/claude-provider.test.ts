import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import type { ChatMessage, ChatOptions } from '../providers/types'

// Create mock functions outside the mock factory
const mockMessagesCreate = vi.fn()
const mockMessagesStream = vi.fn()

// Track constructor calls
let constructorCalls: Array<{ apiKey: string; baseURL?: string }> = []

// Mock the Anthropic SDK with a proper class
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockMessagesCreate,
        stream: mockMessagesStream,
      }

      constructor(config: { apiKey: string; baseURL?: string }) {
        constructorCalls.push(config)
      }
    },
  }
})

// Import after mock is set up
import { ClaudeProvider, ClaudeProviderConfig, convertMessages } from '../providers/claude'

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider

  const config: ClaudeProviderConfig = {
    apiKey: 'test-api-key',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    constructorCalls = []
    provider = new ClaudeProvider('test-claude', config)
  })

  describe('constructor', () => {
    it('should create provider with id and type', () => {
      expect(provider.id).toBe('test-claude')
      expect(provider.type).toBe('claude')
    })

    it('should create Anthropic client with API key', () => {
      expect(constructorCalls).toHaveLength(1)
      expect(constructorCalls[0]).toEqual({
        apiKey: 'test-api-key',
        baseURL: undefined,
      })
    })

    it('should support custom base URL for API proxies', () => {
      constructorCalls = []

      new ClaudeProvider('proxy-claude', {
        apiKey: 'test-key',
        baseUrl: 'https://proxy.example.com',
      })

      expect(constructorCalls).toHaveLength(1)
      expect(constructorCalls[0]).toEqual({
        apiKey: 'test-key',
        baseURL: 'https://proxy.example.com',
      })
    })
  })

  describe('testConnection', () => {
    it('should return success with models on successful API call', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      })

      const result = await provider.testConnection()

      expect(result.success).toBe(true)
      expect(result.models).toEqual([
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
        'claude-3-5-haiku-20241022',
      ])
    })

    it('should return failure with error message on API error', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Invalid API key'))

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')
    })

    it('should handle non-Error exceptions', async () => {
      mockMessagesCreate.mockRejectedValueOnce('String error')

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })

  describe('chat', () => {
    const mockResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello, how can I help you?' }],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: { input_tokens: 15, output_tokens: 8 },
    }

    beforeEach(() => {
      mockMessagesCreate.mockResolvedValue(mockResponse)
    })

    it('should send messages and return response', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      const response = await provider.chat(messages)

      expect(response.content).toBe('Hello, how can I help you?')
      expect(response.model).toBe('claude-sonnet-4-20250514')
      expect(response.usage).toEqual({
        inputTokens: 15,
        outputTokens: 8,
      })
      expect(response.stopReason).toBe('end_turn')
    })

    it('should use default model when not specified', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await provider.chat(messages)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
        })
      )
    })

    it('should use specified model from options', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { model: 'claude-opus-4-20250514' }

      await provider.chat(messages, options)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-20250514',
        })
      )
    })

    it('should extract system message and pass separately', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ]

      await provider.chat(messages)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant.',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      )
    })

    it('should pass maxTokens option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { maxTokens: 2000 }

      await provider.chat(messages, options)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000,
        })
      )
    })

    it('should use default maxTokens when not specified', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await provider.chat(messages)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4096,
        })
      )
    })

    it('should pass temperature option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { temperature: 0.7 }

      await provider.chat(messages, options)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      )
    })

    it('should pass stop sequences option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { stopSequences: ['END', 'STOP'] }

      await provider.chat(messages, options)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stop_sequences: ['END', 'STOP'],
        })
      )
    })

    it('should handle multiple content blocks in response', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        ...mockResponse,
        content: [
          { type: 'text', text: 'First part. ' },
          { type: 'text', text: 'Second part.' },
        ],
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.content).toBe('First part. Second part.')
    })

    it('should map max_tokens stop reason correctly', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        ...mockResponse,
        stop_reason: 'max_tokens',
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.stopReason).toBe('max_tokens')
    })

    it('should map stop_sequence stop reason correctly', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        ...mockResponse,
        stop_reason: 'stop_sequence',
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.stopReason).toBe('stop_sequence')
    })

    it('should throw error on API failure', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('API Error'))

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow('API Error')
    })
  })

  describe('chatStream', () => {
    it('should yield chunks from stream', async () => {
      // Create a mock async iterator for the stream
      const mockEvents = [
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ' World' } },
        { type: 'message_stop' },
      ]

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockEvents) {
            yield event
          }
        },
      }

      mockMessagesStream.mockReturnValueOnce(mockStream)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const chunks: Array<{ content: string; done: boolean }> = []

      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(3)
      expect(chunks[0]).toEqual({ content: 'Hello', done: false })
      expect(chunks[1]).toEqual({ content: ' World', done: false })
      expect(chunks[2]).toEqual({ content: '', done: true })
    })

    it('should use default model when not specified', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'message_stop' }
        },
      }

      mockMessagesStream.mockReturnValueOnce(mockStream)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      // Consume the stream
      for await (const _ of provider.chatStream(messages)) {
        // consume
      }

      expect(mockMessagesStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
        })
      )
    })

    it('should extract system message for streaming', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'message_stop' }
        },
      }

      mockMessagesStream.mockReturnValueOnce(mockStream)

      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'Hello' },
      ]

      for await (const _ of provider.chatStream(messages)) {
        // consume
      }

      expect(mockMessagesStream).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'System prompt',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      )
    })

    it('should handle errors in stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
          throw new Error('Stream error')
        },
      }

      mockMessagesStream.mockReturnValueOnce(mockStream)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const chunks: Array<{ content: string; done: boolean }> = []

      await expect(async () => {
        for await (const chunk of provider.chatStream(messages)) {
          chunks.push(chunk)
        }
      }).rejects.toThrow('Stream error')

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toEqual({ content: 'Hello', done: false })
    })
  })
})

describe('convertMessages', () => {
  it('should extract system message from messages', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' },
    ]

    const result = convertMessages(messages)

    expect(result.system).toBe('You are helpful.')
    expect(result.messages).toEqual([{ role: 'user', content: 'Hi' }])
  })

  it('should handle messages without system message', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'How are you?' },
    ]

    const result = convertMessages(messages)

    expect(result.system).toBeUndefined()
    expect(result.messages).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'How are you?' },
    ])
  })

  it('should preserve message order', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'System' },
      { role: 'user', content: 'First' },
      { role: 'assistant', content: 'Second' },
      { role: 'user', content: 'Third' },
    ]

    const result = convertMessages(messages)

    expect(result.messages).toEqual([
      { role: 'user', content: 'First' },
      { role: 'assistant', content: 'Second' },
      { role: 'user', content: 'Third' },
    ])
  })

  it('should handle empty messages array', () => {
    const messages: ChatMessage[] = []

    const result = convertMessages(messages)

    expect(result.system).toBeUndefined()
    expect(result.messages).toEqual([])
  })

  it('should use first system message if multiple exist', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'First system' },
      { role: 'user', content: 'Hi' },
      { role: 'system', content: 'Second system' },
    ]

    const result = convertMessages(messages)

    expect(result.system).toBe('First system')
    expect(result.messages).toEqual([{ role: 'user', content: 'Hi' }])
  })
})
