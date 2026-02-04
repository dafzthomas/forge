/**
 * Claude Code Format Parser
 *
 * Parses skills in the Claude Code format and converts them to Forge format.
 */

import type { Skill, SkillInput, SkillSourceType, ClaudeCodeArg } from '../types'

/**
 * Parse a Claude Code format skill
 *
 * @param frontmatter - The parsed frontmatter object
 * @param content - The markdown content after frontmatter
 * @param sourcePath - Path to the file (for error messages and source tracking)
 * @param sourceType - The source type to assign
 * @returns Parsed Skill object or null if parsing fails or required fields are missing
 */
export function parseClaudeCodeSkill(
  frontmatter: Record<string, unknown>,
  content: string,
  sourcePath: string,
  sourceType: SkillSourceType
): Skill | null {
  try {
    // Validate required fields
    if (!frontmatter.name || typeof frontmatter.name !== 'string') {
      return null
    }

    // Description is optional in Claude Code format, use name as fallback
    const description =
      typeof frontmatter.description === 'string' ? frontmatter.description : frontmatter.name

    // Convert trigger to triggers array
    const triggers = convertTriggers(frontmatter.trigger)

    // Convert args to inputs
    let inputs: SkillInput[] | undefined
    if (frontmatter.args !== undefined) {
      if (!Array.isArray(frontmatter.args)) {
        return null
      }
      inputs = []
      for (const arg of frontmatter.args) {
        const input = convertArg(arg)
        if (!input) {
          return null
        }
        inputs.push(input)
      }
    }

    return {
      name: frontmatter.name,
      description,
      triggers,
      inputs,
      content: content.trim(),
      source: sourcePath,
      sourceType,
    }
  } catch {
    return null
  }
}

/**
 * Convert Claude Code trigger field to Forge triggers array
 *
 * @param trigger - Single string, array of strings, or undefined
 * @returns Array of trigger strings or undefined
 */
export function convertTriggers(trigger: unknown): string[] | undefined {
  if (trigger === undefined) {
    return undefined
  }

  if (typeof trigger === 'string') {
    return [trigger]
  }

  if (Array.isArray(trigger)) {
    // Validate all elements are strings
    if (!trigger.every((t) => typeof t === 'string')) {
      return undefined
    }
    return trigger as string[]
  }

  return undefined
}

/**
 * Convert a Claude Code arg to a Forge input
 *
 * @param arg - The Claude Code arg object
 * @returns SkillInput or null if conversion fails
 */
export function convertArg(arg: unknown): SkillInput | null {
  if (!arg || typeof arg !== 'object') {
    return null
  }

  const argObj = arg as Record<string, unknown>

  // Validate required name field
  if (!argObj.name || typeof argObj.name !== 'string') {
    return null
  }

  // Convert type (default to 'string' if not specified)
  let type: SkillInput['type'] = 'string'
  if (argObj.type !== undefined) {
    if (typeof argObj.type !== 'string') {
      return null
    }
    // Map Claude Code types to Forge types
    switch (argObj.type) {
      case 'string':
        type = 'string'
        break
      case 'string[]':
      case 'array':
        type = 'string[]'
        break
      case 'number':
        type = 'number'
        break
      case 'boolean':
      case 'bool':
        type = 'boolean'
        break
      default:
        // Unknown type, default to string
        type = 'string'
    }
  }

  return {
    name: argObj.name,
    type,
    description: typeof argObj.description === 'string' ? argObj.description : undefined,
    required: typeof argObj.required === 'boolean' ? argObj.required : undefined,
    default: argObj.default,
  }
}
