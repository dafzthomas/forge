import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { SCHEMA } from '../database/schema'
import { PRService } from '../pr/service'

describe('PRService', () => {
  let db: Database.Database
  let service: PRService

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:')
    db.exec(SCHEMA)

    // Create test project
    db.prepare(`
      INSERT INTO projects (id, name, path, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run('test-project', 'Test Project', '/test/path')

    // Create test task
    db.prepare(`
      INSERT INTO tasks (id, project_id, description, status, priority, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run('test-task', 'test-project', 'Test task', 'completed', 'normal')

    service = new PRService(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('getPR', () => {
    it('should return PR by ID', () => {
      // Insert a PR directly for testing
      const prId = 'test-pr-id'
      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(prId, 'test-task', 'test-project', 123, 'https://github.com/test/repo/pull/123',
             'Test PR', 'Test description', 'open', new Date().toISOString())

      const retrieved = service.getPR(prId)

      expect(retrieved).toBeTruthy()
      expect(retrieved?.id).toBe(prId)
      expect(retrieved?.title).toBe('Test PR')
      expect(retrieved?.number).toBe(123)
      expect(retrieved?.url).toBe('https://github.com/test/repo/pull/123')
      expect(retrieved?.status).toBe('open')
    })

    it('should return null for non-existent PR', () => {
      const result = service.getPR('non-existent')
      expect(result).toBeNull()
    })

    it('should convert database row to PRResult correctly', () => {
      const prId = 'test-convert'
      const createdAt = new Date().toISOString()
      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(prId, 'test-task', 'test-project', 456, 'https://github.com/test/repo/pull/456',
             'Convert Test', 'Description', 'merged', createdAt)

      const pr = service.getPR(prId)

      expect(pr?.createdAt).toBeInstanceOf(Date)
      expect(pr?.createdAt.toISOString()).toBe(createdAt)
    })
  })

  describe('listPRs', () => {
    it('should list all PRs for a project', () => {
      // Insert multiple PRs
      const now = new Date().toISOString()
      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('pr1', 'test-task', 'test-project', 129, 'https://github.com/test/repo/pull/129',
             'PR 1', 'Description 1', 'open', now)

      // Ensure different timestamps by using a later date
      const later = new Date(Date.now() + 1000).toISOString()
      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('pr2', 'test-task', 'test-project', 130, 'https://github.com/test/repo/pull/130',
             'PR 2', 'Description 2', 'open', later)

      const prs = service.listPRs('test-project')
      expect(prs).toHaveLength(2)
      expect(prs[0].title).toBe('PR 2') // Most recent first
      expect(prs[1].title).toBe('PR 1')
    })

    it('should return empty array for project with no PRs', () => {
      const prs = service.listPRs('test-project')
      expect(prs).toEqual([])
    })

    it('should only return PRs for the specified project', () => {
      // Create another project
      db.prepare(`
        INSERT INTO projects (id, name, path, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `).run('other-project', 'Other Project', '/other/path')

      db.prepare(`
        INSERT INTO tasks (id, project_id, description, status, priority, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run('other-task', 'other-project', 'Other task', 'completed', 'normal')

      // Insert PRs for both projects
      const now = new Date().toISOString()
      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('pr1', 'test-task', 'test-project', 1, 'https://github.com/test/repo/pull/1',
             'Test PR', 'Description', 'open', now)

      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('pr2', 'other-task', 'other-project', 2, 'https://github.com/other/repo/pull/2',
             'Other PR', 'Description', 'open', now)

      const prs = service.listPRs('test-project')
      expect(prs).toHaveLength(1)
      expect(prs[0].title).toBe('Test PR')
    })

    it('should handle different PR statuses', () => {
      const now = new Date().toISOString()

      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('pr1', 'test-task', 'test-project', 1, 'https://github.com/test/repo/pull/1',
             'Open PR', 'Description', 'open', now)

      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('pr2', 'test-task', 'test-project', 2, 'https://github.com/test/repo/pull/2',
             'Merged PR', 'Description', 'merged', now)

      db.prepare(`
        INSERT INTO pull_requests (id, task_id, project_id, number, url, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('pr3', 'test-task', 'test-project', 3, 'https://github.com/test/repo/pull/3',
             'Closed PR', 'Description', 'closed', now)

      const prs = service.listPRs('test-project')
      expect(prs).toHaveLength(3)

      const openPR = prs.find(pr => pr.status === 'open')
      const mergedPR = prs.find(pr => pr.status === 'merged')
      const closedPR = prs.find(pr => pr.status === 'closed')

      expect(openPR).toBeTruthy()
      expect(mergedPR).toBeTruthy()
      expect(closedPR).toBeTruthy()
    })
  })

  describe('createPR validation', () => {
    it('should throw error if project not found', async () => {
      await expect(service.createPR({
        projectId: 'non-existent',
        taskId: 'test-task',
      })).rejects.toThrow('Project not found')
    })

    it('should throw error if task not found', async () => {
      await expect(service.createPR({
        projectId: 'test-project',
        taskId: 'non-existent',
      })).rejects.toThrow('Task not found')
    })
  })
})
