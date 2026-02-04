/**
 * ReviewService
 *
 * Service for managing code reviews.
 * Orchestrates AI-powered code review requests and stores results.
 */

import { randomUUID } from 'crypto'
import { getDatabase } from '../database'
import { ModelProviderRegistry } from '../providers/registry'
import type { Database } from 'better-sqlite3'
import type {
  ReviewRequest,
  ReviewResult,
  ReviewComment,
  ReviewRow,
  ReviewCommentRow,
} from './types'
import simpleGit from 'simple-git'
import fs from 'fs/promises'
import path from 'path'

export class ReviewService {
  constructor(
    private providerRegistry: ModelProviderRegistry,
    private db: Database | null
  ) {
    // db can be null for testing, will use getDatabase() instead
  }

  private getDb(): Database {
    return this.db ?? getDatabase()
  }

  /**
   * Request a code review
   */
  async requestReview(request: ReviewRequest): Promise<ReviewResult> {
    const db = this.getDb()

    // Validate project exists
    const project = db
      .prepare('SELECT id, path FROM projects WHERE id = ?')
      .get(request.projectId) as { id: string; path: string } | undefined

    if (!project) {
      throw new Error(`Project not found: ${request.projectId}`)
    }

    const reviewId = randomUUID()
    const now = new Date().toISOString()

    // Create initial review record
    db.prepare(`
      INSERT INTO reviews (id, project_id, task_id, status, summary, approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(reviewId, request.projectId, request.taskId ?? null, 'pending', '', 0, now)

    try {
      // Get files to review
      const files = await this.getChangedFiles(project.path, request.files)

      // Build the review prompt
      const prompt = this.buildReviewPrompt(files, request.focus)

      // Get AI provider
      const provider = this.providerRegistry.getDefaultProvider()
      if (!provider) {
        throw new Error('No AI provider configured')
      }

      // Request review from AI
      const response = await provider.chat([
        {
          role: 'user',
          content: prompt,
        },
      ])

      // Parse the response
      const parsed = this.parseReviewResponse(response.content)

      // Update review with results
      db.prepare(`
        UPDATE reviews
        SET status = 'completed', summary = ?, approved = ?
        WHERE id = ?
      `).run(parsed.summary, parsed.approved ? 1 : 0, reviewId)

      // Insert comments
      const commentStmt = db.prepare(`
        INSERT INTO review_comments (id, review_id, file, line, end_line, severity, message, suggestion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const comment of parsed.comments) {
        commentStmt.run(
          comment.id,
          reviewId,
          comment.file,
          comment.line ?? null,
          comment.endLine ?? null,
          comment.severity,
          comment.message,
          comment.suggestion ?? null
        )
      }

      return this.getReview(reviewId)!
    } catch (error) {
      // Mark review as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      db.prepare(`
        UPDATE reviews
        SET status = 'failed', summary = ?
        WHERE id = ?
      `).run(errorMessage, reviewId)

      throw error
    }
  }

  /**
   * Get review by ID
   */
  getReview(id: string): ReviewResult | null {
    const db = this.getDb()

    const reviewRow = db
      .prepare('SELECT * FROM reviews WHERE id = ?')
      .get(id) as ReviewRow | undefined

    if (!reviewRow) {
      return null
    }

    const commentRows = db
      .prepare('SELECT * FROM review_comments WHERE review_id = ?')
      .all(id) as ReviewCommentRow[]

    return this.rowToReview(reviewRow, commentRows)
  }

  /**
   * List reviews for a project
   */
  listReviews(projectId: string): ReviewResult[] {
    const db = this.getDb()

    const reviewRows = db
      .prepare('SELECT * FROM reviews WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId) as ReviewRow[]

    return reviewRows.map((reviewRow) => {
      const commentRows = db
        .prepare('SELECT * FROM review_comments WHERE review_id = ?')
        .all(reviewRow.id) as ReviewCommentRow[]

      return this.rowToReview(reviewRow, commentRows)
    })
  }

  /**
   * Get changed files using git diff
   */
  private async getChangedFiles(
    projectPath: string,
    files?: string[]
  ): Promise<Array<{ path: string; content: string; diff?: string }>> {
    const git = simpleGit(projectPath)

    let filePaths: string[]

    if (files && files.length > 0) {
      // Use specified files
      filePaths = files
    } else {
      // Get all changed files
      const status = await git.status()
      filePaths = [
        ...status.modified,
        ...status.created,
        ...status.renamed.map((r) => r.to),
      ]
    }

    const result: Array<{ path: string; content: string; diff?: string }> = []

    for (const filePath of filePaths) {
      const fullPath = path.join(projectPath, filePath)

      try {
        // Read file content
        const content = await fs.readFile(fullPath, 'utf-8')

        // Get diff for the file
        let diff: string | undefined
        try {
          diff = await git.diff(['HEAD', '--', filePath])
        } catch {
          // File might be untracked, no diff available
          diff = undefined
        }

        result.push({ path: filePath, content, diff })
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Could not read file: ${filePath}`, error)
      }
    }

    return result
  }

  /**
   * Build the review prompt
   */
  private buildReviewPrompt(
    files: Array<{ path: string; content: string; diff?: string }>,
    focus?: string
  ): string {
    const focusText = focus && focus !== 'all' ? ` with a focus on ${focus}` : ''

    let prompt = `Please perform a code review${focusText} of the following files.\n\n`
    prompt += `Respond with a JSON object in the following format:\n`
    prompt += `{\n`
    prompt += `  "summary": "Overall review summary",\n`
    prompt += `  "approved": true/false,\n`
    prompt += `  "comments": [\n`
    prompt += `    {\n`
    prompt += `      "file": "path/to/file",\n`
    prompt += `      "line": 10,\n`
    prompt += `      "endLine": 15,  // optional\n`
    prompt += `      "severity": "error" | "warning" | "info" | "suggestion",\n`
    prompt += `      "message": "Description of the issue",\n`
    prompt += `      "suggestion": "Optional suggested fix"\n`
    prompt += `    }\n`
    prompt += `  ]\n`
    prompt += `}\n\n`

    for (const file of files) {
      prompt += `\n## File: ${file.path}\n\n`

      if (file.diff) {
        prompt += `### Diff:\n\`\`\`diff\n${file.diff}\n\`\`\`\n\n`
      }

      prompt += `### Content:\n\`\`\`\n${file.content}\n\`\`\`\n\n`
    }

    return prompt
  }

  /**
   * Parse the AI response into structured comments
   */
  private parseReviewResponse(response: string): {
    summary: string
    approved: boolean
    comments: ReviewComment[]
  } {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response)

      // Assign IDs to comments
      const comments: ReviewComment[] = (parsed.comments || []).map((comment: any) => ({
        id: randomUUID(),
        file: comment.file,
        line: comment.line,
        endLine: comment.endLine,
        severity: comment.severity || 'info',
        message: comment.message,
        suggestion: comment.suggestion,
      }))

      return {
        summary: parsed.summary || 'No summary provided',
        approved: parsed.approved ?? false,
        comments,
      }
    } catch {
      // If parsing fails, create a basic response
      return {
        summary: 'Failed to parse review response: ' + response.substring(0, 200),
        approved: false,
        comments: [],
      }
    }
  }

  /**
   * Convert database rows to ReviewResult
   */
  private rowToReview(reviewRow: ReviewRow, commentRows: ReviewCommentRow[]): ReviewResult {
    const comments: ReviewComment[] = commentRows.map((row) => ({
      id: row.id,
      file: row.file,
      line: row.line ?? undefined,
      endLine: row.end_line ?? undefined,
      severity: row.severity,
      message: row.message,
      suggestion: row.suggestion ?? undefined,
    }))

    return {
      id: reviewRow.id,
      projectId: reviewRow.project_id,
      taskId: reviewRow.task_id ?? undefined,
      createdAt: new Date(reviewRow.created_at),
      status: reviewRow.status,
      comments,
      summary: reviewRow.summary,
      approved: reviewRow.approved === 1,
    }
  }
}

// Export singleton instance
let reviewServiceInstance: ReviewService | null = null

export function getReviewService(): ReviewService {
  if (!reviewServiceInstance) {
    const registry = new ModelProviderRegistry()
    reviewServiceInstance = new ReviewService(registry, null)
  }
  return reviewServiceInstance
}

export function resetReviewService(): void {
  reviewServiceInstance = null
}
