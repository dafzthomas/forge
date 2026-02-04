import { useState } from 'react'
import * as Switch from '@radix-ui/react-switch'
import type { ProviderType, ProviderConfig } from '../../../shared/provider-types'

type BedrockAuthType = 'profile' | 'credentials'

interface ClaudeConfig {
  apiKey: string
  baseUrl?: string
}

interface BedrockConfig {
  region: string
  authType: BedrockAuthType
  profileName?: string
  accessKeyId?: string
  secretAccessKey?: string
}

interface OpenAICompatibleConfig {
  baseUrl: string
  apiKey?: string
  defaultModel?: string
}

type LocalProviderConfig = ClaudeConfig | BedrockConfig | OpenAICompatibleConfig

/**
 * Provider interface for UI components.
 * Uses ProviderConfig from shared types for the base structure,
 * but with a more specific config type for form handling.
 */
interface Provider extends Omit<ProviderConfig, 'config'> {
  config: LocalProviderConfig
}

interface TestResult {
  success: boolean
  error?: string
}

interface ProviderCardProps {
  provider: Provider
  onEdit: () => void
  onTest: () => void
  onRemove: () => void
  onToggle: (enabled: boolean) => void
  testing: boolean
  testResult?: TestResult
}

function ProviderCard({
  provider,
  onEdit,
  onTest,
  onRemove,
  onToggle,
  testing,
  testResult,
}: ProviderCardProps) {
  const getTypeBadgeColor = (type: ProviderType) => {
    switch (type) {
      case 'claude':
        return 'bg-orange-600'
      case 'bedrock':
        return 'bg-purple-600'
      case 'openai-compatible':
        return 'bg-green-600'
    }
  }

  const getTypeLabel = (type: ProviderType) => {
    switch (type) {
      case 'claude':
        return 'Claude'
      case 'bedrock':
        return 'Bedrock'
      case 'openai-compatible':
        return 'OpenAI-Compatible'
    }
  }

  return (
    <div
      data-testid="provider-card"
      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(provider.type)}`}
          >
            {getTypeLabel(provider.type)}
          </span>
          <h3 className="font-medium">{provider.name}</h3>
        </div>
        <Switch.Root
          checked={provider.enabled}
          onCheckedChange={onToggle}
          className="w-11 h-6 bg-gray-600 rounded-full relative data-[state=checked]:bg-blue-600 transition-colors"
          role="switch"
        >
          <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onTest}
          disabled={testing}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded"
        >
          Edit
        </button>
        <button
          onClick={onRemove}
          className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded"
        >
          Remove
        </button>

        {testResult && (
          <span
            className={`ml-2 text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}
          >
            {testResult.success ? 'Connected' : testResult.error || 'Connection failed'}
          </span>
        )}
      </div>
    </div>
  )
}

interface ProviderFormProps {
  provider: Partial<Provider> | null
  onSave: (provider: Provider) => void
  onCancel: () => void
  isEditing: boolean
}

interface FormErrors {
  name?: string
  apiKey?: string
  baseUrl?: string
  region?: string
  profileName?: string
  accessKeyId?: string
  secretAccessKey?: string
}

