export function MainPanel() {
  return (
    <main className="flex-1 flex flex-col bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Task output will go here */}
      </div>

      <div className="border-t border-gray-700 p-4">
        <input
          type="text"
          placeholder="Ask Forge anything..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>
    </main>
  )
}
