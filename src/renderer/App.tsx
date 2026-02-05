import { Sidebar } from './components/Sidebar'
import { ChatView, ChangedFilesPanel } from './components/chat'
import { StatusBar } from './components/StatusBar'
import { UpdateNotification } from './components/updater'

export default function App() {
  return (
    <div data-testid="app-shell" className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ChatView />
        <ChangedFilesPanel />
      </div>
      <StatusBar />
      <UpdateNotification />
    </div>
  )
}
