/**
 * Agent Executor
 *
 * The agent executor is responsible for running AI agents that can use tools
 * to accomplish tasks. It manages the execution loop, tool calls, cancellation,
 * and event emission.
 */

import { EventEmitter } from 'events'
import type {
  AgentContext,
  AgentResult,
  AgentEvent,
  AgentTool,
  AgentEventType,
  AgentStartedEventData,
  AgentCompletedEventData,
  AgentErrorEventData,
  AgentMessageEventData,
  AgentToolUseEventData,
} from './types'
import type { ModelProvider, ChatMessage, ChatOptions, ChatResponse } from '../providers/types'

/**
 * Maximum number of iterations before forcing completion
 * This prevents infinite loops when the AI keeps requesting tools
 */
const MAX_ITERATIONS = 10

/**
 * Pattern to match tool calls in assistant responses
 * Format: <tool>tool_name</tool><params>{"key": "value"}</params>
 */
const TOOL_CALL_PATTERN = /<tool>([^<]+)<\/tool><params>([^<]*)<\/params>/

/**
 * Agent executor that manages AI agent execution with tool support
 *
 * Emits events:
 * - 'started': When execution begins
 * - 'message': When assistant sends a message
 * - 'tool_use': When a tool is executed
 * - 'completed': When execution finishes successfully
 * - 'error': When an error occurs
 */
export class AgentExecutor extends EventEmitter {
  /** Registered tools available to agents */
  private tools: Map<string, AgentTool> = new Map()

  /** Running agents with their abort controllers */
  private runningAgents: Map<string, AbortController> = new Map()

  /**
   * Register a tool that agents can use
   *
   * @param tool - The tool to register
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Execute an agent task
   *
   * @param context - The context for the task
   * @param provider - The model provider to use
   * @param systemPrompt - The system prompt for the agent
   * @returns The result of the execution
   */
  async execute(
    context: AgentContext,
    provider: ModelProvider,
    systemPrompt: string
  ): Promise<AgentResult> {
    const { taskId } = context

    // Set up abort controller for cancellation
    const abortController = new AbortController()
    this.runningAgents.set(taskId, abortController)

    // Emit started event
    this.emitEvent({
      type: 'started',
      taskId,
      timestamp: new Date(),
      data: { context } as AgentStartedEventData,
    })

    // Track token usage
    let totalInputTokens = 0
    let totalOutputTokens = 0

    // Build initial messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Execute the task for project at: ${context.projectPath}` },
    ]

    try {
      // Execution loop
      let iterations = 0
      let lastContent = ''

      while (iterations < MAX_ITERATIONS) {
        // Check for cancellation
        if (abortController.signal.aborted) {
          throw new Error('Agent execution cancelled')
        }

        iterations++

        // Call the provider with cancellation support
        const chatOptions: ChatOptions = {
          model: context.model,
          maxTokens: context.maxTokens,
        }

        // Race between provider call and abort signal
        const response = await this.withAbortSignal(
          provider.chat(messages, chatOptions),
          abortController.signal
        )

        // Accumulate token usage
        if (response.usage) {
          totalInputTokens += response.usage.inputTokens
          totalOutputTokens += response.usage.outputTokens
        }

        lastContent = response.content

        // Emit message event
        this.emitEvent({
          type: 'message',
          taskId,
          timestamp: new Date(),
          data: { role: 'assistant', content: response.content } as AgentMessageEventData,
        })

        // Check for tool calls
        const toolMatch = response.content.match(TOOL_CALL_PATTERN)

        if (toolMatch) {
          const toolName = toolMatch[1]
          const paramsJson = toolMatch[2]

          let params: Record<string, unknown> = {}
          try {
            params = JSON.parse(paramsJson || '{}')
          } catch {
            // Invalid JSON, use empty params
          }

          // Get the tool
          const tool = this.tools.get(toolName)

          if (tool) {
            let toolResult: string

            try {
              // Execute the tool
              toolResult = await tool.execute(params, context)
            } catch (error) {
              toolResult = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }

            // Emit tool_use event
            this.emitEvent({
              type: 'tool_use',
              taskId,
              timestamp: new Date(),
              data: { tool: toolName, params, result: toolResult } as AgentToolUseEventData,
            })

            // Add assistant message and tool result to conversation
            messages.push({ role: 'assistant', content: response.content })
            messages.push({ role: 'user', content: `Tool result: ${toolResult}` })

            // Continue loop to get next response
            continue
          }
        }

        // No tool call or tool not found - execution complete
        break
      }

      // Success
      const result: AgentResult = {
        success: true,
        output: lastContent,
        tokensUsed: {
          input: totalInputTokens,
          output: totalOutputTokens,
        },
      }

      this.emitEvent({
        type: 'completed',
        taskId,
        timestamp: new Date(),
        data: { result } as AgentCompletedEventData,
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      this.emitEvent({
        type: 'error',
        taskId,
        timestamp: new Date(),
        data: { error: errorMessage } as AgentErrorEventData,
      })

      return {
        success: false,
        error: errorMessage,
        tokensUsed: {
          input: totalInputTokens,
          output: totalOutputTokens,
        },
      }
    } finally {
      // Clean up
      this.runningAgents.delete(taskId)
    }
  }

  /**
   * Cancel a running agent
   *
   * @param taskId - The ID of the task to cancel
   * @returns true if the task was cancelled, false if not found
   */
  cancel(taskId: string): boolean {
    const controller = this.runningAgents.get(taskId)

    if (controller) {
      controller.abort()
      return true
    }

    return false
  }

  /**
   * Check if an agent is currently running
   *
   * @param taskId - The ID of the task to check
   * @returns true if the task is running
   */
  isRunning(taskId: string): boolean {
    return this.runningAgents.has(taskId)
  }

  /**
   * Get all currently running task IDs
   *
   * @returns Array of running task IDs
   */
  getRunningTaskIds(): string[] {
    return Array.from(this.runningAgents.keys())
  }

  /**
   * Emit a typed agent event
   *
   * @param event - The event to emit
   */
  private emitEvent(event: AgentEvent): void {
    this.emit(event.type, event)
  }

  /**
   * Race a promise against an abort signal
   * If the signal is aborted, the promise is rejected with a cancellation error
   *
   * @param promise - The promise to race
   * @param signal - The abort signal
   * @returns The result of the promise or throws if aborted
   */
  private withAbortSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check if already aborted
      if (signal.aborted) {
        reject(new Error('Agent execution cancelled'))
        return
      }

      // Listen for abort
      const abortHandler = () => {
        reject(new Error('Agent execution cancelled'))
      }
      signal.addEventListener('abort', abortHandler, { once: true })

      // Race the promise
      promise
        .then((result) => {
          signal.removeEventListener('abort', abortHandler)
          resolve(result)
        })
        .catch((error) => {
          signal.removeEventListener('abort', abortHandler)
          reject(error)
        })
    })
  }
}
