# Forge

An open-source, cross-platform desktop application for AI-assisted coding with bring-your-own-model support.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build](https://img.shields.io/github/actions/workflow/status/dafzthomas/forge/ci.yml?branch=main)
![Version](https://img.shields.io/github/v/release/dafzthomas/forge)

## Features

- **Multi-Provider Support**: Connect to Claude (direct API), AWS Bedrock, or any OpenAI-compatible API
- **AI Code Review**: Get automated code reviews with actionable feedback
- **Task Automation**: Queue and execute coding tasks with Git worktree isolation
- **Skills System**: Extensible skills for code review, feature implementation, bug fixing, and more
- **File Watcher**: Automatically trigger actions on file changes
- **History & Logs**: Full conversation and task history with search
- **Auto-Updates**: Automatic application updates with built-in updater
- **Cross-Platform**: Runs on macOS, Windows, and Linux

## Installation

### Download

Download the latest release for your platform:
- [macOS (DMG)](https://github.com/dafzthomas/forge/releases/latest)
- [Windows (Installer)](https://github.com/dafzthomas/forge/releases/latest)
- [Linux (AppImage)](https://github.com/dafzthomas/forge/releases/latest)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/dafzthomas/forge.git
cd forge

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm run package
```

## Configuration

### API Providers

1. Open Settings (gear icon in sidebar)
2. Click "Add Provider"
3. Choose provider type:
   - **Claude Direct**: Enter your Anthropic API key
   - **AWS Bedrock**: Configure AWS credentials and region
   - **OpenAI Compatible**: Enter endpoint URL and API key

### Skills

Forge includes built-in skills:
- `code-review` - Analyze code for quality and security
- `implement-feature` - Build new features with TDD
- `fix-bug` - Diagnose and fix bugs
- `write-tests` - Generate comprehensive tests
- `document` - Create documentation
- `refactor` - Improve code structure

Custom skills can be added in:
- Global: `~/.forge/skills/`
- Project: `.forge/skills/`

See [Skills Documentation](./docs/SKILLS.md) for more details.

## Usage

### Starting a Task

1. Select a project from the sidebar
2. Click "New Task"
3. Describe what you want to accomplish
4. Select a skill or let Forge choose automatically
5. Review and approve the execution plan

### Code Review

1. Make changes in your project
2. Click "Request Review" in the task panel
3. Review the feedback organized by file
4. Apply suggested fixes or dismiss

### File Watchers

Set up automatic actions on file changes:
1. Go to Project Settings > File Watchers
2. Add a new rule with:
   - Pattern (e.g., `src/**/*.ts`)
   - Events (add, change, delete)
   - Action (notify, trigger skill, custom command)

## Development

### Tech Stack

- **Runtime**: Electron 40+
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **State**: Zustand
- **Database**: SQLite (better-sqlite3)
- **Build**: Vite, electron-builder

### Project Structure

```
forge/
├── src/
│   ├── main/           # Electron main process
│   │   ├── providers/  # AI provider implementations
│   │   ├── tasks/      # Task queue system
│   │   ├── agents/     # Agent executor and tools
│   │   ├── skills/     # Skills loader and parser
│   │   ├── review/     # Code review service
│   │   ├── pr/         # PR creation service
│   │   ├── watcher/    # File watcher service
│   │   └── history/    # History and logging
│   ├── renderer/       # React frontend
│   │   └── components/ # UI components
│   ├── shared/         # Shared types and utilities
│   └── preload/        # Electron preload scripts
├── build/              # Build resources (icons)
├── docs/               # Documentation
└── scripts/            # Build and utility scripts
```

### Running Tests

```bash
npm test              # Run all tests
npm test -- watch     # Watch mode
npm test -- coverage  # With coverage
```

### Building

```bash
npm run build          # Build for current platform
npm run package:mac    # Package for macOS
npm run package:win    # Package for Windows
npm run package:linux  # Package for Linux
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Documentation

- [Skills Documentation](./docs/SKILLS.md) - Create and customize skills
- [Code Signing](./docs/CODE_SIGNING.md) - Code signing setup for releases

## Support

- Report bugs: [GitHub Issues](https://github.com/dafzthomas/forge/issues)
- Discussions: [GitHub Discussions](https://github.com/dafzthomas/forge/discussions)
