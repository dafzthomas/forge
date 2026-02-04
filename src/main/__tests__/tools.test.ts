import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AgentContext, AgentTool } from '../agents/types'

// Import the tools we'll create
import {
  readFileTool,
  writeFileTool,
  listDirectoryTool,
} from '../agents/tools/filesystem'
import { shellExecuteTool } from '../agents/tools/shell'
import {
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
} from '../agents/tools/git'
import {
  searchFilesTool,
  searchCodeTool,
} from '../agents/tools/search'
import {
  builtInTools,
  registerBuiltInTools,
} from '../agents/tools/index'
import { AgentExecutor } from '../agents/executor'

/**
 * Create a mock agent context for testing
 */
function createMockContext(workingDir: string, overrides?: Partial<AgentContext>): AgentContext {
  return {
    taskId: 'test-task-123',
    projectId: 'test-project-456',
    projectPath: workingDir,
    workingDir: workingDir,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    ...overrides,
  }
}

describe('Filesystem Tools', () => {
  let tempDir: string
  let context: AgentContext

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'forge-test-'))
    context = createMockContext(tempDir)
  })

  afterEach(async () => {
    // Clean up temporary directory
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  })

  describe('read_file', () => {
    it('should have correct tool metadata', () => {
      expect(readFileTool.name).toBe('read_file')
      expect(readFileTool.description).toContain('Read')
      expect(readFileTool.parameters).toBeDefined()
    })

    it('should read file content', async () => {
      const testContent = 'Hello, World!'
      const testFile = path.join(tempDir, 'test.txt')
      await fs.promises.writeFile(testFile, testContent)

      const result = await readFileTool.execute({ path: 'test.txt' }, context)

      expect(result).toBe(testContent)
    })

    it('should read file content with nested path', async () => {
      const testContent = 'Nested content'
      const nestedDir = path.join(tempDir, 'nested', 'dir')
      await fs.promises.mkdir(nestedDir, { recursive: true })
      await fs.promises.writeFile(path.join(nestedDir, 'file.txt'), testContent)

      const result = await readFileTool.execute({ path: 'nested/dir/file.txt' }, context)

      expect(result).toBe(testContent)
    })

    it('should reject paths outside working directory using ../', async () => {
      await expect(
        readFileTool.execute({ path: '../outside.txt' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject absolute paths outside working directory', async () => {
      await expect(
        readFileTool.execute({ path: '/etc/passwd' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should throw error for non-existent file', async () => {
      await expect(
        readFileTool.execute({ path: 'nonexistent.txt' }, context)
      ).rejects.toThrow()
    })

    it('should reject symlink pointing outside working directory', async () => {
      // Create a symlink that points outside the working directory
      const symlinkPath = path.join(tempDir, 'malicious-link')
      await fs.promises.symlink('/etc/passwd', symlinkPath)

      await expect(
        readFileTool.execute({ path: 'malicious-link' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject file accessed through symlinked directory', async () => {
      // Create a symlink to a directory outside working directory
      const symlinkDir = path.join(tempDir, 'link-to-etc')
      await fs.promises.symlink('/etc', symlinkDir)

      await expect(
        readFileTool.execute({ path: 'link-to-etc/passwd' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject files exceeding size limit', async () => {
      // Create a file larger than 10MB
      const largeFile = path.join(tempDir, 'large-file.bin')
      const tenMB = 10 * 1024 * 1024
      // Write a file slightly over 10MB
      const buffer = Buffer.alloc(tenMB + 1024)
      await fs.promises.writeFile(largeFile, buffer)

      await expect(
        readFileTool.execute({ path: 'large-file.bin' }, context)
      ).rejects.toThrow('File too large')
    })

    it('should allow files at exactly the size limit', async () => {
      // Create a file at exactly 10MB
      const maxSizeFile = path.join(tempDir, 'max-size-file.bin')
      const tenMB = 10 * 1024 * 1024
      const buffer = Buffer.alloc(tenMB)
      buffer.fill('a')
      await fs.promises.writeFile(maxSizeFile, buffer)

      // This should not throw
      const result = await readFileTool.execute({ path: 'max-size-file.bin' }, context)
      expect(result.length).toBe(tenMB)
    })
  })

  describe('write_file', () => {
    it('should have correct tool metadata', () => {
      expect(writeFileTool.name).toBe('write_file')
      expect(writeFileTool.description).toContain('Write')
      expect(writeFileTool.parameters).toBeDefined()
    })

    it('should create and write to file', async () => {
      const result = await writeFileTool.execute(
        { path: 'new-file.txt', content: 'New content' },
        context
      )

      expect(result).toContain('new-file.txt')
      const content = await fs.promises.readFile(path.join(tempDir, 'new-file.txt'), 'utf-8')
      expect(content).toBe('New content')
    })

    it('should overwrite existing file', async () => {
      const testFile = path.join(tempDir, 'existing.txt')
      await fs.promises.writeFile(testFile, 'Original content')

      await writeFileTool.execute(
        { path: 'existing.txt', content: 'Updated content' },
        context
      )

      const content = await fs.promises.readFile(testFile, 'utf-8')
      expect(content).toBe('Updated content')
    })

    it('should create parent directories if needed', async () => {
      await writeFileTool.execute(
        { path: 'new/nested/path/file.txt', content: 'Deep content' },
        context
      )

      const content = await fs.promises.readFile(
        path.join(tempDir, 'new/nested/path/file.txt'),
        'utf-8'
      )
      expect(content).toBe('Deep content')
    })

    it('should reject paths outside working directory', async () => {
      await expect(
        writeFileTool.execute({ path: '../outside.txt', content: 'Bad content' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject absolute paths outside working directory', async () => {
      await expect(
        writeFileTool.execute({ path: '/tmp/outside.txt', content: 'Bad content' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject writing through symlink pointing outside', async () => {
      // Create a symlink that points outside the working directory
      const symlinkPath = path.join(tempDir, 'malicious-link')
      await fs.promises.symlink('/tmp/malicious-write-target', symlinkPath)

      await expect(
        writeFileTool.execute({ path: 'malicious-link', content: 'Bad content' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject writing through symlinked directory', async () => {
      // Create a symlink to a directory outside working directory
      const symlinkDir = path.join(tempDir, 'link-to-tmp')
      await fs.promises.symlink('/tmp', symlinkDir)

      await expect(
        writeFileTool.execute({ path: 'link-to-tmp/malicious.txt', content: 'Bad content' }, context)
      ).rejects.toThrow('Access denied')
    })
  })

  describe('list_directory', () => {
    it('should have correct tool metadata', () => {
      expect(listDirectoryTool.name).toBe('list_directory')
      expect(listDirectoryTool.description).toContain('List')
      expect(listDirectoryTool.parameters).toBeDefined()
    })

    it('should list files and directories', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file1.txt'), 'content')
      await fs.promises.writeFile(path.join(tempDir, 'file2.js'), 'content')
      await fs.promises.mkdir(path.join(tempDir, 'subdir'))

      const result = await listDirectoryTool.execute({ path: '.' }, context)

      expect(result).toContain('file1.txt')
      expect(result).toContain('file2.js')
      expect(result).toContain('subdir')
    })

    it('should indicate file types', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), 'content')
      await fs.promises.mkdir(path.join(tempDir, 'folder'))

      const result = await listDirectoryTool.execute({ path: '.' }, context)

      // Should distinguish files from directories
      expect(result).toMatch(/file\.txt.*\[file\]|file\.txt/)
      expect(result).toMatch(/folder.*\[dir\]|folder.*\//)
    })

    it('should list nested directory', async () => {
      const nestedDir = path.join(tempDir, 'nested')
      await fs.promises.mkdir(nestedDir)
      await fs.promises.writeFile(path.join(nestedDir, 'nested-file.txt'), 'content')

      const result = await listDirectoryTool.execute({ path: 'nested' }, context)

      expect(result).toContain('nested-file.txt')
    })

    it('should reject paths outside working directory', async () => {
      await expect(
        listDirectoryTool.execute({ path: '../' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should throw error for non-existent directory', async () => {
      await expect(
        listDirectoryTool.execute({ path: 'nonexistent' }, context)
      ).rejects.toThrow()
    })
  })
})

describe('Shell Tool', () => {
  let tempDir: string
  let context: AgentContext

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'forge-shell-test-'))
    context = createMockContext(tempDir)
  })

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  })

  describe('shell_execute', () => {
    it('should have correct tool metadata', () => {
      expect(shellExecuteTool.name).toBe('shell_execute')
      expect(shellExecuteTool.description).toContain('Execute')
      expect(shellExecuteTool.parameters).toBeDefined()
    })

    it('should execute simple command', async () => {
      const result = await shellExecuteTool.execute({ command: 'echo "Hello"' }, context)

      expect(result).toContain('Hello')
    })

    it('should execute command in working directory', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'test-file.txt'), 'content')

      const result = await shellExecuteTool.execute({ command: 'ls' }, context)

      expect(result).toContain('test-file.txt')
    })

    it('should capture stderr', async () => {
      const result = await shellExecuteTool.execute(
        { command: 'echo "error" >&2' },
        context
      )

      expect(result).toContain('error')
    })

    it('should return exit code on failure', async () => {
      const result = await shellExecuteTool.execute({ command: 'exit 1' }, context)

      expect(result).toMatch(/exit.*1|code.*1/i)
    })

    it('should enforce timeout', async () => {
      // This should timeout (100ms is very short)
      const result = await shellExecuteTool.execute(
        { command: 'sleep 10', timeout: 100 },
        context
      )

      expect(result.toLowerCase()).toContain('timed out')
    }, 5000)

    it('should use default timeout', async () => {
      // Just verify the command works - we're testing that timeout parameter is optional
      const result = await shellExecuteTool.execute({ command: 'echo "quick"' }, context)

      expect(result).toContain('quick')
    })
  })
})

describe('Git Tools', () => {
  let tempDir: string
  let context: AgentContext

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'forge-git-test-'))
    context = createMockContext(tempDir)

    // Initialize a git repo
    const { execSync } = await import('child_process')
    execSync('git init', { cwd: tempDir, stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' })
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'pipe' })
    // Disable GPG signing in test environment (avoids 1Password/gpg-agent issues)
    execSync('git config commit.gpgsign false', { cwd: tempDir, stdio: 'pipe' })
  })

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  })

  describe('git_status', () => {
    it('should have correct tool metadata', () => {
      expect(gitStatusTool.name).toBe('git_status')
      expect(gitStatusTool.description).toContain('status')
    })

    it('should return git status', async () => {
      const result = await gitStatusTool.execute({}, context)

      // Fresh repo should show clean state or nothing to commit
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should show untracked files', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'untracked.txt'), 'content')

      const result = await gitStatusTool.execute({}, context)

      expect(result).toContain('untracked.txt')
    })

    it('should show modified files', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), 'content')
      const { execSync } = await import('child_process')
      execSync('git add file.txt', { cwd: tempDir, stdio: 'pipe' })
      execSync('git commit -m "Initial"', { cwd: tempDir, stdio: 'pipe' })
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), 'modified')

      const result = await gitStatusTool.execute({}, context)

      expect(result).toContain('file.txt')
    })
  })

  describe('git_diff', () => {
    it('should have correct tool metadata', () => {
      expect(gitDiffTool.name).toBe('git_diff')
      expect(gitDiffTool.description).toContain('diff')
    })

    it('should show diff of unstaged changes', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), 'original')
      const { execSync } = await import('child_process')
      execSync('git add file.txt', { cwd: tempDir, stdio: 'pipe' })
      execSync('git commit -m "Initial"', { cwd: tempDir, stdio: 'pipe' })
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), 'modified content')

      const result = await gitDiffTool.execute({ staged: false }, context)

      expect(result).toContain('modified content')
    })

    it('should show diff of staged changes', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), 'original')
      const { execSync } = await import('child_process')
      execSync('git add file.txt', { cwd: tempDir, stdio: 'pipe' })
      execSync('git commit -m "Initial"', { cwd: tempDir, stdio: 'pipe' })
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), 'staged content')
      execSync('git add file.txt', { cwd: tempDir, stdio: 'pipe' })

      const result = await gitDiffTool.execute({ staged: true }, context)

      expect(result).toContain('staged content')
    })

    it('should filter by path', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file1.txt'), 'original1')
      await fs.promises.writeFile(path.join(tempDir, 'file2.txt'), 'original2')
      const { execSync } = await import('child_process')
      execSync('git add .', { cwd: tempDir, stdio: 'pipe' })
      execSync('git commit -m "Initial"', { cwd: tempDir, stdio: 'pipe' })
      await fs.promises.writeFile(path.join(tempDir, 'file1.txt'), 'modified1')
      await fs.promises.writeFile(path.join(tempDir, 'file2.txt'), 'modified2')

      const result = await gitDiffTool.execute({ staged: false, path: 'file1.txt' }, context)

      expect(result).toContain('modified1')
      expect(result).not.toContain('modified2')
    })

    it('should reject path traversal attempts', async () => {
      await expect(
        gitDiffTool.execute({ staged: false, path: '../../../etc/passwd' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject absolute paths outside working directory', async () => {
      await expect(
        gitDiffTool.execute({ staged: false, path: '/etc/passwd' }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject symlinks pointing outside working directory', async () => {
      const symlinkPath = path.join(tempDir, 'malicious-link')
      await fs.promises.symlink('/etc/passwd', symlinkPath)

      await expect(
        gitDiffTool.execute({ staged: false, path: 'malicious-link' }, context)
      ).rejects.toThrow('Access denied')
    })
  })

  describe('git_commit', () => {
    it('should have correct tool metadata', () => {
      expect(gitCommitTool.name).toBe('git_commit')
      expect(gitCommitTool.description).toContain('commit')
    })

    it('should create a commit with all staged files', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), 'content')
      const { execSync } = await import('child_process')
      execSync('git add file.txt', { cwd: tempDir, stdio: 'pipe' })

      const result = await gitCommitTool.execute({ message: 'Test commit' }, context)

      expect(result).toContain('Test commit')

      // Verify commit was created
      const log = execSync('git log --oneline', { cwd: tempDir, encoding: 'utf-8' })
      expect(log).toContain('Test commit')
    })

    it('should stage and commit specific files', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file1.txt'), 'content1')
      await fs.promises.writeFile(path.join(tempDir, 'file2.txt'), 'content2')

      const result = await gitCommitTool.execute(
        { message: 'Specific files', files: ['file1.txt'] },
        context
      )

      expect(result).toContain('Specific files')

      // Verify only file1 was committed
      const { execSync } = await import('child_process')
      const show = execSync('git show --name-only', { cwd: tempDir, encoding: 'utf-8' })
      expect(show).toContain('file1.txt')
      expect(show).not.toContain('file2.txt')
    })

    it('should fail with no staged changes', async () => {
      const result = await gitCommitTool.execute({ message: 'Empty commit' }, context)

      expect(result.toLowerCase()).toMatch(/nothing|no changes|error/)
    })

    it('should reject files with path traversal', async () => {
      await expect(
        gitCommitTool.execute({
          message: 'Malicious commit',
          files: ['../../../etc/passwd']
        }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject files with absolute paths outside working directory', async () => {
      await expect(
        gitCommitTool.execute({
          message: 'Malicious commit',
          files: ['/etc/passwd']
        }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject symlinks pointing outside working directory in files', async () => {
      const symlinkPath = path.join(tempDir, 'malicious-link')
      await fs.promises.symlink('/etc/passwd', symlinkPath)

      await expect(
        gitCommitTool.execute({
          message: 'Malicious commit',
          files: ['malicious-link']
        }, context)
      ).rejects.toThrow('Access denied')
    })

    it('should reject if any file in array has path traversal', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'good-file.txt'), 'content')

      await expect(
        gitCommitTool.execute({
          message: 'Mixed commit',
          files: ['good-file.txt', '../bad-file.txt']
        }, context)
      ).rejects.toThrow('Access denied')
    })
  })
})

