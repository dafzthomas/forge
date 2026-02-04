/**
 * Shell Execution Tool
 *
 * Tool for executing shell commands within the project directory.
 * Commands are executed with a configurable timeout for safety.
 */

import { spawn } from 'child_process'
import type { AgentTool, AgentContext } from '../types'

/**
 * Default timeout for shell commands (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000

/**
 * Tool to execute shell commands
 */
export const shellExecuteTool: AgentTool = {
  name: 'shell_execute',
  description: 'Execute a shell command in the project directory. Returns stdout and stderr combined. Use timeout parameter to set a custom timeout in milliseconds.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
      },
    },
    required: ['command'],
  },
  execute: async (params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    const command = params.command as string
    const timeout = (params.timeout as number) ?? DEFAULT_TIMEOUT

    if (!command) {
      throw new Error('Command is required')
    }

    return new Promise((resolve) => {
      const output: string[] = []
      let killed = false

      // Spawn the shell process
      const child = spawn(command, {
        shell: true,
        cwd: context.workingDir,
        env: { ...process.env },
      })

      // Collect stdout
      child.stdout.on('data', (data: Buffer) => {
        output.push(data.toString())
      })

      // Collect stderr
      child.stderr.on('data', (data: Buffer) => {
        output.push(data.toString())
      })

      // Set up timeout
      const timeoutId = setTimeout(() => {
        killed = true
        child.kill('SIGKILL')
      }, timeout)

      // Handle process exit
      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId)

        if (killed) {
          resolve(`Command timed out after ${timeout}ms`)
          return
        }

        const combinedOutput = output.join('').trim()

        if (code !== 0) {
          if (combinedOutput) {
            resolve(`${combinedOutput}\n\nExit code: ${code}`)
          } else {
            resolve(`Command failed with exit code: ${code}`)
          }
        } else {
          resolve(combinedOutput || 'Command completed successfully (no output)')
        }
      })

      // Handle spawn errors
      child.on('error', (error: Error) => {
        clearTimeout(timeoutId)
        resolve(`Error executing command: ${error.message}`)
      })
    })
  },
}
