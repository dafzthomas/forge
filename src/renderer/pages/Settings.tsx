import * as Tabs from '@radix-ui/react-tabs'
import { GeneralSettings } from '../components/settings/GeneralSettings'
import { AppearanceSettings } from '../components/settings/AppearanceSettings'
import { ProvidersSettings } from '../components/settings/ProvidersSettings'

export function Settings() {
  return (
    <div className="h-full bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Tabs.Root defaultValue="general" className="flex gap-8">
        <Tabs.List className="flex flex-col w-48 space-y-1">
          <Tabs.Trigger
            value="general"
            className="px-4 py-2 text-left rounded hover:bg-gray-800 data-[state=active]:bg-gray-800"
          >
            General
          </Tabs.Trigger>
          <Tabs.Trigger
            value="appearance"
            className="px-4 py-2 text-left rounded hover:bg-gray-800 data-[state=active]:bg-gray-800"
          >
            Appearance
          </Tabs.Trigger>
          <Tabs.Trigger
            value="providers"
            className="px-4 py-2 text-left rounded hover:bg-gray-800 data-[state=active]:bg-gray-800"
          >
            Providers
          </Tabs.Trigger>
        </Tabs.List>

        <div className="flex-1">
          <Tabs.Content value="general">
            <GeneralSettings />
          </Tabs.Content>
          <Tabs.Content value="appearance">
            <AppearanceSettings />
          </Tabs.Content>
          <Tabs.Content value="providers">
            <ProvidersSettings />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  )
}
