/**
 * Skill Parser
 *
 * Parses Markdown files with YAML frontmatter into Skill objects.
 */

import matter from 'gray-matter'
import type { Skill, SkillFrontmatter, SkillSourceType } from './types'

/**
 * Parse a skill file from its raw content
 *
 * @param content - The raw file content (Markdown with YAML frontmatter)
 * @param filePath - Path to the file (for error messages and source tracking)
 * @param sourceType - The source type to assign (defaults to 'project')
 * @returns Parsed Skill object or null if parsing fails or required fields are missing
 */
export function parseSkillFile(
  content: string,
  filePath: string,
  sourceType: SkillSourceType = 'project'
): Skill | null {
  try {
    const { data: frontmatter, content: markdown } = matter(content)
    const fm = frontmatter as SkillFrontmatter

    // Validate required fields
    if (!fm.name || typeof fm.name !== 'string') {
      return null
    }
    if (!fm.description || typeof fm.description !== 'string') {
      return null
    }

    // Validate triggers if present
    if (fm.triggers !== undefined && !Array.isArray(fm.triggers)) {
      return null
    }

    // Validate inputs if present
    if (fm.inputs !== undefined) {
      if (!Array.isArray(fm.inputs)) {
        return null
      }
      // Validate each input
      for (const input of fm.inputs) {
        if (!input.name || typeof input.name !== 'string') {
          return null
        }
        if (!input.type || !['string', 'string[]', 'number', 'boolean'].includes(input.type)) {
          return null
        }
      }
    }

    return {
      name: fm.name,
      description: fm.description,
      triggers: fm.triggers,
      inputs: fm.inputs,
      content: markdown.trim(),
      source: filePath,
      sourceType,
    }
  } catch {
    // Parsing failed (invalid YAML, etc.)
    return null
  }
}
