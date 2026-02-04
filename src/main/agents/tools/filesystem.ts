/**
 * Filesystem Tools
 *
 * Tools for reading, writing, and listing files within the project directory.
 * All operations are sandboxed to the working directory for security.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { AgentTool, AgentContext } from '../types'

/** Maximum file size allowed for read operations (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Find the closest existing ancestor directory for a path
 *
 * @param targetPath - The path to find the closest ancestor for
 * @returns The closest existing ancestor directory path
 */
function findClosestExistingAncestor(targetPath: string): string {
  let current = targetPath
  while (current !== path.dirname(current)) {
    try {
      fs.statSync(current)
      return current
    } catch {
      current = path.dirname(current)
    }
  }
  return current // root
}

/**
 * Validate that a path is within the working directory
 * Throws an error if the path attempts to escape the sandbox
 * Resolves symlinks to prevent symlink bypass attacks
 *
 * @param relativePath - The relative path to validate
 * @param context - The agent context containing the working directory
 * @returns The resolved absolute path
 */
function validatePath(relativePath: string, context: AgentContext): string {
  // Resolve the path relative to working directory
  const fullPath = path.resolve(context.workingDir, relativePath)

  // Resolve working directory symlinks to get the real path
  let realWorkingDir: string
  try {
    realWorkingDir = fs.realpathSync(context.workingDir)
  } catch {
    realWorkingDir = path.normalize(context.workingDir)
  }

  // For existing files, resolve symlinks to prevent symlink bypass attacks
  let realFullPath: string
  try {
    realFullPath = fs.realpathSync(fullPath)
  } catch {
    // realpathSync failed - could be:
    // 1. File doesn't exist at all
    // 2. File is a symlink but target doesn't exist (dangling symlink)

    // Check if the path is a symlink (even if dangling)
    try {
      const lstat = fs.lstatSync(fullPath)
      if (lstat.isSymbolicLink()) {
        // This is a symlink - check where it points
        const linkTarget = fs.readlinkSync(fullPath)
        const resolvedTarget = path.isAbsolute(linkTarget)
          ? linkTarget
          : path.resolve(path.dirname(fullPath), linkTarget)

        // Validate the symlink target is within working directory
        const normalizedTarget = path.normalize(resolvedTarget)
        if (!normalizedTarget.startsWith(realWorkingDir + path.sep) &&
            normalizedTarget !== realWorkingDir) {
          throw new Error('Access denied: path outside working directory')
        }
      }
    } catch (lstatError) {
      if (lstatError instanceof Error &&
          lstatError.message.includes('Access denied')) {
        throw lstatError
      }
      // File doesn't exist at all - continue with ancestor check
    }

    // File doesn't exist - find the closest existing ancestor and validate that
    const closestAncestor = findClosestExistingAncestor(fullPath)
    try {
      const realAncestor = fs.realpathSync(closestAncestor)
      if (!realAncestor.startsWith(realWorkingDir + path.sep) &&
          realAncestor !== realWorkingDir) {
        throw new Error('Access denied: path outside working directory')
      }
      // Ancestor is safe - construct the real path by replacing the ancestor portion
      // with the real ancestor path
      const relativePart = fullPath.substring(closestAncestor.length)
      realFullPath = realAncestor + relativePart
    } catch (ancestorError) {
      if (ancestorError instanceof Error &&
          ancestorError.message.includes('Access denied')) {
        throw ancestorError
      }
      // Can't resolve ancestor - fall back to normalized path check
      realFullPath = path.normalize(fullPath)
    }
  }

  // Check that the resolved path is within the working directory
  if (!realFullPath.startsWith(realWorkingDir + path.sep) &&
      realFullPath !== realWorkingDir) {
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

    // Check file size before reading to prevent memory issues
    const stats = await fs.promises.stat(fullPath)
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large (${stats.size} bytes). Maximum is ${MAX_FILE_SIZE} bytes.`)
    }

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
