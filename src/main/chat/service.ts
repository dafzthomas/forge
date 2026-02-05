/**
 * Chat Service
 *
 * Handles AI chat requests using configured providers.
 * Supports streaming responses.
 */

import { BrowserWindow } from 'electron'
import {
  ModelProviderRegistry,
  ClaudeProvider,
  BedrockProvider,
  OpenAICompatibleProvider,
  type ChatMessage,
  type ProviderConfig,
} from '../providers'
import { IPC_CHANNELS } from '../../shared/ipc-types'

// Global registry instance
let registry: ModelProviderRegistry | null = null

/**
 * Initialize the chat service
 */
export function initChatService(): void {
  registry = new ModelProviderRegistry()
}

/**
 * Get the provider registry
 */
export function getRegistry(): ModelProviderRegistry {
  if (!registry) {
    registry = new ModelProviderRegistry()
  }
  return registry
}

/**
 * Create a provider instance from config
 */
export function createProvider(config: ProviderConfig) {
  const providerConfig = config.config as Record<string, unknown>

  switch (config.type) {
    case 'claude':
      return new ClaudeProvider(config.id, {
        apiKey: providerConfig.apiKey as string,
        baseUrl: providerConfig.baseUrl as string | undefined,
      })
    case 'bedrock':
      return new BedrockProvider(config.id, {
        region: providerConfig.region as string,
        profile: providerConfig.profileName as string | undefined,
        accessKeyId: providerConfig.accessKeyId as string | undefined,
        secretAccessKey: providerConfig.secretAccessKey as string | undefined,
      })
    case 'openai-compatible':
      return new OpenAICompatibleProvider(config.id, {
        baseUrl: providerConfig.baseUrl as string,
        apiKey: providerConfig.apiKey as string | undefined,
        defaultModel: providerConfig.defaultModel as string | undefined,
      })
    default:
      throw new Error(`Unknown provider type: ${config.type}`)
  }
}

/**
 * Register a provider from config
 */
export function registerProvider(config: ProviderConfig): void {
  const reg = getRegistry()
  const provider = createProvider(config)
  reg.register(provider)
}

/**
 * Unregister a provider
 */
export function unregisterProvider(id: string): void {
  const reg = getRegistry()
  reg.unregister(id)
}

export interface SendMessageOptions {
  providerId: string
  providerConfig: ProviderConfig
  modelId: string
  messages: ChatMessage[]
  conversationId: string
}

/**
 * Send a message and stream the response
 */
export async function sendMessage(
  mainWindow: BrowserWindow,
  options: SendMessageOptions
): Promise<void> {
  const { providerId, providerConfig, modelId, messages, conversationId } = options

  try {
    // Create provider on-the-fly from config (since renderer stores provider configs)
    const provider = createProvider(providerConfig)

    // Stream the response
    let fullContent = ''

    for await (const chunk of provider.chatStream(messages, { model: modelId })) {
      fullContent += chunk.content

      // Send chunk to renderer
      mainWindow.webContents.send(IPC_CHANNELS.CHAT_STREAM_CHUNK, {
        conversationId,
        content: chunk.content,
        fullContent,
        done: chunk.done,
      })
    }

    // Send completion
    mainWindow.webContents.send(IPC_CHANNELS.CHAT_STREAM_END, {
      conversationId,
      content: fullContent,
    })
  } catch (error) {
    // Send error to renderer
    mainWindow.webContents.send(IPC_CHANNELS.CHAT_STREAM_ERROR, {
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
