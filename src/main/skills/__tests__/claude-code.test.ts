import { describe, it, expect } from 'vitest'
import { parseClaudeCodeSkill, convertTriggers, convertArg } from '../formats/claude-code'

describe('Claude Code Format Parser', () => {
  describe('convertTriggers', () => {
    it('should convert undefined to undefined', () => {
      expect(convertTriggers(undefined)).toBeUndefined()
    })

    it('should convert single string to array', () => {
      expect(convertTriggers('test-trigger')).toEqual(['test-trigger'])
    })

    it('should pass through string array', () => {
      expect(convertTriggers(['trigger1', 'trigger2'])).toEqual(['trigger1', 'trigger2'])
    })

    it('should return undefined for invalid types', () => {
      expect(convertTriggers(123)).toBeUndefined()
      expect(convertTriggers({})).toBeUndefined()
      expect(convertTriggers(null)).toBeUndefined()
    })

    it('should return undefined for array with non-string elements', () => {
      expect(convertTriggers(['valid', 123, 'also-valid'])).toBeUndefined()
      expect(convertTriggers([1, 2, 3])).toBeUndefined()
    })
  })

  describe('convertArg', () => {
    it('should convert basic string arg', () => {
      const result = convertArg({
        name: 'input1',
      })

      expect(result).toEqual({
        name: 'input1',
        type: 'string',
        description: undefined,
        required: undefined,
        default: undefined,
      })
    })

    it('should convert arg with all fields', () => {
      const result = convertArg({
        name: 'input1',
        type: 'string',
        description: 'Test input',
        required: true,
        default: 'default-value',
      })

      expect(result).toEqual({
        name: 'input1',
        type: 'string',
        description: 'Test input',
        required: true,
        default: 'default-value',
      })
    })

    it('should map array type', () => {
      const result1 = convertArg({
        name: 'input1',
        type: 'string[]',
      })
      expect(result1?.type).toBe('string[]')

      const result2 = convertArg({
        name: 'input2',
        type: 'array',
      })
      expect(result2?.type).toBe('string[]')
    })

    it('should map boolean types', () => {
      const result1 = convertArg({
        name: 'input1',
        type: 'boolean',
      })
      expect(result1?.type).toBe('boolean')

      const result2 = convertArg({
        name: 'input2',
        type: 'bool',
      })
      expect(result2?.type).toBe('boolean')
    })

    it('should map number type', () => {
      const result = convertArg({
        name: 'input1',
        type: 'number',
      })
      expect(result?.type).toBe('number')
    })

    it('should default unknown types to string', () => {
      const result = convertArg({
        name: 'input1',
        type: 'unknown-type',
      })
      expect(result?.type).toBe('string')
    })

    it('should return null for invalid arg', () => {
      expect(convertArg(null)).toBeNull()
      expect(convertArg(undefined)).toBeNull()
      expect(convertArg('string')).toBeNull()
      expect(convertArg(123)).toBeNull()
    })

    it('should return null for arg without name', () => {
      expect(convertArg({})).toBeNull()
      expect(convertArg({ type: 'string' })).toBeNull()
    })

    it('should return null for arg with invalid name', () => {
      expect(convertArg({ name: 123 })).toBeNull()
      expect(convertArg({ name: null })).toBeNull()
    })

    it('should return null for arg with invalid type field', () => {
      const result = convertArg({
        name: 'input1',
        type: 123,
      })
      expect(result).toBeNull()
    })
  })

  describe('parseClaudeCodeSkill', () => {
    it('should parse minimal Claude Code skill', () => {
      const frontmatter = {
        name: 'test-skill',
      }
      const content = 'Skill content here'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.description).toBe('test-skill') // Uses name as fallback
      expect(skill!.content).toBe('Skill content here')
      expect(skill!.source).toBe('/path/to/skill.md')
      expect(skill!.sourceType).toBe('global')
      expect(skill!.triggers).toBeUndefined()
      expect(skill!.inputs).toBeUndefined()
    })

    it('should parse skill with description', () => {
      const frontmatter = {
        name: 'test-skill',
        description: 'A test skill',
      }
      const content = 'Content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'project')

      expect(skill!.description).toBe('A test skill')
    })

    it('should parse skill with single trigger', () => {
      const frontmatter = {
        name: 'test-skill',
        trigger: '/test',
      }
      const content = 'Content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill!.triggers).toEqual(['/test'])
    })

    it('should parse skill with multiple triggers', () => {
      const frontmatter = {
        name: 'test-skill',
        trigger: ['/test', '/t'],
      }
      const content = 'Content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill!.triggers).toEqual(['/test', '/t'])
    })

    it('should parse skill with args', () => {
      const frontmatter = {
        name: 'test-skill',
        args: [
          {
            name: 'arg1',
            type: 'string',
            description: 'First arg',
            required: true,
          },
          {
            name: 'arg2',
            type: 'number',
            default: 42,
          },
        ],
      }
      const content = 'Content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill!.inputs).toHaveLength(2)
      expect(skill!.inputs![0]).toEqual({
        name: 'arg1',
        type: 'string',
        description: 'First arg',
        required: true,
        default: undefined,
      })
      expect(skill!.inputs![1]).toEqual({
        name: 'arg2',
        type: 'number',
        description: undefined,
        required: undefined,
        default: 42,
      })
    })

    it('should parse complete Claude Code skill', () => {
      const frontmatter = {
        name: 'complete-skill',
        description: 'A complete test skill',
        trigger: ['/complete', '/c'],
        args: [
          {
            name: 'input1',
            type: 'string',
            description: 'First input',
            required: true,
          },
          {
            name: 'input2',
            type: 'boolean',
            default: false,
          },
        ],
      }
      const content = 'Complete skill content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'project')

      expect(skill).toEqual({
        name: 'complete-skill',
        description: 'A complete test skill',
        triggers: ['/complete', '/c'],
        inputs: [
          {
            name: 'input1',
            type: 'string',
            description: 'First input',
            required: true,
            default: undefined,
          },
          {
            name: 'input2',
            type: 'boolean',
            description: undefined,
            required: undefined,
            default: false,
          },
        ],
        content: 'Complete skill content',
        source: '/path/to/skill.md',
        sourceType: 'project',
      })
    })

    it('should return null for missing name', () => {
      const frontmatter = {
        description: 'Missing name',
      }
      const content = 'Content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill).toBeNull()
    })

    it('should return null for invalid name type', () => {
      const frontmatter = {
        name: 123,
      }
      const content = 'Content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill).toBeNull()
    })

    it('should return null for invalid args type', () => {
      const frontmatter = {
        name: 'test-skill',
        args: 'not-an-array',
      }
      const content = 'Content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill).toBeNull()
    })

    it('should return null for invalid arg in array', () => {
      const frontmatter = {
        name: 'test-skill',
        args: [
          { name: 'valid' },
          { type: 'string' }, // Missing name
        ],
      }
      const content = 'Content'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill).toBeNull()
    })

    it('should trim content whitespace', () => {
      const frontmatter = {
        name: 'test-skill',
      }
      const content = '\n\n  Content with whitespace  \n\n'

      const skill = parseClaudeCodeSkill(frontmatter, content, '/path/to/skill.md', 'global')

      expect(skill!.content).toBe('Content with whitespace')
    })
  })
})
