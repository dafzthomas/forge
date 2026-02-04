import { useSettingsStore } from '../../stores/settingsStore'

export function AppearanceSettings() {
  const { theme, setTheme } = useSettingsStore()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Appearance</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Theme
          </label>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded capitalize ${
                  theme === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
