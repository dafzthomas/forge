# Forge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an open-source Electron app for agentic coding with bring-your-own-model support

**Architecture:** Electron main/renderer split with React UI, TypeScript throughout, SQLite persistence

**Tech Stack:** Electron, React, TypeScript, Zustand, Radix UI, Tailwind, Monaco, SQLite

**Testing:** TDD approach - write failing tests first, then implement, then verify

**Notion Task Board:** https://www.notion.so/1e4bb4d6eeef44248469a61483479a8d

---

## Phase 1: Foundation

### Task 1.1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.main.json`
- Create: `tsconfig.renderer.json`
- Create: `vite.config.ts`
- Create: `vite.main.config.ts`
- Create: `electron-builder.json`
- Create: `.gitignore`
- Create: `.eslintrc.js`
- Create: `.prettierrc`

**Step 1: Initialize npm project**

```bash
cd /Users/dafydd/Github/forge
npm init -y
```

**Step 2: Install core dependencies**

```bash
npm install electron electron-builder vite @vitejs/plugin-react
npm install react react-dom
npm install -D typescript @types/react @types/react-dom @types/node
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D eslint prettier eslint-config-prettier
npm install -D concurrently wait-on cross-env
```

**Step 3: Create package.json scripts**

```json
{
  "name": "forge",
  "version": "0.1.0",
  "description": "Open-source agentic coding app with bring-your-own-model support",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src --ext .ts,.tsx",
    "package": "electron-builder"
  }
}
```

**Step 4: Create TypeScript configs**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

`tsconfig.main.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist/main",
    "rootDir": "src/main"
  },
  "include": ["src/main/**/*", "src/shared/**/*"]
}
```

`tsconfig.renderer.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "outDir": "dist/renderer",
    "rootDir": "src/renderer"
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

**Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
})
```

**Step 6: Create directory structure**

```bash
mkdir -p src/main src/renderer src/shared
mkdir -p src/main/__tests__ src/renderer/__tests__
mkdir -p src/renderer/components src/renderer/pages src/renderer/stores src/renderer/lib
mkdir -p resources
```

**Step 7: Create .gitignore**

```
node_modules/
dist/
.vite/
*.log
.DS_Store
.env
.env.local
coverage/
```

**Step 8: Verify setup**

```bash
npm run build
```

Expected: Build completes without errors

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: initial project setup with Electron, React, TypeScript, Vite"
```

---

### Task 1.2: Electron Main Process Shell

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/window.ts`
- Test: `src/main/__tests__/window.test.ts`

**Step 1: Write failing test for window creation**

`src/main/__tests__/window.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMainWindow, getMainWindow } from '../window'

// Mock Electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: { openDevTools: vi.fn() },
  })),
  app: {
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    quit: vi.fn(),
  },
}))

describe('window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a browser window', async () => {
    const window = await createMainWindow()
    expect(window).toBeDefined()
  })

  it('should return the main window after creation', async () => {
    await createMainWindow()
    const window = getMainWindow()
    expect(window).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/main/__tests__/window.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement window.ts**

`src/main/window.ts`:
```typescript
import { BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

export async function createMainWindow(): Promise<BrowserWindow> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
  })

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
```

**Step 4: Implement index.ts**

`src/main/index.ts`:
```typescript
import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'

