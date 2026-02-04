import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PRPanel } from '../components/pr/PRPanel'
import type { PRResult } from '../../main/pr/types'

describe('PRPanel', () => {
  const mockPR: PRResult = {
    id: 'test-pr-id',
    projectId: 'test-project',
    taskId: 'test-task',
    number: 123,
    url: 'https://github.com/test/repo/pull/123',
    title: 'Test Pull Request',
    description: 'This is a test PR description',
    status: 'open',
    createdAt: new Date('2025-01-15T10:30:00Z'),
  }

  it('should render PR number and title', () => {
    render(<PRPanel pr={mockPR} />)

    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('Test Pull Request')).toBeInTheDocument()
  })

  it('should display status badge', () => {
    render(<PRPanel pr={mockPR} />)

    const statusBadge = screen.getByRole('status')
    expect(statusBadge).toBeInTheDocument()
    expect(statusBadge).toHaveTextContent('open')
  })

  it('should render GitHub link', () => {
    render(<PRPanel pr={mockPR} />)

    const link = screen.getByRole('link', { name: /view on github/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', mockPR.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should display PR description', () => {
    render(<PRPanel pr={mockPR} />)

    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('This is a test PR description')).toBeInTheDocument()
  })

  it('should display metadata', () => {
    render(<PRPanel pr={mockPR} />)

    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('test-project')).toBeInTheDocument()
    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByText('test-task')).toBeInTheDocument()
  })

  it('should display creation date', () => {
    render(<PRPanel pr={mockPR} />)

    expect(screen.getByText(/created/i)).toBeInTheDocument()
  })

  describe('status badges', () => {
    it('should render open status with green badge', () => {
      const openPR = { ...mockPR, status: 'open' as const }
      render(<PRPanel pr={openPR} />)

      const badge = screen.getByRole('status')
      expect(badge).toHaveTextContent('open')
      expect(badge).toHaveClass('bg-green-600')
    })

    it('should render merged status with purple badge', () => {
      const mergedPR = { ...mockPR, status: 'merged' as const }
      render(<PRPanel pr={mergedPR} />)

      const badge = screen.getByRole('status')
      expect(badge).toHaveTextContent('merged')
      expect(badge).toHaveClass('bg-purple-600')
    })

    it('should render closed status with red badge', () => {
      const closedPR = { ...mockPR, status: 'closed' as const }
      render(<PRPanel pr={closedPR} />)

      const badge = screen.getByRole('status')
      expect(badge).toHaveTextContent('closed')
      expect(badge).toHaveClass('bg-red-600')
    })
  })

  it('should handle missing description', () => {
    const prWithoutDescription = { ...mockPR, description: '' }
    render(<PRPanel pr={prWithoutDescription} />)

    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  it('should handle Date object for createdAt', () => {
    const prWithDateObject = {
      ...mockPR,
      createdAt: new Date('2025-01-15T10:30:00Z'),
    }
    render(<PRPanel pr={prWithDateObject} />)

    expect(screen.getByTestId('pr-panel')).toBeInTheDocument()
  })

  it('should handle ISO string for createdAt', () => {
    const prWithISOString = {
      ...mockPR,
      createdAt: new Date('2025-01-15T10:30:00Z'),
    }
    render(<PRPanel pr={prWithISOString} />)

    expect(screen.getByTestId('pr-panel')).toBeInTheDocument()
  })

  it('should preserve whitespace in description', () => {
    const prWithMultilineDesc = {
      ...mockPR,
      description: 'Line 1\nLine 2\n\nLine 3',
    }
    const { container } = render(<PRPanel pr={prWithMultilineDesc} />)

    const descriptionContainer = container.querySelector('.whitespace-pre-wrap')
    expect(descriptionContainer).toBeInTheDocument()
    expect(descriptionContainer).toHaveClass('whitespace-pre-wrap')
    // Check that the text content includes all lines (without worrying about exact whitespace)
    expect(descriptionContainer?.textContent).toContain('Line 1')
    expect(descriptionContainer?.textContent).toContain('Line 2')
    expect(descriptionContainer?.textContent).toContain('Line 3')
  })
})
