export const IPC_CHANNELS = {
  // Projects
  GET_PROJECTS: 'projects:get',
  ADD_PROJECT: 'projects:add',
  REMOVE_PROJECT: 'projects:remove',

  // Tasks
  CREATE_TASK: 'tasks:create',
  GET_TASKS: 'tasks:get',
  CANCEL_TASK: 'tasks:cancel',

  // Settings
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',

  // Providers
  TEST_PROVIDER: 'providers:test',
  GET_PROVIDERS: 'providers:get',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
