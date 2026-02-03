# Forge: Open-Source Agentic Coding App

**Date**: 2025-02-03
**Status**: Design Complete
**Author**: Brainstorm Session

## Overview

Forge is an open-source, cross-platform desktop application for agentic coding with bring-your-own-model support. It provides multi-agent parallel workflows, a customizable skills system, automations, code review, and workspace organization—similar to OpenAI Codex but model-agnostic.

### Goals

- **Personal tool**: Individual developers can use their preferred AI models
- **Team/enterprise ready**: Scalable for team use with shared skills and standards
- **Open-source**: Community-driven, self-hostable, no vendor lock-in

### Key Features

1. Multi-agent parallel workflows with git worktrees
2. Skills system for customizable workflows
3. Automations for background/triggered work
4. Code review and PR creation
5. Workspace/project organization

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Agent     │  │   Model     │  │    Git/Worktree     │  │
│  │  Executor   │  │  Provider   │  │      Manager        │  │
│  │  (sandbox)  │  │   Router    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Skills    │  │   Task      │  │    Project          │  │
│  │   Loader    │  │   Queue     │  │    Registry         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Electron Renderer (React)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Sidebar  │ │  Task    │ │  Agent   │ │   Settings    │   │
│  │ (projs)  │ │  Panel   │ │  Output  │ │   & Auth      │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **Main process** handles all heavy lifting: agent execution, git operations, model API calls
- **Renderer process** is purely UI—communicates via IPC
- **Agent Executor** spawns sandboxed processes (process isolation, optional Docker)
- **Model Provider Router** abstracts all LLM calls behind a unified interface

---

## Model Provider System

Three-layer provider system, checked in order:

### Layer 1: Curated Providers

Built-in, first-class support with proper auth flows:

| Provider | Auth Method |
|----------|-------------|
| Claude Direct | API key or OAuth |
| Claude Bedrock | AWS profile, access key, or IAM role |
| OpenAI | API key |

### Layer 2: OpenAI-Compatible

Any endpoint implementing `/v1/chat/completions`:
- User provides: base URL + API key
- Covers: Together AI, Groq, Fireworks, local Ollama, LM Studio, vLLM, etc.

### Layer 3: Plugins

TypeScript modules in `~/.forge/plugins/providers/`:

```typescript
// example: my-provider.ts
export default {
  name: "my-custom-provider",
  async chat(messages, options) {
    // custom implementation
    return { content: "..." }
  }
}
```

### Model Selection

- Each project can have a default model
- Each task can override the model
- Settings page shows all configured providers with connection status
- Credentials stored in system keychain (via `keytar`)

---

## Agent Executor & Multi-Agent Workflows

### Execution Model

Each agent runs in an isolated environment:

- **Default**: Spawned Node.js child process with restricted filesystem access (only project directory + temp)
- **Optional**: Docker container for stronger isolation (user opt-in)

**Agent capabilities**:
- `read_file`, `write_file`, `list_directory`
- `shell_execute` (sandboxed)
- `git_commit`, `git_branch`, `git_diff`
- `search_code`, `search_files`
- `ask_user` (pause and request clarification)

**Agent restrictions**:
- Cannot access network (except LLM API)
- Cannot read outside project directory
- Cannot install global packages

### Multi-Agent via Git Worktrees

```
my-project/
├── .git/
├── src/                    # main working tree
└── ../.forge-worktrees/
    └── my-project/
        ├── task-123/       # agent 1 working here
        ├── task-456/       # agent 2 working here
        └── task-789/       # agent 3 working here
```

- Each task gets its own git worktree (isolated branch)
- Agents work in parallel without conflicts
- Results merged back via PR workflow
- Worktrees auto-cleaned after task completion (configurable retention)

### Task Queue

- Tasks queued per-project with priority levels
- Configurable concurrency (default: 2 parallel agents per project)
- Global limit based on system resources
- Queue persists across app restarts (SQLite)

---

## Skills System

### Skill File Format

Markdown with YAML frontmatter:

