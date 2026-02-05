import { useState } from 'react'
import { TaskList, TaskOutput } from './tasks'
import type { Task } from '@shared/task-types'

export function MainPanel() {
  // TODO: These will be replaced with actual state management/IPC
  const [tasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>()
  const selectedTask = tasks.find((t) => t.id === selectedTaskId)

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  const handleCancelTask = (taskId: string) => {
    // TODO: Wire up to IPC to cancel task
    console.log('Cancel task:', taskId)
  }

  return (
    <main className="flex-1 flex flex-col bg-gray-900">
      {/* Task input area with draggable header */}
      <div
        className="p-4 pt-8 border-b border-gray-700"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <input
          type="text"
          placeholder="Ask Forge..."
          aria-label="Enter a task for Forge"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        />
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
