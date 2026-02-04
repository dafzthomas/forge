import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import { WorktreeManager, type WorktreeInfo } from '../git/worktree'

/**
 * Test suite for WorktreeManager
 *
 * These tests create temporary git repositories to verify worktree operations.
 */
describe('WorktreeManager', () => {
  let tempDir: string
  let projectPath: string
  let worktreeBaseDir: string
  let manager: WorktreeManager

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'forge-worktree-test-'))

    // Create a project directory and initialize git repo
    projectPath = path.join(tempDir, 'test-project')
    await fs.promises.mkdir(projectPath, { recursive: true })

    // Initialize git repo with an initial commit (required for worktrees)
    execSync('git init', { cwd: projectPath, stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', { cwd: projectPath, stdio: 'pipe' })
    execSync('git config user.name "Test User"', { cwd: projectPath, stdio: 'pipe' })
    // Disable GPG signing in test environment (avoids 1Password/gpg-agent issues)
    execSync('git config commit.gpgsign false', { cwd: projectPath, stdio: 'pipe' })

    // Create initial commit (required for worktrees to work)
    await fs.promises.writeFile(path.join(projectPath, 'README.md'), '# Test Project')
    execSync('git add .', { cwd: projectPath, stdio: 'pipe' })
    execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'pipe' })

    // Set up worktree base directory
    worktreeBaseDir = path.join(tempDir, '.forge-worktrees', 'test-project')

    // Create manager
    manager = new WorktreeManager(projectPath, worktreeBaseDir)
  })

  afterEach(async () => {
    // Clean up temporary directory
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  })

  describe('constructor', () => {
    it('should initialize with project path and custom base directory', () => {
      const customBaseDir = path.join(tempDir, 'custom-worktrees')
      const customManager = new WorktreeManager(projectPath, customBaseDir)

      expect(customManager.getWorktreePath('test-task')).toBe(
        path.join(customBaseDir, 'task-test-task')
      )
    })

    it('should use default base directory when not specified', () => {
      const defaultManager = new WorktreeManager(projectPath)

      // Default: ../.forge-worktrees/<project-name>/
      const expectedBaseDir = path.join(
        path.dirname(projectPath),
        '.forge-worktrees',
        'test-project'
      )
      expect(defaultManager.getWorktreePath('test-task')).toBe(
        path.join(expectedBaseDir, 'task-test-task')
      )
    })
  })

  describe('createWorktree', () => {
    it('should create a worktree directory', async () => {
      const result = await manager.createWorktree('123')

      expect(result.taskId).toBe('123')
      expect(result.path).toBe(path.join(worktreeBaseDir, 'task-123'))
      expect(result.branch).toBe('forge/task-123')
      expect(result.createdAt).toBeInstanceOf(Date)

      // Verify directory exists
      const stats = await fs.promises.stat(result.path)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should create the branch forge/task-{taskId}', async () => {
      await manager.createWorktree('456')

      // Verify branch exists
      const branches = execSync('git branch -a', { cwd: projectPath, encoding: 'utf-8' })
      expect(branches).toContain('forge/task-456')
    })

    it('should create base directory if it does not exist', async () => {
      // Remove base directory if it exists
      await fs.promises.rm(worktreeBaseDir, { recursive: true, force: true })

      // Should still work
      const result = await manager.createWorktree('789')

      expect(result.path).toBe(path.join(worktreeBaseDir, 'task-789'))
      const stats = await fs.promises.stat(result.path)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should use specified base branch', async () => {
      // Create a feature branch first
      execSync('git checkout -b feature-branch', { cwd: projectPath, stdio: 'pipe' })
      await fs.promises.writeFile(path.join(projectPath, 'feature.txt'), 'feature content')
      execSync('git add .', { cwd: projectPath, stdio: 'pipe' })
      execSync('git commit -m "Feature commit"', { cwd: projectPath, stdio: 'pipe' })
      execSync('git checkout master || git checkout main', { cwd: projectPath, stdio: 'pipe' })

      // Create worktree based on feature branch
      const result = await manager.createWorktree('feature-task', 'feature-branch')

      // Verify the worktree contains the feature file
      const featureFile = path.join(result.path, 'feature.txt')
      const content = await fs.promises.readFile(featureFile, 'utf-8')
      expect(content).toBe('feature content')
    })

    it('should throw error if worktree already exists', async () => {
      await manager.createWorktree('duplicate')

      await expect(manager.createWorktree('duplicate')).rejects.toThrow()
    })
  })

  describe('removeWorktree', () => {
    it('should remove worktree directory', async () => {
      const worktree = await manager.createWorktree('to-remove')

      const result = await manager.removeWorktree('to-remove')

      expect(result).toBe(true)

      // Verify directory no longer exists
      await expect(fs.promises.access(worktree.path)).rejects.toThrow()
    })

    it('should delete the branch', async () => {
      await manager.createWorktree('branch-delete')

      await manager.removeWorktree('branch-delete')

      // Verify branch no longer exists
      const branches = execSync('git branch -a', { cwd: projectPath, encoding: 'utf-8' })
      expect(branches).not.toContain('forge/task-branch-delete')
    })

    it('should return false for non-existent worktree', async () => {
      const result = await manager.removeWorktree('non-existent')

      expect(result).toBe(false)
    })

    it('should handle worktree with uncommitted changes gracefully', async () => {
      const worktree = await manager.createWorktree('with-changes')

      // Make uncommitted changes in the worktree
      await fs.promises.writeFile(path.join(worktree.path, 'uncommitted.txt'), 'changes')

      // Should still be able to remove (force remove)
      const result = await manager.removeWorktree('with-changes')

      expect(result).toBe(true)
    })
  })

  describe('listWorktrees', () => {
    it('should return empty array when no worktrees exist', async () => {
      const worktrees = await manager.listWorktrees()

      // Should only list forge-related worktrees, not the main one
      expect(worktrees.length).toBe(0)
    })

    it('should list all created worktrees', async () => {
      await manager.createWorktree('task-a')
      await manager.createWorktree('task-b')
      await manager.createWorktree('task-c')

      const worktrees = await manager.listWorktrees()

      expect(worktrees.length).toBe(3)

      const taskIds = worktrees.map((w) => w.taskId)
      expect(taskIds).toContain('task-a')
      expect(taskIds).toContain('task-b')
      expect(taskIds).toContain('task-c')
    })

    it('should return correct info for each worktree', async () => {
      await manager.createWorktree('info-test')

      const worktrees = await manager.listWorktrees()

      expect(worktrees.length).toBe(1)
      expect(worktrees[0].taskId).toBe('info-test')
      expect(worktrees[0].branch).toBe('forge/task-info-test')
      // Compare real paths to handle macOS /var -> /private/var symlink
      expect(fs.realpathSync(worktrees[0].path)).toBe(
        fs.realpathSync(path.join(worktreeBaseDir, 'task-info-test'))
      )
    })
  })

  describe('worktreeExists', () => {
    it('should return true for existing worktree', async () => {
      await manager.createWorktree('exists')

      const exists = await manager.worktreeExists('exists')

      expect(exists).toBe(true)
    })

    it('should return false for non-existing worktree', async () => {
      const exists = await manager.worktreeExists('non-existent')

      expect(exists).toBe(false)
    })

    it('should return false after worktree is removed', async () => {
      await manager.createWorktree('temp')
      await manager.removeWorktree('temp')

      const exists = await manager.worktreeExists('temp')

      expect(exists).toBe(false)
    })
  })

  describe('cleanupOldWorktrees', () => {
    it('should remove worktrees older than specified time', async () => {
      // Create a worktree
      await manager.createWorktree('old-task')

      // Wait a small amount of time
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Cleanup worktrees older than 50ms
      const removed = await manager.cleanupOldWorktrees(50)

      expect(removed).toBe(1)

      // Verify worktree no longer exists
      const exists = await manager.worktreeExists('old-task')
      expect(exists).toBe(false)
    })

    it('should not remove recent worktrees', async () => {
      await manager.createWorktree('recent-task')

      // Cleanup worktrees older than 1 hour (should keep this one)
      const removed = await manager.cleanupOldWorktrees(3600000)

      expect(removed).toBe(0)

      // Verify worktree still exists
      const exists = await manager.worktreeExists('recent-task')
      expect(exists).toBe(true)
    })

    it('should remove all worktrees when no retention period specified', async () => {
      await manager.createWorktree('cleanup-1')
      await manager.createWorktree('cleanup-2')

      const removed = await manager.cleanupOldWorktrees()

      expect(removed).toBe(2)
    })

    it('should return 0 when no worktrees exist', async () => {
      const removed = await manager.cleanupOldWorktrees()

      expect(removed).toBe(0)
    })
  })

  describe('getWorktreePath', () => {
    it('should return correct path for task ID', () => {
      const worktreePath = manager.getWorktreePath('test-task-id')

      expect(worktreePath).toBe(path.join(worktreeBaseDir, 'task-test-task-id'))
    })

    it('should handle special characters in task ID', () => {
      const worktreePath = manager.getWorktreePath('task-with-dashes-123')

      expect(worktreePath).toBe(path.join(worktreeBaseDir, 'task-task-with-dashes-123'))
    })
  })

  describe('error handling', () => {
    it('should handle git errors gracefully when creating worktree', async () => {
      // Try to create worktree from non-existent branch
      await expect(
        manager.createWorktree('error-test', 'non-existent-branch')
      ).rejects.toThrow()
    })

    it('should handle invalid project path', async () => {
      // simple-git throws immediately for non-existent paths in constructor
      expect(() => new WorktreeManager('/non/existent/path')).toThrow()
    })
  })

  describe('taskId validation', () => {
    it('should reject empty taskId', async () => {
      await expect(manager.createWorktree('')).rejects.toThrow('Task ID cannot be empty')
      await expect(manager.removeWorktree('')).rejects.toThrow('Task ID cannot be empty')
      await expect(manager.worktreeExists('')).rejects.toThrow('Task ID cannot be empty')
      expect(() => manager.getWorktreePath('')).toThrow('Task ID cannot be empty')
    })

    it('should reject taskId with only whitespace', async () => {
      await expect(manager.createWorktree('   ')).rejects.toThrow('Task ID cannot be empty')
      await expect(manager.removeWorktree('  \t')).rejects.toThrow('Task ID cannot be empty')
      await expect(manager.worktreeExists(' ')).rejects.toThrow('Task ID cannot be empty')
      expect(() => manager.getWorktreePath('   ')).toThrow('Task ID cannot be empty')
    })

    it('should reject taskId with spaces', async () => {
      await expect(manager.createWorktree('task with spaces')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      await expect(manager.removeWorktree('task with spaces')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      await expect(manager.worktreeExists('task with spaces')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      expect(() => manager.getWorktreePath('task with spaces')).toThrow(
        'Task ID contains invalid characters'
      )
    })

    it('should reject taskId with path traversal characters', async () => {
      await expect(manager.createWorktree('../../../etc/passwd')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      await expect(manager.removeWorktree('foo/bar')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      await expect(manager.worktreeExists('foo\\bar')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      expect(() => manager.getWorktreePath('..')).toThrow('Task ID contains invalid characters')
    })

    it('should reject taskId with special characters', async () => {
      await expect(manager.createWorktree('task@123')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      await expect(manager.removeWorktree('task#456')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      await expect(manager.worktreeExists('task$789')).rejects.toThrow(
        'Task ID contains invalid characters'
      )
      expect(() => manager.getWorktreePath('task!abc')).toThrow(
        'Task ID contains invalid characters'
      )
    })

    it('should accept valid taskId with alphanumeric, hyphens, and underscores', async () => {
      // These should not throw validation errors (may throw git errors if worktree doesn't exist)
      expect(() => manager.getWorktreePath('valid-task-123')).not.toThrow()
      expect(() => manager.getWorktreePath('valid_task_456')).not.toThrow()
      expect(() => manager.getWorktreePath('ValidTask789')).not.toThrow()
      expect(() => manager.getWorktreePath('abc-123_DEF')).not.toThrow()
    })
  })
})