app.whenReady().then(async () => {
  await createMainWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/main/__tests__/window.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/main/
git commit -m "feat: add Electron main process with window management"
```

---

### Task 1.3: React Renderer Shell

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles/globals.css`
- Test: `src/renderer/__tests__/App.test.tsx`

**Step 1: Create test setup**

`src/renderer/__tests__/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

`vitest.config.ts` (update):
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/renderer/__tests__/setup.ts'],
    globals: true,
  },
})
```

**Step 2: Write failing test**

`src/renderer/__tests__/App.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('should render the app shell', () => {
    render(<App />)
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })
})
```

**Step 3: Run test to verify it fails**

```bash
npm run test:run -- src/renderer/__tests__/App.test.tsx
```

Expected: FAIL

**Step 4: Implement App.tsx**

`src/renderer/App.tsx`:
```typescript
export default function App() {
  return (
    <div data-testid="app-shell" className="flex h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 border-r border-gray-700">
        {/* Sidebar */}
      </aside>
      <main className="flex-1 flex flex-col">
        {/* Main content */}
      </main>
    </div>
  )
}
```

**Step 5: Create main.tsx**

`src/renderer/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 6: Create index.html**

`src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">
    <title>Forge</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

**Step 7: Install and configure Tailwind**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

`src/renderer/styles/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

**Step 8: Run test to verify it passes**

```bash
npm run test:run -- src/renderer/__tests__/App.test.tsx
```

Expected: PASS

**Step 9: Verify dev mode**

```bash
npm run dev:renderer
```

Expected: Vite starts on port 5173

**Step 10: Commit**

```bash
git add src/renderer/ tailwind.config.js postcss.config.js vitest.config.ts
git commit -m "feat: add React renderer with Tailwind CSS"
```

---

### Task 1.4: Main Layout Components

**Files:**
- Create: `src/renderer/components/Sidebar.tsx`
- Create: `src/renderer/components/MainPanel.tsx`
- Create: `src/renderer/components/StatusBar.tsx`
- Test: `src/renderer/__tests__/layout.test.tsx`

**Step 1: Write failing tests**

`src/renderer/__tests__/layout.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../components/Sidebar'
import { MainPanel } from '../components/MainPanel'
import { StatusBar } from '../components/StatusBar'

describe('Layout Components', () => {
  describe('Sidebar', () => {
    it('should render projects section', () => {
      render(<Sidebar />)
      expect(screen.getByText('Projects')).toBeInTheDocument()
    })

    it('should render skills section', () => {
      render(<Sidebar />)
      expect(screen.getByText('Skills')).toBeInTheDocument()
    })
  })

  describe('MainPanel', () => {
    it('should render task input', () => {
      render(<MainPanel />)
      expect(screen.getByPlaceholderText(/ask forge/i)).toBeInTheDocument()
    })
  })

  describe('StatusBar', () => {
    it('should render status information', () => {
      render(<StatusBar />)
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/renderer/__tests__/layout.test.tsx
```

Expected: FAIL

**Step 3: Implement Sidebar.tsx**

`src/renderer/components/Sidebar.tsx`:
```typescript
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
```

**Step 4: Implement MainPanel.tsx**

`src/renderer/components/MainPanel.tsx`:
```typescript
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
```

**Step 5: Implement StatusBar.tsx**

`src/renderer/components/StatusBar.tsx`:
```typescript
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
```

**Step 6: Update App.tsx to use components**

`src/renderer/App.tsx`:
```typescript
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
```

**Step 7: Run tests to verify they pass**

```bash
npm run test:run -- src/renderer/__tests__/layout.test.tsx
```

Expected: PASS

**Step 8: Commit**

```bash
git add src/renderer/components/ src/renderer/App.tsx
git commit -m "feat: add main layout components (Sidebar, MainPanel, StatusBar)"
```

---

### Task 1.5: Zustand Store Setup

**Files:**
- Create: `src/renderer/stores/projectStore.ts`
- Create: `src/renderer/stores/settingsStore.ts`
- Test: `src/renderer/__tests__/stores.test.ts`

**Step 1: Install Zustand**

```bash
npm install zustand
```

**Step 2: Write failing tests**

`src/renderer/__tests__/stores.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '../stores/projectStore'
import { useSettingsStore } from '../stores/settingsStore'

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('should add a project', () => {
    const { addProject, projects } = useProjectStore.getState()
    addProject({ id: '1', name: 'Test', path: '/test' })
    expect(useProjectStore.getState().projects).toHaveLength(1)
  })

  it('should set active project', () => {
    const { addProject, setActiveProject } = useProjectStore.getState()
    addProject({ id: '1', name: 'Test', path: '/test' })
    setActiveProject('1')
    expect(useProjectStore.getState().activeProjectId).toBe('1')
  })
})

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset()
  })

  it('should toggle theme', () => {
    const { setTheme } = useSettingsStore.getState()
    setTheme('dark')
    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  it('should set default model', () => {
    const { setDefaultModel } = useSettingsStore.getState()
    setDefaultModel('claude-sonnet')
    expect(useSettingsStore.getState().defaultModel).toBe('claude-sonnet')
  })
})
```

**Step 3: Run tests to verify they fail**

```bash
npm run test:run -- src/renderer/__tests__/stores.test.ts
```

Expected: FAIL

**Step 4: Implement projectStore.ts**

`src/renderer/stores/projectStore.ts`:
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  name: string
  path: string
  defaultModel?: string
}

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  setActiveProject: (id: string | null) => void
  reset: () => void
}

const initialState = {
  projects: [],
  activeProjectId: null,
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initialState,
      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),
      setActiveProject: (id) => set({ activeProjectId: id }),
      reset: () => set(initialState),
    }),
    { name: 'forge-projects' }
  )
)
```

**Step 5: Implement settingsStore.ts**

`src/renderer/stores/settingsStore.ts`:
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  defaultModel: string | null
  maxParallelAgents: number
  setTheme: (theme: Theme) => void
  setDefaultModel: (model: string | null) => void
  setMaxParallelAgents: (count: number) => void
  reset: () => void
}

const initialState = {
  theme: 'system' as Theme,
  defaultModel: null,
  maxParallelAgents: 2,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setTheme: (theme) => set({ theme }),
      setDefaultModel: (model) => set({ defaultModel: model }),
      setMaxParallelAgents: (count) => set({ maxParallelAgents: count }),
      reset: () => set(initialState),
    }),
    { name: 'forge-settings' }
  )
)
```

**Step 6: Run tests to verify they pass**

```bash
npm run test:run -- src/renderer/__tests__/stores.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/renderer/stores/
git commit -m "feat: add Zustand stores for projects and settings"
```

---

### Task 1.6: SQLite Database Setup

**Files:**
- Create: `src/main/database/index.ts`
- Create: `src/main/database/migrations/001_initial.sql`
- Create: `src/main/database/schema.ts`
- Test: `src/main/__tests__/database.test.ts`

**Step 1: Install better-sqlite3**

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

**Step 2: Write failing test**

`src/main/__tests__/database.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Database, initDatabase, closeDatabase } from '../database'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = path.join(__dirname, 'test.db')

