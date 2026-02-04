import { describe, it, expect, beforeEach } from 'vitest'
import {
  ModelProviderRegistry,
  ModelProvider,
  ChatMessage,
  ChatResponse,
  ChatStreamChunk,
  ChatOptions,
  ProviderConfig,
} from '../providers'

// Mock provider for testing
class MockProvider implements ModelProvider {
  readonly id: string
  readonly type: ProviderConfig['type']
  private shouldFail: boolean

  constructor(id: string, type: ProviderConfig['type'] = 'claude', shouldFail = false) {
    this.id = id
    this.type = type
    this.shouldFail = shouldFail
  }

  async testConnection(): Promise<{ success: boolean; models?: string[]; error?: string }> {
    if (this.shouldFail) {
      return { success: false, error: 'Connection failed' }
    }
    return { success: true, models: ['model-1', 'model-2'] }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    // Type guard ensures messages conforms to interface
    void messages
    return {
      content: 'Mock response',
      model: options?.model ?? 'mock-model',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
      },
      stopReason: 'end_turn',
    }
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk> {
    // Type guard ensures params conform to interface
    void messages
    void options
    yield { content: 'Hello', done: false }
    yield { content: ' World', done: false }
    yield { content: '', done: true }
  }
}

describe('ModelProviderRegistry', () => {
  let registry: ModelProviderRegistry

  beforeEach(() => {
    registry = new ModelProviderRegistry()
  })

  describe('register', () => {
    it('should register a provider', () => {
      const provider = new MockProvider('test-provider')
      registry.register(provider)

      const retrieved = registry.get('test-provider')
      expect(retrieved).toBe(provider)
    })

    it('should overwrite existing provider with same id', () => {
      const provider1 = new MockProvider('test-provider')
      const provider2 = new MockProvider('test-provider')

      registry.register(provider1)
      registry.register(provider2)

      const retrieved = registry.get('test-provider')
      expect(retrieved).toBe(provider2)
    })
  })

  describe('unregister', () => {
    it('should unregister a provider', () => {
      const provider = new MockProvider('test-provider')
      registry.register(provider)
      registry.unregister('test-provider')

      const retrieved = registry.get('test-provider')
      expect(retrieved).toBeUndefined()
    })

    it('should not throw when unregistering non-existent provider', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow()
    })

    it('should clear default if unregistered provider was default', () => {
      const provider = new MockProvider('test-provider')
      registry.register(provider)
      registry.setDefault('test-provider')
      registry.unregister('test-provider')

      expect(registry.getDefault()).toBeUndefined()
    })
  })

  describe('get', () => {
    it('should return undefined for non-existent provider', () => {
      const retrieved = registry.get('non-existent')
      expect(retrieved).toBeUndefined()
    })

    it('should return registered provider', () => {
      const provider = new MockProvider('test-provider')
      registry.register(provider)

      const retrieved = registry.get('test-provider')
      expect(retrieved).toBe(provider)
    })
  })

  describe('getAll', () => {
    it('should return empty array when no providers registered', () => {
      const providers = registry.getAll()
      expect(providers).toEqual([])
    })

    it('should return all registered providers', () => {
      const provider1 = new MockProvider('provider-1')
      const provider2 = new MockProvider('provider-2')
      const provider3 = new MockProvider('provider-3')

      registry.register(provider1)
      registry.register(provider2)
      registry.register(provider3)

      const providers = registry.getAll()
      expect(providers).toHaveLength(3)
      expect(providers).toContain(provider1)
      expect(providers).toContain(provider2)
      expect(providers).toContain(provider3)
    })
  })

  describe('setDefault', () => {
    it('should set default provider', () => {
      const provider = new MockProvider('test-provider')
      registry.register(provider)
      registry.setDefault('test-provider')

      expect(registry.getDefault()).toBe(provider)
    })

    it('should throw when setting non-existent provider as default', () => {
      expect(() => registry.setDefault('non-existent')).toThrow(
        'Provider with id "non-existent" not found'
      )
    })

    it('should allow changing default provider', () => {
      const provider1 = new MockProvider('provider-1')
      const provider2 = new MockProvider('provider-2')

      registry.register(provider1)
      registry.register(provider2)

      registry.setDefault('provider-1')
      expect(registry.getDefault()).toBe(provider1)

      registry.setDefault('provider-2')
      expect(registry.getDefault()).toBe(provider2)
    })
  })

  describe('getDefault', () => {
    it('should return undefined when no default set', () => {
      expect(registry.getDefault()).toBeUndefined()
    })

    it('should return default provider', () => {
      const provider = new MockProvider('test-provider')
      registry.register(provider)
      registry.setDefault('test-provider')

      expect(registry.getDefault()).toBe(provider)
    })
  })

  describe('testAll', () => {
    it('should return empty map when no providers registered', async () => {
      const results = await registry.testAll()
      expect(results.size).toBe(0)
    })

    it('should test all providers and return results', async () => {
      const provider1 = new MockProvider('provider-1', 'claude', false)
      const provider2 = new MockProvider('provider-2', 'bedrock', true)

      registry.register(provider1)
      registry.register(provider2)

      const results = await registry.testAll()

      expect(results.size).toBe(2)
      expect(results.get('provider-1')).toEqual({ success: true })
      expect(results.get('provider-2')).toEqual({
        success: false,
        error: 'Connection failed',
      })
    })
  })
})

