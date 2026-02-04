export function Sidebar() {
  return (
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
    </aside>
  )
}
