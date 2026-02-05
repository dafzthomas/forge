/**
 * Chat IPC Handlers
 */

import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { sendMessage, type SendMessageOptions } from './service'
import type { ProviderConfig } from '../../shared/provider-types'
import type { ChatMessage } from '../providers'

interface ChatSendMessageInput {
  providerId: string
  providerConfig: ProviderConfig
  modelId: string
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  conversationId: string
  projectPath?: string
}

export function registerChatIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.CHAT_SEND_MESSAGE,
    async (event, input: ChatSendMessageInput) => {
      const mainWindow = BrowserWindow.fromWebContents(event.sender)
      if (!mainWindow) {
        return { success: false, error: 'No window found' }
      }

      try {
        // Build messages array with system prompt
        const messages: ChatMessage[] = []

        // Add system prompt for coding assistant
        const systemPrompt = buildSystemPrompt(input.projectPath)
        messages.push({ role: 'system', content: systemPrompt })

        // Add conversation messages
        for (const msg of input.messages) {
          messages.push({
            role: msg.role,
            content: msg.content,
          })
        }

        // Start streaming (async, doesn't block)
        sendMessage(mainWindow, {
          providerId: input.providerId,
          providerConfig: input.providerConfig,
          modelId: input.modelId,
          messages,
          conversationId: input.conversationId,
        })

        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )
}

function buildSystemPrompt(projectPath?: string): string {
  let prompt = `You are Forge, an AI coding assistant. You help developers understand and modify their code.

Your capabilities:
- Analyze and explain code
- Suggest improvements and fixes
- Help with debugging
- Write new code based on requirements

Guidelines:
- Be concise and direct
- Show code examples when helpful
- Explain your reasoning
- Ask clarifying questions when needed`

  if (projectPath) {
    prompt += `\n\nYou are working on a project located at: ${projectPath}`
  }

  return prompt
}
