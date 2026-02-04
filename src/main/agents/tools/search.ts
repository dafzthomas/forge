/**
 * Search Tools
 *
 * Tools for searching files by name pattern and searching code content.
 * All searches are restricted to the working directory.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { AgentTool, AgentContext } from '../types'

/**
 * Directories to skip during search
 */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'target',
])

/**
 * Match a filename against a glob pattern
 * Supports basic glob patterns: *, **, ?
 *
 * @param filename - The filename to match
 * @param pattern - The glob pattern
 * @returns Whether the filename matches the pattern
 */
function matchGlob(filename: string, pattern: string): boolean {
  // Convert glob pattern to regex
  let regexStr = pattern
    // Escape regex special chars except * and ?
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Handle ** (match any path)
    .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
    // Handle * (match anything except path separator)
    .replace(/\*/g, '[^/]*')
    // Handle ? (match single char)
    .replace(/\?/g, '.')
    // Restore **
    .replace(/<<<DOUBLESTAR>>>/g, '.*')

  // Anchor to match the end (or full string if no path separators)
  if (!pattern.includes('/')) {
    // Pattern without path separators matches just the filename
    regexStr = regexStr + '$'
  } else {
    // Pattern with path separators matches the full relative path
    regexStr = '^' + regexStr + '$'
  }

  const regex = new RegExp(regexStr, 'i')
  return regex.test(filename)
}

/**
 * Recursively walk a directory and collect file paths
 *
 * @param dir - Directory to walk
 * @param baseDir - Base directory for relative paths
 * @param files - Array to collect files into
 */
async function walkDirectory(
  dir: string,
  baseDir: string,
  files: string[]
): Promise<void> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(baseDir, fullPath)

    if (entry.isDirectory()) {
      // Skip certain directories
      if (SKIP_DIRS.has(entry.name)) {
        continue
      }
      await walkDirectory(fullPath, baseDir, files)
    } else if (entry.isFile()) {
      files.push(relativePath)
    }
  }
}

/**
 * Tool to search for files by name pattern
 */
export const searchFilesTool: AgentTool = {
  name: 'search_files',
  description: 'Search for files by name pattern using glob syntax. Supports *, **, and ? wildcards. Returns matching file paths.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match files (e.g., "*.ts", "**/*.test.js", "src/**/*.tsx")',
      },
    },
    required: ['pattern'],
  },
  execute: async (params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    const pattern = params.pattern as string

    if (!pattern) {
      throw new Error('Pattern is required')
    }

    // Collect all files
    const allFiles: string[] = []
    await walkDirectory(context.workingDir, context.workingDir, allFiles)

    // Filter by pattern
    const matchingFiles = allFiles.filter((file) => {
      // For patterns without path separators, match just the filename
      if (!pattern.includes('/') && !pattern.includes('**')) {
        return matchGlob(path.basename(file), pattern)
      }
      // For patterns with paths, match the full relative path
      return matchGlob(file, pattern)
    })

    if (matchingFiles.length === 0) {
      return 'No files found matching pattern'
    }

    // Sort and return
    matchingFiles.sort()
    return matchingFiles.join('\n')
  },
}

/**
 * Tool to search for text in files
 */
export const searchCodeTool: AgentTool = {
  name: 'search_code',
  description: 'Search for text content within files. Returns matching lines with file paths and line numbers. Optionally filter by file pattern.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The text to search for',
      },
      filePattern: {
        type: 'string',
        description: 'Optional glob pattern to filter files (e.g., "*.ts", "*.js")',
      },
    },
    required: ['query'],
  },
  execute: async (params: Record<string, unknown>, context: AgentContext): Promise<string> => {
    const query = params.query as string
    const filePattern = params.filePattern as string | undefined

    if (!query) {
      throw new Error('Query is required')
    }

    // Collect all files
    const allFiles: string[] = []
    await walkDirectory(context.workingDir, context.workingDir, allFiles)

    // Filter by file pattern if provided
    let filesToSearch = allFiles
    if (filePattern) {
      filesToSearch = allFiles.filter((file) => {
        if (!filePattern.includes('/') && !filePattern.includes('**')) {
          return matchGlob(path.basename(file), filePattern)
        }
        return matchGlob(file, filePattern)
      })
    }

    // Search for query in files
    const results: string[] = []
    const maxResults = 100 // Limit results to prevent overwhelming output

    for (const file of filesToSearch) {
      if (results.length >= maxResults) {
        results.push(`\n... (truncated, ${maxResults}+ results found)`)
        break
      }

      const fullPath = path.join(context.workingDir, file)

      try {
        const content = await fs.promises.readFile(fullPath, 'utf-8')
        const lines = content.split('\n')

        for (let i = 0; i < lines.length; i++) {
          if (results.length >= maxResults) break

          if (lines[i].includes(query)) {
            const lineNum = i + 1
            const trimmedLine = lines[i].trim()
            // Truncate long lines
            const displayLine = trimmedLine.length > 100
              ? trimmedLine.substring(0, 100) + '...'
              : trimmedLine
            results.push(`${file}:${lineNum}: ${displayLine}`)
          }
        }
      } catch {
        // Skip files that can't be read (binary, permissions, etc.)
        continue
      }
    }

    if (results.length === 0) {
      return 'No matches found'
    }

    return results.join('\n')
  },
}
