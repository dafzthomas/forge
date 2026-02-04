import { randomUUID } from 'crypto'
import path from 'path'
import { getDatabase } from '../database'
import type { Project, ProjectRow, ProjectUpdate } from '../../shared/project-types'

/**
 * Service for managing projects in the database.
 * Projects represent workspace directories that can have their own settings.
 */
export class ProjectService {
  /**
   * Add a new project to the database.
   * @param projectPath - Absolute path to the project directory
   * @param name - Optional display name (defaults to folder name)
   * @returns The created project
   * @throws Error if a project already exists at the given path
   */
  addProject(projectPath: string, name?: string): Project {
    const normalizedPath = this.normalizePath(projectPath)

    // Check if project already exists at this path
    if (this.projectExistsAtPath(normalizedPath)) {
      throw new Error(`A project already exists at path: ${normalizedPath}`)
    }

    // Use folder name if name not provided
    const projectName = name || this.extractFolderName(projectPath)

    const id = randomUUID()
    const now = new Date().toISOString()

    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO projects (id, name, path, default_model, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, projectName, normalizedPath, null, now, now)

    return {
      id,
      name: projectName,
      path: normalizedPath,
      defaultModel: undefined,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }
  }

  /**
   * Remove a project from the database by ID.
   * @param id - The project ID to remove
   * @returns true if the project was removed, false if it didn't exist
   */
  removeProject(id: string): boolean {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Get all projects from the database.
   * @returns Array of projects, ordered by creation date (newest first)
   */
  getProjects(): Project[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC')
    const rows = stmt.all() as ProjectRow[]
    return rows.map(this.rowToProject)
  }

  /**
   * Get a single project by ID.
   * @param id - The project ID
   * @returns The project or null if not found
   */
  getProject(id: string): Project | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?')
    const row = stmt.get(id) as ProjectRow | undefined
    return row ? this.rowToProject(row) : null
  }

  /**
   * Update a project's settings.
   * @param id - The project ID to update
   * @param updates - Fields to update (name and/or defaultModel)
   * @returns The updated project or null if not found
   */
  updateProject(id: string, updates: ProjectUpdate): Project | null {
    // First check if project exists
    const existing = this.getProject(id)
    if (!existing) {
      return null
    }

    const db = getDatabase()
    const now = new Date().toISOString()

    // Build dynamic update query based on provided fields
    const setClauses: string[] = ['updated_at = ?']
    const values: (string | null)[] = [now]

    if ('name' in updates && updates.name !== undefined) {
      setClauses.push('name = ?')
      values.push(updates.name)
    }

    if ('defaultModel' in updates) {
      setClauses.push('default_model = ?')
      values.push(updates.defaultModel ?? null)
    }

    values.push(id)

    const stmt = db.prepare(`
      UPDATE projects
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)

    return this.getProject(id)
  }

  /**
   * Check if a project already exists at the given path.
   * @param projectPath - Path to check
   * @returns true if a project exists at this path
   */
  projectExistsAtPath(projectPath: string): boolean {
    const normalizedPath = this.normalizePath(projectPath)
    const db = getDatabase()
    const stmt = db.prepare('SELECT 1 FROM projects WHERE path = ?')
    const result = stmt.get(normalizedPath)
    return result !== undefined
  }

  /**
   * Normalize a path for consistent storage and comparison.
   * Removes trailing slashes.
   */
  private normalizePath(projectPath: string): string {
    // Remove trailing slashes (but keep root slash for Unix)
    let normalized = projectPath.replace(/[/\\]+$/, '')
    // If path is now empty (was just "/"), restore root
    if (normalized === '' && projectPath.startsWith('/')) {
      normalized = '/'
    }
    return normalized
  }

  /**
   * Extract the folder name from a path.
   * Works with both Unix and Windows paths.
   */
  private extractFolderName(projectPath: string): string {
    // Handle both Unix and Windows path separators
    const normalizedForParse = projectPath.replace(/\\/g, '/')
    const parsed = path.posix.parse(normalizedForParse)
    return parsed.base || parsed.root || 'project'
  }

  /**
   * Convert a database row to a Project object.
   */
  private rowToProject(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      defaultModel: row.default_model ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}

// Export singleton instance for convenience
let projectServiceInstance: ProjectService | null = null

export function getProjectService(): ProjectService {
  if (!projectServiceInstance) {
    projectServiceInstance = new ProjectService()
  }
  return projectServiceInstance
}
