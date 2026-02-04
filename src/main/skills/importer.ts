/**
 * Skill Importer
 *
 * Imports skills from external locations, including Claude Code skills.
 */

import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { parseSkillWithFormat } from './formats'
import type { Skill, SkillFormat, SkillSourceType } from './types'

/**
 * Options for skill import
 */
export interface ImportOptions {
  /** Whether to overwrite existing files */
  overwrite?: boolean
  /** Format hint (auto-detects if not specified) */
  format?: SkillFormat
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  /** The imported skill */
  skill: Skill
  /** Path where the skill was saved */
  targetPath: string
  /** Whether an existing skill was overwritten */
  overwritten: boolean
}

/**
 * SkillImporter handles importing skills from external sources
 */
export class SkillImporter {
  /**
   * Import a single skill file
   *
   * @param sourcePath - Path to the skill file to import
   * @param targetDir - Directory to save the skill (global or project skills dir)
   * @param sourceType - The source type to assign to the imported skill
   * @param options - Import options
   * @returns Import result with the imported skill
   */
  async importSkill(
    sourcePath: string,
    targetDir: string,
    sourceType: SkillSourceType,
    options?: ImportOptions
  ): Promise<ImportResult> {
    // Read the source file
    const content = await fs.readFile(sourcePath, 'utf-8')

    // Parse the skill (with format auto-detection)
    const skill = parseSkillWithFormat(content, sourcePath, sourceType, options?.format)

    if (!skill) {
      throw new Error(`Failed to parse skill file: ${sourcePath}`)
    }

    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true })

    // Determine target file path
    const targetFileName = `${skill.name}.md`
    const targetPath = path.join(targetDir, targetFileName)

    // Check if file already exists
    let overwritten = false
    try {
      await fs.access(targetPath)
      overwritten = true

      // Don't overwrite unless explicitly allowed
      if (!options?.overwrite) {
        throw new Error(`Skill "${skill.name}" already exists at ${targetPath}. Use overwrite option to replace.`)
      }
    } catch (error) {
      // File doesn't exist, safe to write
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }

    // Copy the file
    await fs.copyFile(sourcePath, targetPath)

    return {
      skill,
      targetPath,
      overwritten,
    }
  }

  /**
   * Import all skills from a directory
   *
   * @param sourceDir - Directory containing skill files
   * @param targetDir - Directory to save the skills
   * @param sourceType - The source type to assign to imported skills
   * @param options - Import options
   * @returns Array of import results
   */
  async importDirectory(
    sourceDir: string,
    targetDir: string,
    sourceType: SkillSourceType,
    options?: ImportOptions
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = []

    // Read directory
    let files: string[]
    try {
      files = await fs.readdir(sourceDir)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Source directory does not exist: ${sourceDir}`)
      }
      throw error
    }

    // Filter to only .md files
    const skillFiles = files.filter((file) => file.endsWith('.md'))

    // Import each skill
    for (const file of skillFiles) {
      const sourcePath = path.join(sourceDir, file)

      try {
        const result = await this.importSkill(sourcePath, targetDir, sourceType, options)
        results.push(result)
      } catch (error) {
        // Log error but continue with other files
        console.warn(
          `Failed to import ${file}:`,
          error instanceof Error ? error.message : error
        )
      }
    }

    return results
  }

  /**
   * Import skills from Claude Code default locations
   *
   * Searches for Claude Code skills directory based on platform:
   * - macOS: ~/.claude/skills/
   * - Linux: ~/.config/claude/skills/
   * - Windows: %APPDATA%/claude/skills/
   *
   * @param targetDir - Directory to save the skills
   * @param sourceType - The source type to assign to imported skills
   * @param options - Import options
   * @returns Array of import results
   */
  async importFromClaudeCode(
    targetDir: string,
    sourceType: SkillSourceType,
    options?: ImportOptions
  ): Promise<ImportResult[]> {
    const claudeCodeDir = this.getClaudeCodeSkillsDir()

    // Check if directory exists
    try {
      await fs.access(claudeCodeDir)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Claude Code skills directory not found: ${claudeCodeDir}`)
      }
      throw error
    }

    // Import from Claude Code directory with format hint
    return this.importDirectory(claudeCodeDir, targetDir, sourceType, {
      ...options,
      format: 'claude-code',
    })
  }

  /**
   * Get the Claude Code skills directory based on platform
   */
  private getClaudeCodeSkillsDir(): string {
    const platform = os.platform()
    const homeDir = os.homedir()

    switch (platform) {
      case 'darwin': // macOS
      case 'linux':
        // Check .config/claude first (Linux), fall back to .claude (macOS)
        if (platform === 'linux') {
          return path.join(homeDir, '.config', 'claude', 'skills')
        }
        return path.join(homeDir, '.claude', 'skills')

      case 'win32': // Windows
        const appData = process.env.APPDATA
        if (!appData) {
          throw new Error('APPDATA environment variable not set')
        }
        return path.join(appData, 'claude', 'skills')

      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }
}
