/**
 * Git Worktree Manager
 *
 * Manages git worktrees for parallel agent execution.
 * Each agent gets its own worktree with a dedicated branch,
 * allowing simultaneous work without conflicts.
 */

import simpleGit, { SimpleGit } from 'simple-git'
import path from 'path'
import fs from 'fs'

export interface WorktreeInfo {
  path: string
  branch: string
  taskId: string
  createdAt: Date
}

interface WorktreeMetadata {
  taskId: string
  createdAt: string
}

export class WorktreeManager {
  private baseDir: string // Where worktrees are stored
  private projectPath: string // Main project path
  private git: SimpleGit

  constructor(projectPath: string, baseDir?: string) {
    this.projectPath = projectPath
    // Default: ../.forge-worktrees/<project-name>/
    this.baseDir =
      baseDir ??
      path.join(path.dirname(projectPath), '.forge-worktrees', path.basename(projectPath))
    this.git = simpleGit(projectPath)
  }

  /**
   * Create a worktree for a task
   *
   * @param taskId - The task identifier
   * @param baseBranch - Optional base branch to create from (defaults to HEAD)
   * @returns WorktreeInfo with path, branch, taskId, and createdAt
   */
  async createWorktree(taskId: string, baseBranch?: string): Promise<WorktreeInfo> {
    const branchName = `forge/task-${taskId}`
    const worktreePath = path.join(this.baseDir, `task-${taskId}`)

    // Ensure base directory exists
    await fs.promises.mkdir(this.baseDir, { recursive: true })

    // Create new branch and worktree
    // git worktree add -b <branch> <path> [<base>]
    const args = ['worktree', 'add', '-b', branchName, worktreePath]

    if (baseBranch) {
      args.push(baseBranch)
    } else {
      args.push('HEAD')
    }

    await this.git.raw(args)

    const createdAt = new Date()

    // Store metadata for tracking
    await this.saveWorktreeMetadata(taskId, createdAt)

    return {
      path: worktreePath,
      branch: branchName,
      taskId,
      createdAt,
    }
  }

  /**
   * Remove a worktree and its associated branch
   *
   * @param taskId - The task identifier
   * @returns true if successfully removed, false otherwise
   */
  async removeWorktree(taskId: string): Promise<boolean> {
    const worktreePath = path.join(this.baseDir, `task-${taskId}`)
    const branchName = `forge/task-${taskId}`

    try {
      // Check if worktree exists
      const exists = await this.worktreeExists(taskId)
      if (!exists) {
        return false
      }

      // Remove worktree (force to handle uncommitted changes)
      await this.git.raw(['worktree', 'remove', worktreePath, '--force'])

      // Delete the branch (force delete)
      try {
        await this.git.deleteLocalBranch(branchName, true)
      } catch {
        // Branch might already be deleted or never existed
      }

      // Remove metadata
      await this.removeWorktreeMetadata(taskId)

      return true
    } catch {
      return false
    }
  }

  /**
   * List all active worktrees for this project
   *
   * @returns Array of WorktreeInfo for forge-managed worktrees
   */
  async listWorktrees(): Promise<WorktreeInfo[]> {
    try {
      // Parse git worktree list --porcelain output
      const output = await this.git.raw(['worktree', 'list', '--porcelain'])
      const worktrees: WorktreeInfo[] = []

      // Parse porcelain format
      const entries = output.split('\n\n').filter((entry) => entry.trim())

      for (const entry of entries) {
        const lines = entry.split('\n')
        let worktreePath = ''
        let branch = ''

        for (const line of lines) {
          if (line.startsWith('worktree ')) {
            worktreePath = line.substring('worktree '.length)
          } else if (line.startsWith('branch refs/heads/')) {
            branch = line.substring('branch refs/heads/'.length)
          }
        }

        // Only include forge-managed worktrees
        if (branch.startsWith('forge/task-')) {
          const taskId = branch.replace('forge/task-', '')
          const metadata = await this.loadWorktreeMetadata(taskId)

          worktrees.push({
            path: worktreePath,
            branch,
            taskId,
            createdAt: metadata?.createdAt ? new Date(metadata.createdAt) : new Date(),
          })
        }
      }

      return worktrees
    } catch {
      return []
    }
  }

  /**
   * Check if a worktree exists for a given task
   *
   * @param taskId - The task identifier
   * @returns true if worktree exists, false otherwise
   */
  async worktreeExists(taskId: string): Promise<boolean> {
    const worktreePath = path.join(this.baseDir, `task-${taskId}`)

    try {
      // Check if directory exists
      const stats = await fs.promises.stat(worktreePath)
      if (!stats.isDirectory()) {
        return false
      }

      // Verify it's actually a git worktree by checking .git file
      const gitPath = path.join(worktreePath, '.git')
      await fs.promises.access(gitPath)

      return true
    } catch {
      return false
    }
  }

  /**
   * Cleanup old worktrees based on retention period
   *
   * @param olderThanMs - Remove worktrees older than this many milliseconds (optional, removes all if not specified)
   * @returns Number of worktrees removed
   */
  async cleanupOldWorktrees(olderThanMs?: number): Promise<number> {
    const worktrees = await this.listWorktrees()
    const now = Date.now()
    let removed = 0

    for (const worktree of worktrees) {
      const age = now - worktree.createdAt.getTime()

      // Remove if older than threshold or if no threshold specified
      if (olderThanMs === undefined || age > olderThanMs) {
        const success = await this.removeWorktree(worktree.taskId)
        if (success) {
          removed++
        }
      }
    }

    return removed
  }

  /**
   * Get the worktree path for a task
   *
   * @param taskId - The task identifier
   * @returns The full path where the worktree would be located
   */
  getWorktreePath(taskId: string): string {
    return path.join(this.baseDir, `task-${taskId}`)
  }

  /**
   * Save metadata for a worktree
   */
  private async saveWorktreeMetadata(taskId: string, createdAt: Date): Promise<void> {
    const metadataDir = path.join(this.baseDir, '.metadata')
    await fs.promises.mkdir(metadataDir, { recursive: true })

    const metadataPath = path.join(metadataDir, `${taskId}.json`)
    const metadata: WorktreeMetadata = {
      taskId,
      createdAt: createdAt.toISOString(),
    }

    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
  }

  /**
   * Load metadata for a worktree
   */
  private async loadWorktreeMetadata(taskId: string): Promise<WorktreeMetadata | null> {
    const metadataPath = path.join(this.baseDir, '.metadata', `${taskId}.json`)

    try {
      const content = await fs.promises.readFile(metadataPath, 'utf-8')
      return JSON.parse(content) as WorktreeMetadata
    } catch {
      return null
    }
  }

  /**
   * Remove metadata for a worktree
   */
  private async removeWorktreeMetadata(taskId: string): Promise<void> {
    const metadataPath = path.join(this.baseDir, '.metadata', `${taskId}.json`)

    try {
      await fs.promises.unlink(metadataPath)
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
