/**
 * HistoryPanel Component
 *
 * Displays conversation history with search, filtering, and export capabilities.
 */

import { useState, useEffect } from 'react'
import { IPC_CHANNELS } from '../../../shared/ipc-types'
import type {
  Conversation,
  ConversationMessage,
  HistorySearchQuery,
} from '../../../main/history/types'

declare global {
  interface Window {
    forge: {
      invoke: (channel: string, ...args: unknown[]) => Promise<{
        success: boolean
        data?: unknown
        error?: string
      }>
    }
  }
}

interface HistoryPanelProps {
  projectId: string
}

interface ConversationWithMessages {
  conversation: Conversation
  messages: ConversationMessage[]
}

/**
 * Badge for displaying message role
 */
function RoleBadge({ role }: { role: ConversationMessage['role'] }) {
  const colors: Record<ConversationMessage['role'], string> = {
    user: 'bg-blue-600 text-white',
    assistant: 'bg-purple-600 text-white',
    system: 'bg-gray-600 text-white',
    tool: 'bg-green-600 text-white',
  }

  const icons: Record<ConversationMessage['role'], string> = {
    user: '👤',
    assistant: '🤖',
    system: '⚙️',
    tool: '🔧',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[role]}`}
      role="img"
      aria-label={`Role: ${role}`}
    >
      {icons[role]} {role}
    </span>
  )
}

/**
 * Displays a single message
 */
function MessageItem({ message }: { message: ConversationMessage }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-3">
      <div className="flex items-center justify-between mb-2">
        <RoleBadge role={message.role} />
        <time className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleString()}
        </time>
      </div>

      {message.role === 'tool' && message.toolName && (
        <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          <strong>Tool:</strong> {message.toolName}
        </div>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>

      {message.toolInput && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400">
            Tool Input
          </summary>
          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
            {message.toolInput}
          </pre>
        </details>
      )}

      {message.toolOutput && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400">
            Tool Output
          </summary>
          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
            {message.toolOutput}
          </pre>
        </details>
      )}
    </div>
  )
}

/**
 * Displays a conversation item in the list
 */
function ConversationListItem({
  conversation,
  isExpanded,
  onToggle,
  onExport,
}: {
  conversation: Conversation
  isExpanded: boolean
  onToggle: () => void
  onExport: (format: 'json' | 'markdown') => void
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isExpanded && messages.length === 0) {
      setLoading(true)
      window.forge
        .invoke(IPC_CHANNELS.HISTORY_GET_CONVERSATION, conversation.id)
        .then((response) => {
          if (response.success && response.data) {
            const data = response.data as ConversationWithMessages
            setMessages(data.messages)
          }
        })
        .catch((error) => {
          console.error('Failed to load messages:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isExpanded, conversation.id, messages.length])

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">{conversation.title}</h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span>Task: {conversation.taskId.slice(0, 8)}</span>
              <span className="mx-2">•</span>
              <span>{conversation.messageCount} messages</span>
              <span className="mx-2">•</span>
              <time>{new Date(conversation.startedAt).toLocaleString()}</time>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExport('json')
              }}
              className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              title="Export as JSON"
            >
              JSON
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExport('markdown')
              }}
              className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
              title="Export as Markdown"
            >
              MD
            </button>
            <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {loading ? (
            <div className="text-center py-4 text-sm text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">No messages found</div>
          ) : (
            <div className="space-y-0">
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Main HistoryPanel component
 */
export function HistoryPanel({ projectId }: HistoryPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10

  // Load conversations
  const loadConversations = async (query?: Partial<HistorySearchQuery>) => {
    setLoading(true)
    try {
      const searchParams: HistorySearchQuery = {
        projectId,
        limit: pageSize,
        offset: currentPage * pageSize,
        ...query,
      }

      const response = await window.forge.invoke(
        IPC_CHANNELS.HISTORY_SEARCH,
        searchParams
      )

      if (response.success && response.data) {
        const data = response.data as { conversations: Conversation[]; totalCount: number }
        setConversations(data.conversations)
        setTotalCount(data.totalCount)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [projectId, currentPage])

  const handleSearch = () => {
    setCurrentPage(0)
    loadConversations({
      query: searchQuery.trim() || undefined,
    })
  }

  const handleExport = async (conversationId: string, format: 'json' | 'markdown') => {
    try {
      const response = await window.forge.invoke(
        IPC_CHANNELS.HISTORY_EXPORT,
        conversationId,
        format
      )

      if (response.success && response.data) {
        // Create a downloadable file
        const content = response.data as string
        const blob = new Blob([content], {
          type: format === 'json' ? 'application/json' : 'text/markdown',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `conversation-${conversationId.slice(0, 8)}.${format === 'json' ? 'json' : 'md'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export conversation:', error)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-3">Conversation History</h2>

        {/* Search bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search conversations..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations found. Start a task to create conversation history.
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isExpanded={expandedId === conversation.id}
                onToggle={() =>
                  setExpandedId(expandedId === conversation.id ? null : conversation.id)
                }
                onExport={(format) => handleExport(conversation.id, format)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            Page {currentPage + 1} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
