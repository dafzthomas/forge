import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  defaultModel: string | null
  maxParallelAgents: number
  setTheme: (theme: Theme) => void
  setDefaultModel: (model: string | null) => void
  setMaxParallelAgents: (count: number) => void
  reset: () => void
}

const initialState = {
  theme: 'system' as Theme,
  defaultModel: null,
  maxParallelAgents: 2,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setTheme: (theme) => set({ theme }),
      setDefaultModel: (model) => set({ defaultModel: model }),
      setMaxParallelAgents: (count) => set({ maxParallelAgents: count }),
      reset: () => set(initialState),
    }),
    { name: 'forge-settings' }
  )
)
