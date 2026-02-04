import { useState, useEffect } from 'react'

interface UpdateStatus {
  available: boolean
  version?: string
  releaseNotes?: string
  downloading: boolean
  downloadProgress?: number
  downloaded: boolean
  error?: string
}

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Skip if forge API is not available (e.g., in tests)
    if (!window.forge) {
      return
    }

    // Get initial status
    window.forge.invoke('updater:getStatus').then(setStatus as (value: unknown) => void)

    // Listen for updates
    const handleStatus = (newStatus: UpdateStatus) => {
      setStatus(newStatus)
      setDismissed(false) // Show notification again on new status
    }

    window.forge.on('updater:status', handleStatus)

    return () => {
      window.forge.off('updater:status', handleStatus)
    }
  }, [])

  if (!status || dismissed || (!status.available && !status.error)) {
    return null
  }

  const handleDownload = async () => {
    await window.forge.invoke('updater:download')
  }

  const handleInstall = async () => {
    await window.forge.invoke('updater:install')
  }

  const handleCheck = async () => {
    await window.forge.invoke('updater:check')
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-50">
      {/* Error State */}
      {status.error && (
        <>
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Update Error</span>
          </div>
          <p className="text-sm text-gray-400 mb-3">{status.error}</p>
          <div className="flex gap-2">
            <button
              onClick={handleCheck}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded"
            >
              Retry
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              Dismiss
            </button>
          </div>
        </>
      )}

      {/* Update Available */}
      {status.available && !status.downloading && !status.downloaded && !status.error && (
        <>
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Update Available</span>
          </div>
          <p className="text-sm text-gray-300 mb-1">Version {status.version} is ready to download</p>
          {status.releaseNotes && (
            <p className="text-xs text-gray-400 mb-3 line-clamp-2">{status.releaseNotes}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded"
            >
              Download
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              Later
            </button>
          </div>
        </>
      )}

      {/* Downloading */}
      {status.downloading && (
        <>
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-medium">Downloading Update...</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${status.downloadProgress || 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{(status.downloadProgress || 0).toFixed(0)}% complete</p>
        </>
      )}

      {/* Downloaded */}
      {status.downloaded && !status.downloading && (
        <>
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Update Ready</span>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            Restart the app to install version {status.version}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded"
            >
              Restart Now
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              Later
            </button>
          </div>
        </>
      )}
    </div>
  )
}
