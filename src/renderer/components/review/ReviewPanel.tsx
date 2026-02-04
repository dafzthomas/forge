/**
 * ReviewPanel Component
 *
 * Displays code review results with summary, approval status, and comments.
 */

import type { ReviewResult, ReviewComment, ReviewSeverity } from '../../../main/review/types'

interface ReviewPanelProps {
  review: ReviewResult
}

/**
 * Badge for displaying comment severity
 */
function SeverityBadge({ severity }: { severity: ReviewSeverity }) {
  const colors: Record<ReviewSeverity, string> = {
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-600 text-white',
    suggestion: 'bg-green-600 text-white',
  }

  const icons: Record<ReviewSeverity, string> = {
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    suggestion: '💡',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[severity]}`}
      role="img"
      aria-label={`Severity: ${severity}`}
    >
      {icons[severity]} {severity}
    </span>
  )
}

/**
 * Displays a single review comment
 */
function ReviewCommentItem({ comment }: { comment: ReviewComment }) {
  const lineInfo = comment.line
    ? comment.endLine
      ? `Lines ${comment.line}-${comment.endLine}`
      : `Line ${comment.line}`
    : 'General'

  return (
    <div
      data-testid="review-comment"
      className="p-3 rounded border border-gray-700 bg-gray-800 hover:bg-gray-750 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <SeverityBadge severity={comment.severity} />
        <span className="text-xs text-gray-400">{lineInfo}</span>
      </div>

      <p className="text-sm text-gray-300 mb-2">{comment.message}</p>

      {comment.suggestion && (
        <div className="mt-2 p-2 bg-gray-900 rounded border border-gray-600">
          <p className="text-xs text-gray-400 mb-1">Suggested fix:</p>
          <pre className="text-xs text-green-400 font-mono">{comment.suggestion}</pre>
        </div>
      )}
    </div>
  )
}

/**
 * Groups comments by file and displays them
 */
function CommentsByFile({ comments }: { comments: ReviewComment[] }) {
  if (comments.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No comments from this review
      </div>
    )
  }

  // Group comments by file
  const commentsByFile = comments.reduce(
    (acc, comment) => {
      if (!acc[comment.file]) {
        acc[comment.file] = []
      }
      acc[comment.file].push(comment)
      return acc
    },
    {} as Record<string, ReviewComment[]>
  )

  return (
    <div className="space-y-6">
      {Object.entries(commentsByFile).map(([file, fileComments]) => (
        <div key={file}>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <span className="text-blue-400">📄</span>
            {file}
            <span className="text-xs text-gray-500">({fileComments.length})</span>
          </h3>
          <div className="space-y-2">
            {fileComments.map((comment) => (
              <ReviewCommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Main ReviewPanel component
 */
export function ReviewPanel({ review }: ReviewPanelProps) {
  const statusColors: Record<ReviewResult['status'], string> = {
    pending: 'text-yellow-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  }

  const approvalColor = review.approved ? 'text-green-400' : 'text-red-400'
  const approvalIcon = review.approved ? '✓' : '✗'
  const approvalText = review.approved ? 'Approved' : 'Changes Requested'

  return (
    <div data-testid="review-panel" className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-white">Code Review</h2>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${statusColors[review.status]}`}>
              {review.status}
            </span>
            {review.status === 'completed' && (
              <span className={`text-sm font-semibold ${approvalColor}`}>
                {approvalIcon} {approvalText}
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-400">
          {review.createdAt instanceof Date
            ? review.createdAt.toLocaleString()
            : new Date(review.createdAt).toLocaleString()}
        </div>
      </div>

      {/* Summary */}
      {review.summary && (
        <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Summary</h3>
          <p className="text-sm text-gray-300">{review.summary}</p>
        </div>
      )}

      {/* Stats */}
      {review.comments.length > 0 && (
        <div className="mb-6 flex gap-4">
          {(['error', 'warning', 'info', 'suggestion'] as const).map((severity) => {
            const count = review.comments.filter((c) => c.severity === severity).length
            return count > 0 ? (
              <div key={severity} className="flex items-center gap-2">
                <SeverityBadge severity={severity} />
                <span className="text-sm text-gray-400">{count}</span>
              </div>
            ) : null
          })}
        </div>
      )}

      {/* Comments */}
      <CommentsByFile comments={review.comments} />
    </div>
  )
}
