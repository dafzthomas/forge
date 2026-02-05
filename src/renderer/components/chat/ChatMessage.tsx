interface FileChange {
  path: string
  additions: number
  deletions: number
  status: 'pending' | 'approved' | 'rejected'
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  thinkingTime?: number
  exploredFiles?: string[]
  editedFiles?: FileChange[]
}

export function ChatMessage({
  role,
  content,
  timestamp,
  thinkingTime,
  exploredFiles,
  editedFiles,
}: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%] bg-blue-600 rounded-2xl rounded-br-md px-4 py-3 text-white">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Thinking indicator */}
      {thinkingTime && (
        <div className="text-xs text-gray-500 mb-2">
          Thought {thinkingTime}s
        </div>
      )}

      {/* Explored files */}
      {exploredFiles && exploredFiles.length > 0 && (
        <div className="text-xs text-gray-500 mb-2">
          Explored {exploredFiles.length} file{exploredFiles.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Edited files */}
      {editedFiles && editedFiles.length > 0 && (
        <div className="space-y-2 mb-3">
          {editedFiles.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-2 text-sm bg-gray-800 rounded-lg px-3 py-2"
            >
              <span className="text-gray-400">
                {file.status === 'approved' ? 'Edited' : file.status === 'rejected' ? 'Rejected' : 'Read'}
              </span>
              <span className="text-gray-200 font-mono text-xs">{file.path}</span>
              {file.status === 'approved' && (
                <svg className="w-4 h-4 text-green-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message content */}
      <div className="text-gray-200 leading-relaxed">
        {content}
      </div>
    </div>
  )
}
