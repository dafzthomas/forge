/**
 * OpenAI-Compatible Provider
 *
 * Implements the ModelProvider interface for any OpenAI-compatible API endpoint.
 * This includes: Together AI, Groq, Fireworks, Ollama, LM Studio, vLLM, and others.
 * Uses the official OpenAI SDK for type compatibility and consistent behavior.
 */

import OpenAI from 'openai'
import type {
  ModelProvider,
  ChatMessage,
  ChatResponse,
  ChatStreamChunk,
  ChatOptions,
  ConnectionTestResult,
} from './types'

/**
 * Configuration for the OpenAI-compatible provider
 */
export interface OpenAICompatibleProviderConfig {
  /** Required: the API endpoint base URL */
  baseUrl: string
  /** Optional: some local APIs don't need keys */
  apiKey?: string
  /** Optional: default model to use when not specified in options */
  defaultModel?: string
  /** Optional: display name for the provider */
  name?: string
}

/**
 * Default model to use when not specified in config or options
 */
const DEFAULT_FALLBACK_MODEL = 'gpt-3.5-turbo'

/**
 * Default max tokens to use when not specified in options
 */
const DEFAULT_MAX_TOKENS = 4096

/**
 * Maps OpenAI finish_reason to internal format
 * Note: OpenAI uses 'stop' for both natural completion and stop sequences.
 * Unlike Anthropic's API, we cannot distinguish these cases.
 */
export function mapFinishReason(
  reason?: string | null
): 'end_turn' | 'max_tokens' | 'stop_sequence' | undefined {
  switch (reason) {
    case 'stop':
      return 'end_turn'
    case 'length':
      return 'max_tokens'
    default:
      return undefined
  }
}

/**
 * OpenAI-compatible provider implementation using the OpenAI SDK
 *
 * This provider works with any API that implements the OpenAI chat completions API,
 * including cloud providers (Together AI, Groq, Fireworks) and local servers
 * (Ollama, LM Studio, vLLM).
 */
export class OpenAICompatibleProvider implements ModelProvider {
  readonly id: string
  readonly type = 'openai-compatible' as const

  private client: OpenAI
  private config: OpenAICompatibleProviderConfig

  constructor(id: string, config: OpenAICompatibleProviderConfig) {
    this.id = id
    this.config = config
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey ?? 'dummy-key', // OpenAI SDK requires a key
      dangerouslyAllowBrowser: false,
    })
  }

  /**
   * Test the connection by making a minimal chat request
   *
   * We use a chat completion request rather than listing models because
   * some OpenAI-compatible APIs don't implement the models endpoint.
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.client.chat.completions.create({
        model: this.config.defaultModel ?? DEFAULT_FALLBACK_MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })

      return {
        success: true,
        // Note: We don't return models list because many OpenAI-compatible
        // APIs don't support the models endpoint
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send a non-streaming chat request
   *
   * OpenAI's message format is already compatible with our ChatMessage format,
   * so we can pass messages directly without conversion.
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.config.defaultModel ?? DEFAULT_FALLBACK_MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options?.temperature,
      stop: options?.stopSequences,
    })

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
      stopReason: mapFinishReason(response.choices[0]?.finish_reason),
    }
  }

  /**
   * Send a streaming chat request
   *
   * Yields chunks as they arrive from the API, with a final chunk
   * indicating completion.
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: options?.model ?? this.config.defaultModel ?? DEFAULT_FALLBACK_MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options?.temperature,
      stop: options?.stopSequences,
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      const done = chunk.choices[0]?.finish_reason !== null
      yield { content: delta, done }
    }
  }
}
