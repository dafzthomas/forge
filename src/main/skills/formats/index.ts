/**
 * Skill Format Detection and Conversion
 *
 * Automatically detects skill format and converts to internal Forge format.
 */

import matter from 'gray-matter'
import { parseSkillFile } from '../parser'
import { parseClaudeCodeSkill } from './claude-code'
import type { Skill, SkillFormat, SkillSourceType } from '../types'

/**
 * Detect skill format from frontmatter
 *
 * @param frontmatter - The parsed frontmatter object
 * @returns The detected format
 */
export function detectSkillFormat(frontmatter: Record<string, unknown>): SkillFormat {
  // Check for Claude Code specific fields
  // - 'args' instead of 'inputs'
  // - 'trigger' instead of 'triggers'
  // Claude Code format takes precedence if its specific fields are present
  if ('args' in frontmatter) {
    return 'claude-code'
  }

  if ('trigger' in frontmatter) {
    return 'claude-code'
  }

  // Default to Forge format
  return 'forge'
}

/**
 * Parse a skill file with automatic format detection
 *
 * @param content - The raw file content (Markdown with YAML frontmatter)
 * @param sourcePath - Path to the file (for error messages and source tracking)
 * @param sourceType - The source type to assign (defaults to 'project')
 * @param format - Optional format hint (auto-detects if not specified)
 * @returns Parsed Skill object or null if parsing fails
 */
export function parseSkillWithFormat(
  content: string,
  sourcePath: string,
  sourceType: SkillSourceType = 'project',
  format?: SkillFormat
): Skill | null {
  try {
    const { data: frontmatter, content: markdown } = matter(content)

    // Detect format if not specified
    const detectedFormat = format ?? detectSkillFormat(frontmatter)

    // Parse based on format
    if (detectedFormat === 'claude-code') {
      return parseClaudeCodeSkill(frontmatter, markdown, sourcePath, sourceType)
    } else {
      // Use existing Forge format parser
      return parseSkillFile(content, sourcePath, sourceType)
    }
  } catch {
    return null
  }
}