```markdown
---
name: code-review
description: Review code changes for quality and issues
triggers:
  - pr-created
  - manual
inputs:
  - name: focus_areas
    type: string[]
    default: ["security", "performance", "readability"]
---

# Code Review Skill

## Context
You are reviewing code changes in a {{language}} project.

## Steps
1. Read the diff using `git diff {{base_branch}}...{{head_branch}}`
2. For each changed file, analyze for:
   {{#each focus_areas}}
   - {{this}}
   {{/each}}
3. Write review comments in a structured format

## Output Format
Provide findings as:
- **Critical**: Must fix before merge
- **Suggestions**: Improvements to consider
- **Praise**: What was done well
```

### Skill Storage

- Global skills: `~/.forge/skills/`
- Project skills: `.forge/skills/` (committed to repo)
- Project skills override global ones with same name

### Built-in Skills

Shipped with app:
- `code-review` - PR review with configurable focus
- `implement-feature` - Feature implementation from description
- `fix-bug` - Bug investigation and fix
- `write-tests` - Generate tests for code
- `document` - Generate documentation
- `refactor` - Code refactoring with goals

### Format Compatibility

Support for existing skill ecosystems:

| Format | Source | Detection |
|--------|--------|-----------|
| Forge native | `.forge/skills/*.md` | Default |
| Claude Code | `.claude/skills/*.md`, `CLAUDE.md` | Auto-detect frontmatter |
| Cursor rules | `.cursor/rules/*.md`, `.cursorrules` | Auto-detect format |
| GitHub Copilot | `.github/copilot-instructions.md` | Filename match |
| Aider conventions | `.aider.conf.yml`, `CONVENTIONS.md` | Filename match |

- App scans for known skill file locations on project load
- Parses each format into internal representation
- Skills from all sources appear in unified skill picker
- User can set priority order if skills conflict

---

## Automations

### App-Based Triggers (Phase 1)

- **File watcher**: App watches project directories for changes, can trigger skills
- **Manual triggers**: All automations invoked from UI

### Future: CLI/CI Integration (Phase 2)

CLI tool and GitHub Actions integration can be added later.

---

## Code Review & PR Creation

### Review Workflow

1. User selects branch or commits to review
2. Picks review skill (or uses default `code-review`)
3. Agent analyzes diff, produces structured feedback
4. Results displayed in-app with inline annotations

### Review UI

```
┌─────────────────────────────────────────────────────┐
│  Review: feature/dark-mode  vs  main                │
├─────────────────────────────────────────────────────┤
│  src/theme.ts                          +42  -12    │
│  ├─ Line 23: [Critical] SQL injection risk         │
│  └─ Line 45: [Suggestion] Extract to constant      │
│                                                     │
│  src/components/Toggle.tsx             +28  -0     │
│  └─ Line 12: [Praise] Good accessibility attrs     │
├─────────────────────────────────────────────────────┤
│  Summary: 1 critical, 3 suggestions, 2 praise      │
│                                                     │
│  [Apply Fixes]  [Create PR]  [Dismiss]             │
└─────────────────────────────────────────────────────┘
```

### PR Creation

- Agent generates PR title and description from changes
- User can edit before creating
- Creates PR via GitHub/GitLab API (user provides PAT in settings)
- Supports draft PRs, labels, reviewers assignment

### Apply Fixes

- Agent can auto-fix issues it identified
- Shows diff preview before applying
- User approves each fix or batch-approves

---

## Workspace & Project Organization

