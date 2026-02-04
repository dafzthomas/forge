import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import type { ChatMessage, ChatOptions } from '../providers/types'

// Mock AWS SDK modules
const mockSend = vi.fn()
let constructorCalls: Array<{ region: string; credentials: unknown }> = []

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  return {
    BedrockRuntimeClient: class MockBedrockRuntimeClient {
      send = mockSend

      constructor(config: { region: string; credentials: unknown }) {
        constructorCalls.push(config)
      }
    },
    InvokeModelCommand: class MockInvokeModelCommand {
      input: unknown
      constructor(input: unknown) {
        this.input = input
      }
    },
    InvokeModelWithResponseStreamCommand: class MockInvokeModelWithResponseStreamCommand {
      input: unknown
      constructor(input: unknown) {
        this.input = input
      }
    },
  }
})

// Mock credential providers
const mockFromIni = vi.fn()
const mockFromEnv = vi.fn()

vi.mock('@aws-sdk/credential-providers', () => {
  return {
    fromIni: (config: { profile: string }) => {
      mockFromIni(config)
      return { profile: config.profile }
    },
    fromEnv: () => {
      mockFromEnv()
      return { type: 'env' }
    },
  }
})

// Import after mocks are set up
import { BedrockProvider, BedrockProviderConfig } from '../providers/bedrock'

