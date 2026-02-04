/**
 * Provider configuration types shared between main and renderer processes
 */

/**
 * Supported provider types
 */
export type ProviderType = 'claude' | 'bedrock' | 'openai' | 'openai-compatible'

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
