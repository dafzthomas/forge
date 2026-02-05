import { useSettingsStore } from '../stores/settingsStore'
import { PROVIDER_MODELS } from '../../shared/provider-types'

export function StatusBar() {
  const {
    providers,
    selectedProviderId,
    selectedModelId,
    setSelectedProvider,
    setSelectedModel,
  } = useSettingsStore()

  const enabledProviders = providers.filter((p) => p.enabled)
  const selectedProvider = providers.find((p) => p.id === selectedProviderId)
  const availableModels = selectedProvider ? PROVIDER_MODELS[selectedProvider.type] : []
  const selectedModel = availableModels.find((m) => m.id === selectedModelId)

  // For openai-compatible, check if there's a custom model in config
  const customModel = selectedProvider?.type === 'openai-compatible'
    ? (selectedProvider.config as { defaultModel?: string }).defaultModel
    : null

  return (
    <footer
      data-testid="status-bar"
      className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400 gap-4"
    >
      <span>Ready</span>
      <span>|</span>

      {/* Provider selector */}
      <div className="flex items-center gap-2">
        <span>Provider:</span>
        {enabledProviders.length === 0 ? (
          <span className="text-yellow-500">None configured</span>
        ) : (
          <select
            value={selectedProviderId || ''}
            onChange={(e) => setSelectedProvider(e.target.value || null)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select...</option>
            {enabledProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Model selector */}
      {selectedProvider && (
        <>
          <span>|</span>
          <div className="flex items-center gap-2">
            <span>Model:</span>
            {selectedProvider.type === 'openai-compatible' ? (
              <span className="text-gray-300">{customModel || 'Custom'}</span>
            ) : availableModels.length === 0 ? (
              <span className="text-yellow-500">No models</span>
            ) : (
              <select
                value={selectedModelId || ''}
                onChange={(e) => setSelectedModel(e.target.value || null)}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select...</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}
    </footer>
  )
}
