/**
 * PRService
 *
 * Service for managing GitHub pull requests.
 * Uses gh CLI to create and manage PRs.
 */

import { randomUUID } from 'crypto'
import { getDatabase } from '../database'
import type { Database } from 'better-sqlite3'
import type { PRRequest, PRResult, PRRow } from './types'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { WorktreeManager } from '../git/worktree'

const execFileAsync = promisify(execFile)

export class PRService {
  constructor(private db: Database | null = null) {
    // db can be null for testing, will use getDatabase() instead
  }

  private getDb(): Database {
    return this.db ?? getDatabase()
  }

  /**
   * Create a PR from a task's worktree
   */
  async createPR(request: PRRequest): Promise<PRResult> {
    const db = this.getDb()

    // Validate project exists
    const project = db
      .prepare('SELECT id, path FROM projects WHERE id = ?')
      .get(request.projectId) as { id: string; path: string } | undefined

    if (!project) {
      throw new Error(`Project not found: ${request.projectId}`)
    }

    // Validate task exists
    const task = db
      .prepare('SELECT id FROM tasks WHERE id = ?')
      .get(request.taskId) as { id: string } | undefined

    if (!task) {
      throw new Error(`Task not found: ${request.taskId}`)
    }

    // Get worktree path for the task
    const worktreeManager = new WorktreeManager(project.path)
    const worktreePath = worktreeManager.getWorktreePath(request.taskId)

    // Generate title if not provided
    const title = request.title ?? await this.generateTitle(worktreePath, request.taskId)

    // Generate description if not provided
    const description = request.description ?? await this.generateDescription(worktreePath, request.taskId)

    // Determine base branch
    const baseBranch = request.baseBranch ?? await this.getDefaultBranch(worktreePath)

    // Create PR using gh CLI
    const args = [
      'pr', 'create',
      '--title', title,
      '--body', description,
      '--base', baseBranch,
    ]

    if (request.draft) {
      args.push('--draft')
    }

    const { stdout } = await execFileAsync('gh', args, { cwd: worktreePath })

    // Extract PR URL and number from output
    const prUrl = stdout.trim()
    const prNumber = this.extractPRNumber(prUrl)

    // Store PR in database
    const prId = randomUUID()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(prId, request.taskId, request.projectId, prNumber, prUrl, title, description, 'open', now)

    return {
      id: prId,
      taskId: request.taskId,
      projectId: request.projectId,
      number: prNumber,
      url: prUrl,
      title,
      description,
      status: 'open',
      createdAt: new Date(now),
    }
  }

  /**
   * Get PR by ID
   */
  getPR(id: string): PRResult | null {
    const db = this.getDb()

    const row = db
      .prepare('SELECT * FROM pull_requests WHERE id = ?')
      .get(id) as PRRow | undefined

    if (!row) {
      return null
    }

    return this.rowToPR(row)
  }

  /**
   * List PRs for a project
   */
  listPRs(projectId: string): PRResult[] {
    const db = this.getDb()

    const rows = db
      .prepare('SELECT * FROM pull_requests WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId) as PRRow[]

    return rows.map(row => this.rowToPR(row))
  }

  /**
   * Update PR status from GitHub
   */
  async syncPRStatus(id: string): Promise<PRResult | null> {
    const db = this.getDb()

    const pr = this.getPR(id)
    if (!pr) {
      return null
    }

    // Get project path from database
    const project = db
      .prepare('SELECT path FROM projects WHERE id = ?')
      .get(pr.projectId) as { path: string } | undefined

    if (!project) {
      throw new Error(`Project not found for PR: ${id}`)
    }

    try {
      // Get PR status from GitHub using gh CLI
      const { stdout } = await execFileAsync(
        'gh',
        ['pr', 'view', String(pr.number), '--json', 'number,state,title'],
        { cwd: project.path }
      )

      const ghPR = JSON.parse(stdout) as {
        number: number
        state: string
        title: string
      }

      // Map GitHub state to our status
      const status = this.mapGitHubState(ghPR.state)

      // Update database
      db.prepare(`
        UPDATE pull_requests
        SET status = ?
        WHERE id = ?
      `).run(status, id)

      return {
        ...pr,
        status,
      }
    } catch (error) {
      console.error('Failed to sync PR status:', error)
      throw error
    }
  }

  /**
   * Generate title from task and commits
   */
  private async generateTitle(worktreePath: string, taskId: string): Promise<string> {
    try {
      // Get recent commits
      const { stdout } = await execFileAsync(
        'git',
        ['log', '--oneline', '-5'],
        { cwd: worktreePath }
      )

      if (stdout.trim()) {
        // Extract first commit message (most recent)
        const firstLine = stdout.split('\n')[0]
        const message = firstLine.substring(firstLine.indexOf(' ') + 1)
        return message.trim()
      }
    } catch {
      // If git log fails, use task ID
    }

    return `PR for task ${taskId}`
  }

  /**
   * Generate description from commits
   */
  private async generateDescription(worktreePath: string, taskId: string): Promise<string> {
    try {
      // Get commit messages
      const { stdout } = await execFileAsync(
        'git',
        ['log', '--oneline', '-10'],
        { cwd: worktreePath }
      )

      const commits = stdout
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const message = line.substring(line.indexOf(' ') + 1)
          return `- ${message}`
        })

      if (commits.length > 0) {
        return `## Changes\n\n${commits.join('\n')}\n\n---\nCreated by Forge for task: ${taskId}`
      }
    } catch {
      // If git log fails, use basic description
    }

    return `Pull request for task: ${taskId}\n\n---\nCreated by Forge`
  }

  /**
   * Get the default branch (main or master)
   */
  private async getDefaultBranch(worktreePath: string): Promise<string> {
    try {
      // Try to get the default branch from git
      const { stdout } = await execFileAsync(
        'git',
        ['symbolic-ref', 'refs/remotes/origin/HEAD'],
        { cwd: worktreePath }
      )

      const branch = stdout.trim().replace('refs/remotes/origin/', '')
      return branch
    } catch {
      // Default to main if we can't determine
      return 'main'
    }
  }

  /**
   * Extract PR number from GitHub URL
   */
  private extractPRNumber(url: string): number {
    const match = url.match(/\/pull\/(\d+)/)
    if (!match) {
      throw new Error(`Could not extract PR number from URL: ${url}`)
    }
    return parseInt(match[1], 10)
  }

  /**
   * Map GitHub PR state to our status
   */
  private mapGitHubState(state: string): 'open' | 'merged' | 'closed' {
    const normalized = state.toUpperCase()
    if (normalized === 'MERGED') return 'merged'
    if (normalized === 'CLOSED') return 'closed'
    return 'open'
  }

  /**
   * Convert database row to PRResult
   */
  private rowToPR(row: PRRow): PRResult {
    return {
      id: row.id,
      taskId: row.task_id,
      projectId: row.project_id,
      number: row.number,
      url: row.url,
      title: row.title,
      description: row.description,
      status: row.status as 'open' | 'merged' | 'closed',
      createdAt: new Date(row.created_at),
    }
  }
}

// Export singleton instance
let prServiceInstance: PRService | null = null

export function getPRService(): PRService {
  if (!prServiceInstance) {
    prServiceInstance = new PRService()
  }
  return prServiceInstance
}

export function resetPRService(): void {
  prServiceInstance = null
}
