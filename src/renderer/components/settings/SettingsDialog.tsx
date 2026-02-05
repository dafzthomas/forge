import * as Tabs from '@radix-ui/react-tabs'
import { ProvidersSettings } from './ProvidersSettings'
import { GeneralSettings } from './GeneralSettings'
import { AppearanceSettings } from './AppearanceSettings'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-gray-800 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Tabs.Root defaultValue="providers" className="flex-1 flex flex-col overflow-hidden">
          <Tabs.List className="flex border-b border-gray-700 px-4">
            <Tabs.Trigger
              value="providers"
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent data-[state=active]:text-white data-[state=active]:border-blue-500 transition-colors"
            >
              Providers
            </Tabs.Trigger>
            <Tabs.Trigger
              value="general"
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent data-[state=active]:text-white data-[state=active]:border-blue-500 transition-colors"
            >
              General
            </Tabs.Trigger>
            <Tabs.Trigger
              value="appearance"
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent data-[state=active]:text-white data-[state=active]:border-blue-500 transition-colors"
            >
              Appearance
            </Tabs.Trigger>
          </Tabs.List>

          <div className="flex-1 overflow-y-auto p-6">
            <Tabs.Content value="providers" className="outline-none">
              <ProvidersSettings />
            </Tabs.Content>
            <Tabs.Content value="general" className="outline-none">
              <GeneralSettings />
            </Tabs.Content>
            <Tabs.Content value="appearance" className="outline-none">
              <AppearanceSettings />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </div>
    </div>
  )
}
