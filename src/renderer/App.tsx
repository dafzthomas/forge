import { Sidebar } from './components/Sidebar'
import { MainPanel } from './components/MainPanel'
import { StatusBar } from './components/StatusBar'

export default function App() {
  return (
    <div data-testid="app-shell" className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainPanel />
      </div>
      <StatusBar />
    </div>
  )
}