describe('Database', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  afterEach(() => {
    closeDatabase()
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  it('should initialize database', () => {
    const db = initDatabase(TEST_DB_PATH)
    expect(db).toBeDefined()
  })

  it('should create tables on init', () => {
    const db = initDatabase(TEST_DB_PATH)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
    const tableNames = tables.map((t: any) => t.name)
    expect(tableNames).toContain('projects')
    expect(tableNames).toContain('tasks')
    expect(tableNames).toContain('task_history')
  })
})
```

**Step 3: Run test to verify it fails**

```bash
npm run test:run -- src/main/__tests__/database.test.ts
```

Expected: FAIL

**Step 4: Create schema.ts**

`src/main/database/schema.ts`:
```typescript
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  default_model TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  skill TEXT,
  model TEXT,
  priority INTEGER DEFAULT 0,
  worktree_path TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_history_task ON task_history(task_id);
`
```

**Step 5: Implement database/index.ts**

`src/main/database/index.ts`:
```typescript
import Database from 'better-sqlite3'
import { SCHEMA } from './schema'

let db: Database.Database | null = null

export function initDatabase(dbPath: string): Database.Database {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)
  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export { Database }
```

**Step 6: Run test to verify it passes**

```bash
npm run test:run -- src/main/__tests__/database.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/main/database/
git commit -m "feat: add SQLite database with schema for projects and tasks"
```

---

### Task 1.7: IPC Communication Layer

**Files:**
- Create: `src/main/ipc/handlers.ts`
- Create: `src/shared/ipc-types.ts`
- Create: `src/renderer/lib/ipc.ts`
- Create: `src/main/preload.ts`
- Test: `src/main/__tests__/ipc.test.ts`

**Step 1: Define IPC types**

`src/shared/ipc-types.ts`:
```typescript
export const IPC_CHANNELS = {
  // Projects
  GET_PROJECTS: 'projects:get',
  ADD_PROJECT: 'projects:add',
  REMOVE_PROJECT: 'projects:remove',

  // Tasks
  CREATE_TASK: 'tasks:create',
  GET_TASKS: 'tasks:get',
  CANCEL_TASK: 'tasks:cancel',

  // Settings
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',

  // Providers
  TEST_PROVIDER: 'providers:test',
  GET_PROVIDERS: 'providers:get',
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]
```

**Step 2: Write failing test**

`src/main/__tests__/ipc.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { registerIpcHandlers } from '../ipc/handlers'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

describe('IPC Handlers', () => {
  it('should register all handlers', () => {
    const { ipcMain } = require('electron')
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalled()
  })
})
```

**Step 3: Run test to verify it fails**

```bash
npm run test:run -- src/main/__tests__/ipc.test.ts
```

Expected: FAIL

**Step 4: Implement handlers.ts**

`src/main/ipc/handlers.ts`:
```typescript
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-types'

export function registerIpcHandlers(): void {
  // Projects
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, async () => {
    // TODO: Implement with database
    return []
  })

  ipcMain.handle(IPC_CHANNELS.ADD_PROJECT, async (_event, project) => {
    // TODO: Implement with database
    return project
  })

  ipcMain.handle(IPC_CHANNELS.REMOVE_PROJECT, async (_event, id) => {
    // TODO: Implement with database
    return true
  })

  // Tasks
  ipcMain.handle(IPC_CHANNELS.CREATE_TASK, async (_event, task) => {
    // TODO: Implement with task queue
    return task
  })

  ipcMain.handle(IPC_CHANNELS.GET_TASKS, async (_event, projectId) => {
    // TODO: Implement with database
    return []
  })

  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    // TODO: Implement
    return {}
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, async (_event, settings) => {
    // TODO: Implement
    return settings
  })

  // Providers
  ipcMain.handle(IPC_CHANNELS.TEST_PROVIDER, async (_event, config) => {
    // TODO: Implement provider testing
    return { success: true }
  })
}
```

**Step 5: Create preload.ts**

`src/main/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, IpcChannel } from '../shared/ipc-types'

const api = {
  invoke: (channel: IpcChannel, ...args: unknown[]) => {
    return ipcRenderer.invoke(channel, ...args)
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
}

contextBridge.exposeInMainWorld('forge', api)

export type ForgeAPI = typeof api
```

**Step 6: Create renderer IPC client**

`src/renderer/lib/ipc.ts`:
```typescript
import { IPC_CHANNELS } from '../../shared/ipc-types'

declare global {
  interface Window {
    forge: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export const ipc = {
  projects: {
    getAll: () => window.forge.invoke(IPC_CHANNELS.GET_PROJECTS),
    add: (project: unknown) => window.forge.invoke(IPC_CHANNELS.ADD_PROJECT, project),
    remove: (id: string) => window.forge.invoke(IPC_CHANNELS.REMOVE_PROJECT, id),
  },
  tasks: {
    create: (task: unknown) => window.forge.invoke(IPC_CHANNELS.CREATE_TASK, task),
    getAll: (projectId: string) => window.forge.invoke(IPC_CHANNELS.GET_TASKS, projectId),
    cancel: (id: string) => window.forge.invoke(IPC_CHANNELS.CANCEL_TASK, id),
  },
  settings: {
    get: () => window.forge.invoke(IPC_CHANNELS.GET_SETTINGS),
    update: (settings: unknown) => window.forge.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings),
  },
  providers: {
    test: (config: unknown) => window.forge.invoke(IPC_CHANNELS.TEST_PROVIDER, config),
  },
}
```

**Step 7: Run test to verify it passes**

```bash
npm run test:run -- src/main/__tests__/ipc.test.ts
```

Expected: PASS

**Step 8: Commit**

```bash
git add src/main/ipc/ src/main/preload.ts src/shared/ src/renderer/lib/
git commit -m "feat: add IPC communication layer between main and renderer"
```

---

### Task 1.8: Settings Window

**Files:**
- Create: `src/renderer/pages/Settings.tsx`
- Create: `src/renderer/components/settings/GeneralSettings.tsx`
- Create: `src/renderer/components/settings/AppearanceSettings.tsx`
- Test: `src/renderer/__tests__/Settings.test.tsx`

**Step 1: Install Radix UI primitives**

```bash
npm install @radix-ui/react-tabs @radix-ui/react-switch @radix-ui/react-select
```

**Step 2: Write failing tests**

`src/renderer/__tests__/Settings.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Settings } from '../pages/Settings'

describe('Settings', () => {
  it('should render settings tabs', () => {
    render(<Settings />)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Providers')).toBeInTheDocument()
  })

  it('should render theme selector in Appearance tab', () => {
    render(<Settings />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })
})
```

**Step 3: Run tests to verify they fail**

```bash
npm run test:run -- src/renderer/__tests__/Settings.test.tsx
```

Expected: FAIL

**Step 4: Implement Settings.tsx**

`src/renderer/pages/Settings.tsx`:
```typescript
import * as Tabs from '@radix-ui/react-tabs'
import { GeneralSettings } from '../components/settings/GeneralSettings'
import { AppearanceSettings } from '../components/settings/AppearanceSettings'

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
            <div>Provider settings coming soon...</div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  )
}
```

**Step 5: Implement GeneralSettings.tsx**

`src/renderer/components/settings/GeneralSettings.tsx`:
```typescript
import { useSettingsStore } from '../../stores/settingsStore'

export function GeneralSettings() {
  const { maxParallelAgents, setMaxParallelAgents } = useSettingsStore()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">General</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Max Parallel Agents
          </label>
          <select
            value={maxParallelAgents}
            onChange={(e) => setMaxParallelAgents(Number(e.target.value))}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
```

**Step 6: Implement AppearanceSettings.tsx**

`src/renderer/components/settings/AppearanceSettings.tsx`:
```typescript
import { useSettingsStore } from '../../stores/settingsStore'

export function AppearanceSettings() {
  const { theme, setTheme } = useSettingsStore()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Appearance</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Theme
          </label>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded capitalize ${
                  theme === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 7: Run tests to verify they pass**

```bash
npm run test:run -- src/renderer/__tests__/Settings.test.tsx
```

Expected: PASS

**Step 8: Commit**

```bash
git add src/renderer/pages/ src/renderer/components/settings/
git commit -m "feat: add Settings page with General and Appearance tabs"
```

---

## Remaining Phases

Phases 2-4 follow the same TDD pattern. See the Notion Implementation Plan page for detailed steps for each task.

---

## Execution Options

**Plan complete and saved to `docs/plans/2025-02-03-forge-implementation-plan.md`**

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
