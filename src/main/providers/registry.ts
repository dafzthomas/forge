/**
 * Model Provider Registry
 *
 * Manages the registration and retrieval of model providers.
 * This registry is instantiated in the main process and used by the agent executor.
 */

import { ModelProvider } from './types'

/**
 * Registry for managing model provider instances
 */
export class ModelProviderRegistry {
  private providers: Map<string, ModelProvider> = new Map()
  private defaultProviderId: string | null = null

  /**
   * Register a provider instance
   * If a provider with the same ID already exists, it will be overwritten.
   */
  register(provider: ModelProvider): void {
    this.providers.set(provider.id, provider)
  }

  /**
   * Unregister a provider by ID
   * If the provider was the default, the default will be cleared.
   */
  unregister(id: string): void {
    this.providers.delete(id)
    if (this.defaultProviderId === id) {
      this.defaultProviderId = null
    }
  }

  /**
   * Get a provider by ID
   * Returns undefined if the provider is not found.
   */
  get(id: string): ModelProvider | undefined {
    return this.providers.get(id)
  }

  /**
   * Get all registered providers
   */
  getAll(): ModelProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Set the default provider by ID
   * Throws an error if the provider is not registered.
   */
  setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider with id "${id}" not found`)
    }
    this.defaultProviderId = id
  }

  /**
   * Get the default provider
   * Returns undefined if no default is set.
   */
  getDefault(): ModelProvider | undefined {
    if (this.defaultProviderId === null) {
      return undefined
    }
    return this.providers.get(this.defaultProviderId)
  }

  /**
   * Test all registered providers and return their status
   * Returns a Map of provider IDs to their test results.
   */
  async testAll(): Promise<Map<string, { success: boolean; error?: string }>> {
    const results = new Map<string, { success: boolean; error?: string }>()

    const testPromises = Array.from(this.providers.entries()).map(async ([id, provider]) => {
      const result = await provider.testConnection()
      return { id, result }
    })

    const testResults = await Promise.all(testPromises)

    for (const { id, result } of testResults) {
      if (result.success) {
        results.set(id, { success: true })
      } else {
        results.set(id, { success: false, error: result.error })
      }
    }

    return results
  }
}
