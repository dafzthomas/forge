export const IPC_CHANNELS = {
  // Projects
  GET_PROJECTS: 'projects:get',
  GET_PROJECT: 'projects:getOne',
  ADD_PROJECT: 'projects:add',
  REMOVE_PROJECT: 'projects:remove',
  UPDATE_PROJECT: 'projects:update',
  PROJECT_EXISTS_AT_PATH: 'projects:existsAtPath',

  // Tasks
  CREATE_TASK: 'tasks:create',
  GET_TASKS: 'tasks:get',
  GET_TASK: 'tasks:getOne',
  CANCEL_TASK: 'tasks:cancel',

  // Settings
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',

  // Providers
  TEST_PROVIDER: 'providers:test',
  GET_PROVIDERS: 'providers:get',

  // Reviews
  REQUEST_REVIEW: 'review:request',
  GET_REVIEW: 'review:get',
  LIST_REVIEWS: 'review:list',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
