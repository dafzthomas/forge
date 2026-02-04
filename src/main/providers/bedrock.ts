/**
 * Claude Bedrock Provider
 *
 * Implements the ModelProvider interface for accessing Claude through AWS Bedrock.
 * Uses the AWS SDK for Bedrock Runtime.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime'
import { fromIni, fromEnv } from '@aws-sdk/credential-providers'
import type {
  ModelProvider,
  ChatMessage,
  ChatResponse,
  ChatStreamChunk,
  ChatOptions,
  ConnectionTestResult,
} from './types'
import { convertMessages } from './claude'

/**
 * Configuration for the Bedrock provider
 */
export interface BedrockProviderConfig {
  /** AWS region for Bedrock */
  region: string
  /** AWS profile name (from ~/.aws/credentials) */
  profile?: string
  /** Explicit AWS access key ID */
  accessKeyId?: string
  /** Explicit AWS secret access key */
  secretAccessKey?: string
}

/**
 * Default model to use when not specified in options
 */
const DEFAULT_MODEL = 'anthropic.claude-3-5-sonnet-20241022-v2:0'

/**
 * Default max tokens when not specified
 */
const DEFAULT_MAX_TOKENS = 4096

/**
 * Bedrock API version for Anthropic models
 */
const ANTHROPIC_VERSION = 'bedrock-2023-05-31'

/**
 * Available Claude models on Bedrock
 */
const AVAILABLE_MODELS = [
  'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'anthropic.claude-3-5-haiku-20241022-v1:0',
  'anthropic.claude-3-opus-20240229-v1:0',
]

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
function extractTextContent(
  content: Array<{ type: string; text?: string }>
): string {
  return content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

/**
 * Bedrock provider implementation using the AWS SDK
 */
export class BedrockProvider implements ModelProvider {
  readonly id: string
  readonly type = 'bedrock' as const

  private client: BedrockRuntimeClient
  private config: BedrockProviderConfig

  constructor(id: string, config: BedrockProviderConfig) {
    this.id = id
    this.config = config

    // Determine credentials based on config
    const credentials =
      config.profile
        ? fromIni({ profile: config.profile })
        : config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : fromEnv() // Fall back to environment variables

    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials,
    })
  }

  /**
   * Test the connection by making a minimal API call
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const { system, messages: convertedMessages } = convertMessages([
        { role: 'user', content: 'Hi' },
      ])

      const command = new InvokeModelCommand({
        modelId: DEFAULT_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: ANTHROPIC_VERSION,
          max_tokens: 10,
          messages: convertedMessages,
          ...(system && { system }),
        }),
      })

      await this.client.send(command)

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

    if (convertedMessages.length === 0) {
      throw new Error('At least one user or assistant message is required')
    }

    const command = new InvokeModelCommand({
      modelId: options?.model ?? DEFAULT_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: ANTHROPIC_VERSION,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: convertedMessages,
        ...(system && { system }),
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
      }),
    })

    const response = await this.client.send(command)
    if (!response.body) {
      throw new Error('No response body from Bedrock')
    }
    const result = JSON.parse(new TextDecoder().decode(response.body))

    return {
      content: extractTextContent(result.content),
      model: result.model,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
      stopReason: mapStopReason(result.stop_reason),
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

    if (convertedMessages.length === 0) {
      throw new Error('At least one user or assistant message is required')
    }

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: options?.model ?? DEFAULT_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: ANTHROPIC_VERSION,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: convertedMessages,
        ...(system && { system }),
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
      }),
    })

    const response = await this.client.send(command)

    if (!response.body) {
      throw new Error('No response body from Bedrock streaming')
    }

    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        const chunkData = JSON.parse(new TextDecoder().decode(event.chunk.bytes))

        if (chunkData.type === 'content_block_delta') {
          const delta = chunkData.delta as { type: string; text?: string }
          if (delta.type === 'text_delta' && delta.text) {
            yield { content: delta.text, done: false }
          }
        } else if (chunkData.type === 'message_stop') {
          yield { content: '', done: true }
        }
      }
    }
  }
}
