/**
 * Project types shared between main and renderer processes
 */

/**
 * A project represents a workspace directory that can have
 * its own settings and configuration.
 */
export interface Project {
  /** Unique identifier for the project */
  id: string
  /** Display name for the project */
  name: string
  /** Absolute path to the project directory */
  path: string
  /** Default model to use for this project */
  defaultModel?: string
  /** When the project was added */
  createdAt: Date
  /** When the project was last updated */
  updatedAt: Date
}

/**
 * Database row representation of a project
 */
export interface ProjectRow {
  id: string
  name: string
  path: string
  default_model: string | null
  created_at: string
  updated_at: string
}

/**
 * Fields that can be updated on a project
 */
export type ProjectUpdate = Partial<Pick<Project, 'name' | 'defaultModel'>>
