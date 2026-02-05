import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderConfig } from '../../shared/provider-types'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  defaultModel: string | null
  maxParallelAgents: number
  providers: ProviderConfig[]
  selectedProviderId: string | null
  selectedModelId: string | null
  setTheme: (theme: Theme) => void
  setDefaultModel: (model: string | null) => void
  setMaxParallelAgents: (count: number) => void
  addProvider: (provider: ProviderConfig) => void
  updateProvider: (id: string, provider: ProviderConfig) => void
  removeProvider: (id: string) => void
  toggleProvider: (id: string, enabled: boolean) => void
  setSelectedProvider: (id: string | null) => void
  setSelectedModel: (modelId: string | null) => void
  reset: () => void
}

const initialState = {
  theme: 'system' as Theme,
  defaultModel: null,
  maxParallelAgents: 2,
  providers: [] as ProviderConfig[],
  selectedProviderId: null as string | null,
  selectedModelId: null as string | null,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setTheme: (theme) => set({ theme }),
      setDefaultModel: (model) => set({ defaultModel: model }),
      setMaxParallelAgents: (count) => set({ maxParallelAgents: count }),
      addProvider: (provider) =>
        set((state) => ({ providers: [...state.providers, provider] })),
      updateProvider: (id, provider) =>
        set((state) => ({
          providers: state.providers.map((p) => (p.id === id ? provider : p)),
        })),
      removeProvider: (id) =>
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
        })),
      toggleProvider: (id, enabled) =>
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, enabled } : p
          ),
        })),
      setSelectedProvider: (id) => set({ selectedProviderId: id, selectedModelId: null }),
      setSelectedModel: (modelId) => set({ selectedModelId: modelId }),
      reset: () => set(initialState),
    }),
    { name: 'forge-settings' }
  )
)
