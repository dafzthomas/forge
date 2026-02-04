/**
 * Agent Type Definitions
 *
 * This module defines the core types for the agent executor system.
 * Agents are AI-powered task executors that can use tools to accomplish tasks.
 */

/**
 * Context provided to an agent for task execution
 */
export interface AgentContext {
  /** Unique identifier for the task being executed */
  taskId: string
  /** Project ID this task belongs to */
  projectId: string
  /** Root path of the project */
  projectPath: string
  /** Working directory for the agent (could be worktree or project path) */
  workingDir: string
  /** Model to use for the agent */
  model: string
  /** Maximum tokens for responses */
  maxTokens?: number
}

/**
 * Message format for agent conversations
 */
export interface AgentMessage {
  /** Role of the message sender */
  role: 'system' | 'user' | 'assistant'
  /** Message content */
  content: string
}

/**
 * Tool that an agent can use to perform actions
 */
export interface AgentTool {
  /** Unique name of the tool */
  name: string
  /** Human-readable description of what the tool does */
  description: string
  /** JSON Schema for the tool's parameters */
  parameters: Record<string, unknown>
  /** Execute the tool with given parameters */
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<string>
}

/**
 * Result from an agent execution
 */
export interface AgentResult {
  /** Whether the execution completed successfully */
  success: boolean
  /** Output from the agent (if successful) */
  output?: string
  /** Error message (if failed) */
  error?: string
  /** Token usage statistics */
  tokensUsed?: {
    input: number
    output: number
  }
}

/**
 * Types of events emitted by the agent executor
 */
export type AgentEventType = 'started' | 'message' | 'tool_use' | 'completed' | 'error'

/**
 * Event emitted by the agent executor during execution
 */
export interface AgentEvent {
  /** Type of event */
  type: AgentEventType
  /** Task ID this event relates to */
  taskId: string
  /** When the event occurred */
  timestamp: Date
  /** Additional event data */
  data?: unknown
}

/**
 * Data for 'started' event
 */
export interface AgentStartedEventData {
  context: AgentContext
}

/**
 * Data for 'message' event
 */
export interface AgentMessageEventData {
  role: 'assistant' | 'user'
  content: string
}

/**
 * Data for 'tool_use' event
 */
export interface AgentToolUseEventData {
  tool: string
  params: Record<string, unknown>
  result?: string
  error?: string
}

/**
 * Data for 'completed' event
 */
export interface AgentCompletedEventData {
  result: AgentResult
}

/**
 * Data for 'error' event
 */
export interface AgentErrorEventData {
  error: string
}
