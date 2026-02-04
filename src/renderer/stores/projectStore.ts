import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  name: string
  path: string
  defaultModel?: string
}

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  setActiveProject: (id: string | null) => void
  reset: () => void
}

const initialState = {
  projects: [],
  activeProjectId: null,
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initialState,
      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),
      setActiveProject: (id) => set({ activeProjectId: id }),
      reset: () => set(initialState),
    }),
    { name: 'forge-projects' }
  )
)
