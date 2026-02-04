# Contributing to Forge

Thank you for your interest in contributing to Forge!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/forge.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development Workflow

### Code Style

- TypeScript for all code
- ESLint for linting: `npm run lint`
- Prettier for formatting (configured in ESLint)
- Use descriptive variable and function names
- Add JSDoc comments for public APIs

### Testing

- Write tests for new features
- Run tests before committing: `npm test`
- Run tests in watch mode during development: `npm test -- watch`
- Maintain >80% coverage for new code
- Place tests in `__tests__` directories next to the code they test

### Commits

Use conventional commit messages:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks
- `style:` Code style changes (formatting, etc.)
- `perf:` Performance improvements

Example:
```
feat: add support for custom AI providers

- Add provider interface for extensibility
- Implement custom provider configuration UI
- Add validation for provider settings
```

### Pull Requests

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass: `npm test`
4. Run linting: `npm run lint`
5. Update CHANGELOG.md if applicable
6. Request review from maintainers

Pull request template:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested the changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Linting passes
- [ ] All tests pass
```

## Architecture Guidelines

### Main Process

- Keep IPC handlers thin - delegate to services
- Use singleton pattern for services
- Validate all IPC input
- Handle errors gracefully and return meaningful error messages
- Use dependency injection for testability

### Renderer Process

- Use functional React components
- Keep components focused and small (< 200 lines)
- Use Zustand for shared state
- Avoid prop drilling - use context or store for deep props
- Separate UI logic from business logic

### Database

- Use migrations for schema changes
- Add indexes for frequently queried columns
- Use transactions for multi-step operations
- Never expose raw SQL to the renderer
- Use prepared statements to prevent SQL injection

### Security

- Never trust renderer input in main process
- Validate and sanitize all user input
- Use contextBridge for preload scripts
- Don't expose Node.js APIs directly to renderer
- Store sensitive data (API keys) securely using electron-store

## Project Structure

```
src/
├── main/
│   ├── index.ts              # Main process entry point
│   ├── ipc/                  # IPC handlers
│   ├── providers/            # AI provider implementations
│   │   ├── base.ts          # Base provider interface
│   │   ├── claude.ts        # Claude provider
│   │   ├── bedrock.ts       # AWS Bedrock provider
│   │   └── openai.ts        # OpenAI-compatible provider
│   ├── tasks/                # Task management
│   ├── agents/               # AI agent execution
│   ├── skills/               # Skills system
│   ├── review/               # Code review service
│   ├── pr/                   # PR creation service
│   ├── watcher/              # File watcher service
│   ├── history/              # History and logging
│   ├── database/             # Database management
│   └── utils/                # Utilities
├── renderer/
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Renderer entry point
│   ├── components/          # React components
│   │   ├── tasks/          # Task-related components
│   │   ├── review/         # Code review components
│   │   ├── settings/       # Settings components
│   │   ├── history/        # History components
│   │   └── ...
│   ├── stores/              # Zustand stores
│   └── utils/               # Utilities
├── shared/
│   ├── types.ts            # Shared TypeScript types
│   └── constants.ts        # Shared constants
└── preload/
    └── index.ts            # Preload script
```

## Adding New Features

### Adding a New AI Provider

1. Create a new file in `src/main/providers/`
2. Implement the `AIProvider` interface
3. Add provider configuration UI in `src/renderer/components/settings/`
4. Add provider type to `src/shared/types.ts`
5. Register provider in provider factory
6. Add tests

### Adding a New Skill

1. Create a `.md` file in the appropriate skills directory
2. Follow the skill format (see [SKILLS.md](./docs/SKILLS.md))
3. Add triggers that match the skill's purpose
4. Define required inputs with types
5. Write a clear, actionable prompt template
6. Test the skill with various inputs

### Adding a New Component

1. Create component in appropriate directory under `src/renderer/components/`
2. Use TypeScript and define prop types
3. Follow existing patterns for styling (Tailwind CSS)
4. Add tests in `__tests__` subdirectory
5. Export from `index.ts` if part of a module

## Testing Guidelines

### Unit Tests

- Test individual functions and components in isolation
- Mock external dependencies
- Use descriptive test names: `it('should handle error when API key is invalid')`
- Follow AAA pattern: Arrange, Act, Assert

### Integration Tests

- Test interactions between components/services
- Use realistic test data
- Test error cases and edge cases

### Example Test

```typescript
import { render, screen } from '@testing-library/react';
import { TaskCard } from '../TaskCard';

describe('TaskCard', () => {
  it('should display task title and status', () => {
    const task = {
      id: '1',
      title: 'Test Task',
      status: 'completed'
    };

    render(<TaskCard task={task} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });
});
```

## Reporting Issues

Please include:
- OS and version (e.g., macOS 14.2, Windows 11, Ubuntu 22.04)
- Forge version (see About dialog)
- Steps to reproduce
- Expected vs actual behavior
- Error logs if applicable (check Developer Tools console)
- Screenshots if relevant

## Code of Conduct

- Be respectful and constructive in all interactions
- Welcome newcomers and help them get started
- Focus on the technical merits of contributions
- Assume good intent
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully

## Development Tips

### Debugging

- Use Chrome DevTools for renderer process: View > Toggle Developer Tools
- Use VS Code debugger for main process
- Check logs in: `~/.forge/logs/` (macOS/Linux) or `%APPDATA%/forge/logs/` (Windows)
- Enable verbose logging in settings for more details

### Hot Reload

- Renderer changes hot reload automatically in dev mode
- Main process changes require restart (Ctrl+C and `npm run dev` again)
- Use `console.log` liberally during development

### Common Issues

**SQLite errors**: Make sure you run migrations after pulling changes
**IPC errors**: Check that handler names match between main and renderer
**Build errors**: Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`

## Getting Help

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Join our community channels (coming soon)
- Read the documentation in `/docs`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