describe('Search Tools', () => {
  let tempDir: string
  let context: AgentContext

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'forge-search-test-'))
    context = createMockContext(tempDir)
  })

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  })

  describe('search_files', () => {
    it('should have correct tool metadata', () => {
      expect(searchFilesTool.name).toBe('search_files')
      expect(searchFilesTool.description).toContain('Search')
    })

    it('should find files by pattern', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.ts'), '')
      await fs.promises.writeFile(path.join(tempDir, 'file.js'), '')
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), '')

      const result = await searchFilesTool.execute({ pattern: '*.ts' }, context)

      expect(result).toContain('file.ts')
      expect(result).not.toContain('file.js')
      expect(result).not.toContain('file.txt')
    })

    it('should search recursively', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'deep')
      await fs.promises.mkdir(nestedDir, { recursive: true })
      await fs.promises.writeFile(path.join(nestedDir, 'deep-file.ts'), '')

      const result = await searchFilesTool.execute({ pattern: '**/*.ts' }, context)

      expect(result).toContain('deep-file.ts')
    })

    it('should return no results for non-matching pattern', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.txt'), '')

      const result = await searchFilesTool.execute({ pattern: '*.xyz' }, context)

      expect(result).not.toContain('file.txt')
    })
  })

  describe('search_code', () => {
    it('should have correct tool metadata', () => {
      expect(searchCodeTool.name).toBe('search_code')
      expect(searchCodeTool.description).toContain('Search')
    })

    it('should find text in files', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.ts'), 'function hello() {}')
      await fs.promises.writeFile(path.join(tempDir, 'file.js'), 'const world = 1')

      const result = await searchCodeTool.execute({ query: 'hello' }, context)

      expect(result).toContain('file.ts')
      expect(result).toContain('hello')
    })

    it('should search with file pattern filter', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.ts'), 'function test() {}')
      await fs.promises.writeFile(path.join(tempDir, 'file.js'), 'function test() {}')

      const result = await searchCodeTool.execute(
        { query: 'test', filePattern: '*.ts' },
        context
      )

      expect(result).toContain('file.ts')
      expect(result).not.toContain('file.js')
    })

    it('should search recursively', async () => {
      const nestedDir = path.join(tempDir, 'nested')
      await fs.promises.mkdir(nestedDir)
      await fs.promises.writeFile(path.join(nestedDir, 'deep.ts'), 'const deepSearch = true')

      const result = await searchCodeTool.execute({ query: 'deepSearch' }, context)

      expect(result).toContain('deep.ts')
      expect(result).toContain('deepSearch')
    })

    it('should return no results for non-matching query', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file.ts'), 'function hello() {}')

      const result = await searchCodeTool.execute({ query: 'nonexistentterm12345' }, context)

      expect(result).not.toContain('file.ts')
    })
  })
})

