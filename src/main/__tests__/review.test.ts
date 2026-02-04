import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ReviewService } from '../review/service'
import { ProjectService } from '../projects'
import { initDatabase, closeDatabase } from '../database'
import fs from 'fs'
import path from 'path'
import type { ReviewRequest } from '../review/types'

const TEST_DB_PATH = path.join(__dirname, 'review-test.db')

describe('ReviewService', () => {
  let service: ReviewService
  let projectService: ProjectService
  let testProjectId: string
  let testProjectPath: string

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    const walPath = TEST_DB_PATH + '-wal'
    const shmPath = TEST_DB_PATH + '-shm'
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

    initDatabase(TEST_DB_PATH)
    projectService = new ProjectService()

    // Create a test project
    testProjectPath = path.join(__dirname, 'test-project')
    const testProject = projectService.addProject(testProjectPath, 'Test Project')
    testProjectId = testProject.id

    // Mock provider registry - will be passed to service
    const mockProviderRegistry = {
      getDefaultProvider: vi.fn(),
      getProvider: vi.fn(),
    }

    service = new ReviewService(mockProviderRegistry as any, null as any)
  })

  afterEach(() => {
    closeDatabase()
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    const walPath = TEST_DB_PATH + '-wal'
    const shmPath = TEST_DB_PATH + '-shm'
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
  })

  describe('getReview', () => {
    it('should return null for non-existent review', () => {
      const review = service.getReview('non-existent-id')
      expect(review).toBeNull()
    })
  })

  describe('listReviews', () => {
    it('should return empty array when no reviews', () => {
      const reviews = service.listReviews(testProjectId)
      expect(reviews).toEqual([])
    })
  })

  describe('database persistence', () => {
    it('should store review in database', async () => {
      // This will be implemented when we create requestReview
      // For now, we'll manually insert a review to test retrieval
      const db = await import('../database').then(m => m.getDatabase())

      const reviewId = 'test-review-1'
      const now = new Date().toISOString()

      db.prepare(`
        INSERT INTO reviews (id, project_id, status, summary, approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(reviewId, testProjectId, 'completed', 'Test summary', 1, now)

      const review = service.getReview(reviewId)
      expect(review).not.toBeNull()
      expect(review!.id).toBe(reviewId)
      expect(review!.projectId).toBe(testProjectId)
      expect(review!.status).toBe('completed')
      expect(review!.summary).toBe('Test summary')
      expect(review!.approved).toBe(true)
      expect(review!.comments).toEqual([])
    })

    it('should retrieve review with comments', async () => {
      const db = await import('../database').then(m => m.getDatabase())

      const reviewId = 'test-review-2'
      const now = new Date().toISOString()

      db.prepare(`
        INSERT INTO reviews (id, project_id, status, summary, approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(reviewId, testProjectId, 'completed', 'Test summary', 0, now)

      db.prepare(`
        INSERT INTO review_comments (id, review_id, file, line, severity, message)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('comment-1', reviewId, 'src/test.ts', 10, 'error', 'Test error')

      db.prepare(`
        INSERT INTO review_comments (id, review_id, file, line, end_line, severity, message, suggestion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('comment-2', reviewId, 'src/test.ts', 20, 25, 'warning', 'Test warning', 'Fix this')

      const review = service.getReview(reviewId)
      expect(review).not.toBeNull()
      expect(review!.comments).toHaveLength(2)

      const comment1 = review!.comments.find(c => c.id === 'comment-1')
      expect(comment1).toBeDefined()
      expect(comment1!.file).toBe('src/test.ts')
      expect(comment1!.line).toBe(10)
      expect(comment1!.severity).toBe('error')
      expect(comment1!.message).toBe('Test error')

      const comment2 = review!.comments.find(c => c.id === 'comment-2')
      expect(comment2).toBeDefined()
      expect(comment2!.line).toBe(20)
      expect(comment2!.endLine).toBe(25)
      expect(comment2!.severity).toBe('warning')
      expect(comment2!.suggestion).toBe('Fix this')
    })

    it('should list reviews for a project', async () => {
      const db = await import('../database').then(m => m.getDatabase())
      const now = new Date().toISOString()

      db.prepare(`
        INSERT INTO reviews (id, project_id, status, summary, approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('review-1', testProjectId, 'completed', 'Review 1', 1, now)

      db.prepare(`
        INSERT INTO reviews (id, project_id, status, summary, approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('review-2', testProjectId, 'completed', 'Review 2', 0, now)

      const reviews = service.listReviews(testProjectId)
      expect(reviews).toHaveLength(2)
      expect(reviews.map(r => r.id)).toContain('review-1')
      expect(reviews.map(r => r.id)).toContain('review-2')
    })

    it('should filter reviews by project', async () => {
      const db = await import('../database').then(m => m.getDatabase())
      const now = new Date().toISOString()

      const project2 = projectService.addProject('/test/project2', 'Project 2')

      db.prepare(`
        INSERT INTO reviews (id, project_id, status, summary, approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('review-p1', testProjectId, 'completed', 'Review P1', 1, now)

      db.prepare(`
        INSERT INTO reviews (id, project_id, status, summary, approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('review-p2', project2.id, 'completed', 'Review P2', 1, now)

      const reviewsP1 = service.listReviews(testProjectId)
      const reviewsP2 = service.listReviews(project2.id)

      expect(reviewsP1).toHaveLength(1)
      expect(reviewsP1[0].id).toBe('review-p1')

      expect(reviewsP2).toHaveLength(1)
      expect(reviewsP2[0].id).toBe('review-p2')
    })
  })

  describe('buildReviewPrompt', () => {
    it('should build a basic review prompt', () => {
      const files = [
        { path: 'src/test.ts', content: 'console.log("test")' }
      ]

      // Access private method for testing via any cast
      const prompt = (service as any).buildReviewPrompt(files, 'all')

      expect(prompt).toContain('code review')
      expect(prompt).toContain('src/test.ts')
      expect(prompt).toContain('console.log("test")')
    })

    it('should include focus area in prompt', () => {
      const files = [
        { path: 'src/test.ts', content: 'const x = 1' }
      ]

      const securityPrompt = (service as any).buildReviewPrompt(files, 'security')
      expect(securityPrompt).toContain('security')

      const performancePrompt = (service as any).buildReviewPrompt(files, 'performance')
      expect(performancePrompt).toContain('performance')
    })

    it('should handle multiple files', () => {
      const files = [
        { path: 'src/file1.ts', content: 'code1' },
        { path: 'src/file2.ts', content: 'code2' }
      ]

      const prompt = (service as any).buildReviewPrompt(files, 'all')

      expect(prompt).toContain('src/file1.ts')
      expect(prompt).toContain('src/file2.ts')
      expect(prompt).toContain('code1')
      expect(prompt).toContain('code2')
    })

    it('should include diffs when provided', () => {
      const files = [
        {
          path: 'src/test.ts',
          content: 'new code',
          diff: '+console.log("added")\n-console.log("removed")'
        }
      ]

      const prompt = (service as any).buildReviewPrompt(files, 'all')

      expect(prompt).toContain('diff')
      expect(prompt).toContain('+console.log("added")')
    })
  })

  describe('parseReviewResponse', () => {
    it('should parse JSON response format', () => {
      const response = JSON.stringify({
        summary: 'Code looks good overall',
        approved: true,
        comments: [
          {
            file: 'src/test.ts',
            line: 10,
            severity: 'warning',
            message: 'Consider adding type annotation'
          }
        ]
      })

      const result = (service as any).parseReviewResponse(response)

      expect(result.summary).toBe('Code looks good overall')
      expect(result.approved).toBe(true)
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].file).toBe('src/test.ts')
      expect(result.comments[0].line).toBe(10)
      expect(result.comments[0].severity).toBe('warning')
    })

    it('should handle malformed JSON gracefully', () => {
      const response = 'This is not JSON'

      const result = (service as any).parseReviewResponse(response)

      expect(result.summary).toBeDefined()
      expect(result.approved).toBe(false)
      expect(result.comments).toEqual([])
    })

    it('should assign IDs to comments', () => {
      const response = JSON.stringify({
        summary: 'Review',
        approved: true,
        comments: [
          { file: 'src/test.ts', severity: 'info', message: 'Comment 1' },
          { file: 'src/test.ts', severity: 'info', message: 'Comment 2' }
        ]
      })

      const result = (service as any).parseReviewResponse(response)

      expect(result.comments[0].id).toBeDefined()
      expect(result.comments[1].id).toBeDefined()
      expect(result.comments[0].id).not.toBe(result.comments[1].id)
    })
  })
})
