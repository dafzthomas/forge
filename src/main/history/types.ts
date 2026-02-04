/**
 * History Types
 *
 * Type definitions for conversation history, messages, and logs.
 */

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ConversationMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  toolName?: string    // If role is 'tool'
  toolInput?: string   // JSON string of tool input
  toolOutput?: string  // JSON string of tool output
  timestamp: Date
}

export interface Conversation {
  id: string
  taskId: string
  projectId: string
  title: string
  startedAt: Date
  endedAt?: Date
  messageCount: number
}

export interface TaskLog {
  id: string
  taskId: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

export interface HistorySearchQuery {
  projectId?: string
  taskId?: string
  query?: string       // Full-text search
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface HistorySearchResult {
  conversations: Conversation[]
  totalCount: number
}

// Database row types
export interface ConversationRow {
  id: string
  task_id: string
  project_id: string
  title: string | null
  started_at: string
  ended_at: string | null
  message_count: number
}

export interface ConversationMessageRow {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  tool_name: string | null
  tool_input: string | null
  tool_output: string | null
  timestamp: string
}

export interface TaskLogRow {
  id: string
  task_id: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  metadata: string | null
  timestamp: string
}
