/**
 * Agent Module
 *
 * Exports the agent executor, types, and built-in tools for running AI agents.
 */

export { AgentExecutor } from './executor'
export type {
  AgentContext,
  AgentMessage,
  AgentTool,
  AgentResult,
  AgentEventType,
  AgentEvent,
  AgentStartedEventData,
  AgentMessageEventData,
  AgentToolUseEventData,
  AgentCompletedEventData,
  AgentErrorEventData,
} from './types'

// Export built-in tools and registry
export {
  builtInTools,
  registerBuiltInTools,
  // Individual tools
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  shellExecuteTool,
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
  searchFilesTool,
  searchCodeTool,
} from './tools'
