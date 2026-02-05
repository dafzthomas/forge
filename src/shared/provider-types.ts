/**
 * Provider configuration types shared between main and renderer processes
 */

/**
 * Supported provider types
 */
export type ProviderType = 'claude' | 'bedrock' | 'openai' | 'openai-compatible'

/**
 * Model definition
 */
export interface ModelInfo {
  id: string
  name: string
  contextWindow?: number
}

/**
 * Available models per provider type
 */
export const PROVIDER_MODELS: Record<ProviderType, ModelInfo[]> = {
  claude: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000 },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', contextWindow: 200000 },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', contextWindow: 200000 },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000 },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000 },
  ],
  bedrock: [
    { id: 'anthropic.claude-sonnet-4-20250514-v1:0', name: 'Claude Sonnet 4', contextWindow: 200000 },
    { id: 'anthropic.claude-opus-4-20250514-v1:0', name: 'Claude Opus 4', contextWindow: 200000 },
    { id: 'anthropic.claude-3-7-sonnet-20250219-v1:0', name: 'Claude 3.7 Sonnet', contextWindow: 200000 },
    { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2', contextWindow: 200000 },
    { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', name: 'Claude 3.5 Haiku', contextWindow: 200000 },
    { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus', contextWindow: 200000 },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
    { id: 'o1', name: 'o1', contextWindow: 200000 },
    { id: 'o1-mini', name: 'o1 Mini', contextWindow: 128000 },
  ],
  'openai-compatible': [
    // User can specify custom model in config
  ],
}

/**
 * Provider configuration stored in settings
 */
export interface ProviderConfig {
  /** Unique identifier for the provider instance */
  id: string
  /** Type of provider */
  type: ProviderType
  /** Display name shown in UI */
  name: string
  /** Whether this provider is enabled */
  enabled: boolean
  /** Type-specific configuration stored as JSON */
  config: Record<string, unknown>
}
