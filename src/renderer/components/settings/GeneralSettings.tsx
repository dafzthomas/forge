import { useSettingsStore } from '../../stores/settingsStore'

export function GeneralSettings() {
  const { maxParallelAgents, setMaxParallelAgents } = useSettingsStore()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">General</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Max Parallel Agents
          </label>
          <select
            value={maxParallelAgents}
            onChange={(e) => setMaxParallelAgents(Number(e.target.value))}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
