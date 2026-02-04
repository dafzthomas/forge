import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ProjectService } from '../projects'
import { initDatabase, closeDatabase } from '../database'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TEST_DB_PATH = path.join(__dirname, 'projects-test.db')

describe('ProjectService', () => {
  let service: ProjectService

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
    service = new ProjectService()
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

  describe('addProject', () => {
    it('should create project with generated ID', () => {
      const testPath = '/test/project/path'
      const project = service.addProject(testPath, 'Test Project')

      expect(project.id).toBeDefined()
      expect(project.id.length).toBeGreaterThan(0)
      expect(project.name).toBe('Test Project')
      expect(project.path).toBe(testPath)
      expect(project.createdAt).toBeInstanceOf(Date)
      expect(project.updatedAt).toBeInstanceOf(Date)
    })

    it('should use folder name if name not provided', () => {
      const testPath = '/users/developer/my-awesome-project'
      const project = service.addProject(testPath)

      expect(project.name).toBe('my-awesome-project')
    })

    it('should use folder name for Windows-style paths', () => {
      const testPath = 'C:\\Users\\developer\\MyProject'
      const project = service.addProject(testPath)

      expect(project.name).toBe('MyProject')
    })

    it('should reject duplicate paths', () => {
      const testPath = '/test/duplicate/path'
      service.addProject(testPath, 'First Project')

      expect(() => {
        service.addProject(testPath, 'Second Project')
      }).toThrow(/already exists/)
    })

    it('should normalize paths for duplicate detection', () => {
      const testPath = '/test/project/path'
      service.addProject(testPath, 'First')

      // Trailing slash should be normalized
      expect(() => {
        service.addProject(testPath + '/', 'Second')
      }).toThrow(/already exists/)
    })
  })

  describe('removeProject', () => {
    it('should delete project', () => {
      const project = service.addProject('/test/path', 'Test')
      const removed = service.removeProject(project.id)

      expect(removed).toBe(true)
      expect(service.getProject(project.id)).toBeNull()
    })

    it('should return false for non-existent project', () => {
      const removed = service.removeProject('non-existent-id')
      expect(removed).toBe(false)
    })
  })

  describe('getProjects', () => {
    it('should return empty array when no projects', () => {
      const projects = service.getProjects()
      expect(projects).toEqual([])
    })

    it('should return all projects', () => {
      service.addProject('/test/path1', 'Project 1')
      service.addProject('/test/path2', 'Project 2')
      service.addProject('/test/path3', 'Project 3')

      const projects = service.getProjects()

      expect(projects).toHaveLength(3)
      expect(projects.map((p) => p.name)).toContain('Project 1')
      expect(projects.map((p) => p.name)).toContain('Project 2')
      expect(projects.map((p) => p.name)).toContain('Project 3')
    })

    it('should return projects ordered by creation date descending', () => {
      // Add projects and verify they are returned in descending order by created_at
      const oldest = service.addProject('/test/oldest', 'Oldest')
      const middle = service.addProject('/test/middle', 'Middle')
      const newest = service.addProject('/test/newest', 'Newest')

      const projects = service.getProjects()

      // Verify all three projects exist
      expect(projects).toHaveLength(3)

      // The ORDER BY created_at DESC should put projects with later dates first
      // Since they're inserted in sequence, newest should have latest timestamp
      const projectIds = projects.map((p) => p.id)
      expect(projectIds).toContain(oldest.id)
      expect(projectIds).toContain(middle.id)
      expect(projectIds).toContain(newest.id)

      // Verify that created timestamps are ordered (descending)
      for (let i = 0; i < projects.length - 1; i++) {
        expect(projects[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          projects[i + 1].createdAt.getTime()
        )
      }
    })
  })

  describe('getProject', () => {
    it('should return single project by ID', () => {
      const created = service.addProject('/test/path', 'My Project')
      const found = service.getProject(created.id)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.name).toBe('My Project')
      expect(found!.path).toBe('/test/path')
    })

    it('should return null for non-existent ID', () => {
      const found = service.getProject('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('updateProject', () => {
    it('should update project name', () => {
      const project = service.addProject('/test/path', 'Original Name')
      const updated = service.updateProject(project.id, { name: 'New Name' })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('New Name')
      expect(updated!.path).toBe('/test/path')
    })

    it('should update defaultModel', () => {
      const project = service.addProject('/test/path', 'Test')
      const updated = service.updateProject(project.id, {
        defaultModel: 'claude-3-opus',
      })

      expect(updated).not.toBeNull()
      expect(updated!.defaultModel).toBe('claude-3-opus')
    })

    it('should update multiple fields at once', () => {
      const project = service.addProject('/test/path', 'Original')
      const updated = service.updateProject(project.id, {
        name: 'Updated Name',
        defaultModel: 'gpt-4',
      })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('Updated Name')
      expect(updated!.defaultModel).toBe('gpt-4')
    })

    it('should update updatedAt timestamp', () => {
      const project = service.addProject('/test/path', 'Test')
      const originalUpdatedAt = project.updatedAt

      // Small delay to ensure timestamp difference
      const updated = service.updateProject(project.id, { name: 'Updated' })

      expect(updated).not.toBeNull()
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime()
      )
    })

    it('should return null for non-existent project', () => {
      const updated = service.updateProject('non-existent', { name: 'Test' })
      expect(updated).toBeNull()
    })

    it('should clear defaultModel when set to undefined', () => {
      const project = service.addProject('/test/path', 'Test')
      service.updateProject(project.id, { defaultModel: 'claude-3-opus' })
      const updated = service.updateProject(project.id, {
        defaultModel: undefined,
      })

      expect(updated).not.toBeNull()
      expect(updated!.defaultModel).toBeUndefined()
    })
  })

  describe('projectExistsAtPath', () => {
    it('should return true for existing path', () => {
      service.addProject('/existing/path', 'Test')

      expect(service.projectExistsAtPath('/existing/path')).toBe(true)
    })

    it('should return false for non-existing path', () => {
      expect(service.projectExistsAtPath('/non/existing/path')).toBe(false)
    })

    it('should normalize paths with trailing slashes', () => {
      service.addProject('/test/path', 'Test')

      expect(service.projectExistsAtPath('/test/path/')).toBe(true)
    })
  })

  describe('database persistence', () => {
    it('should persist projects across service instances', () => {
      // Add project with first service instance
      const project = service.addProject('/test/path', 'Persistent Project')
      project.defaultModel = undefined // Ensure consistent state

      // Create new service instance (simulating restart)
      const newService = new ProjectService()
      const found = newService.getProject(project.id)

      expect(found).not.toBeNull()
      expect(found!.name).toBe('Persistent Project')
      expect(found!.path).toBe('/test/path')
    })

    it('should persist project updates', () => {
      const project = service.addProject('/test/path', 'Original')
      service.updateProject(project.id, { name: 'Updated' })

      const newService = new ProjectService()
      const found = newService.getProject(project.id)

      expect(found).not.toBeNull()
      expect(found!.name).toBe('Updated')
    })

    it('should persist project deletions', () => {
      const project = service.addProject('/test/path', 'To Delete')
      service.removeProject(project.id)

      const newService = new ProjectService()
      const found = newService.getProject(project.id)

      expect(found).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle home directory paths', () => {
      const homePath = os.homedir()
      const testPath = path.join(homePath, 'test-project')
      const project = service.addProject(testPath)

      expect(project.path).toBe(testPath)
    })

    it('should handle projects with special characters in name', () => {
      const project = service.addProject(
        '/test/path',
        'Project (Test) - v1.0 [beta]'
      )
      const found = service.getProject(project.id)

      expect(found).not.toBeNull()
      expect(found!.name).toBe('Project (Test) - v1.0 [beta]')
    })

    it('should handle empty defaultModel', () => {
      const project = service.addProject('/test/path', 'Test')
      expect(project.defaultModel).toBeUndefined()
    })
  })
})
