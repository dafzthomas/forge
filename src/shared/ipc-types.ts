export const IPC_CHANNELS = {
  // App
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_NAME: 'app:getName',

  // Dialog
  DIALOG_OPEN_FOLDER: 'dialog:openFolder',

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

  // Pull Requests
  PR_CREATE: 'pr:create',
  PR_GET: 'pr:get',
  PR_LIST: 'pr:list',
  PR_SYNC: 'pr:sync',

  // Errors
  ERROR_REPORT: 'error:report',
  ERROR_SUBSCRIBE: 'error:subscribe',
  ERROR_UNSUBSCRIBE: 'error:unsubscribe',

  // File Watcher
  WATCHER_START: 'watcher:start',
  WATCHER_STOP: 'watcher:stop',
  WATCHER_ADD_RULE: 'watcher:addRule',
  WATCHER_UPDATE_RULE: 'watcher:updateRule',
  WATCHER_REMOVE_RULE: 'watcher:removeRule',
  WATCHER_LIST_RULES: 'watcher:listRules',
  WATCHER_SUBSCRIBE_EVENTS: 'watcher:subscribeEvents',
  WATCHER_UNSUBSCRIBE_EVENTS: 'watcher:unsubscribeEvents',
  WATCHER_GET_ACTIVE: 'watcher:getActive',

  // Skills
  SKILLS_IMPORT: 'skills:import',
  SKILLS_IMPORT_DIRECTORY: 'skills:importDirectory',
  SKILLS_IMPORT_FROM_CLAUDE_CODE: 'skills:importFromClaudeCode',
  SKILLS_LIST: 'skills:list',
  SKILLS_GET: 'skills:get',

  // History
  HISTORY_CREATE_CONVERSATION: 'history:createConversation',
  HISTORY_ADD_MESSAGE: 'history:addMessage',
  HISTORY_END_CONVERSATION: 'history:endConversation',
  HISTORY_GET_CONVERSATION: 'history:getConversation',
  HISTORY_SEARCH: 'history:search',
  HISTORY_GET_RECENT: 'history:getRecent',
  HISTORY_EXPORT: 'history:export',
  HISTORY_LOG: 'history:log',
  HISTORY_GET_LOGS: 'history:getLogs',

  // Chat / AI
  CHAT_SEND_MESSAGE: 'chat:sendMessage',
  CHAT_STREAM_CHUNK: 'chat:streamChunk',
  CHAT_STREAM_END: 'chat:streamEnd',
  CHAT_STREAM_ERROR: 'chat:streamError',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