describe('Type exports', () => {
  it('should export ChatMessage type', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hello',
    }
    expect(message.role).toBe('user')
    expect(message.content).toBe('Hello')
  })

  it('should export ChatResponse type', () => {
    const response: ChatResponse = {
      content: 'Response',
      model: 'test-model',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
      },
      stopReason: 'end_turn',
    }
    expect(response.content).toBe('Response')
    expect(response.model).toBe('test-model')
    expect(response.usage?.inputTokens).toBe(10)
    expect(response.stopReason).toBe('end_turn')
  })

  it('should export ChatStreamChunk type', () => {
    const chunk: ChatStreamChunk = {
      content: 'Hello',
      done: false,
    }
    expect(chunk.content).toBe('Hello')
    expect(chunk.done).toBe(false)
  })

  it('should export ChatOptions type', () => {
    const options: ChatOptions = {
      model: 'test-model',
      maxTokens: 1000,
      temperature: 0.7,
      stopSequences: ['END'],
    }
    expect(options.model).toBe('test-model')
    expect(options.maxTokens).toBe(1000)
    expect(options.temperature).toBe(0.7)
    expect(options.stopSequences).toContain('END')
  })

  it('should export ProviderConfig type', () => {
    const config: ProviderConfig = {
      id: 'test-id',
      type: 'claude',
      name: 'Test Provider',
      enabled: true,
      config: { apiKey: 'test-key' },
    }
    expect(config.id).toBe('test-id')
    expect(config.type).toBe('claude')
    expect(config.name).toBe('Test Provider')
    expect(config.enabled).toBe(true)
    expect(config.config.apiKey).toBe('test-key')
  })

  it('should support all provider types', () => {
    const types: ProviderConfig['type'][] = ['claude', 'bedrock', 'openai', 'openai-compatible']
    expect(types).toHaveLength(4)
  })
})

describe('MockProvider implementation', () => {
  it('should implement chat method', async () => {
    const provider = new MockProvider('test')
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

    const response = await provider.chat(messages)

    expect(response.content).toBe('Mock response')
    expect(response.model).toBeDefined()
  })

  it('should implement chatStream method', async () => {
    const provider = new MockProvider('test')
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }]

    const chunks: ChatStreamChunk[] = []
    for await (const chunk of provider.chatStream(messages)) {
      chunks.push(chunk)
    }

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[chunks.length - 1].done).toBe(true)
  })

  it('should implement testConnection method', async () => {
    const provider = new MockProvider('test')

    const result = await provider.testConnection()

    expect(result.success).toBe(true)
    expect(result.models).toBeDefined()
  })
})
