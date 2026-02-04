export function StatusBar() {
  return (
    <footer
      data-testid="status-bar"
      className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400"
    >
      <span>Ready</span>
      <span className="mx-2">|</span>
      <span>No model selected</span>
    </footer>
  )
}
