/**
 * Tests for History Service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { HistoryService } from '../history/service'
import { ProjectService } from '../projects'
import { TaskQueueService } from '../tasks'
import { initDatabase, closeDatabase } from '../database'
import fs from 'fs'
import path from 'path'
import type { HistorySearchQuery } from '../history/types'

const TEST_DB_PATH = path.join(__dirname, 'history-test.db')

describe('HistoryService', () => {
  let service: HistoryService
  let projectService: ProjectService
  let taskService: TaskQueueService
  let testProjectId: string
  let testTaskId: string

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
    taskService = new TaskQueueService()

    // Create a test project
    const testProjectPath = path.join(__dirname, 'test-project')
    const testProject = projectService.addProject(testProjectPath, 'Test Project')
    testProjectId = testProject.id

    // Create a test task
    const testTask = taskService.createTask({
      projectId: testProjectId,
      description: 'Test task',
    })
    testTaskId = testTask.id

    service = new HistoryService()
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

  describe('createConversation', () => {
    it('should create a conversation', () => {
      const conversation = service.createConversation(
        testTaskId,
        testProjectId,
        'Test Conversation'
      )

      expect(conversation).toBeDefined()
      expect(conversation.id).toBeDefined()
      expect(conversation.taskId).toBe(testTaskId)
      expect(conversation.projectId).toBe(testProjectId)
      expect(conversation.title).toBe('Test Conversation')
      expect(conversation.startedAt).toBeInstanceOf(Date)
      expect(conversation.endedAt).toBeUndefined()
      expect(conversation.messageCount).toBe(0)
    })

    it('should create a conversation with default title', () => {
      const conversation = service.createConversation(testTaskId, testProjectId)

      expect(conversation.title).toMatch(/^Conversation [a-f0-9]{8}$/)
    })

    it('should retrieve created conversation', () => {
      const created = service.createConversation(
        testTaskId,
        testProjectId,
        'Test Conversation'
      )

      const retrieved = service.getConversation(created.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.title).toBe('Test Conversation')
    })
  })

  describe('addMessage', () => {
    it('should add a message to a conversation', () => {
      const conversation = service.createConversation(
        testTaskId,
        testProjectId,
        'Test Conversation'
      )

      const message = service.addMessage(conversation.id, {
        role: 'user',
        content: 'Hello, assistant!',
      })

      expect(message).toBeDefined()
      expect(message.id).toBeDefined()
      expect(message.conversationId).toBe(conversation.id)
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello, assistant!')
      expect(message.timestamp).toBeInstanceOf(Date)
    })

    it('should add a tool message with metadata', () => {
      const conversation = service.createConversation(testTaskId, testProjectId)

      const message = service.addMessage(conversation.id, {
        role: 'tool',
        content: 'Tool executed successfully',
        toolName: 'test-tool',
        toolInput: JSON.stringify({ arg: 'value' }),
        toolOutput: JSON.stringify({ result: 'success' }),
      })

      expect(message.role).toBe('tool')
      expect(message.toolName).toBe('test-tool')
      expect(message.toolInput).toBe(JSON.stringify({ arg: 'value' }))
      expect(message.toolOutput).toBe(JSON.stringify({ result: 'success' }))
    })

    it('should increment message count', () => {
      const conversation = service.createConversation(testTaskId, testProjectId)

      service.addMessage(conversation.id, {
        role: 'user',
        content: 'Message 1',
      })

      service.addMessage(conversation.id, {
        role: 'assistant',
        content: 'Message 2',
      })

      const updated = service.getConversation(conversation.id)
      expect(updated!.messageCount).toBe(2)
    })

    it('should throw error for non-existent conversation', () => {
      expect(() => {
        service.addMessage('non-existent', {
          role: 'user',
          content: 'Test',
        })
      }).toThrow('Conversation not found')
    })
  })

  describe('getMessages', () => {
    it('should retrieve messages in order', () => {
      const conversation = service.createConversation(testTaskId, testProjectId)

      service.addMessage(conversation.id, {
        role: 'user',
        content: 'First message',
      })

      service.addMessage(conversation.id, {
        role: 'assistant',
        content: 'Second message',
      })

      service.addMessage(conversation.id, {
        role: 'user',
        content: 'Third message',
      })

      const messages = service.getMessages(conversation.id)
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('First message')
      expect(messages[1].content).toBe('Second message')
      expect(messages[2].content).toBe('Third message')
    })

    it('should return empty array for conversation with no messages', () => {
      const conversation = service.createConversation(testTaskId, testProjectId)
      const messages = service.getMessages(conversation.id)
      expect(messages).toEqual([])
    })
  })

  describe('endConversation', () => {
    it('should set end timestamp', () => {
      const conversation = service.createConversation(testTaskId, testProjectId)

      service.endConversation(conversation.id)

      const updated = service.getConversation(conversation.id)
      expect(updated!.endedAt).toBeInstanceOf(Date)
    })

    it('should throw error for non-existent conversation', () => {
      expect(() => {
        service.endConversation('non-existent')
      }).toThrow('Conversation not found')
    })
  })

  describe('log', () => {
    it('should create a task log entry', () => {
      const log = service.log(testTaskId, 'info', 'Test log message')

      expect(log).toBeDefined()
      expect(log.id).toBeDefined()
      expect(log.taskId).toBe(testTaskId)
      expect(log.level).toBe('info')
      expect(log.message).toBe('Test log message')
      expect(log.timestamp).toBeInstanceOf(Date)
      expect(log.metadata).toBeUndefined()
    })

    it('should create a log with metadata', () => {
      const metadata = { key: 'value', count: 42 }
      const log = service.log(testTaskId, 'debug', 'Test with metadata', metadata)

      expect(log.metadata).toEqual(metadata)
    })

    it('should support all log levels', () => {
      const levels = ['debug', 'info', 'warn', 'error'] as const

      for (const level of levels) {
        const log = service.log(testTaskId, level, `${level} message`)
        expect(log.level).toBe(level)
      }
    })
  })

  describe('getTaskLogs', () => {
    it('should retrieve logs in order', () => {
      service.log(testTaskId, 'info', 'First log')
      service.log(testTaskId, 'warn', 'Second log')
      service.log(testTaskId, 'error', 'Third log')

      const logs = service.getTaskLogs(testTaskId)
      expect(logs).toHaveLength(3)
      expect(logs[0].message).toBe('First log')
      expect(logs[1].message).toBe('Second log')
      expect(logs[2].message).toBe('Third log')
    })

    it('should return empty array for task with no logs', () => {
      const logs = service.getTaskLogs(testTaskId)
      expect(logs).toEqual([])
    })
  })

  describe('search', () => {
    beforeEach(() => {
      // Create some test conversations
      const conv1 = service.createConversation(
        testTaskId,
        testProjectId,
        'Authentication Bug Fix'
      )
      service.addMessage(conv1.id, {
        role: 'user',
        content: 'Fix the login authentication issue',
      })
      service.addMessage(conv1.id, {
        role: 'assistant',
        content: 'I will help you fix the authentication bug',
      })

      const conv2 = service.createConversation(testTaskId, testProjectId, 'Database Migration')
      service.addMessage(conv2.id, {
        role: 'user',
        content: 'Create a migration for the users table',
      })
    })

    it('should search by project ID', () => {
      const result = service.search({ projectId: testProjectId })

      expect(result.totalCount).toBe(2)
      expect(result.conversations).toHaveLength(2)
    })

    it('should search by task ID', () => {
      const result = service.search({ taskId: testTaskId })

      expect(result.totalCount).toBe(2)
      expect(result.conversations).toHaveLength(2)
    })

    it('should support pagination', () => {
      const result = service.search({
        projectId: testProjectId,
        limit: 1,
        offset: 0,
      })

      expect(result.conversations).toHaveLength(1)
      expect(result.totalCount).toBe(2)

      const result2 = service.search({
        projectId: testProjectId,
        limit: 1,
        offset: 1,
      })

      expect(result2.conversations).toHaveLength(1)
      expect(result2.totalCount).toBe(2)
      expect(result2.conversations[0].id).not.toBe(result.conversations[0].id)
    })

    it('should return empty result for non-existent project', () => {
      const result = service.search({ projectId: 'non-existent' })

      expect(result.totalCount).toBe(0)
      expect(result.conversations).toEqual([])
    })
  })

  describe('getRecentConversations', () => {
    it('should return conversations ordered by start time', async () => {
      // Create conversations and manually set different timestamps
      const conv1 = service.createConversation(testTaskId, testProjectId, 'First')
      const conv2 = service.createConversation(testTaskId, testProjectId, 'Second')
      const conv3 = service.createConversation(testTaskId, testProjectId, 'Third')

      // Manually update timestamps to ensure ordering
      const { getDatabase } = await import('../database')
      const db = getDatabase()

      const now = Date.now()
      db.prepare('UPDATE conversations SET started_at = ? WHERE id = ?')
        .run(new Date(now - 3000).toISOString(), conv1.id)
      db.prepare('UPDATE conversations SET started_at = ? WHERE id = ?')
        .run(new Date(now - 2000).toISOString(), conv2.id)
      db.prepare('UPDATE conversations SET started_at = ? WHERE id = ?')
        .run(new Date(now - 1000).toISOString(), conv3.id)

      const recent = service.getRecentConversations(testProjectId)

      expect(recent).toHaveLength(3)
      // Most recent first
      expect(recent[0].id).toBe(conv3.id)
      expect(recent[1].id).toBe(conv2.id)
      expect(recent[2].id).toBe(conv1.id)
    })

    it('should respect limit parameter', () => {
      service.createConversation(testTaskId, testProjectId, 'First')
      service.createConversation(testTaskId, testProjectId, 'Second')
      service.createConversation(testTaskId, testProjectId, 'Third')

      const recent = service.getRecentConversations(testProjectId, 2)

      expect(recent).toHaveLength(2)
    })

    it('should return empty array for project with no conversations', () => {
      const otherProject = projectService.addProject('/other/path', 'Other Project')
      const recent = service.getRecentConversations(otherProject.id)

      expect(recent).toEqual([])
    })
  })

  describe('exportConversation', () => {
    it('should export conversation as JSON', () => {
      const conversation = service.createConversation(
        testTaskId,
        testProjectId,
        'Test Export'
      )
      service.addMessage(conversation.id, {
        role: 'user',
        content: 'Test message',
      })

      const exported = service.exportConversation(conversation.id, 'json')
      const parsed = JSON.parse(exported)

      expect(parsed.conversation).toBeDefined()
      expect(parsed.conversation.id).toBe(conversation.id)
      expect(parsed.messages).toHaveLength(1)
      expect(parsed.messages[0].content).toBe('Test message')
    })

    it('should export conversation as Markdown', () => {
      const conversation = service.createConversation(
        testTaskId,
        testProjectId,
        'Test Export'
      )
      service.addMessage(conversation.id, {
        role: 'user',
        content: 'Test message',
      })

      const exported = service.exportConversation(conversation.id, 'markdown')

      expect(exported).toContain('# Test Export')
      expect(exported).toContain('## User')
      expect(exported).toContain('Test message')
    })

    it('should throw error for non-existent conversation', () => {
      expect(() => {
        service.exportConversation('non-existent', 'json')
      }).toThrow('Conversation not found')
    })
  })

  describe('cleanupOldHistory', () => {
    it('should delete old conversations', async () => {
      // Create a conversation
      const conversation = service.createConversation(testTaskId, testProjectId)

      // Manually set an old timestamp
      const { getDatabase } = await import('../database')
      const db = getDatabase()
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 100) // 100 days ago

      db.prepare(
        'UPDATE conversations SET started_at = ? WHERE id = ?'
      ).run(oldDate.toISOString(), conversation.id)

      // Clean up conversations older than 30 days
      const deletedCount = service.cleanupOldHistory(30)

      expect(deletedCount).toBe(1)

      // Verify conversation was deleted
      const retrieved = service.getConversation(conversation.id)
      expect(retrieved).toBeNull()
    })

    it('should not delete recent conversations', () => {
      const conversation = service.createConversation(testTaskId, testProjectId)

      const deletedCount = service.cleanupOldHistory(30)

      expect(deletedCount).toBe(0)

      const retrieved = service.getConversation(conversation.id)
      expect(retrieved).not.toBeNull()
    })
  })
})
