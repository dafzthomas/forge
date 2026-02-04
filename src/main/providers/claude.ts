/**
 * Claude Direct API Provider
 *
 * Implements the ModelProvider interface for direct access to Anthropic's Claude API.
 * Uses the official @anthropic-ai/sdk package.
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  ModelProvider,
  ChatMessage,
  ChatResponse,
  ChatStreamChunk,
  ChatOptions,
  ConnectionTestResult,
} from './types'

/**
 * Configuration for the Claude provider
 */
export interface ClaudeProviderConfig {
  /** Anthropic API key */
  apiKey: string
  /** Optional base URL for API proxies */
  baseUrl?: string
}

/**
 * Default model to use when not specified in options
 */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

/**
 * Default max tokens when not specified
 */
const DEFAULT_MAX_TOKENS = 4096

/**
 * Available Claude models
 */
const AVAILABLE_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-haiku-20241022',
]

/**
 * Convert ChatMessage array to Anthropic format
 * Anthropic API expects system message as a separate parameter
 */
export function convertMessages(messages: ChatMessage[]): {
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
} {
  const systemMessage = messages.find((m) => m.role === 'system')
  const system = systemMessage?.content

  const converted = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  return { system, messages: converted }
}

/**
 * Map Anthropic stop reason to our stop reason type
 */
function mapStopReason(
  stopReason: string | null
): 'end_turn' | 'max_tokens' | 'stop_sequence' | undefined {
  switch (stopReason) {
    case 'end_turn':
      return 'end_turn'
    case 'max_tokens':
      return 'max_tokens'
    case 'stop_sequence':
      return 'stop_sequence'
    default:
      return undefined
  }
}

/**
 * Extract text content from Anthropic message content blocks
 */
function extractTextContent(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

/**
 * Claude provider implementation using the Anthropic SDK
 */
export class ClaudeProvider implements ModelProvider {
  readonly id: string
  readonly type = 'claude' as const

  private client: Anthropic
  private config: ClaudeProviderConfig

  constructor(id: string, config: ClaudeProviderConfig) {
    this.id = id
    this.config = config
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })
  }

  /**
   * Test the connection by making a minimal API call
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Make a minimal API call to verify credentials
      await this.client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })

      return {
        success: true,
        models: AVAILABLE_MODELS,
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
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const { system, messages: convertedMessages } = convertMessages(messages)

    const response = await this.client.messages.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: convertedMessages,
      ...(system && { system }),
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
    })

    return {
      content: extractTextContent(response.content),
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: mapStopReason(response.stop_reason),
    }
  }

  /**
   * Send a streaming chat request
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk> {
    const { system, messages: convertedMessages } = convertMessages(messages)

    const stream = this.client.messages.stream({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: convertedMessages,
      ...(system && { system }),
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as { type: string; text?: string }
        if (delta.type === 'text_delta' && delta.text) {
          yield { content: delta.text, done: false }
        }
      } else if (event.type === 'message_stop') {
        yield { content: '', done: true }
      }
    }
  }
}
