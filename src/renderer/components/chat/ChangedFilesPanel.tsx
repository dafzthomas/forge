import { useState } from 'react'
import { useChatStore, type FileChange } from '../../stores/chatStore'

interface FileDiffProps {
  file: FileChange
  onApprove: () => void
  onReject: () => void
}

function FileDiff({ file, onApprove, onReject }: FileDiffProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden mb-3">
      {/* File header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-750"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm text-gray-200 truncate">{file.path}</span>
          <span className="text-xs text-green-500">+{file.additions}</span>
          <span className="text-xs text-red-500">-{file.deletions}</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {file.status === 'pending' ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onReject()
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="Reject changes"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove()
                }}
                className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                title="Approve changes"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </>
          ) : file.status === 'approved' ? (
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Diff content */}
      {expanded && file.diff && (
        <div className="bg-gray-900 p-3 font-mono text-xs overflow-x-auto">
          {file.diff.split('\n').map((line, i) => {
            let bgColor = ''
            let textColor = 'text-gray-400'
            if (line.startsWith('+') && !line.startsWith('+++')) {
              bgColor = 'bg-green-900/30'
              textColor = 'text-green-400'
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              bgColor = 'bg-red-900/30'
              textColor = 'text-red-400'
            }
            return (
              <div key={i} className={`${bgColor} ${textColor} px-2 py-0.5`}>
                {line || ' '}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ChangedFilesPanel() {
  const { conversations, activeConversationId, updateFileChangeStatus } = useChatStore()

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  // Collect all pending file changes from the conversation
  const allFileChanges: Array<{ messageId: string; file: FileChange }> = []
  activeConversation?.messages.forEach((msg) => {
    msg.editedFiles?.forEach((file) => {
      allFileChanges.push({ messageId: msg.id, file })
    })
  })

  const pendingChanges = allFileChanges.filter((c) => c.file.status === 'pending')
  const totalAdditions = allFileChanges.reduce((sum, c) => sum + c.file.additions, 0)
  const totalDeletions = allFileChanges.reduce((sum, c) => sum + c.file.deletions, 0)

  if (allFileChanges.length === 0) {
    return null
  }

  const handleApprove = (messageId: string, filePath: string) => {
    if (activeConversationId) {
      updateFileChangeStatus(activeConversationId, messageId, filePath, 'approved')
    }
  }

  const handleReject = (messageId: string, filePath: string) => {
    if (activeConversationId) {
      updateFileChangeStatus(activeConversationId, messageId, filePath, 'rejected')
    }
  }

  const handleApproveAll = () => {
    pendingChanges.forEach(({ messageId, file }) => {
      handleApprove(messageId, file.path)
    })
  }

  const handleRejectAll = () => {
    pendingChanges.forEach(({ messageId, file }) => {
      handleReject(messageId, file.path)
    })
  }

  return (
    <div className="w-96 border-l border-gray-700 bg-gray-850 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {allFileChanges.length} file{allFileChanges.length !== 1 ? 's' : ''} changed
          </span>
          <span className="text-xs text-green-500">+{totalAdditions}</span>
          <span className="text-xs text-red-500">-{totalDeletions}</span>
        </div>
        {pendingChanges.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleRejectAll}
              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
              title="Reject all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={handleApproveAll}
              className="p-1.5 text-gray-400 hover:text-green-400 transition-colors"
              title="Approve all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-4">
        {allFileChanges.map(({ messageId, file }) => (
          <FileDiff
            key={`${messageId}-${file.path}`}
            file={file}
            onApprove={() => handleApprove(messageId, file.path)}
            onReject={() => handleReject(messageId, file.path)}
          />
        ))}
      </div>
    </div>
  )
}
