/**
 * PRPanel Component
 *
 * Displays pull request information with status, links, and details.
 */

import type { PRResult } from '../../../main/pr/types'

interface PRPanelProps {
  pr: PRResult
}

/**
 * Status badge for PR status (open, merged, closed)
 */
function StatusBadge({ status }: { status: PRResult['status'] }) {
  const colors: Record<PRResult['status'], string> = {
    open: 'bg-green-600 text-white',
    merged: 'bg-purple-600 text-white',
    closed: 'bg-red-600 text-white',
  }

  const icons: Record<PRResult['status'], string> = {
    open: '●',
    merged: '✓',
    closed: '✗',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[status]}`}
      role="status"
      aria-label={`PR Status: ${status}`}
    >
      {icons[status]} {status}
    </span>
  )
}

/**
 * Main PRPanel component
 */
export function PRPanel({ pr }: PRPanelProps) {
  return (
    <div data-testid="pr-panel" className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="text-gray-400">#</span>{pr.number}
          </h2>
          <StatusBadge status={pr.status} />
        </div>

        <h3 className="text-lg text-gray-200 mb-2">{pr.title}</h3>

        <div className="text-xs text-gray-400">
          Created {pr.createdAt instanceof Date
            ? pr.createdAt.toLocaleString()
            : new Date(pr.createdAt).toLocaleString()}
        </div>
      </div>

      {/* GitHub Link */}
      <div className="mb-6">
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>View on GitHub</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      </div>

      {/* Description */}
      {pr.description && (
        <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Description</h4>
          <div className="text-sm text-gray-300 whitespace-pre-wrap">
            {pr.description}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded border border-gray-700">
        <div>
          <div className="text-xs text-gray-400 mb-1">Project</div>
          <div className="text-sm text-gray-200">{pr.projectId}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Task</div>
          <div className="text-sm text-gray-200">{pr.taskId}</div>
        </div>
      </div>
    </div>
  )
}
