import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ChatMessage, ChatOptions } from '../providers/types'

// Create mock functions outside the mock factory
const mockChatCompletionsCreate = vi.fn()

// Track constructor calls
let constructorCalls: Array<{ baseURL: string; apiKey: string; dangerouslyAllowBrowser?: boolean }> =
  []

// Mock the OpenAI SDK with a proper class
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockChatCompletionsCreate,
        },
      }
      models = {
        list: vi.fn(),
      }

      constructor(config: { baseURL: string; apiKey: string; dangerouslyAllowBrowser?: boolean }) {
        constructorCalls.push(config)
      }
    },
  }
})

// Import after mock is set up
import {
  OpenAICompatibleProvider,
  OpenAICompatibleProviderConfig,
  mapFinishReason,
} from '../providers/openai-compatible'

describe('OpenAICompatibleProvider', () => {
  let provider: OpenAICompatibleProvider

  const defaultConfig: OpenAICompatibleProviderConfig = {
    baseUrl: 'https://api.together.xyz/v1',
    apiKey: 'test-api-key',
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
    name: 'Together AI',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    constructorCalls = []
    provider = new OpenAICompatibleProvider('test-openai-compat', defaultConfig)
  })

  describe('constructor', () => {
    it('should create provider with id and type', () => {
      expect(provider.id).toBe('test-openai-compat')
      expect(provider.type).toBe('openai-compatible')
    })

    it('should create OpenAI client with correct base URL and API key', () => {
      expect(constructorCalls).toHaveLength(1)
      expect(constructorCalls[0]).toEqual({
        baseURL: 'https://api.together.xyz/v1',
        apiKey: 'test-api-key',
        dangerouslyAllowBrowser: false,
      })
    })

    it('should use dummy-key when no API key provided (local Ollama scenario)', () => {
      constructorCalls = []

      new OpenAICompatibleProvider('ollama-local', {
        baseUrl: 'http://localhost:11434/v1',
        // No apiKey - typical for local Ollama
      })

      expect(constructorCalls).toHaveLength(1)
      expect(constructorCalls[0].apiKey).toBe('dummy-key')
      expect(constructorCalls[0].baseURL).toBe('http://localhost:11434/v1')
    })

    it('should handle all config options', () => {
      constructorCalls = []

      const fullConfig: OpenAICompatibleProviderConfig = {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: 'groq-key',
        defaultModel: 'llama2-70b-4096',
        name: 'Groq',
      }

      const groqProvider = new OpenAICompatibleProvider('groq-provider', fullConfig)

      expect(groqProvider.id).toBe('groq-provider')
      expect(constructorCalls[0].baseURL).toBe('https://api.groq.com/openai/v1')
      expect(constructorCalls[0].apiKey).toBe('groq-key')
    })
  })

  describe('testConnection', () => {
    it('should return success on successful API call', async () => {
      mockChatCompletionsCreate.mockResolvedValueOnce({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'meta-llama/Llama-3-70b-chat-hf',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hi' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      })

      const result = await provider.testConnection()

      expect(result.success).toBe(true)
    })

    it('should return failure with error message on API error', async () => {
      mockChatCompletionsCreate.mockRejectedValueOnce(new Error('Invalid API key'))

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')
    })

    it('should handle non-Error exceptions', async () => {
      mockChatCompletionsCreate.mockRejectedValueOnce('String error')

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })

  describe('chat', () => {
    const mockResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'meta-llama/Llama-3-70b-chat-hf',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello, how can I help you?' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
    }

    beforeEach(() => {
      mockChatCompletionsCreate.mockResolvedValue(mockResponse)
    })

    it('should send messages and return response', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      const response = await provider.chat(messages)

      expect(response.content).toBe('Hello, how can I help you?')
      expect(response.model).toBe('meta-llama/Llama-3-70b-chat-hf')
      expect(response.usage).toEqual({
        inputTokens: 15,
        outputTokens: 8,
      })
      expect(response.stopReason).toBe('end_turn')
    })

    it('should use default model when not specified', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await provider.chat(messages)

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'meta-llama/Llama-3-70b-chat-hf',
        })
      )
    })

    it('should use specified model from options', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { model: 'codellama/CodeLlama-70b-Instruct-hf' }

      await provider.chat(messages, options)

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'codellama/CodeLlama-70b-Instruct-hf',
        })
      )
    })

    it('should fallback to gpt-3.5-turbo when no model specified', async () => {
      // Create provider without default model
      const noDefaultProvider = new OpenAICompatibleProvider('no-default', {
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'test-key',
        // No defaultModel
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await noDefaultProvider.chat(messages)

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
        })
      )
    })

    it('should pass system message directly (OpenAI format)', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ]

      await provider.chat(messages)

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello' },
          ],
        })
      )
    })

    it('should pass maxTokens option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { maxTokens: 2000 }

      await provider.chat(messages, options)

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000,
        })
      )
    })

    it('should pass temperature option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { temperature: 0.7 }

      await provider.chat(messages, options)

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      )
    })

    it('should pass stop sequences option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { stopSequences: ['END', 'STOP'] }

      await provider.chat(messages, options)

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stop: ['END', 'STOP'],
        })
      )
    })

    it('should handle response with null content', async () => {
      mockChatCompletionsCreate.mockResolvedValueOnce({
        ...mockResponse,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: null },
            finish_reason: 'stop',
          },
        ],
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.content).toBe('')
    })

    it('should handle response with no choices', async () => {
      mockChatCompletionsCreate.mockResolvedValueOnce({
        ...mockResponse,
        choices: [],
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.content).toBe('')
    })

    it('should handle response without usage', async () => {
      mockChatCompletionsCreate.mockResolvedValueOnce({
        ...mockResponse,
        usage: undefined,
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.usage).toBeUndefined()
    })

    it('should map length finish reason to max_tokens', async () => {
      mockChatCompletionsCreate.mockResolvedValueOnce({
        ...mockResponse,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'length',
          },
        ],
      })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.stopReason).toBe('max_tokens')
    })

    it('should throw error on API failure', async () => {
      mockChatCompletionsCreate.mockRejectedValueOnce(new Error('API Error'))

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow('API Error')
    })

    it('should handle conversation with multiple messages', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ]

      await provider.chat(messages)

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
          ],
        })
      )
    })
  })

  describe('chatStream', () => {
    it('should yield chunks from stream', async () => {
      // Create a mock async iterator for the stream
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }],
          }
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: { content: ' World' }, finish_reason: null }],
          }
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          }
        },
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream)

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

    it('should pass stream: true to API', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          }
        },
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      for await (const _ of provider.chatStream(messages)) {
        // consume
      }

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      )
    })

    it('should use default model when not specified', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          }
        },
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      for await (const _ of provider.chatStream(messages)) {
        // consume
      }

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'meta-llama/Llama-3-70b-chat-hf',
        })
      )
    })

    it('should pass system message in streaming', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          }
        },
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream)

      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'Hello' },
      ]

      for await (const _ of provider.chatStream(messages)) {
        // consume
      }

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System prompt' },
            { role: 'user', content: 'Hello' },
          ],
        })
      )
    })

    it('should handle errors in stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }],
          }
          throw new Error('Stream error')
        },
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream)

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

    it('should handle empty delta content', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }], // Initial chunk without content
          }
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }],
          }
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          }
        },
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const chunks: Array<{ content: string; done: boolean }> = []

      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk)
      }

      // First chunk has empty content (role only), second has "Hello", third is done
      expect(chunks).toHaveLength(3)
      expect(chunks[0]).toEqual({ content: '', done: false })
      expect(chunks[1]).toEqual({ content: 'Hello', done: false })
      expect(chunks[2]).toEqual({ content: '', done: true })
    })

    it('should handle empty choices array in stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: 'chatcmpl-123',
            object: 'chat.completion.chunk',
            created: 1677652288,
            model: 'meta-llama/Llama-3-70b-chat-hf',
            choices: [],
          }
        },
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const chunks: Array<{ content: string; done: boolean }> = []

      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk)
      }

      // When choices is empty, finish_reason is undefined (not null), so done=true
      // This is a defensive handling for malformed responses
      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toEqual({ content: '', done: true })
    })
  })
})

describe('mapFinishReason', () => {
  it('should map stop to end_turn', () => {
    expect(mapFinishReason('stop')).toBe('end_turn')
  })

  it('should map length to max_tokens', () => {
    expect(mapFinishReason('length')).toBe('max_tokens')
  })

  it('should return undefined for null', () => {
    expect(mapFinishReason(null)).toBeUndefined()
  })

  it('should return undefined for unknown reasons', () => {
    expect(mapFinishReason('content_filter')).toBeUndefined()
    expect(mapFinishReason('function_call')).toBeUndefined()
  })
})
