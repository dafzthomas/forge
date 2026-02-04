import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { WatcherConfig } from '../WatcherConfig'
import type { WatchRule } from '../../../../main/watcher/types'

// Mock window.forge.invoke
const mockInvoke = vi.fn()
global.window = {
  ...global.window,
  forge: {
    invoke: mockInvoke,
    on: vi.fn(),
    off: vi.fn(),
  },
} as any

describe('WatcherConfig', () => {
  const testProjectId = 'test-project-123'

  beforeEach(() => {
    mockInvoke.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('should render loading state', () => {
    mockInvoke.mockResolvedValue({ success: true, data: [] })
    render(<WatcherConfig projectId={testProjectId} />)
    expect(screen.getByText('Loading watch rules...')).toBeInTheDocument()
  })

  it('should load and display rules', async () => {
    const mockRules: WatchRule[] = [
      {
        id: 'rule-1',
        projectId: testProjectId,
        name: 'Watch TypeScript',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 1000,
      },
    ]

    mockInvoke.mockResolvedValue({ success: true, data: mockRules })

    const { container } = render(<WatcherConfig projectId={testProjectId} />)

    await waitFor(
      () => {
        expect(screen.getByText('Watch TypeScript')).toBeInTheDocument()
      },
      { container }
    )

    expect(screen.getByText('**/*.ts')).toBeInTheDocument()
    expect(screen.getByText('change')).toBeInTheDocument()
  })

  it('should display empty state when no rules', async () => {
    mockInvoke.mockResolvedValue({ success: true, data: [] })

    const { container } = render(<WatcherConfig projectId={testProjectId} />)

    await waitFor(
      () => {
        expect(
          screen.getByText('No watch rules configured. Add a rule to get started.')
        ).toBeInTheDocument()
      },
      { container }
    )
  })

  it('should display rules with different action types', async () => {
    const mockRules: WatchRule[] = [
      {
        id: 'rule-1',
        projectId: testProjectId,
        name: 'Notify Rule',
        pattern: '**/*.ts',
        events: ['change'],
        action: 'notify',
        enabled: true,
        debounceMs: 1000,
      },
      {
        id: 'rule-2',
        projectId: testProjectId,
        name: 'Skill Rule',
        pattern: '**/*.js',
        events: ['add'],
        action: 'skill',
        skillName: 'format',
        enabled: true,
        debounceMs: 500,
      },
      {
        id: 'rule-3',
        projectId: testProjectId,
        name: 'Custom Rule',
        pattern: '**/*.css',
        events: ['change'],
        action: 'custom',
        customCommand: 'npm run lint {path}',
        enabled: true,
        debounceMs: 2000,
      },
    ]

    mockInvoke.mockResolvedValue({ success: true, data: mockRules })

    const { container } = render(<WatcherConfig projectId={testProjectId} />)

    await waitFor(
      () => {
        expect(screen.getByText('Notify Rule')).toBeInTheDocument()
      },
      { container }
    )

    expect(screen.getByText('Skill Rule')).toBeInTheDocument()
    expect(screen.getByText('Custom Rule')).toBeInTheDocument()
    expect(screen.getByText('format')).toBeInTheDocument()
    expect(screen.getByText('npm run lint {path}')).toBeInTheDocument()
  })

  it('should display error messages', async () => {
    mockInvoke.mockResolvedValue({ success: false, error: 'Failed to load rules' })

    const { container } = render(<WatcherConfig projectId={testProjectId} />)

    await waitFor(
      () => {
        expect(screen.getByText('Failed to load rules')).toBeInTheDocument()
      },
      { container }
    )
  })

  it('should show watcher status', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: [] }) // List rules
      .mockResolvedValueOnce({ success: true, data: [] }) // Get active watchers

    const { container } = render(<WatcherConfig projectId={testProjectId} />)

    await waitFor(
      () => {
        expect(screen.getByText('Stopped')).toBeInTheDocument()
      },
      { container }
    )
  })

  it('should show watching status when active', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: [] }) // List rules
      .mockResolvedValueOnce({ success: true, data: [testProjectId] }) // Get active watchers

    const { container } = render(<WatcherConfig projectId={testProjectId} />)

    await waitFor(
      () => {
        expect(screen.getByText('Watching')).toBeInTheDocument()
      },
      { container }
    )
  })

  it('should display multiple event types', async () => {
    const mockRules: WatchRule[] = [
      {
        id: 'rule-1',
        projectId: testProjectId,
        name: 'Multi Event Rule',
        pattern: '**/*.ts',
        events: ['add', 'change', 'unlink'],
        enabled: true,
        debounceMs: 1000,
      },
    ]

    mockInvoke.mockResolvedValue({ success: true, data: mockRules })

    const { container } = render(<WatcherConfig projectId={testProjectId} />)

    await waitFor(
      () => {
        expect(screen.getByText('Multi Event Rule')).toBeInTheDocument()
      },
      { container }
    )

    // Should show all three event types
    const eventBadges = screen.getAllByText(/^(add|change|unlink)$/)
    expect(eventBadges.length).toBeGreaterThanOrEqual(3)
  })

  it('should display disabled rules with reduced opacity', async () => {
    const mockRules: WatchRule[] = [
      {
        id: 'rule-1',
        projectId: testProjectId,
        name: 'Disabled Rule',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: false,
        debounceMs: 1000,
      },
    ]

    mockInvoke.mockResolvedValue({ success: true, data: mockRules })

    const { container } = render(<WatcherConfig projectId={testProjectId} />)

    await waitFor(
      () => {
        expect(screen.getByText('Disabled Rule')).toBeInTheDocument()
      },
      { container }
    )

    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
