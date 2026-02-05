import { useSettingsStore } from '../stores/settingsStore'

export function StatusBar() {
  const { providers, selectedProviderId, setSelectedProvider } = useSettingsStore()
  const enabledProviders = providers.filter((p) => p.enabled)
  const selectedProvider = providers.find((p) => p.id === selectedProviderId)

  return (
    <footer
      data-testid="status-bar"
      className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400"
    >
      <span>Ready</span>
      <span className="mx-2">|</span>
      <div className="flex items-center gap-2">
        <span>Model:</span>
        {enabledProviders.length === 0 ? (
          <span className="text-yellow-500">No providers configured</span>
        ) : (
          <select
            value={selectedProviderId || ''}
            onChange={(e) => setSelectedProvider(e.target.value || null)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a model...</option>
            {enabledProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name} ({provider.type})
              </option>
            ))}
          </select>
        )}
      </div>
    </footer>
  )
}
