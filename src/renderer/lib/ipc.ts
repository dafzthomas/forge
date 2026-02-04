import { IPC_CHANNELS } from '../../shared/ipc-types'

declare global {
  interface Window {
    forge: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export const ipc = {
  projects: {
    getAll: () => window.forge.invoke(IPC_CHANNELS.GET_PROJECTS),
    add: (project: unknown) => window.forge.invoke(IPC_CHANNELS.ADD_PROJECT, project),
    remove: (id: string) => window.forge.invoke(IPC_CHANNELS.REMOVE_PROJECT, id),
  },
  tasks: {
    create: (task: unknown) => window.forge.invoke(IPC_CHANNELS.CREATE_TASK, task),
    getAll: (projectId: string) => window.forge.invoke(IPC_CHANNELS.GET_TASKS, projectId),
    cancel: (id: string) => window.forge.invoke(IPC_CHANNELS.CANCEL_TASK, id),
  },
  settings: {
    get: () => window.forge.invoke(IPC_CHANNELS.GET_SETTINGS),
    update: (settings: unknown) => window.forge.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings),
  },
  providers: {
    test: (config: unknown) => window.forge.invoke(IPC_CHANNELS.TEST_PROVIDER, config),
    getAll: () => window.forge.invoke(IPC_CHANNELS.GET_PROVIDERS),
  },
  review: {
    request: (request: unknown) => window.forge.invoke(IPC_CHANNELS.REQUEST_REVIEW, request),
    get: (id: string) => window.forge.invoke(IPC_CHANNELS.GET_REVIEW, id),
    list: (projectId: string) => window.forge.invoke(IPC_CHANNELS.LIST_REVIEWS, projectId),
  },
}
