/**
 * History Service
 *
 * Manages conversation history, messages, and task logs.
 */

import { randomUUID } from 'crypto'
import { getDatabase } from '../database'
import type {
  Conversation,
  ConversationMessage,
  TaskLog,
  HistorySearchQuery,
  HistorySearchResult,
  ConversationRow,
  ConversationMessageRow,
  TaskLogRow,
} from './types'

export class HistoryService {
  /**
   * Create a new conversation for a task.
   * @param taskId - The task ID
   * @param projectId - The project ID
   * @param title - Optional conversation title
   * @returns The created conversation
   */
  createConversation(
    taskId: string,
    projectId: string,
    title?: string
  ): Conversation {
    const db = getDatabase()
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO conversations (id, task_id, project_id, title, started_at, message_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `)

    stmt.run(id, taskId, projectId, title ?? null, now)

    // Update FTS index if title provided
    if (title) {
      const ftsStmt = db.prepare(`
        INSERT INTO conversations_fts(rowid, title)
        SELECT rowid, title FROM conversations WHERE id = ?
      `)
      ftsStmt.run(id)
    }

    return {
      id,
      taskId,
      projectId,
      title: title ?? `Conversation ${id.slice(0, 8)}`,
      startedAt: new Date(now),
      messageCount: 0,
    }
  }

  /**
   * Add a message to a conversation.
   * @param conversationId - The conversation ID
   * @param message - Message data (without id, conversationId, timestamp)
   * @returns The created message
   */
  addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'id' | 'conversationId' | 'timestamp'>
  ): ConversationMessage {
    const db = getDatabase()

    // Verify conversation exists
    const conversation = this.getConversation(conversationId)
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    // Insert message
    const messageStmt = db.prepare(`
      INSERT INTO conversation_messages
        (id, conversation_id, role, content, tool_name, tool_input, tool_output, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    messageStmt.run(
      id,
      conversationId,
      message.role,
      message.content,
      message.toolName ?? null,
      message.toolInput ?? null,
      message.toolOutput ?? null,
      now
    )

    // Update message count
    const countStmt = db.prepare(`
      UPDATE conversations
      SET message_count = message_count + 1
      WHERE id = ?
    `)
    countStmt.run(conversationId)

    // Update FTS index
    const ftsStmt = db.prepare(`
      INSERT INTO messages_fts(rowid, content)
      SELECT rowid, content FROM conversation_messages WHERE id = ?
    `)
    ftsStmt.run(id)

    return {
      id,
      conversationId,
      role: message.role,
      content: message.content,
      toolName: message.toolName,
      toolInput: message.toolInput,
      toolOutput: message.toolOutput,
      timestamp: new Date(now),
    }
  }

  /**
   * End a conversation by setting its end timestamp.
   * @param conversationId - The conversation ID
   */
  endConversation(conversationId: string): void {
    const db = getDatabase()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      UPDATE conversations
      SET ended_at = ?
      WHERE id = ?
    `)

    const result = stmt.run(now, conversationId)
    if (result.changes === 0) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }
  }

  /**
   * Get a conversation by ID.
   * @param id - The conversation ID
   * @returns The conversation or null if not found
   */
  getConversation(id: string): Conversation | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?')
    const row = stmt.get(id) as ConversationRow | undefined

    return row ? this.rowToConversation(row) : null
  }

  /**
   * Get all messages in a conversation.
   * @param conversationId - The conversation ID
   * @returns Array of messages, ordered by timestamp
   */
  getMessages(conversationId: string): ConversationMessage[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM conversation_messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `)

    const rows = stmt.all(conversationId) as ConversationMessageRow[]
    return rows.map(this.rowToMessage)
  }

  /**
   * Log a message for a task.
   * @param taskId - The task ID
   * @param level - Log level
   * @param message - Log message
   * @param metadata - Optional metadata
   * @returns The created log entry
   */
  log(
    taskId: string,
    level: TaskLog['level'],
    message: string,
    metadata?: Record<string, unknown>
  ): TaskLog {
    const db = getDatabase()
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO task_logs (id, task_id, level, message, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      taskId,
      level,
      message,
      metadata ? JSON.stringify(metadata) : null,
      now
    )

    return {
      id,
      taskId,
      level,
      message,
      metadata,
      timestamp: new Date(now),
    }
  }

  /**
   * Get all logs for a task.
   * @param taskId - The task ID
   * @returns Array of log entries, ordered by timestamp
   */
  getTaskLogs(taskId: string): TaskLog[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM task_logs
      WHERE task_id = ?
      ORDER BY timestamp ASC
    `)

    const rows = stmt.all(taskId) as TaskLogRow[]
    return rows.map(this.rowToLog)
  }

  /**
   * Search conversation history.
   * @param query - Search query parameters
   * @returns Search results with conversations and total count
   */
  search(query: HistorySearchQuery): HistorySearchResult {
    const db = getDatabase()
    const params: unknown[] = []
    let whereClause = 'WHERE 1=1'

    // Filter by project
    if (query.projectId) {
      whereClause += ' AND c.project_id = ?'
      params.push(query.projectId)
    }

    // Filter by task
    if (query.taskId) {
      whereClause += ' AND c.task_id = ?'
      params.push(query.taskId)
    }

    // Filter by date range
    if (query.startDate) {
      whereClause += ' AND c.started_at >= ?'
      params.push(query.startDate.toISOString())
    }
    if (query.endDate) {
      whereClause += ' AND c.started_at <= ?'
      params.push(query.endDate.toISOString())
    }

    // Full-text search
    if (query.query && query.query.trim()) {
      // Search in conversation titles and message content
      whereClause += ` AND c.id IN (
        SELECT id FROM conversations WHERE rowid IN (
          SELECT rowid FROM conversations_fts WHERE title MATCH ?
        )
        UNION
        SELECT conversation_id FROM conversation_messages WHERE rowid IN (
          SELECT rowid FROM messages_fts WHERE content MATCH ?
        )
      )`
      const searchTerm = query.query.trim()
      params.push(searchTerm, searchTerm)
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM conversations c ${whereClause}`
    const countStmt = db.prepare(countQuery)
    const countResult = countStmt.get(...params) as { count: number }
    const totalCount = countResult.count

    // Get conversations
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0

    const selectQuery = `
      SELECT c.* FROM conversations c
      ${whereClause}
      ORDER BY c.started_at DESC
      LIMIT ? OFFSET ?
    `

    const stmt = db.prepare(selectQuery)
    const rows = stmt.all(...params, limit, offset) as ConversationRow[]
    const conversations = rows.map(this.rowToConversation)

    return {
      conversations,
      totalCount,
    }
  }

  /**
   * Get recent conversations for a project.
   * @param projectId - The project ID
   * @param limit - Maximum number of conversations to return
   * @returns Array of conversations, ordered by start time (most recent first)
   */
  getRecentConversations(projectId: string, limit: number = 20): Conversation[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE project_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `)

    const rows = stmt.all(projectId, limit) as ConversationRow[]
    return rows.map(this.rowToConversation)
  }

  /**
   * Export a conversation to JSON or Markdown.
   * @param conversationId - The conversation ID
   * @param format - Export format ('json' or 'markdown')
   * @returns Formatted export string
   */
  exportConversation(
    conversationId: string,
    format: 'json' | 'markdown'
  ): string {
    const conversation = this.getConversation(conversationId)
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    const messages = this.getMessages(conversationId)

    if (format === 'json') {
      return JSON.stringify(
        {
          conversation,
          messages,
        },
        null,
        2
      )
    }

    // Markdown format
    let md = `# ${conversation.title}\n\n`
    md += `**Task ID:** ${conversation.taskId}\n`
    md += `**Project ID:** ${conversation.projectId}\n`
    md += `**Started:** ${conversation.startedAt.toISOString()}\n`
    if (conversation.endedAt) {
      md += `**Ended:** ${conversation.endedAt.toISOString()}\n`
    }
    md += `\n---\n\n`

    for (const message of messages) {
      const roleLabel = message.role.charAt(0).toUpperCase() + message.role.slice(1)
      md += `## ${roleLabel}\n`
      md += `*${message.timestamp.toISOString()}*\n\n`

      if (message.role === 'tool' && message.toolName) {
        md += `**Tool:** ${message.toolName}\n\n`
        if (message.toolInput) {
          md += `**Input:**\n\`\`\`json\n${message.toolInput}\n\`\`\`\n\n`
        }
        if (message.toolOutput) {
          md += `**Output:**\n\`\`\`json\n${message.toolOutput}\n\`\`\`\n\n`
        }
      }

      md += `${message.content}\n\n`
      md += `---\n\n`
    }

    return md
  }

  /**
   * Clean up old history based on retention policy.
   * @param retentionDays - Number of days to retain history
   * @returns Number of conversations deleted
   */
  cleanupOldHistory(retentionDays: number): number {
    const db = getDatabase()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const stmt = db.prepare(`
      DELETE FROM conversations
      WHERE started_at < ?
    `)

    const result = stmt.run(cutoffDate.toISOString())
    return result.changes
  }

  /**
   * Convert a database row to a Conversation object.
   */
  private rowToConversation(row: ConversationRow): Conversation {
    return {
      id: row.id,
      taskId: row.task_id,
      projectId: row.project_id,
      title: row.title ?? `Conversation ${row.id.slice(0, 8)}`,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      messageCount: row.message_count,
    }
  }

  /**
   * Convert a database row to a ConversationMessage object.
   */
  private rowToMessage(row: ConversationMessageRow): ConversationMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      toolName: row.tool_name ?? undefined,
      toolInput: row.tool_input ?? undefined,
      toolOutput: row.tool_output ?? undefined,
      timestamp: new Date(row.timestamp),
    }
  }

  /**
   * Convert a database row to a TaskLog object.
   */
  private rowToLog(row: TaskLogRow): TaskLog {
    return {
      id: row.id,
      taskId: row.task_id,
      level: row.level,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: new Date(row.timestamp),
    }
  }
}

// Export singleton instance
let historyServiceInstance: HistoryService | null = null

export function getHistoryService(): HistoryService {
  if (!historyServiceInstance) {
    historyServiceInstance = new HistoryService()
  }
  return historyServiceInstance
}

// Reset singleton (for testing)
export function resetHistoryService(): void {
  historyServiceInstance = null
}
