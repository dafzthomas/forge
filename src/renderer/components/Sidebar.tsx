import { useState } from 'react'
import { AboutDialog } from './about'
import { SettingsDialog } from './settings'
import { useProjectStore } from '../stores/projectStore'
import { useChatStore } from '../stores/chatStore'
import { IPC_CHANNELS } from '../../shared/ipc-types'

// Declare forge API on window
declare global {
  interface Window {
    forge: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  return `${diffDays}d`
}

export function Sidebar() {
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())

  const { projects, activeProjectId, addProject, setActiveProject, removeProject } = useProjectStore()
  const { conversations, activeConversationId, createConversation, setActiveConversation, deleteConversation } = useChatStore()

  const handleOpenProject = async () => {
    try {
      const result = await window.forge.invoke(IPC_CHANNELS.DIALOG_OPEN_FOLDER) as { success: boolean; data: string | null }
      if (result.success && result.data) {
        const folderPath = result.data
        const name = folderPath.split('/').pop() || 'Project'
        const id = crypto.randomUUID()
        addProject({ id, name, path: folderPath })
        setActiveProject(id)
      }
    } catch (error) {
      console.error('Failed to open project:', error)
    }
  }

  const handleNewThread = (projectId: string) => {
    setActiveProject(projectId)
    createConversation(projectId)
  }

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const getProjectConversations = (projectId: string) => {
    return conversations.filter((c) => c.projectId === projectId)
  }

  return (
    <>
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header with space for macOS traffic lights */}
        <div
          className="px-4 pt-8 pb-4 border-b border-gray-700"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {/* New thread button */}
          <button
            onClick={() => activeProjectId && handleNewThread(activeProjectId)}
            disabled={!activeProjectId}
            className="w-full flex items-center gap-2 px-3 py-2 ml-12 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            New thread
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Projects with conversations */}
          <div className="py-2">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Threads
              </h2>
              <button
                onClick={handleOpenProject}
                className="text-gray-400 hover:text-white transition-colors"
                title="Open Project"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {projects.length === 0 ? (
              <p className="text-xs text-gray-500 px-4">No projects yet</p>
            ) : (
              projects.map((project) => {
                const projectConversations = getProjectConversations(project.id)
                const isCollapsed = collapsedProjects.has(project.id)

                return (
                  <div key={project.id} className="mb-1">
                    {/* Project header */}
                    <div
                      className={`group flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-gray-700/50 ${
                        activeProjectId === project.id ? 'text-white' : 'text-gray-400'
                      }`}
                      onClick={() => {
                        setActiveProject(project.id)
                        toggleProjectCollapse(project.id)
                      }}
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-sm font-medium truncate flex-1">{project.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeProject(project.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300"
                        title="Remove project"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Conversations under project */}
                    {!isCollapsed && (
                      <div className="ml-4 border-l border-gray-700">
                        {projectConversations.length === 0 ? (
                          <button
                            onClick={() => handleNewThread(project.id)}
                            className="w-full text-left px-4 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700/30"
                          >
                            + New thread
                          </button>
                        ) : (
                          projectConversations.map((conv) => (
                            <div
                              key={conv.id}
                              className={`group flex items-center justify-between px-4 py-1.5 cursor-pointer ${
                                activeConversationId === conv.id
                                  ? 'bg-gray-700 text-white'
                                  : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-300'
                              }`}
                              onClick={() => {
                                setActiveProject(project.id)
                                setActiveConversation(conv.id)
                              }}
                            >
                              <span className="text-sm truncate flex-1">{conv.title}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {formatRelativeTime(conv.updatedAt)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteConversation(conv.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 ml-1 text-gray-500 hover:text-gray-300"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
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
