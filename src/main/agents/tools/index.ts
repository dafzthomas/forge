/**
 * Agent Tools Registry
 *
 * Central registry for all built-in agent tools.
 * Provides utilities for registering tools with the agent executor.
 */

import type { AgentTool } from '../types'
import type { AgentExecutor } from '../executor'

// Import filesystem tools
import {
  readFileTool,
  writeFileTool,
  listDirectoryTool,
} from './filesystem'

// Import shell tool
import { shellExecuteTool } from './shell'

// Import git tools
import {
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
} from './git'

// Import search tools
import {
  searchFilesTool,
  searchCodeTool,
} from './search'

/**
 * Array of all built-in tools available to agents
 */
export const builtInTools: AgentTool[] = [
  // Filesystem tools
  readFileTool,
  writeFileTool,
  listDirectoryTool,

  // Shell tool
  shellExecuteTool,

  // Git tools
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,

  // Search tools
  searchFilesTool,
  searchCodeTool,
]

/**
 * Register all built-in tools with an agent executor
 *
 * @param executor - The agent executor to register tools with
 */
export function registerBuiltInTools(executor: AgentExecutor): void {
  for (const tool of builtInTools) {
    executor.registerTool(tool)
  }
}

// Re-export individual tools for direct access
export {
  // Filesystem
  readFileTool,
  writeFileTool,
  listDirectoryTool,

  // Shell
  shellExecuteTool,

  // Git
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,

  // Search
  searchFilesTool,
  searchCodeTool,
}
