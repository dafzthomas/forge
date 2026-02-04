import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard, StatusIcon, PriorityBadge } from '../components/tasks/TaskCard'
import { TaskList } from '../components/tasks/TaskList'
import { TaskOutput } from '../components/tasks/TaskOutput'
import type { Task, TaskStatus, TaskPriority } from '@shared/task-types'

// Helper to create a mock task
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    description: 'Test task description',
    status: 'queued',
    priority: 'normal',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  }
}

describe('StatusIcon', () => {
  it.each<[TaskStatus, string, string]>([
    ['queued', '○', 'text-gray-400'],
    ['running', '●', 'text-blue-400'],
    ['completed', '✓', 'text-green-400'],
    ['failed', '✗', 'text-red-400'],
    ['paused', '⏸', 'text-yellow-400'],
    ['cancelled', '⊘', 'text-gray-500'],
  ])('renders correct icon and color for %s status', (status, expectedIcon, expectedColor) => {
    render(<StatusIcon status={status} />)
    const icon = screen.getByText(expectedIcon)
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass(expectedColor)
  })

  it('applies animate-pulse class for running status', () => {
    render(<StatusIcon status="running" />)
    const icon = screen.getByText('●')
    expect(icon).toHaveClass('animate-pulse')
  })

  it('has role="img" for accessibility', () => {
    render(<StatusIcon status="completed" />)
    const icon = screen.getByRole('img')
    expect(icon).toBeInTheDocument()
  })

  it.each<[TaskStatus]>([
    ['queued'],
    ['running'],
    ['completed'],
    ['failed'],
    ['paused'],
    ['cancelled'],
  ])('has aria-label for %s status', (status) => {
    render(<StatusIcon status={status} />)
    const icon = screen.getByRole('img')
    expect(icon).toHaveAttribute('aria-label', `Status: ${status}`)
  })
})

describe('PriorityBadge', () => {
  it.each<[TaskPriority, string]>([
    ['high', 'bg-red-600'],
    ['normal', 'bg-gray-600'],
    ['low', 'bg-gray-700'],
  ])('renders correct color for %s priority', (priority, expectedColor) => {
    render(<PriorityBadge priority={priority} />)
    const badge = screen.getByText(priority)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass(expectedColor)
  })
})