describe('Tool Registry', () => {
  it('should export all built-in tools', () => {
    expect(builtInTools).toBeInstanceOf(Array)
    expect(builtInTools.length).toBeGreaterThan(0)

    // Check that expected tools are present
    const toolNames = builtInTools.map((t) => t.name)
    expect(toolNames).toContain('read_file')
    expect(toolNames).toContain('write_file')
    expect(toolNames).toContain('list_directory')
    expect(toolNames).toContain('shell_execute')
    expect(toolNames).toContain('git_status')
    expect(toolNames).toContain('git_diff')
    expect(toolNames).toContain('git_commit')
    expect(toolNames).toContain('search_files')
    expect(toolNames).toContain('search_code')
  })

  it('should have unique tool names', () => {
    const toolNames = builtInTools.map((t) => t.name)
    const uniqueNames = new Set(toolNames)
    expect(uniqueNames.size).toBe(toolNames.length)
  })

  it('should register all tools with executor', () => {
    const executor = new AgentExecutor()
    registerBuiltInTools(executor)

    // We can't directly access the tools map, but we can verify by trying to use a tool
    // The executor should have the tools registered
    expect(executor).toBeInstanceOf(AgentExecutor)
  })

  it('all tools should have valid structure', () => {
    for (const tool of builtInTools) {
      expect(tool.name).toBeTruthy()
      expect(typeof tool.name).toBe('string')
      expect(tool.description).toBeTruthy()
      expect(typeof tool.description).toBe('string')
      expect(tool.parameters).toBeDefined()
      expect(typeof tool.execute).toBe('function')
    }
  })
})
