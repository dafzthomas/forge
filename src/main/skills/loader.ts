/**
 * Skill Loader
 *
 * Loads skills from multiple directories with priority-based overriding:
 * - Built-in skills (lowest priority)
 * - Global skills (~/.forge/skills/)
 * - Project skills (.forge/skills/) (highest priority)
 */

import path from 'path'
import fs from 'fs'
import os from 'os'
import { parseSkillFile } from './parser'
import type { Skill, SkillSourceType } from './types'

/**
 * Check if a resolved path is within a given directory (prevents path traversal)
 */
function isPathWithinDirectory(resolvedPath: string, directory: string): boolean {
  const resolvedDir = path.resolve(directory)
  return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir
}

/**
 * SkillLoader handles loading skills from multiple sources with priority ordering
 */
export class SkillLoader {
  private globalSkillsDir: string
  private builtInSkillsDir: string

  constructor(options?: { globalSkillsDir?: string; builtInSkillsDir?: string }) {
    // ~/.forge/skills/
    this.globalSkillsDir = options?.globalSkillsDir ?? path.join(os.homedir(), '.forge', 'skills')
    // Built-in skills from app resources
    this.builtInSkillsDir =
      options?.builtInSkillsDir ?? path.join(__dirname, '../../resources/skills')
  }

  /**
   * Load skills from all sources for a project
   *
   * Skills are loaded with priority ordering where later sources override earlier:
   * 1. Built-in skills (lowest priority)
   * 2. Global skills
   * 3. Project skills (highest priority)
   *
   * @param projectPath - Path to the project root (optional)
   * @returns Array of loaded skills
   */
  async loadSkills(projectPath?: string): Promise<Skill[]> {
    const skills: Map<string, Skill> = new Map()

    // Load in priority order (later ones override earlier)
    // 1. Built-in skills
    await this.loadFromDirectory(this.builtInSkillsDir, 'built-in', skills)

    // 2. Global skills
    await this.loadFromDirectory(this.globalSkillsDir, 'global', skills)

    // 3. Project skills (if projectPath provided)
    if (projectPath) {
      const projectSkillsDir = path.join(projectPath, '.forge', 'skills')
      await this.loadFromDirectory(projectSkillsDir, 'project', skills)
    }

    return Array.from(skills.values())
  }

  /**
   * Load a single skill by name
   *
   * Searches in order: project, global, built-in (first match wins)
   *
   * @param name - The skill name to find
   * @param projectPath - Path to the project root (optional)
   * @returns The skill if found, null otherwise
   */
  async getSkill(name: string, projectPath?: string): Promise<Skill | null> {
    // Validate skill name to prevent path traversal
    if (!this.validateSkillName(name)) {
      console.debug(`Invalid skill name: ${name}`)
      return null
    }
    // Search in priority order (highest to lowest)
    const searchDirs: Array<{ dir: string; sourceType: SkillSourceType }> = []

    // 1. Project skills (highest priority)
    if (projectPath) {
      searchDirs.push({
        dir: path.join(projectPath, '.forge', 'skills'),
        sourceType: 'project',
      })
    }

    // 2. Global skills
    searchDirs.push({
      dir: this.globalSkillsDir,
      sourceType: 'global',
    })

    // 3. Built-in skills (lowest priority)
    searchDirs.push({
      dir: this.builtInSkillsDir,
      sourceType: 'built-in',
    })

    for (const { dir, sourceType } of searchDirs) {
      const skill = await this.loadSkillFromDir(name, dir, sourceType)
      if (skill) {
        return skill
      }
    }

    return null
  }

  /**
   * List names of all available skills
   *
   * @param projectPath - Path to the project root (optional)
   * @returns Array of skill names
   */
  async listSkillNames(projectPath?: string): Promise<string[]> {
    const skills = await this.loadSkills(projectPath)
    return skills.map((s) => s.name)
  }

  /**
   * Load all skills from a directory
   */
  private async loadFromDirectory(
    dir: string,
    sourceType: SkillSourceType,
    skills: Map<string, Skill>
  ): Promise<void> {
    try {
      const files = await fs.promises.readdir(dir)
      // Resolve the directory to handle any symlinks in the directory path itself
      const resolvedDir = await fs.promises.realpath(dir)

      for (const file of files) {
        if (!file.endsWith('.md')) continue

        const filePath = path.join(dir, file)

        try {
          // Resolve symlinks in the file path
          const resolvedPath = await fs.promises.realpath(filePath)

          // Security: Verify resolved path stays within resolved directory (prevents symlink traversal)
          if (!isPathWithinDirectory(resolvedPath, resolvedDir)) {
            console.debug(`Skipping file outside directory: ${filePath}`)
            continue
          }

          const stat = await fs.promises.stat(filePath)
          if (!stat.isFile()) continue

          const content = await fs.promises.readFile(filePath, 'utf-8')
          const skill = parseSkillFile(content, filePath, sourceType)

          if (skill) {
            // Later sources override earlier ones
            skills.set(skill.name, skill)
          }
        } catch (error) {
          console.debug(
            `Failed to read skill file ${filePath}:`,
            error instanceof Error ? error.message : error
          )
          continue
        }
      }
    } catch (error) {
      // Handle non-existent directory gracefully
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return
      }
      console.debug(
        `Failed to read directory ${dir}:`,
        error instanceof Error ? error.message : error
      )
      return
    }
  }

  /**
   * Load a specific skill from a directory by name
   */
  private async loadSkillFromDir(
    name: string,
    dir: string,
    sourceType: SkillSourceType
  ): Promise<Skill | null> {
    try {
      const files = await fs.promises.readdir(dir)
      // Resolve the directory to handle any symlinks in the directory path itself
      const resolvedDir = await fs.promises.realpath(dir)

      for (const file of files) {
        if (!file.endsWith('.md')) continue

        const filePath = path.join(dir, file)

        try {
          // Resolve symlinks in the file path
          const resolvedPath = await fs.promises.realpath(filePath)

          // Security: Verify resolved path stays within resolved directory (prevents symlink traversal)
          if (!isPathWithinDirectory(resolvedPath, resolvedDir)) {
            console.debug(`Skipping file outside directory: ${filePath}`)
            continue
          }

          const stat = await fs.promises.stat(filePath)
          if (!stat.isFile()) continue

          const content = await fs.promises.readFile(filePath, 'utf-8')
          const skill = parseSkillFile(content, filePath, sourceType)

          if (skill && skill.name === name) {
            return skill
          }
        } catch (error) {
          console.debug(
            `Failed to read skill file ${filePath}:`,
            error instanceof Error ? error.message : error
          )
          continue
        }
      }
    } catch (error) {
      // Handle non-existent directory gracefully
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      console.debug(
        `Failed to read directory ${dir}:`,
        error instanceof Error ? error.message : error
      )
      return null
    }

    return null
  }

  /**
   * Validate skill name to prevent path traversal attacks
   * Only allows alphanumeric characters, hyphens, and underscores
   */
  private validateSkillName(name: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(name)
  }
}
