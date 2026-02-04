/**
 * Model Provider Module
 *
 * This module provides the foundation for the model provider system:
 * - Type definitions for chat messages, responses, and streaming
 * - Provider configuration types
 * - Abstract ModelProvider interface
 * - Provider registry for managing provider instances
 */

// Export all types
export type {
  ChatMessage,
  ChatResponse,
  ChatStreamChunk,
  ProviderConfig,
  ChatOptions,
  ConnectionTestResult,
  ModelProvider,
} from './types'

// Export registry
export { ModelProviderRegistry } from './registry'

// Export providers
export { ClaudeProvider } from './claude'
export type { ClaudeProviderConfig } from './claude'

export { BedrockProvider } from './bedrock'
export type { BedrockProviderConfig } from './bedrock'