function ProviderForm({ provider, onSave, onCancel, isEditing }: ProviderFormProps) {
  const [name, setName] = useState(provider?.name || '')
  const [type, setType] = useState<ProviderType>(provider?.type || 'claude')
  const [errors, setErrors] = useState<FormErrors>({})

  // Claude config
  const [apiKey, setApiKey] = useState(
    (provider?.config as ClaudeConfig)?.apiKey || ''
  )
  const [claudeBaseUrl, setClaudeBaseUrl] = useState(
    (provider?.config as ClaudeConfig)?.baseUrl || ''
  )

  // Bedrock config
  const [region, setRegion] = useState(
    (provider?.config as BedrockConfig)?.region || ''
  )
  const [authType, setAuthType] = useState<BedrockAuthType>(
    (provider?.config as BedrockConfig)?.authType || 'profile'
  )
  const [profileName, setProfileName] = useState(
    (provider?.config as BedrockConfig)?.profileName || ''
  )
  const [accessKeyId, setAccessKeyId] = useState(
    (provider?.config as BedrockConfig)?.accessKeyId || ''
  )
  const [secretAccessKey, setSecretAccessKey] = useState(
    (provider?.config as BedrockConfig)?.secretAccessKey || ''
  )

  // OpenAI-Compatible config
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState(
    (provider?.config as OpenAICompatibleConfig)?.baseUrl || ''
  )
  const [openaiApiKey, setOpenaiApiKey] = useState(
    (provider?.config as OpenAICompatibleConfig)?.apiKey || ''
  )
  const [defaultModel, setDefaultModel] = useState(
    (provider?.config as OpenAICompatibleConfig)?.defaultModel || ''
  )

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Provider name is required'
    }

    if (type === 'claude') {
      if (!apiKey.trim()) {
        newErrors.apiKey = 'API key is required'
      }
    } else if (type === 'bedrock') {
      if (!region.trim()) {
        newErrors.region = 'Region is required'
      }
      if (authType === 'profile' && !profileName.trim()) {
        newErrors.profileName = 'Profile name is required'
      }
      if (authType === 'credentials') {
        if (!accessKeyId.trim()) {
          newErrors.accessKeyId = 'Access Key ID is required'
        }
        if (!secretAccessKey.trim()) {
          newErrors.secretAccessKey = 'Secret Access Key is required'
        }
      }
    } else if (type === 'openai-compatible') {
      if (!openaiBaseUrl.trim()) {
        newErrors.baseUrl = 'Base URL is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    let config: LocalProviderConfig

    if (type === 'claude') {
      config = {
        apiKey,
        ...(claudeBaseUrl && { baseUrl: claudeBaseUrl }),
      }
    } else if (type === 'bedrock') {
      config = {
        region,
        authType,
        ...(authType === 'profile' && { profileName }),
        ...(authType === 'credentials' && { accessKeyId, secretAccessKey }),
      }
    } else {
      config = {
        baseUrl: openaiBaseUrl,
        ...(openaiApiKey && { apiKey: openaiApiKey }),
        ...(defaultModel && { defaultModel }),
      }
    }

    onSave({
      id: provider?.id || crypto.randomUUID(),
      type,
      name,
      enabled: provider?.enabled ?? true,
      config,
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? 'Edit Provider' : 'Add New Provider'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="provider-name"
              className="block text-sm font-medium text-gray-400 mb-1"
            >
              Provider Name
            </label>
            <input
              id="provider-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              placeholder="My Provider"
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="provider-type"
              className="block text-sm font-medium text-gray-400 mb-1"
            >
              Provider Type
            </label>
            <select
              id="provider-type"
              value={type}
              onChange={(e) => setType(e.target.value as ProviderType)}
              disabled={isEditing}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 disabled:opacity-50"
            >
              <option value="claude">Claude</option>
              <option value="bedrock">Bedrock</option>
              <option value="openai-compatible">OpenAI-Compatible</option>
            </select>
          </div>

          {type === 'claude' && (
            <>
              <div>
                <label
                  htmlFor="claude-api-key"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  API Key
                </label>
                <input
                  id="claude-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="sk-ant-..."
                />
                {errors.apiKey && (
                  <p className="text-red-400 text-sm mt-1">{errors.apiKey}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="claude-base-url"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Base URL (optional)
                </label>
                <input
                  id="claude-base-url"
                  type="text"
                  value={claudeBaseUrl}
                  onChange={(e) => setClaudeBaseUrl(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="https://api.anthropic.com"
                />
              </div>
            </>
          )}

          {type === 'bedrock' && (
            <>
              <div>
                <label
                  htmlFor="bedrock-region"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Region
                </label>
                <input
                  id="bedrock-region"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="us-east-1"
                />
                {errors.region && (
                  <p className="text-red-400 text-sm mt-1">{errors.region}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="bedrock-auth-type"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Auth Type
                </label>
                <select
                  id="bedrock-auth-type"
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as BedrockAuthType)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="profile">Profile</option>
                  <option value="credentials">Credentials</option>
                </select>
              </div>
              {authType === 'profile' && (
                <div>
                  <label
                    htmlFor="bedrock-profile-name"
                    className="block text-sm font-medium text-gray-400 mb-1"
                  >
                    Profile Name
                  </label>
                  <input
                    id="bedrock-profile-name"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    placeholder="default"
                  />
                  {errors.profileName && (
                    <p className="text-red-400 text-sm mt-1">{errors.profileName}</p>
                  )}
                </div>
              )}
              {authType === 'credentials' && (
                <>
                  <div>
                    <label
                      htmlFor="bedrock-access-key"
                      className="block text-sm font-medium text-gray-400 mb-1"
                    >
                      Access Key ID
                    </label>
                    <input
                      id="bedrock-access-key"
                      type="password"
                      value={accessKeyId}
                      onChange={(e) => setAccessKeyId(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    />
                    {errors.accessKeyId && (
                      <p className="text-red-400 text-sm mt-1">{errors.accessKeyId}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="bedrock-secret-key"
                      className="block text-sm font-medium text-gray-400 mb-1"
                    >
                      Secret Access Key
                    </label>
                    <input
                      id="bedrock-secret-key"
                      type="password"
                      value={secretAccessKey}
                      onChange={(e) => setSecretAccessKey(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    />
                    {errors.secretAccessKey && (
                      <p className="text-red-400 text-sm mt-1">{errors.secretAccessKey}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {type === 'openai-compatible' && (
            <>
              <div>
                <label
                  htmlFor="openai-base-url"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Base URL
                </label>
                <input
                  id="openai-base-url"
                  type="text"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="http://localhost:8080"
                />
                {errors.baseUrl && (
                  <p className="text-red-400 text-sm mt-1">{errors.baseUrl}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="openai-api-key"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  API Key (optional)
                </label>
                <input
                  id="openai-api-key"
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="openai-default-model"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Default Model
                </label>
                <input
                  id="openai-default-model"
                  type="text"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="gpt-4"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProvidersSettings() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [editingProvider, setEditingProvider] = useState<Partial<Provider> | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  const handleAddProvider = () => {
    setEditingProvider({
      type: 'claude',
      enabled: true,
    })
    setIsEditing(false)
  }

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider)
    setIsEditing(true)
  }

  const handleSaveProvider = (provider: Provider) => {
    if (isEditing) {
      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? provider : p))
      )
    } else {
      setProviders((prev) => [...prev, provider])
    }
    setEditingProvider(null)
  }

  const handleRemoveProvider = (id: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== id))
    // Clean up test results
    setTestResults((prev) => {
      const newResults = { ...prev }
      delete newResults[id]
      return newResults
    })
  }

  const handleToggleProvider = (id: string, enabled: boolean) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    )
  }

  const handleTestConnection = async (id: string) => {
    setTestingId(id)
    // Clear previous result
    setTestResults((prev) => {
      const newResults = { ...prev }
      delete newResults[id]
      return newResults
    })

    // Simulate connection test - in real implementation, this would call IPC
    await new Promise((resolve) => setTimeout(resolve, 500))

    setTestResults((prev) => ({
      ...prev,
      [id]: { success: true },
    }))
    setTestingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Providers</h2>
        <button
          onClick={handleAddProvider}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Add Provider
        </button>
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onEdit={() => handleEditProvider(provider)}
            onTest={() => handleTestConnection(provider.id)}
            onRemove={() => handleRemoveProvider(provider.id)}
            onToggle={(enabled) => handleToggleProvider(provider.id, enabled)}
            testing={testingId === provider.id}
            testResult={testResults[provider.id]}
          />
        ))}
      </div>

      {/* Empty state */}
      {providers.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No providers configured. Add one to get started.
        </div>
      )}

      {/* Edit Modal/Form */}
      {editingProvider && (
        <ProviderForm
          provider={editingProvider}
          onSave={handleSaveProvider}
          onCancel={() => setEditingProvider(null)}
          isEditing={isEditing}
        />
      )}
    </div>
  )
}
