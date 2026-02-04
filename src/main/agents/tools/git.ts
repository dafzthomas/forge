/**
 * Git Tools
 *
 * Tools for common git operations: status, diff, and commit.
 * All operations are executed in the working directory.
 */

import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import type { AgentTool, AgentContext } from '../types'

/**
 * Validate that a file path is within the working directory
 * Prevents directory traversal attacks through git commands
 *
 * @param filePath - The file path to validate
 * @param workingDir - The working directory
 * @throws Error if path is outside working directory
 */
function validateGitPath(filePath: string, workingDir: string): void {
  const fullPath = path.resolve(workingDir, filePath)

  // Resolve working directory symlinks to get the real path
  let realWorkingDir: string
  try {
    realWorkingDir = fs.realpathSync(workingDir)
  } catch {
    realWorkingDir = path.normalize(workingDir)
  }

  // For existing files, resolve symlinks to prevent symlink bypass attacks
  let realFullPath: string
  try {
    realFullPath = fs.realpathSync(fullPath)
  } catch {
    // File doesn't exist - use normalized path
    realFullPath = path.normalize(fullPath)
  }

  if (!realFullPath.startsWith(realWorkingDir + path.sep) &&
      realFullPath !== realWorkingDir) {
    throw new Error(`Access denied: file path outside working directory: ${filePath}`)
  }
}

/**
 * Execute a git command and return the output
 *
 * @param args - Git command arguments
 * @param cwd - Working directory
 * @returns The command output (stdout + stderr)
 */
async function executeGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    const output: string[] = []

    const child = spawn('git', args, {
      cwd,
      env: { ...process.env },
    })

    child.stdout.on('data', (data: Buffer) => {
      output.push(data.toString())
    })

    child.stderr.on('data', (data: Buffer) => {
      output.push(data.toString())
    })

    child.on('close', (code: number | null) => {
      const combinedOutput = output.join('').trim()

      if (code !== 0 && !combinedOutput) {
        resolve(`Git command failed with exit code: ${code}`)
      } else {
        resolve(combinedOutput || 'No output')
      }
    })

    child.on('error', (error: Error) => {
      resolve(`Error executing git: ${error.message}`)
    })
  })
}

/**
 * Tool to get git status
 */
export const gitStatusTool: AgentTool = {
  name: 'git_status',
  description: 'Get the current git status showing modified, staged, and untracked files.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async (_params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    return executeGit(['status'], context.workingDir)
  },
}

/**
 * Tool to get git diff
 */
export const gitDiffTool: AgentTool = {
  name: 'git_diff',
  description: 'Get git diff showing changes. Use staged=true to see staged changes, or false for unstaged. Optionally filter by path.',
  parameters: {
    type: 'object',
    properties: {
      staged: {
        type: 'boolean',
        description: 'If true, show staged changes (--cached). If false, show unstaged changes.',
      },
      path: {
        type: 'string',
        description: 'Optional file path to filter the diff',
      },
    },
    required: ['staged'],
  },
  execute: async (params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    const staged = params.staged as boolean
    const filePath = params.path as string | undefined

    const args = ['diff']

    if (staged) {
      args.push('--cached')
    }

    if (filePath) {
      // Validate the path is within working directory
      validateGitPath(filePath, context.workingDir)
      args.push('--', filePath)
    }

    const result = await executeGit(args, context.workingDir)

    if (!result || result === 'No output') {
      return staged
        ? 'No staged changes'
        : 'No unstaged changes'
    }

    return result
  },
}

/**
 * Tool to create a git commit
 */
export const gitCommitTool: AgentTool = {
  name: 'git_commit',
  description: 'Create a git commit. If files are specified, they will be staged before committing. Otherwise, commits all staged changes.',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The commit message',
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional array of file paths to stage and commit',
      },
    },
    required: ['message'],
  },
  execute: async (params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    const message = params.message as string
    const files = params.files as string[] | undefined

    if (!message) {
      throw new Error('Commit message is required')
    }

    // If specific files are provided, validate and stage them first
    if (files && files.length > 0) {
      // Validate all file paths before staging
      for (const file of files) {
        validateGitPath(file, context.workingDir)
      }

      const addResult = await executeGit(['add', ...files], context.workingDir)

      // Check if add failed
      if (addResult.includes('fatal:') || addResult.includes('error:')) {
        return `Failed to stage files: ${addResult}`
      }
    }

    // Create the commit
    const result = await executeGit(['commit', '-m', message], context.workingDir)

    return result
  },
}
