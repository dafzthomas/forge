import { useState, KeyboardEvent } from 'react'
import { TaskList, TaskOutput } from './tasks'
import { useProjectStore } from '../stores/projectStore'
import { useSettingsStore } from '../stores/settingsStore'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import type { Task } from '@shared/task-types'

// Declare forge API on window
declare global {
  interface Window {
    forge: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export function MainPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>()
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedTask = tasks.find((t) => t.id === selectedTaskId)

  const { activeProjectId, projects } = useProjectStore()
  const { selectedProviderId, providers } = useSettingsStore()
  const activeProject = projects.find((p) => p.id === activeProjectId)
  const selectedProvider = providers.find((p) => p.id === selectedProviderId)

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  const handleCancelTask = async (taskId: string) => {
    try {
      await window.forge.invoke(IPC_CHANNELS.CANCEL_TASK, taskId)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'cancelled' as const } : t))
      )
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim() || !activeProjectId || !selectedProviderId || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await window.forge.invoke(IPC_CHANNELS.CREATE_TASK, {
        projectId: activeProjectId,
        prompt: prompt.trim(),
        providerId: selectedProviderId,
      }) as { success: boolean; data?: Task; error?: string }

      if (result.success && result.data) {
        setTasks((prev) => [...prev, result.data!])
        setSelectedTaskId(result.data.id)
        setPrompt('')
      } else {
        console.error('Failed to create task:', result.error)
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = prompt.trim() && activeProjectId && selectedProviderId && !isSubmitting

  return (
    <main className="flex-1 flex flex-col bg-gray-900">
      {/* Task input area with draggable header */}
      <div
        className="p-4 pt-8 border-b border-gray-700"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !activeProjectId
                ? 'Select a project first...'
                : !selectedProviderId
                ? 'Select a model first...'
                : 'Ask Forge... (Enter to send, Shift+Enter for new line)'
            }
            disabled={!activeProjectId || !selectedProviderId}
            aria-label="Enter a task for Forge"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
        {activeProject && selectedProvider && (
          <div className="mt-2 text-xs text-gray-500">
            Project: {activeProject.name} | Model: {selectedProvider.name}
          </div>
        )}
      </div>

      {/* Task list and output */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-gray-700 overflow-y-auto p-4">
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
            onCancelTask={handleCancelTask}
          />
        </div>
        <div className="flex-1 p-4">
          <TaskOutput
            taskId={selectedTaskId ?? ''}
            status={selectedTask?.status ?? 'queued'}
            output={selectedTask?.result ? [selectedTask.result] : undefined}
          />
        </div>
      </div>
    </main>
  )
}
