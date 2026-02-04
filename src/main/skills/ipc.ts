/**
 * Skills IPC Handlers
 *
 * Handles IPC communication between renderer and main process for skills.
 */

import { ipcMain } from 'electron'
import path from 'path'
import os from 'os'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import { SkillImporter } from './importer'
import { SkillLoader } from './loader'
import type { SkillSourceType, SkillFormat } from './types'

export function registerSkillsIpcHandlers(): void {
  const importer = new SkillImporter()
  const loader = new SkillLoader()

  // Import a single skill
  ipcMain.handle(IPC_CHANNELS.SKILLS_IMPORT, async (_event, request: unknown) => {
    // Validate request format
    if (!request || typeof request !== 'object') {
      return { success: false, error: 'Invalid request format' }
    }

    const { sourcePath, targetDir, sourceType, overwrite, format } = request as Record<
      string,
      unknown
    >

    // Validate required fields
    if (typeof sourcePath !== 'string' || !sourcePath) {
      return { success: false, error: 'sourcePath is required and must be a string' }
    }
    if (typeof targetDir !== 'string' || !targetDir) {
      return { success: false, error: 'targetDir is required and must be a string' }
    }
    if (typeof sourceType !== 'string' || !sourceType) {
      return { success: false, error: 'sourceType is required and must be a string' }
    }

    // Validate sourceType
    if (!['global', 'project', 'built-in'].includes(sourceType)) {
      return {
        success: false,
        error: 'sourceType must be one of: global, project, built-in',
      }
    }

    // Validate optional fields
    if (overwrite !== undefined && typeof overwrite !== 'boolean') {
      return { success: false, error: 'overwrite must be a boolean' }
    }
    if (format !== undefined && typeof format !== 'string') {
      return { success: false, error: 'format must be a string' }
    }
    if (format !== undefined && !['forge', 'claude-code'].includes(format)) {
      return { success: false, error: 'format must be one of: forge, claude-code' }
    }

    try {
      const result = await importer.importSkill(
        sourcePath,
        targetDir,
        sourceType as SkillSourceType,
        {
          overwrite: overwrite as boolean | undefined,
          format: format as SkillFormat | undefined,
        }
      )
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Import all skills from a directory
  ipcMain.handle(IPC_CHANNELS.SKILLS_IMPORT_DIRECTORY, async (_event, request: unknown) => {
    // Validate request format
    if (!request || typeof request !== 'object') {
      return { success: false, error: 'Invalid request format' }
    }

    const { sourceDir, targetDir, sourceType, overwrite, format } = request as Record<
      string,
      unknown
    >

    // Validate required fields
    if (typeof sourceDir !== 'string' || !sourceDir) {
      return { success: false, error: 'sourceDir is required and must be a string' }
    }
    if (typeof targetDir !== 'string' || !targetDir) {
      return { success: false, error: 'targetDir is required and must be a string' }
    }
    if (typeof sourceType !== 'string' || !sourceType) {
      return { success: false, error: 'sourceType is required and must be a string' }
    }

    // Validate sourceType
    if (!['global', 'project', 'built-in'].includes(sourceType)) {
      return {
        success: false,
        error: 'sourceType must be one of: global, project, built-in',
      }
    }

    // Validate optional fields
    if (overwrite !== undefined && typeof overwrite !== 'boolean') {
      return { success: false, error: 'overwrite must be a boolean' }
    }
    if (format !== undefined && typeof format !== 'string') {
      return { success: false, error: 'format must be a string' }
    }
    if (format !== undefined && !['forge', 'claude-code'].includes(format)) {
      return { success: false, error: 'format must be one of: forge, claude-code' }
    }

    try {
      const results = await importer.importDirectory(
        sourceDir,
        targetDir,
        sourceType as SkillSourceType,
        {
          overwrite: overwrite as boolean | undefined,
          format: format as SkillFormat | undefined,
        }
      )
      return { success: true, data: results }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Import skills from Claude Code
  ipcMain.handle(
    IPC_CHANNELS.SKILLS_IMPORT_FROM_CLAUDE_CODE,
    async (_event, request: unknown) => {
      // Validate request format
      if (!request || typeof request !== 'object') {
        return { success: false, error: 'Invalid request format' }
      }

      const { targetDir, sourceType, overwrite } = request as Record<string, unknown>

      // Validate required fields
      if (typeof targetDir !== 'string' || !targetDir) {
        return { success: false, error: 'targetDir is required and must be a string' }
      }
      if (typeof sourceType !== 'string' || !sourceType) {
        return { success: false, error: 'sourceType is required and must be a string' }
      }

      // Validate sourceType
      if (!['global', 'project', 'built-in'].includes(sourceType)) {
        return {
          success: false,
          error: 'sourceType must be one of: global, project, built-in',
        }
      }

      // Validate optional fields
      if (overwrite !== undefined && typeof overwrite !== 'boolean') {
        return { success: false, error: 'overwrite must be a boolean' }
      }

      try {
        const results = await importer.importFromClaudeCode(
          targetDir,
          sourceType as SkillSourceType,
          {
            overwrite: overwrite as boolean | undefined,
          }
        )
        return { success: true, data: results }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // List all skills
  ipcMain.handle(IPC_CHANNELS.SKILLS_LIST, async (_event, projectPath?: unknown) => {
    // Validate optional projectPath
    if (projectPath !== undefined && typeof projectPath !== 'string') {
      return { success: false, error: 'projectPath must be a string' }
    }

    try {
      const skills = await loader.loadSkills(projectPath as string | undefined)
      return { success: true, data: skills }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get a single skill by name
  ipcMain.handle(IPC_CHANNELS.SKILLS_GET, async (_event, request: unknown) => {
    // Validate request format
    if (!request || typeof request !== 'object') {
      return { success: false, error: 'Invalid request format' }
    }

    const { name, projectPath } = request as Record<string, unknown>

    // Validate required fields
    if (typeof name !== 'string' || !name) {
      return { success: false, error: 'name is required and must be a string' }
    }

    // Validate optional fields
    if (projectPath !== undefined && typeof projectPath !== 'string') {
      return { success: false, error: 'projectPath must be a string' }
    }

    try {
      const skill = await loader.getSkill(name, projectPath as string | undefined)
      return { success: true, data: skill }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}
