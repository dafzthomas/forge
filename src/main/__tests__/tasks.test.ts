import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskQueueService, resetTaskQueueService } from '../tasks'
import { ProjectService } from '../projects'
import { initDatabase, closeDatabase } from '../database'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = path.join(__dirname, 'tasks-test.db')

describe('TaskQueueService', () => {
  let service: TaskQueueService
  let projectService: ProjectService
  let testProjectId: string

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    // Also clean up WAL files
    const walPath = TEST_DB_PATH + '-wal'
    const shmPath = TEST_DB_PATH + '-shm'
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

    initDatabase(TEST_DB_PATH)
    resetTaskQueueService()
    service = new TaskQueueService()
    projectService = new ProjectService()

    // Create a test project for foreign key constraints
    const testProject = projectService.addProject('/test/project', 'Test Project')
    testProjectId = testProject.id
  })

  afterEach(() => {
    closeDatabase()
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    const walPath = TEST_DB_PATH + '-wal'
    const shmPath = TEST_DB_PATH + '-shm'
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
  })

  describe('createTask', () => {
    it('should create task with UUID and queued status', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Test task',
      })

      expect(task.id).toBeDefined()
      expect(task.id.length).toBeGreaterThan(0)
      // UUID format check
      expect(task.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
      expect(task.status).toBe('queued')
      expect(task.projectId).toBe(testProjectId)
      expect(task.description).toBe('Test task')
    })

    it('should use default priority (normal) when not specified', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Test task',
      })

      expect(task.priority).toBe('normal')
    })

    it('should accept custom priority', () => {
      const highTask = service.createTask({
        projectId: testProjectId,
        description: 'High priority',
        priority: 'high',
      })
      const lowTask = service.createTask({
        projectId: testProjectId,
        description: 'Low priority',
        priority: 'low',
      })

      expect(highTask.priority).toBe('high')
      expect(lowTask.priority).toBe('low')
    })

    it('should store optional fields', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Task with options',
        skillName: 'code-review',
        model: 'claude-3-opus',
      })

      expect(task.skillName).toBe('code-review')
      expect(task.model).toBe('claude-3-opus')
    })

    it('should set createdAt timestamp', () => {
      const before = new Date()
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Test task',
      })
      const after = new Date()

      expect(task.createdAt).toBeInstanceOf(Date)
      expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(task.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should not set startedAt or completedAt on creation', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Test task',
      })

      expect(task.startedAt).toBeUndefined()
      expect(task.completedAt).toBeUndefined()
    })

    it('should reject invalid projectId', () => {
      expect(() =>
        service.createTask({
          projectId: 'non-existent-project-id',
          description: 'Test task',
        })
      ).toThrow('Project not found: non-existent-project-id')
    })
  })

  describe('getTasks', () => {
    it('should return empty array when no tasks', () => {
      const tasks = service.getTasks()
      expect(tasks).toEqual([])
    })

    it('should return all tasks', () => {
      service.createTask({ projectId: testProjectId, description: 'Task 1' })
      service.createTask({ projectId: testProjectId, description: 'Task 2' })
      service.createTask({ projectId: testProjectId, description: 'Task 3' })

      const tasks = service.getTasks()

      expect(tasks).toHaveLength(3)
      expect(tasks.map((t) => t.description)).toContain('Task 1')
      expect(tasks.map((t) => t.description)).toContain('Task 2')
      expect(tasks.map((t) => t.description)).toContain('Task 3')
    })

    it('should filter by projectId', () => {
      // Create additional projects for this test
      const projectA = projectService.addProject('/test/project-a', 'Project A')
      const projectB = projectService.addProject('/test/project-b', 'Project B')

      service.createTask({ projectId: projectA.id, description: 'Task A1' })
      service.createTask({ projectId: projectA.id, description: 'Task A2' })
      service.createTask({ projectId: projectB.id, description: 'Task B1' })

      const tasksA = service.getTasks(projectA.id)
      const tasksB = service.getTasks(projectB.id)

      expect(tasksA).toHaveLength(2)
      expect(tasksA.map((t) => t.description)).toContain('Task A1')
      expect(tasksA.map((t) => t.description)).toContain('Task A2')

      expect(tasksB).toHaveLength(1)
      expect(tasksB[0].description).toBe('Task B1')
    })

    it('should return empty array for non-existent project', () => {
      service.createTask({ projectId: testProjectId, description: 'Task' })

      const tasks = service.getTasks('non-existent')

      expect(tasks).toEqual([])
    })
  })

  describe('getTask', () => {
    it('should return single task by ID', () => {
      const created = service.createTask({
        projectId: testProjectId,
        description: 'Find me',
      })

      const found = service.getTask(created.id)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.description).toBe('Find me')
    })

    it('should return null for non-existent ID', () => {
      const found = service.getTask('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('cancelTask', () => {
    it('should cancel queued task', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'To cancel',
      })

      const cancelled = service.cancelTask(task.id)

      expect(cancelled).toBe(true)

      const updated = service.getTask(task.id)
      expect(updated!.status).toBe('cancelled')
      expect(updated!.completedAt).toBeInstanceOf(Date)
    })

    it('should cancel running task', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Running task',
      })
      service.updateTaskStatus(task.id, 'running')

      const cancelled = service.cancelTask(task.id)

      expect(cancelled).toBe(true)

      const updated = service.getTask(task.id)
      expect(updated!.status).toBe('cancelled')
    })

    it('should fail for completed tasks', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Done task',
      })
      service.updateTaskStatus(task.id, 'completed', 'Result')

      const cancelled = service.cancelTask(task.id)

      expect(cancelled).toBe(false)

      const unchanged = service.getTask(task.id)
      expect(unchanged!.status).toBe('completed')
    })

    it('should fail for failed tasks', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Failed task',
      })
      service.updateTaskStatus(task.id, 'failed', undefined, 'Error occurred')

      const cancelled = service.cancelTask(task.id)

      expect(cancelled).toBe(false)

      const unchanged = service.getTask(task.id)
      expect(unchanged!.status).toBe('failed')
    })

    it('should fail for already cancelled tasks', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Already cancelled',
      })
      service.cancelTask(task.id)

      const cancelledAgain = service.cancelTask(task.id)

      expect(cancelledAgain).toBe(false)
    })

    it('should return false for non-existent task', () => {
      const cancelled = service.cancelTask('non-existent')
      expect(cancelled).toBe(false)
    })
  })

  describe('updateTaskStatus', () => {
    it('should update status', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Task',
      })

      const updated = service.updateTaskStatus(task.id, 'running')

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe('running')
    })

    it('should set startedAt when moving to running', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Task',
      })

      const updated = service.updateTaskStatus(task.id, 'running')

      expect(updated!.startedAt).toBeInstanceOf(Date)
    })

    it('should set completedAt when moving to completed', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Task',
      })
      service.updateTaskStatus(task.id, 'running')

      const updated = service.updateTaskStatus(task.id, 'completed', 'Success!')

      expect(updated!.completedAt).toBeInstanceOf(Date)
      expect(updated!.result).toBe('Success!')
    })

    it('should set completedAt when moving to failed', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Task',
      })
      service.updateTaskStatus(task.id, 'running')

      const updated = service.updateTaskStatus(
        task.id,
        'failed',
        undefined,
        'Something went wrong'
      )

      expect(updated!.completedAt).toBeInstanceOf(Date)
      expect(updated!.error).toBe('Something went wrong')
    })

    it('should return null for non-existent task', () => {
      const result = service.updateTaskStatus('non-existent', 'running')
      expect(result).toBeNull()
    })
  })

  describe('getNextTask', () => {
    it('should return null when no tasks', () => {
      const next = service.getNextTask()
      expect(next).toBeNull()
    })

    it('should return null when no queued tasks', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Running',
      })
      service.updateTaskStatus(task.id, 'running')

      const next = service.getNextTask()
      expect(next).toBeNull()
    })

    it('should respect priority order - high before normal', () => {
      // Create in reverse priority order
      service.createTask({
        projectId: testProjectId,
        description: 'Normal task',
        priority: 'normal',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'High task',
        priority: 'high',
      })

      const next = service.getNextTask()

      expect(next).not.toBeNull()
      expect(next!.description).toBe('High task')
      expect(next!.priority).toBe('high')
    })

    it('should respect priority order - normal before low', () => {
      service.createTask({
        projectId: testProjectId,
        description: 'Low task',
        priority: 'low',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'Normal task',
        priority: 'normal',
      })

      const next = service.getNextTask()

      expect(next).not.toBeNull()
      expect(next!.description).toBe('Normal task')
      expect(next!.priority).toBe('normal')
    })

    it('should respect FIFO within same priority', () => {
      service.createTask({
        projectId: testProjectId,
        description: 'First',
        priority: 'normal',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'Second',
        priority: 'normal',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'Third',
        priority: 'normal',
      })

      const first = service.getNextTask()
      expect(first!.description).toBe('First')

      // Mark first as running and get next
      service.updateTaskStatus(first!.id, 'running')
      const second = service.getNextTask()
      expect(second!.description).toBe('Second')

      service.updateTaskStatus(second!.id, 'running')
      const third = service.getNextTask()
      expect(third!.description).toBe('Third')
    })

    it('should handle complex priority scenarios', () => {
      // Create tasks in mixed order
      service.createTask({
        projectId: testProjectId,
        description: 'Low 1',
        priority: 'low',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'High 1',
        priority: 'high',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'Normal 1',
        priority: 'normal',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'High 2',
        priority: 'high',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'Low 2',
        priority: 'low',
      })

      // Should get high tasks first (in FIFO order)
      let next = service.getNextTask()
      expect(next!.description).toBe('High 1')
      service.updateTaskStatus(next!.id, 'completed')

      next = service.getNextTask()
      expect(next!.description).toBe('High 2')
      service.updateTaskStatus(next!.id, 'completed')

      // Then normal
      next = service.getNextTask()
      expect(next!.description).toBe('Normal 1')
      service.updateTaskStatus(next!.id, 'completed')

      // Then low (in FIFO order)
      next = service.getNextTask()
      expect(next!.description).toBe('Low 1')
      service.updateTaskStatus(next!.id, 'completed')

      next = service.getNextTask()
      expect(next!.description).toBe('Low 2')
    })
  })

  describe('concurrency control', () => {
    it('should have default maxConcurrent of 2', () => {
      expect(service.getMaxConcurrent()).toBe(2)
    })

    it('should report running count correctly', () => {
      expect(service.getRunningCount()).toBe(0)

      const task1 = service.createTask({ projectId: testProjectId, description: 'T1' })
      const task2 = service.createTask({ projectId: testProjectId, description: 'T2' })

      service.updateTaskStatus(task1.id, 'running')
      expect(service.getRunningCount()).toBe(1)

      service.updateTaskStatus(task2.id, 'running')
      expect(service.getRunningCount()).toBe(2)

      service.updateTaskStatus(task1.id, 'completed')
      expect(service.getRunningCount()).toBe(1)
    })

    it('should respect maxConcurrent in canStartMore', () => {
      service.setMaxConcurrent(2)

      const task1 = service.createTask({ projectId: testProjectId, description: 'T1' })
      const task2 = service.createTask({ projectId: testProjectId, description: 'T2' })
      service.createTask({ projectId: testProjectId, description: 'T3' })

      expect(service.canStartMore()).toBe(true)

      service.updateTaskStatus(task1.id, 'running')
      expect(service.canStartMore()).toBe(true)

      service.updateTaskStatus(task2.id, 'running')
      expect(service.canStartMore()).toBe(false)

      service.updateTaskStatus(task1.id, 'completed')
      expect(service.canStartMore()).toBe(true)
    })

    it('should allow setting maxConcurrent', () => {
      service.setMaxConcurrent(5)
      expect(service.getMaxConcurrent()).toBe(5)
    })

    it('should reject maxConcurrent less than 1', () => {
      expect(() => service.setMaxConcurrent(0)).toThrow(
        'Max concurrent must be at least 1'
      )
      expect(() => service.setMaxConcurrent(-1)).toThrow(
        'Max concurrent must be at least 1'
      )
    })
  })

  describe('claimNextTask', () => {
    it('should atomically claim the next task', () => {
      service.createTask({
        projectId: testProjectId,
        description: 'Task to claim',
      })

      const claimed = service.claimNextTask()

      expect(claimed).not.toBeNull()
      expect(claimed!.status).toBe('running')
      expect(claimed!.startedAt).toBeInstanceOf(Date)
    })

    it('should return null when no tasks available', () => {
      const claimed = service.claimNextTask()
      expect(claimed).toBeNull()
    })

    it('should return null when at max concurrency', () => {
      service.setMaxConcurrent(1)

      const task1 = service.createTask({
        projectId: testProjectId,
        description: 'Task 1',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'Task 2',
      })

      service.updateTaskStatus(task1.id, 'running')

      const claimed = service.claimNextTask()
      expect(claimed).toBeNull()
    })

    it('should respect priority when claiming', () => {
      service.createTask({
        projectId: testProjectId,
        description: 'Normal task',
        priority: 'normal',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'High task',
        priority: 'high',
      })

      const claimed = service.claimNextTask()

      expect(claimed).not.toBeNull()
      expect(claimed!.description).toBe('High task')
      expect(claimed!.priority).toBe('high')
    })

    it('should claim tasks sequentially', () => {
      service.setMaxConcurrent(3)

      service.createTask({
        projectId: testProjectId,
        description: 'Task 1',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'Task 2',
      })
      service.createTask({
        projectId: testProjectId,
        description: 'Task 3',
      })

      const claimed1 = service.claimNextTask()
      const claimed2 = service.claimNextTask()
      const claimed3 = service.claimNextTask()

      expect(claimed1!.description).toBe('Task 1')
      expect(claimed2!.description).toBe('Task 2')
      expect(claimed3!.description).toBe('Task 3')

      // All should be running
      expect(service.getRunningCount()).toBe(3)

      // No more should be claimable
      const claimed4 = service.claimNextTask()
      expect(claimed4).toBeNull()
    })
  })

  describe('database persistence', () => {
    it('should persist tasks across service instances', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Persistent task',
        priority: 'high',
        skillName: 'test-skill',
      })

      // Create new service instance
      const newService = new TaskQueueService()
      const found = newService.getTask(task.id)

      expect(found).not.toBeNull()
      expect(found!.description).toBe('Persistent task')
      expect(found!.priority).toBe('high')
      expect(found!.skillName).toBe('test-skill')
    })

    it('should persist status updates', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Task',
      })
      service.updateTaskStatus(task.id, 'completed', 'Done!')

      const newService = new TaskQueueService()
      const found = newService.getTask(task.id)

      expect(found!.status).toBe('completed')
      expect(found!.result).toBe('Done!')
      expect(found!.completedAt).toBeInstanceOf(Date)
    })

    it('should persist cancellation', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Task',
      })
      service.cancelTask(task.id)

      const newService = new TaskQueueService()
      const found = newService.getTask(task.id)

      expect(found!.status).toBe('cancelled')
    })
  })

  describe('edge cases', () => {
    it('should handle tasks with very long descriptions', () => {
      const longDescription = 'A'.repeat(10000)
      const task = service.createTask({
        projectId: testProjectId,
        description: longDescription,
      })

      const found = service.getTask(task.id)
      expect(found!.description).toBe(longDescription)
    })

    it('should handle special characters in description', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: "Task with 'quotes' and \"double quotes\" and <html>",
      })

      const found = service.getTask(task.id)
      expect(found!.description).toBe(
        "Task with 'quotes' and \"double quotes\" and <html>"
      )
    })

    it('should handle unicode in description', () => {
      const task = service.createTask({
        projectId: testProjectId,
        description: 'Task with emoji \ud83d\ude80 and unicode \u4e2d\u6587',
      })

      const found = service.getTask(task.id)
      expect(found!.description).toBe('Task with emoji \ud83d\ude80 and unicode \u4e2d\u6587')
    })

    it('should not modify tasks from other projects when filtering', () => {
      const projectA = projectService.addProject('/test/project-filter-a', 'A')
      const projectB = projectService.addProject('/test/project-filter-b', 'B')

      service.createTask({ projectId: projectA.id, description: 'A1' })
      service.createTask({ projectId: projectB.id, description: 'B1' })

      const tasksA = service.getTasks(projectA.id)
      const allTasks = service.getTasks()

      expect(tasksA).toHaveLength(1)
      expect(allTasks).toHaveLength(2)
    })
  })
})
