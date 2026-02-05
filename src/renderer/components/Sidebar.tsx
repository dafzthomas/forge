import { useState } from 'react'
import { AboutDialog } from './about'
import { SettingsDialog } from './settings'

export function Sidebar() {
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-semibold">Forge</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section className="p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Projects
            </h2>
            <div className="space-y-1">
              {/* Project list will go here */}
            </div>
          </section>

          <section className="p-4 border-t border-gray-700">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Skills
            </h2>
            <div className="space-y-1">
              {/* Skills list will go here */}
            </div>
          </section>
        </div>

        {/* Footer with Settings and About buttons */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full text-left text-sm text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
          <button
            onClick={() => setShowAbout(true)}
            className="w-full text-left text-sm text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About Forge
          </button>
        </div>
      </aside>

      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  )
}
