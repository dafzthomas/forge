/**
 * Model Provider Type Definitions
 *
 * This module defines the core types for the model provider system, supporting:
 * - Layer 1: Curated providers (Claude Direct, Bedrock, OpenAI)
 * - Layer 2: OpenAI-compatible endpoints
 * - Layer 3: Plugin providers (future)
 */

// Re-export shared provider types
export { ProviderType, ProviderConfig } from '../../shared/provider-types'
import type { ProviderConfig } from '../../shared/provider-types'

/**
 * Chat message format compatible with OpenAI/Anthropic APIs
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Response from a model provider
 */
export interface ChatResponse {
  content: string
  model: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence'
}

/**
 * Streaming chunk from a model provider
 */
export interface ChatStreamChunk {
  content: string
  done: boolean
}

/**
 * Options for chat requests
 */
export interface ChatOptions {
  /** Model to use for the request */
  model?: string
  /** Maximum tokens in the response */
  maxTokens?: number
  /** Temperature for response randomness (0-1) */
  temperature?: number
  /** Sequences that will stop generation */
  stopSequences?: string[]
}

/**
 * Result from testing a provider connection
 */
export interface ConnectionTestResult {
  success: boolean
  models?: string[]
  error?: string
}

/**
 * Abstract interface for model providers
 *
 * All provider implementations (Claude, Bedrock, OpenAI, etc.) must implement this interface.
 */
export interface ModelProvider {
  /** Unique identifier for this provider instance */
  readonly id: string
  /** Type of provider */
  readonly type: ProviderConfig['type']

  /**
   * Test the connection to the provider and return available models
   */
  testConnection(): Promise<ConnectionTestResult>

  /**
   * Send a non-streaming chat request
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>

  /**
   * Send a streaming chat request
   */
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk>
}