describe('TaskCard', () => {
  it('renders task description', () => {
    const task = createMockTask({ description: 'Build the widget' })
    render(<TaskCard task={task} />)
    expect(screen.getByText('Build the widget')).toBeInTheDocument()
  })

  it('renders status icon', () => {
    const task = createMockTask({ status: 'completed' })
    render(<TaskCard task={task} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('renders priority badge', () => {
    const task = createMockTask({ priority: 'high' })
    render(<TaskCard task={task} />)
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('renders model when specified', () => {
    const task = createMockTask({ model: 'claude-3-opus' })
    render(<TaskCard task={task} />)
    expect(screen.getByText('claude-3-opus')).toBeInTheDocument()
  })

  it('does not render model when not specified', () => {
    const task = createMockTask({ model: undefined })
    render(<TaskCard task={task} />)
    expect(screen.queryByText(/model:/i)).not.toBeInTheDocument()
  })

  it('shows cancel button for queued tasks', () => {
    const task = createMockTask({ status: 'queued' })
    render(<TaskCard task={task} onCancel={vi.fn()} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows cancel button for running tasks', () => {
    const task = createMockTask({ status: 'running' })
    render(<TaskCard task={task} onCancel={vi.fn()} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('does not show cancel button for completed tasks', () => {
    const task = createMockTask({ status: 'completed' })
    render(<TaskCard task={task} onCancel={vi.fn()} />)
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('does not show cancel button for failed tasks', () => {
    const task = createMockTask({ status: 'failed' })
    render(<TaskCard task={task} onCancel={vi.fn()} />)
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('does not show cancel button for cancelled tasks', () => {
    const task = createMockTask({ status: 'cancelled' })
    render(<TaskCard task={task} onCancel={vi.fn()} />)
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('does not show cancel button when onCancel is not provided', () => {
    const task = createMockTask({ status: 'running' })
    render(<TaskCard task={task} />)
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('calls onCancel with task id when cancel button is clicked', () => {
    const onCancel = vi.fn()
    const task = createMockTask({ id: 'task-123', status: 'running' })
    render(<TaskCard task={task} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledWith('task-123')
  })

  it('calls onSelect with task id when card is clicked', () => {
    const onSelect = vi.fn()
    const task = createMockTask({ id: 'task-456' })
    render(<TaskCard task={task} onSelect={onSelect} />)

    fireEvent.click(screen.getByTestId('task-card'))
    expect(onSelect).toHaveBeenCalledWith('task-456')
  })

  it('applies selected styling when selected', () => {
    const task = createMockTask()
    render(<TaskCard task={task} selected={true} />)

    const card = screen.getByTestId('task-card')
    expect(card).toHaveClass('border-blue-500')
  })

  it('applies default styling when not selected', () => {
    const task = createMockTask()
    render(<TaskCard task={task} selected={false} />)

    const card = screen.getByTestId('task-card')
    expect(card).toHaveClass('border-gray-700')
    expect(card).not.toHaveClass('border-blue-500')
  })

  it('displays duration for running tasks', () => {
    const startedAt = new Date(Date.now() - 5000) // 5 seconds ago
    const task = createMockTask({ status: 'running', startedAt })
    render(<TaskCard task={task} />)

    // Should show some time indicator
    expect(screen.getByTestId('task-timing')).toBeInTheDocument()
  })

  it('displays duration for completed tasks', () => {
    const startedAt = new Date('2024-01-01T10:00:00Z')
    const completedAt = new Date('2024-01-01T10:05:00Z')
    const task = createMockTask({ status: 'completed', startedAt, completedAt })
    render(<TaskCard task={task} />)

    expect(screen.getByTestId('task-timing')).toBeInTheDocument()
  })

  describe('accessibility', () => {
    it('has role="button" for keyboard accessibility', () => {
      const task = createMockTask()
      render(<TaskCard task={task} />)

      const card = screen.getByTestId('task-card')
      expect(card).toHaveAttribute('role', 'button')
    })

    it('has tabIndex={0} for keyboard focus', () => {
      const task = createMockTask()
      render(<TaskCard task={task} />)

      const card = screen.getByTestId('task-card')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('has aria-selected attribute', () => {
      const task = createMockTask()
      const { rerender } = render(<TaskCard task={task} selected={false} />)

      const card = screen.getByTestId('task-card')
      expect(card).toHaveAttribute('aria-selected', 'false')

      rerender(<TaskCard task={task} selected={true} />)
      expect(card).toHaveAttribute('aria-selected', 'true')
    })

    it('calls onSelect when Enter key is pressed', () => {
      const onSelect = vi.fn()
      const task = createMockTask({ id: 'task-keyboard' })
      render(<TaskCard task={task} onSelect={onSelect} />)

      const card = screen.getByTestId('task-card')
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(onSelect).toHaveBeenCalledWith('task-keyboard')
    })

    it('calls onSelect when Space key is pressed', () => {
      const onSelect = vi.fn()
      const task = createMockTask({ id: 'task-space' })
      render(<TaskCard task={task} onSelect={onSelect} />)

      const card = screen.getByTestId('task-card')
      fireEvent.keyDown(card, { key: ' ' })

      expect(onSelect).toHaveBeenCalledWith('task-space')
    })

    it('does not call onSelect for other keys', () => {
      const onSelect = vi.fn()
      const task = createMockTask()
      render(<TaskCard task={task} onSelect={onSelect} />)

      const card = screen.getByTestId('task-card')
      fireEvent.keyDown(card, { key: 'Tab' })

      expect(onSelect).not.toHaveBeenCalled()
    })
  })
})

describe('TaskList', () => {
  const mockTasks: Task[] = [
    createMockTask({ id: 'task-1', description: 'Task 1', status: 'queued' }),
    createMockTask({ id: 'task-2', description: 'Task 2', status: 'running' }),
    createMockTask({ id: 'task-3', description: 'Task 3', status: 'completed' }),
    createMockTask({ id: 'task-4', description: 'Task 4', status: 'failed' }),
  ]

  it('renders all tasks when filter is "all"', () => {
    render(<TaskList tasks={mockTasks} filter="all" />)

    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
    expect(screen.getByText('Task 3')).toBeInTheDocument()
    expect(screen.getByText('Task 4')).toBeInTheDocument()
  })

  it('filters tasks by status', () => {
    render(<TaskList tasks={mockTasks} filter="completed" />)

    expect(screen.queryByText('Task 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument()
    expect(screen.getByText('Task 3')).toBeInTheDocument()
    expect(screen.queryByText('Task 4')).not.toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    render(<TaskList tasks={[]} />)
    expect(screen.getByText('No tasks')).toBeInTheDocument()
  })

  it('shows empty state when filter yields no results', () => {
    render(<TaskList tasks={mockTasks} filter="cancelled" />)
    expect(screen.getByText('No tasks')).toBeInTheDocument()
  })

  it('highlights selected task', () => {
    render(<TaskList tasks={mockTasks} selectedTaskId="task-2" />)

    const cards = screen.getAllByTestId('task-card')
    expect(cards[1]).toHaveClass('border-blue-500')
  })

  it('calls onSelectTask when a task is clicked', () => {
    const onSelectTask = vi.fn()
    render(<TaskList tasks={mockTasks} onSelectTask={onSelectTask} />)

    fireEvent.click(screen.getByText('Task 2'))
    expect(onSelectTask).toHaveBeenCalledWith('task-2')
  })

  it('calls onCancelTask when cancel button is clicked', () => {
    const onCancelTask = vi.fn()
    render(<TaskList tasks={mockTasks} onCancelTask={onCancelTask} />)

    // Click the first cancel button (task-1 is queued)
    const cancelButtons = screen.getAllByText('Cancel')
    fireEvent.click(cancelButtons[0])

    expect(onCancelTask).toHaveBeenCalledWith('task-1')
  })

  it('renders tasks in correct order', () => {
    render(<TaskList tasks={mockTasks} />)

    const cards = screen.getAllByTestId('task-card')
    expect(cards).toHaveLength(4)
  })
})

describe('TaskOutput', () => {
  it('shows "Waiting to start..." for queued tasks with no output', () => {
    render(<TaskOutput taskId="task-1" status="queued" />)
    expect(screen.getByText('Waiting to start...')).toBeInTheDocument()
  })

  it('shows "Running..." for running tasks with no output', () => {
    render(<TaskOutput taskId="task-1" status="running" />)
    expect(screen.getByText('Running...')).toBeInTheDocument()
  })

  it('shows "No output" for completed tasks with no output', () => {
    render(<TaskOutput taskId="task-1" status="completed" />)
    expect(screen.getByText('No output')).toBeInTheDocument()
  })

  it('shows "No output" for failed tasks with no output', () => {
    render(<TaskOutput taskId="task-1" status="failed" />)
    expect(screen.getByText('No output')).toBeInTheDocument()
  })

  it('renders output lines', () => {
    const output = ['Line 1', 'Line 2', 'Line 3']
    render(<TaskOutput taskId="task-1" status="running" output={output} />)

    expect(screen.getByText('Line 1')).toBeInTheDocument()
    expect(screen.getByText('Line 2')).toBeInTheDocument()
    expect(screen.getByText('Line 3')).toBeInTheDocument()
  })

  it('preserves whitespace in output', () => {
    const output = ['  indented line']
    render(<TaskOutput taskId="task-1" status="running" output={output} />)

    const line = screen.getByText('indented line')
    expect(line).toHaveClass('whitespace-pre-wrap')
  })

  it('has monospace font', () => {
    render(<TaskOutput taskId="task-1" status="running" />)

    const container = screen.getByTestId('task-output')
    expect(container).toHaveClass('font-mono')
  })

  it('has scrollable container', () => {
    render(<TaskOutput taskId="task-1" status="running" />)

    const container = screen.getByTestId('task-output')
    expect(container).toHaveClass('overflow-y-auto')
  })
})
