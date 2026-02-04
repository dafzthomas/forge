import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FileWatcherService } from '../watcher/service'
import { ProjectService } from '../projects'
import { initDatabase, closeDatabase } from '../database'
import fs from 'fs'
import path from 'path'
import type { CreateWatchRuleInput, WatchEvent } from '../watcher/types'

const TEST_DB_PATH = path.join(__dirname, 'watcher-test.db')

describe('FileWatcherService', () => {
  let service: FileWatcherService
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

    // Create a test project directory
    testProjectPath = path.join(__dirname, 'test-watcher-project')
    if (!fs.existsSync(testProjectPath)) {
      fs.mkdirSync(testProjectPath, { recursive: true })
    }

    const testProject = projectService.addProject(testProjectPath, 'Test Watcher Project')
    testProjectId = testProject.id

    service = new FileWatcherService()
  })

  afterEach(async () => {
    // Stop all watchers
    const activeWatchers = service.getActiveWatchers()
    for (const projectId of activeWatchers) {
      await service.stopWatching(projectId)
    }

    closeDatabase()

    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    const walPath = TEST_DB_PATH + '-wal'
    const shmPath = TEST_DB_PATH + '-shm'
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

    // Clean up test project directory
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true })
    }
  })

  describe('Rule Management', () => {
    it('should create a watch rule', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Watch TypeScript files',
        pattern: '**/*.ts',
        events: ['change'],
        action: 'notify',
        enabled: true,
        debounceMs: 1000,
      }

      const rule = await service.addRule(input)

      expect(rule.id).toBeDefined()
      expect(rule.projectId).toBe(testProjectId)
      expect(rule.name).toBe('Watch TypeScript files')
      expect(rule.pattern).toBe('**/*.ts')
      expect(rule.events).toEqual(['change'])
      expect(rule.enabled).toBe(true)
    })

    it('should list rules for a project', async () => {
      const input1: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Rule 1',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 1000,
      }

      const input2: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Rule 2',
        pattern: '**/*.js',
        events: ['add', 'unlink'],
        enabled: false,
        debounceMs: 500,
      }

      await service.addRule(input1)
      await service.addRule(input2)

      const rules = service.listRules(testProjectId)
      expect(rules).toHaveLength(2)
      expect(rules.some((r) => r.name === 'Rule 1')).toBe(true)
      expect(rules.some((r) => r.name === 'Rule 2')).toBe(true)
    })

    it('should update a watch rule', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Original Name',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 1000,
      }

      const rule = await service.addRule(input)
      const updated = await service.updateRule(rule.id, {
        name: 'Updated Name',
        enabled: false,
      })

      expect(updated).toBeDefined()
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.enabled).toBe(false)
      expect(updated?.pattern).toBe('**/*.ts') // Unchanged
    })

    it('should remove a watch rule', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'To Remove',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 1000,
      }

      const rule = await service.addRule(input)
      const removed = await service.removeRule(rule.id)

      expect(removed).toBe(true)

      const rules = service.listRules(testProjectId)
      expect(rules).toHaveLength(0)
    })

    it('should return false when removing non-existent rule', async () => {
      const removed = await service.removeRule('non-existent-id')
      expect(removed).toBe(false)
    })

    it('should return null when updating non-existent rule', async () => {
      const updated = await service.updateRule('non-existent-id', { name: 'New Name' })
      expect(updated).toBeNull()
    })
  })

  describe('Watcher Lifecycle', () => {
    it('should start watching a project', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Test Rule',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 1000,
      }

      await service.addRule(input)
      service.startWatching(testProjectId)

      const activeWatchers = service.getActiveWatchers()
      expect(activeWatchers).toContain(testProjectId)
    })

    it('should stop watching a project', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Test Rule',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 1000,
      }

      await service.addRule(input)
      service.startWatching(testProjectId)
      await service.stopWatching(testProjectId)

      const activeWatchers = service.getActiveWatchers()
      expect(activeWatchers).not.toContain(testProjectId)
    })

    it('should not start watching if no enabled rules', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Disabled Rule',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: false,
        debounceMs: 1000,
      }

      await service.addRule(input)
      service.startWatching(testProjectId)

      const activeWatchers = service.getActiveWatchers()
      expect(activeWatchers).not.toContain(testProjectId)
    })

    it('should handle starting watcher for already watched project', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Test Rule',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 1000,
      }

      await service.addRule(input)
      service.startWatching(testProjectId)
      service.startWatching(testProjectId) // Should not throw

      const activeWatchers = service.getActiveWatchers()
      expect(activeWatchers).toContain(testProjectId)
    })

    it('should handle stopping watcher for non-watched project', async () => {
      await service.stopWatching('non-existent-id') // Should not throw
      expect(true).toBe(true) // Test passes if no error
    })

    it('should throw error when starting watcher for non-existent project', () => {
      expect(() => service.startWatching('non-existent-id')).toThrow('Project not found')
    })
  })

  describe('Event Subscription', () => {
    it('should subscribe to watch events', () => {
      const callback = vi.fn()
      const unsubscribe = service.subscribe(callback)

      // Verify the subscription mechanism works
      expect(typeof unsubscribe).toBe('function')

      // Unsubscribe
      unsubscribe()

      // The callback should not be called after unsubscribe
      // (We can't easily test real file events in unit tests)
      expect(callback).not.toHaveBeenCalled()
    })

    it('should unsubscribe from watch events', () => {
      const callback = vi.fn()
      const unsubscribe = service.subscribe(callback)
      unsubscribe()

      // Callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Rule Actions', () => {
    it('should create rule with skill action', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Run Skill',
        pattern: '**/*.ts',
        events: ['change'],
        action: 'skill',
        skillName: 'test-skill',
        enabled: true,
        debounceMs: 1000,
      }

      const rule = await service.addRule(input)

      expect(rule.action).toBe('skill')
      expect(rule.skillName).toBe('test-skill')
    })

    it('should create rule with custom command action', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Run Command',
        pattern: '**/*.ts',
        events: ['change'],
        action: 'custom',
        customCommand: 'echo {path}',
        enabled: true,
        debounceMs: 1000,
      }

      const rule = await service.addRule(input)

      expect(rule.action).toBe('custom')
      expect(rule.customCommand).toBe('echo {path}')
    })

    it('should create rule with multiple event types', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Multi Event',
        pattern: '**/*.ts',
        events: ['add', 'change', 'unlink'],
        enabled: true,
        debounceMs: 1000,
      }

      const rule = await service.addRule(input)

      expect(rule.events).toEqual(['add', 'change', 'unlink'])
    })

    it('should handle different debounce times', async () => {
      const input1: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Fast',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 100,
      }

      const input2: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Slow',
        pattern: '**/*.js',
        events: ['change'],
        enabled: true,
        debounceMs: 5000,
      }

      const rule1 = await service.addRule(input1)
      const rule2 = await service.addRule(input2)

      expect(rule1.debounceMs).toBe(100)
      expect(rule2.debounceMs).toBe(5000)
    })
  })

  describe('Database Persistence', () => {
    it('should persist rules to database', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'Persisted Rule',
        pattern: '**/*.ts',
        events: ['change'],
        enabled: true,
        debounceMs: 1000,
      }

      await service.addRule(input)

      // Create new service instance to test persistence
      const newService = new FileWatcherService()
      const rules = newService.listRules(testProjectId)

      expect(rules).toHaveLength(1)
      expect(rules[0].name).toBe('Persisted Rule')
    })

    it('should handle JSON serialization of events array', async () => {
      const input: CreateWatchRuleInput = {
        projectId: testProjectId,
        name: 'JSON Test',
        pattern: '**/*.ts',
        events: ['add', 'change', 'unlink'],
        enabled: true,
        debounceMs: 1000,
      }

      const rule = await service.addRule(input)
      const loaded = service.listRules(testProjectId)[0]

      expect(loaded.events).toEqual(['add', 'change', 'unlink'])
      expect(Array.isArray(loaded.events)).toBe(true)
    })
  })
})
