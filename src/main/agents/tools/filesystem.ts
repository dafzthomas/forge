/**
 * Filesystem Tools
 *
 * Tools for reading, writing, and listing files within the project directory.
 * All operations are sandboxed to the working directory for security.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { AgentTool, AgentContext } from '../types'

/**
 * Validate that a path is within the working directory
 * Throws an error if the path attempts to escape the sandbox
 *
 * @param relativePath - The relative path to validate
 * @param context - The agent context containing the working directory
 * @returns The resolved absolute path
 */
function validatePath(relativePath: string, context: AgentContext): string {
  // Resolve the path relative to working directory
  const fullPath = path.resolve(context.workingDir, relativePath)

  // Normalize both paths to handle trailing slashes and symlinks
  const normalizedWorkingDir = path.normalize(context.workingDir)
  const normalizedFullPath = path.normalize(fullPath)

  // Check that the resolved path is within the working directory
  if (!normalizedFullPath.startsWith(normalizedWorkingDir + path.sep) &&
      normalizedFullPath !== normalizedWorkingDir) {
    throw new Error('Access denied: path outside working directory')
  }

  return fullPath
}

/**
 * Tool to read the contents of a file
 */
export const readFileTool: AgentTool = {
  name: 'read_file',
  description: 'Read the contents of a file. Returns the file content as a string.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path from the project root to the file to read',
      },
    },
    required: ['path'],
  },
  execute: async (params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    const relativePath = params.path as string

    if (!relativePath) {
      throw new Error('Path is required')
    }

    const fullPath = validatePath(relativePath, context)
    const content = await fs.promises.readFile(fullPath, 'utf-8')

    return content
  },
}

/**
 * Tool to write content to a file
 */
export const writeFileTool: AgentTool = {
  name: 'write_file',
  description: 'Write content to a file. Creates the file if it does not exist, or overwrites it if it does. Creates parent directories as needed.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path from the project root to the file to write',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['path', 'content'],
  },
  execute: async (params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    const relativePath = params.path as string
    const content = params.content as string

    if (!relativePath) {
      throw new Error('Path is required')
    }

    if (content === undefined || content === null) {
      throw new Error('Content is required')
    }

    const fullPath = validatePath(relativePath, context)

    // Create parent directories if they don't exist
    const parentDir = path.dirname(fullPath)
    await fs.promises.mkdir(parentDir, { recursive: true })

    // Write the file
    await fs.promises.writeFile(fullPath, content, 'utf-8')

    return `File written: ${relativePath}`
  },
}

/**
 * Tool to list files and directories
 */
export const listDirectoryTool: AgentTool = {
  name: 'list_directory',
  description: 'List files and directories at the specified path. Returns a formatted list showing file names and types.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path from the project root to the directory to list',
      },
    },
    required: ['path'],
  },
  execute: async (params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    const relativePath = params.path as string

    if (!relativePath) {
      throw new Error('Path is required')
    }

    const fullPath = validatePath(relativePath, context)

    // Read directory contents
    const entries = await fs.promises.readdir(fullPath, { withFileTypes: true })

    // Format output with file type indicators
    const formattedEntries = entries.map((entry) => {
      if (entry.isDirectory()) {
        return `${entry.name}/ [dir]`
      } else if (entry.isFile()) {
        return `${entry.name} [file]`
      } else if (entry.isSymbolicLink()) {
        return `${entry.name} [link]`
      } else {
        return entry.name
      }
    })

    // Sort directories first, then files
    formattedEntries.sort((a, b) => {
      const aIsDir = a.includes('[dir]')
      const bIsDir = b.includes('[dir]')
      if (aIsDir && !bIsDir) return -1
      if (!aIsDir && bIsDir) return 1
      return a.localeCompare(b)
    })

    if (formattedEntries.length === 0) {
      return 'Directory is empty'
    }

    return formattedEntries.join('\n')
  },
}