describe('BedrockProvider', () => {
  let provider: BedrockProvider

  const configWithProfile: BedrockProviderConfig = {
    region: 'us-east-1',
    profile: 'my-aws-profile',
  }

  const configWithExplicitCreds: BedrockProviderConfig = {
    region: 'us-west-2',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  }

  const configWithEnvFallback: BedrockProviderConfig = {
    region: 'eu-west-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    constructorCalls = []
  })

  describe('constructor', () => {
    it('should create provider with id and type', () => {
      provider = new BedrockProvider('test-bedrock', configWithProfile)

      expect(provider.id).toBe('test-bedrock')
      expect(provider.type).toBe('bedrock')
    })

    it('should create client with profile credentials', () => {
      provider = new BedrockProvider('profile-bedrock', configWithProfile)

      expect(mockFromIni).toHaveBeenCalledWith({ profile: 'my-aws-profile' })
      expect(constructorCalls).toHaveLength(1)
      expect(constructorCalls[0].region).toBe('us-east-1')
      expect(constructorCalls[0].credentials).toEqual({ profile: 'my-aws-profile' })
    })

    it('should create client with explicit credentials', () => {
      provider = new BedrockProvider('explicit-bedrock', configWithExplicitCreds)

      expect(mockFromIni).not.toHaveBeenCalled()
      expect(mockFromEnv).not.toHaveBeenCalled()
      expect(constructorCalls).toHaveLength(1)
      expect(constructorCalls[0].region).toBe('us-west-2')
      expect(constructorCalls[0].credentials).toEqual({
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      })
    })

    it('should create client with environment variable fallback', () => {
      provider = new BedrockProvider('env-bedrock', configWithEnvFallback)

      expect(mockFromIni).not.toHaveBeenCalled()
      expect(mockFromEnv).toHaveBeenCalled()
      expect(constructorCalls).toHaveLength(1)
      expect(constructorCalls[0].region).toBe('eu-west-1')
      expect(constructorCalls[0].credentials).toEqual({ type: 'env' })
    })
  })

  describe('testConnection', () => {
    beforeEach(() => {
      provider = new BedrockProvider('test-bedrock', configWithProfile)
    })

    it('should return success with models on successful API call', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: 'Hi' }],
            model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            stop_reason: 'end_turn',
            usage: { input_tokens: 5, output_tokens: 3 },
          })
        ),
      }
      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await provider.testConnection()

      expect(result.success).toBe(true)
      expect(result.models).toContain('anthropic.claude-3-5-sonnet-20241022-v2:0')
      expect(result.models).toContain('anthropic.claude-3-5-haiku-20241022-v1:0')
      expect(result.models).toContain('anthropic.claude-3-opus-20240229-v1:0')
    })

    it('should return failure with error message on API error', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'))

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Access denied')
    })

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValueOnce('String error')

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })

  describe('chat', () => {
    const mockResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello, how can I help you?' }],
          model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
          stop_reason: 'end_turn',
          usage: { input_tokens: 15, output_tokens: 8 },
        })
      ),
    }

    beforeEach(() => {
      provider = new BedrockProvider('test-bedrock', configWithProfile)
      mockSend.mockResolvedValue(mockResponse)
    })

    it('should send messages and return response', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      const response = await provider.chat(messages)

      expect(response.content).toBe('Hello, how can I help you?')
      expect(response.model).toBe('anthropic.claude-3-5-sonnet-20241022-v2:0')
      expect(response.usage).toEqual({
        inputTokens: 15,
        outputTokens: 8,
      })
      expect(response.stopReason).toBe('end_turn')
    })

    it('should use default model when not specified', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await provider.chat(messages)

      expect(mockSend).toHaveBeenCalled()
      const command = mockSend.mock.calls[0][0]
      expect(command.input.modelId).toBe('anthropic.claude-3-5-sonnet-20241022-v2:0')
    })

    it('should use specified model from options', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { model: 'anthropic.claude-3-opus-20240229-v1:0' }

      await provider.chat(messages, options)

      const command = mockSend.mock.calls[0][0]
      expect(command.input.modelId).toBe('anthropic.claude-3-opus-20240229-v1:0')
    })

    it('should extract system message and pass in body', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ]

      await provider.chat(messages)

      const command = mockSend.mock.calls[0][0]
      const body = JSON.parse(command.input.body)
      expect(body.system).toBe('You are a helpful assistant.')
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }])
    })

    it('should pass maxTokens option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { maxTokens: 2000 }

      await provider.chat(messages, options)

      const command = mockSend.mock.calls[0][0]
      const body = JSON.parse(command.input.body)
      expect(body.max_tokens).toBe(2000)
    })

    it('should use default maxTokens when not specified', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await provider.chat(messages)

      const command = mockSend.mock.calls[0][0]
      const body = JSON.parse(command.input.body)
      expect(body.max_tokens).toBe(4096)
    })

    it('should pass temperature option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { temperature: 0.7 }

      await provider.chat(messages, options)

      const command = mockSend.mock.calls[0][0]
      const body = JSON.parse(command.input.body)
      expect(body.temperature).toBe(0.7)
    })

    it('should pass stop sequences option', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const options: ChatOptions = { stopSequences: ['END', 'STOP'] }

      await provider.chat(messages, options)

      const command = mockSend.mock.calls[0][0]
      const body = JSON.parse(command.input.body)
      expect(body.stop_sequences).toEqual(['END', 'STOP'])
    })

    it('should include anthropic_version in request body', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await provider.chat(messages)

      const command = mockSend.mock.calls[0][0]
      const body = JSON.parse(command.input.body)
      expect(body.anthropic_version).toBe('bedrock-2023-05-31')
    })

    it('should set correct content type and accept headers', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await provider.chat(messages)

      const command = mockSend.mock.calls[0][0]
      expect(command.input.contentType).toBe('application/json')
      expect(command.input.accept).toBe('application/json')
    })

    it('should handle multiple content blocks in response', async () => {
      const multiBlockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            content: [
              { type: 'text', text: 'First part. ' },
              { type: 'text', text: 'Second part.' },
            ],
            model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            stop_reason: 'end_turn',
            usage: { input_tokens: 15, output_tokens: 8 },
          })
        ),
      }
      mockSend.mockResolvedValueOnce(multiBlockResponse)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.content).toBe('First part. Second part.')
    })

    it('should map max_tokens stop reason correctly', async () => {
      const maxTokensResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: 'Response' }],
            model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            stop_reason: 'max_tokens',
            usage: { input_tokens: 15, output_tokens: 8 },
          })
        ),
      }
      mockSend.mockResolvedValueOnce(maxTokensResponse)

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]
      const response = await provider.chat(messages)

      expect(response.stopReason).toBe('max_tokens')
    })

    it('should throw error on API failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Bedrock API Error'))

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow('Bedrock API Error')
    })

    it('should throw error for empty messages', async () => {
      await expect(provider.chat([])).rejects.toThrow(
        'At least one user or assistant message is required'
      )
    })

    it('should throw error for only system message', async () => {
      const messages: ChatMessage[] = [{ role: 'system', content: 'System' }]
      await expect(provider.chat(messages)).rejects.toThrow(
        'At least one user or assistant message is required'
      )
    })
  })

  describe('chatStream', () => {
    beforeEach(() => {
      provider = new BedrockProvider('test-bedrock', configWithProfile)
    })

    it('should yield chunks from stream', async () => {
      // Create mock streaming response with AsyncIterable body
      const mockChunks = [
        {
          chunk: {
            bytes: new TextEncoder().encode(
              JSON.stringify({
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: 'Hello' },
              })
            ),
          },
        },
        {
          chunk: {
            bytes: new TextEncoder().encode(
              JSON.stringify({
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: ' World' },
              })
            ),
          },
        },
        {
          chunk: {
            bytes: new TextEncoder().encode(
              JSON.stringify({
                type: 'message_stop',
              })
            ),
          },
        },
      ]

      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield chunk
          }
        },
      }

      mockSend.mockResolvedValueOnce({ body: mockAsyncIterator })

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
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            chunk: {
              bytes: new TextEncoder().encode(
                JSON.stringify({ type: 'message_stop' })
              ),
            },
          }
        },
      }

      mockSend.mockResolvedValueOnce({ body: mockAsyncIterator })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      for await (const _ of provider.chatStream(messages)) {
        // consume
      }

      const command = mockSend.mock.calls[0][0]
      expect(command.input.modelId).toBe('anthropic.claude-3-5-sonnet-20241022-v2:0')
    })

    it('should extract system message for streaming', async () => {
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            chunk: {
              bytes: new TextEncoder().encode(
                JSON.stringify({ type: 'message_stop' })
              ),
            },
          }
        },
      }

      mockSend.mockResolvedValueOnce({ body: mockAsyncIterator })

      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'Hello' },
      ]

      for await (const _ of provider.chatStream(messages)) {
        // consume
      }

      const command = mockSend.mock.calls[0][0]
      const body = JSON.parse(command.input.body)
      expect(body.system).toBe('System prompt')
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }])
    })

    it('should handle errors in stream', async () => {
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            chunk: {
              bytes: new TextEncoder().encode(
                JSON.stringify({
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text: 'Hello' },
                })
              ),
            },
          }
          throw new Error('Stream error')
        },
      }

      mockSend.mockResolvedValueOnce({ body: mockAsyncIterator })

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

    it('should throw error for empty messages in chatStream', async () => {
      const stream = provider.chatStream([])
      await expect(async () => {
        for await (const _ of stream) {
          // consume
        }
      }).rejects.toThrow('At least one user or assistant message is required')
    })

    it('should throw error for only system message in chatStream', async () => {
      const messages: ChatMessage[] = [{ role: 'system', content: 'System' }]
      const stream = provider.chatStream(messages)
      await expect(async () => {
        for await (const _ of stream) {
          // consume
        }
      }).rejects.toThrow('At least one user or assistant message is required')
    })

    it('should include anthropic_version in streaming request body', async () => {
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            chunk: {
              bytes: new TextEncoder().encode(
                JSON.stringify({ type: 'message_stop' })
              ),
            },
          }
        },
      }

      mockSend.mockResolvedValueOnce({ body: mockAsyncIterator })

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

      for await (const _ of provider.chatStream(messages)) {
        // consume
      }

      const command = mockSend.mock.calls[0][0]
      const body = JSON.parse(command.input.body)
      expect(body.anthropic_version).toBe('bedrock-2023-05-31')
    })
  })
})
