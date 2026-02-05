import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { ChatMessage } from './ChatMessage'
import { useProjectStore } from '../../stores/projectStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useChatStore, type Message } from '../../stores/chatStore'
import { PROVIDER_MODELS } from '../../../shared/provider-types'

export function ChatView() {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { activeProjectId, projects } = useProjectStore()
  const { selectedProviderId, selectedModelId, providers } = useSettingsStore()
  const { activeConversationId, conversations, addMessage } = useChatStore()

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const selectedProvider = providers.find((p) => p.id === selectedProviderId)
  const availableModels = selectedProvider ? PROVIDER_MODELS[selectedProvider.type] : []
  const selectedModel = availableModels.find((m) => m.id === selectedModelId)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const messages = activeConversation?.messages || []

  // For openai-compatible, use custom model from config
  const effectiveModelId = selectedProvider?.type === 'openai-compatible'
    ? (selectedProvider.config as { defaultModel?: string }).defaultModel || 'custom'
    : selectedModelId

  const modelDisplayName = selectedModel?.name ||
    (selectedProvider?.type === 'openai-compatible' ? effectiveModelId : null)

  const canSubmit = input.trim() && activeProjectId && selectedProviderId && effectiveModelId && activeConversationId && !isSubmitting

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async () => {
    if (!canSubmit || !activeConversationId) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    addMessage(activeConversationId, userMessage)
    setInput('')
    setIsSubmitting(true)

    // TODO: Call AI API and get response
    // For now, simulate a response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I\'ll help you with that. Let me analyze the codebase and make the necessary changes.',
        timestamp: new Date(),
        thinkingTime: 3,
        exploredFiles: ['src/index.ts', 'package.json'],
      }
      addMessage(activeConversationId, assistantMessage)
      setIsSubmitting(false)
    }, 1500)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const getPlaceholder = () => {
    if (!activeProjectId) return 'Select a project first...'
    if (!activeConversationId) return 'Start a new conversation...'
    if (!selectedProviderId) return 'Select a provider first...'
    if (!effectiveModelId) return 'Select a model first...'
    return 'Ask Forge anything...'
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 min-w-0">
      {/* Header */}
      <div
        className="h-12 border-b border-gray-700 flex items-center px-4 gap-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 text-sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {activeConversation ? (
            <>
              <span className="font-medium text-white">{activeConversation.title}</span>
              {activeProject && (
                <>
                  <span className="text-gray-500">in</span>
                  <span className="text-gray-400">{activeProject.name}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-gray-400">No conversation selected</span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {activeConversationId ? 'Start a conversation...' : 'Select or create a conversation'}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                thinkingTime={message.thinkingTime}
                exploredFiles={message.exploredFiles}
                editedFiles={message.editedFiles}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-700 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={!canSubmit && !input}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none"
              rows={1}
            />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="p-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          {selectedProvider && modelDisplayName && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
              <span>{modelDisplayName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
