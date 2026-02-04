import { useState, useEffect } from 'react'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    // Get version from Electron
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer
        .invoke('app:getVersion')
        .then((v: string) => setVersion(v))
        .catch(console.error)
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* App Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-4xl">⚒️</span>
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-2xl font-bold text-center text-white mb-1">
          Forge
        </h1>
        <p className="text-gray-400 text-center mb-4">
          AI Coding Assistant
        </p>

        {/* Version */}
        <p className="text-sm text-gray-500 text-center mb-4">
          Version {version || '0.0.0'}
        </p>

        {/* Description */}
        <p className="text-gray-300 text-center text-sm mb-6">
          An open-source, cross-platform desktop application for AI-assisted coding
          with bring-your-own-model support.
        </p>

        {/* Links */}
        <div className="flex justify-center gap-4 mb-6">
          <a
            href="https://github.com/dafzthomas/forge"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            GitHub
          </a>
          <span className="text-gray-600">•</span>
          <a
            href="https://github.com/dafzthomas/forge/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Report Issue
          </a>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          Close
        </button>
      </div>
    </div>
  )
}
