/**
 * Skill Type Definitions
 *
 * Skills are reusable workflows that can be loaded from multiple sources.
 * They are defined as Markdown files with YAML frontmatter.
 */

/**
 * Input parameter definition for a skill
 */
export interface SkillInput {
  /** Parameter name */
  name: string
  /** Type of the parameter */
  type: 'string' | 'string[]' | 'number' | 'boolean'
  /** Human-readable description */
  description?: string
  /** Default value if not provided */
  default?: unknown
  /** Whether the parameter is required */
  required?: boolean
}

/**
 * Source type for a skill, determines override priority
 */
export type SkillSourceType = 'global' | 'project' | 'built-in'

/**
 * A skill loaded from a Markdown file with YAML frontmatter
 */
export interface Skill {
  /** Unique name of the skill */
  name: string
  /** Human-readable description */
  description: string
  /** Events that can trigger this skill */
  triggers?: string[]
  /** Input parameters for the skill */
  inputs?: SkillInput[]
  /** The markdown content (body after frontmatter) */
  content: string
  /** File path where the skill was loaded from */
  source: string
  /** Where the skill was loaded from (determines override priority) */
  sourceType: SkillSourceType
}

/**
 * Frontmatter data extracted from skill file
 */
export interface SkillFrontmatter {
  name?: string
  description?: string
  triggers?: string[]
  inputs?: SkillInput[]
}

/**
 * Skill format type
 */
export type SkillFormat = 'forge' | 'claude-code'

/**
 * Claude Code skill frontmatter format
 */
export interface ClaudeCodeSkillFrontmatter {
  name: string
  description?: string
  trigger?: string | string[]
  args?: ClaudeCodeArg[]
}

/**
 * Claude Code argument definition
 */
export interface ClaudeCodeArg {
  name: string
  type?: string
  description?: string
  required?: boolean
  default?: unknown
}
