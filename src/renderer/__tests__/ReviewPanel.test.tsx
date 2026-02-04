import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewPanel } from '../components/review/ReviewPanel'
import type { ReviewResult } from '../../main/review/types'

describe('ReviewPanel', () => {
  const mockReview: ReviewResult = {
    id: 'review-1',
    projectId: 'project-1',
    createdAt: new Date('2024-02-04T12:00:00'),
    status: 'completed',
    summary: 'Overall code looks good with a few suggestions',
    approved: true,
    comments: [
      {
        id: 'comment-1',
        file: 'src/test.ts',
        line: 10,
        severity: 'warning',
        message: 'Consider adding error handling',
        suggestion: 'try { ... } catch (error) { ... }',
      },
      {
        id: 'comment-2',
        file: 'src/test.ts',
        line: 20,
        endLine: 25,
        severity: 'suggestion',
        message: 'This function could be refactored',
      },
      {
        id: 'comment-3',
        file: 'src/another.ts',
        line: 5,
        severity: 'error',
        message: 'Security vulnerability detected',
      },
    ],
  }

  it('should render review panel', () => {
    render(<ReviewPanel review={mockReview} />)
    expect(screen.getByTestId('review-panel')).toBeInTheDocument()
  })

  it('should display review status', () => {
    render(<ReviewPanel review={mockReview} />)
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('should display approval status', () => {
    render(<ReviewPanel review={mockReview} />)
    expect(screen.getByText(/Approved/)).toBeInTheDocument()
  })

  it('should display summary', () => {
    render(<ReviewPanel review={mockReview} />)
    expect(screen.getByText('Overall code looks good with a few suggestions')).toBeInTheDocument()
  })

  it('should display all comments', () => {
    render(<ReviewPanel review={mockReview} />)
    const comments = screen.getAllByTestId('review-comment')
    expect(comments).toHaveLength(3)
  })

  it('should group comments by file', () => {
    render(<ReviewPanel review={mockReview} />)
    expect(screen.getByText('src/test.ts')).toBeInTheDocument()
    expect(screen.getByText('src/another.ts')).toBeInTheDocument()
  })

  it('should display severity badges', () => {
    render(<ReviewPanel review={mockReview} />)
    // Check for severity badges via aria-label (multiple instances: stats + comments)
    expect(screen.getAllByLabelText('Severity: warning').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Severity: suggestion').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Severity: error').length).toBeGreaterThan(0)
  })

  it('should display line numbers', () => {
    render(<ReviewPanel review={mockReview} />)
    expect(screen.getByText('Line 10')).toBeInTheDocument()
    expect(screen.getByText('Lines 20-25')).toBeInTheDocument()
    expect(screen.getByText('Line 5')).toBeInTheDocument()
  })

  it('should display suggestions when available', () => {
    render(<ReviewPanel review={mockReview} />)
    expect(screen.getByText(/Suggested fix:/)).toBeInTheDocument()
    expect(screen.getByText('try { ... } catch (error) { ... }')).toBeInTheDocument()
  })

  it('should show changes requested for non-approved reviews', () => {
    const notApprovedReview = { ...mockReview, approved: false }
    render(<ReviewPanel review={notApprovedReview} />)
    expect(screen.getByText(/Changes Requested/)).toBeInTheDocument()
  })

  it('should handle review with no comments', () => {
    const emptyReview = { ...mockReview, comments: [] }
    render(<ReviewPanel review={emptyReview} />)
    expect(screen.getByText('No comments from this review')).toBeInTheDocument()
  })

  it('should display pending status', () => {
    const pendingReview = { ...mockReview, status: 'pending' as const }
    render(<ReviewPanel review={pendingReview} />)
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('should display failed status', () => {
    const failedReview = { ...mockReview, status: 'failed' as const }
    render(<ReviewPanel review={failedReview} />)
    expect(screen.getByText('failed')).toBeInTheDocument()
  })
})
