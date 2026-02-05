import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FileChange {
  path: string
  additions: number
  deletions: number
  diff?: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  thinkingTime?: number
  exploredFiles?: string[]
  editedFiles?: FileChange[]
}

export interface Conversation {
  id: string
  projectId: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  createConversation: (projectId: string, title?: string) => string
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: Message) => void
  updateFileChangeStatus: (conversationId: string, messageId: string, filePath: string, status: 'approved' | 'rejected') => void
  deleteConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,

      createConversation: (projectId, title) => {
        const id = crypto.randomUUID()
        const conversation: Conversation = {
          id,
          projectId,
          title: title || 'New conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }))
        return id
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  updatedAt: new Date(),
                  // Update title from first user message if it's still "New conversation"
                  title: conv.title === 'New conversation' && message.role === 'user'
                    ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                    : conv.title,
                }
              : conv
          ),
        }))
      },

      updateFileChangeStatus: (conversationId, messageId, filePath, status) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === messageId && msg.editedFiles
                      ? {
                          ...msg,
                          editedFiles: msg.editedFiles.map((file) =>
                            file.path === filePath ? { ...file, status } : file
                          ),
                        }
                      : msg
                  ),
                }
              : conv
          ),
        }))
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        }))
      },

      renameConversation: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title } : c
          ),
        }))
      },
    }),
    {
      name: 'forge-chat',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
)