### Main Window Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Forge                                        ─  □  ×           │
├────────────┬─────────────────────────────────────────────────────┤
│            │  ┌─────────────────────────────────────────────┐    │
│  PROJECTS  │  │  Task: Implement dark mode                  │    │
│            │  │  Status: ● Running    Model: claude-sonnet  │    │
│  ▼ my-app  │  ├─────────────────────────────────────────────┤    │
│    ● Task 1│  │                                             │    │
│    ○ Task 2│  │  > Reading src/theme.ts                     │    │
│    ○ Task 3│  │  > Analyzing current implementation         │    │
│            │  │  > Writing src/theme.ts                     │    │
│  ▶ api-srv │  │  > Created ThemeContext provider            │    │
│            │  │  > Writing src/components/ThemeToggle.tsx   │    │
│  ▶ website │  │  > ...                                      │    │
│            │  │                                             │    │
│────────────│  ├─────────────────────────────────────────────┤    │
│            │  │  [Stop]  [Pause]  [View Diff]  [Chat]       │    │
│  SKILLS    │  └─────────────────────────────────────────────┘    │
│  code-review  │                                                  │
│  implement │  ┌─────────────────────────────────────────────┐    │
│  fix-bug   │  │  Ask Forge...                          ⌘K   │    │
│            │  └─────────────────────────────────────────────┘    │
├────────────┴─────────────────────────────────────────────────────┤
│  ● 2 agents running   │  Claude Sonnet  │  my-app: feature/dark  │
└──────────────────────────────────────────────────────────────────┘
```

### Sidebar Sections

- **Projects**: All registered projects, expandable to show active tasks
- **Skills**: Quick access to available skills
- **History**: Recent completed tasks (click to view results)

### Project Management

- Add project: File picker or drag-drop folder
- Projects stored in `~/.forge/projects.json`
- Per-project settings: default model, default branch, skills enabled

### Task States

| Icon | State | Description |
|------|-------|-------------|
| ○ | Queued | Waiting to run |
| ● | Running | Agent active |
| ✓ | Complete | Success |
| ✗ | Failed | Error |
| ⏸ | Paused | Waiting for user input |

---

## Settings & Authentication

### Settings Window

Accessed via `⌘,` or menu:

**Sections**:
- **General**: App behavior, updates, telemetry opt-out
- **Providers**: Model provider configuration and auth
- **Execution**: Max parallel agents, Docker toggle, worktree location
- **Skills**: Priority order, skill directories, import/export
- **Projects**: Default settings for new projects
- **Appearance**: Theme (light/dark/system), font size
- **Keybindings**: Customizable shortcuts

### Auth Flows

| Provider | Auth Method |
|----------|-------------|
| Claude Direct | API key (paste) or OAuth (open browser) |
| AWS Bedrock | AWS profile selector, or manual access key + secret |
| OpenAI | API key |
| OpenAI-Compatible | Base URL + optional API key |

### Credential Storage

- Uses system keychain (via `keytar`) for API keys
- AWS credentials via standard `~/.aws/credentials` or environment variables
- Never stored in plain text config files

---

## Technology Stack

### Frontend (Renderer)

- React 18+ with TypeScript
- State management: Zustand
- UI components: Radix UI primitives + Tailwind CSS
- Code display: Monaco Editor
- Diff rendering: Monaco's diff viewer

### Backend (Main Process)

- Electron with TypeScript
- Database: SQLite via `better-sqlite3`
- Credentials: `keytar` (system keychain)
- Git operations: `simple-git`
- Process isolation: Node `child_process` with restricted permissions

### Build & Distribution

- Build: Vite
- Package: `electron-builder` (macOS, Windows, Linux)
- Auto-updates: `electron-updater`
- Code signing: For macOS/Windows distribution

### Project Structure

```
forge/
├── src/
│   ├── main/           # Electron main process
│   │   ├── agents/     # Agent executor, sandbox
│   │   ├── providers/  # Model provider implementations
│   │   ├── git/        # Git/worktree operations
│   │   └── skills/     # Skill loader & parser
│   ├── renderer/       # React UI
│   │   ├── components/
│   │   ├── pages/
│   │   └── stores/
│   └── shared/         # Types, utils shared between processes
├── resources/          # Icons, default skills
└── scripts/            # Build scripts
```

---

## Implementation Phases

### Phase 1: Foundation
- Electron app shell with React UI
- Project management (add/remove projects)
- Basic settings with Claude API key auth
- Single-agent task execution (no worktrees yet)

### Phase 2: Core Features
- Multi-agent with git worktrees
- Skills system with built-in skills
- Task queue with persistence
- Model provider abstraction (add Bedrock, OpenAI-compatible)

### Phase 3: Review & Polish
- Code review workflow with inline annotations
- PR creation integration
- File watcher automations
- Skill format compatibility (Claude, Cursor, etc.)

### Phase 4: Distribution
- Auto-updates
- Code signing
- Public release
- Documentation

---

## Open Questions

1. **App name**: "Forge" is a working title—final name TBD
2. **License**: MIT? Apache 2.0? GPL?
3. **Monetization**: Pure open-source, or optional cloud features for teams?
