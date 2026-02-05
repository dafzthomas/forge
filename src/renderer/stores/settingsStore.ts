import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderConfig } from '../../shared/provider-types'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  defaultModel: string | null
  maxParallelAgents: number
  providers: ProviderConfig[]
  setTheme: (theme: Theme) => void
  setDefaultModel: (model: string | null) => void
  setMaxParallelAgents: (count: number) => void
  addProvider: (provider: ProviderConfig) => void
  updateProvider: (id: string, provider: ProviderConfig) => void
  removeProvider: (id: string) => void
  toggleProvider: (id: string, enabled: boolean) => void
  reset: () => void
}

const initialState = {
  theme: 'system' as Theme,
  defaultModel: null,
  maxParallelAgents: 2,
  providers: [] as ProviderConfig[],
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
      reset: () => set(initialState),
    }),
    { name: 'forge-settings' }
  )
)
