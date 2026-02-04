import { describe, it, expect } from 'vitest'
import { detectSkillFormat, parseSkillWithFormat } from '../formats'

describe('Skill Format Detection', () => {
  describe('detectSkillFormat', () => {
    it('should detect Claude Code format with args field', () => {
      const frontmatter = {
        name: 'test-skill',
        args: [{ name: 'arg1' }],
      }

      expect(detectSkillFormat(frontmatter)).toBe('claude-code')
    })

    it('should detect Claude Code format with trigger field', () => {
      const frontmatter = {
        name: 'test-skill',
        trigger: '/test',
      }

      expect(detectSkillFormat(frontmatter)).toBe('claude-code')
    })

    it('should detect Claude Code format with both args and trigger', () => {
      const frontmatter = {
        name: 'test-skill',
        trigger: '/test',
        args: [{ name: 'arg1' }],
      }

      expect(detectSkillFormat(frontmatter)).toBe('claude-code')
    })

    it('should detect Forge format with inputs field', () => {
      const frontmatter = {
        name: 'test-skill',
        inputs: [{ name: 'input1', type: 'string' }],
      }

      expect(detectSkillFormat(frontmatter)).toBe('forge')
    })

    it('should detect Forge format with triggers field', () => {
      const frontmatter = {
        name: 'test-skill',
        triggers: ['/test'],
      }

      expect(detectSkillFormat(frontmatter)).toBe('forge')
    })

    it('should default to Forge format for minimal frontmatter', () => {
      const frontmatter = {
        name: 'test-skill',
        description: 'A test skill',
      }

      expect(detectSkillFormat(frontmatter)).toBe('forge')
    })

    it('should default to Forge format for empty frontmatter', () => {
      const frontmatter = {}

      expect(detectSkillFormat(frontmatter)).toBe('forge')
    })

    it('should prefer Claude Code detection when args field is present', () => {
      // If args field exists, it's Claude Code format regardless of other fields
      const frontmatter = {
        name: 'test-skill',
        args: [{ name: 'arg1' }],
        inputs: [{ name: 'input1', type: 'string' }],
      }

      expect(detectSkillFormat(frontmatter)).toBe('claude-code')
    })
  })

  describe('parseSkillWithFormat', () => {
    it('should parse Forge format skill', () => {
      const content = `---
name: test-skill
description: A test skill
triggers:
  - /test
inputs:
  - name: input1
    type: string
---
Skill content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.description).toBe('A test skill')
      expect(skill!.triggers).toEqual(['/test'])
      expect(skill!.inputs).toHaveLength(1)
      expect(skill!.inputs![0].name).toBe('input1')
      expect(skill!.inputs![0].type).toBe('string')
    })

    it('should parse Claude Code format skill', () => {
      const content = `---
name: test-skill
description: A test skill
trigger: /test
args:
  - name: arg1
    type: string
---
Skill content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.description).toBe('A test skill')
      expect(skill!.triggers).toEqual(['/test'])
      expect(skill!.inputs).toHaveLength(1)
      expect(skill!.inputs![0].name).toBe('arg1')
      expect(skill!.inputs![0].type).toBe('string')
    })

    it('should auto-detect Claude Code format', () => {
      const content = `---
name: auto-detect
trigger: /auto
---
Content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('auto-detect')
      expect(skill!.triggers).toEqual(['/auto'])
    })

    it('should use explicit format hint', () => {
      const content = `---
name: test-skill
trigger: /test
---
Content`

      // Force Forge parsing (will fail because 'trigger' is not valid in Forge)
      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global', 'forge')

      // Should fail to parse because trigger field is not valid in Forge format
      expect(skill).toBeNull()
    })

    it('should handle Claude Code format with array trigger', () => {
      const content = `---
name: multi-trigger
trigger:
  - /mt
  - /multi
---
Content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.triggers).toEqual(['/mt', '/multi'])
    })

    it('should convert Claude Code args to Forge inputs', () => {
      const content = `---
name: with-args
args:
  - name: arg1
    type: string
    required: true
  - name: arg2
    type: number
    default: 42
---
Content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'project')

      expect(skill).not.toBeNull()
      expect(skill!.inputs).toHaveLength(2)
      expect(skill!.inputs![0]).toEqual({
        name: 'arg1',
        type: 'string',
        required: true,
        description: undefined,
        default: undefined,
      })
      expect(skill!.inputs![1]).toEqual({
        name: 'arg2',
        type: 'number',
        required: undefined,
        description: undefined,
        default: 42,
      })
    })

    it('should return null for invalid YAML', () => {
      const content = `---
name: [broken yaml
---
Content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).toBeNull()
    })

    it('should return null for missing required fields', () => {
      const content = `---
description: Missing name field
---
Content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).toBeNull()
    })

    it('should handle empty content', () => {
      const content = `---
name: empty-content
description: Test skill
---`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.content).toBe('')
    })

    it('should preserve source and sourceType', () => {
      const content = `---
name: test-skill
description: Test skill
---
Content`

      const skill = parseSkillWithFormat(content, '/custom/path/skill.md', 'built-in')

      expect(skill).not.toBeNull()
      expect(skill!.source).toBe('/custom/path/skill.md')
      expect(skill!.sourceType).toBe('built-in')
    })

    it('should handle Claude Code skill without description', () => {
      const content = `---
name: no-description
trigger: /nd
---
Content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.description).toBe('no-description') // Uses name as fallback
    })

    it('should handle type mapping for Claude Code args', () => {
      const content = `---
name: type-mapping
args:
  - name: str
    type: string
  - name: arr
    type: array
  - name: bool
    type: bool
  - name: num
    type: number
  - name: unknown
    type: custom-type
---
Content`

      const skill = parseSkillWithFormat(content, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.inputs).toHaveLength(5)
      expect(skill!.inputs![0].type).toBe('string')
      expect(skill!.inputs![1].type).toBe('string[]')
      expect(skill!.inputs![2].type).toBe('boolean')
      expect(skill!.inputs![3].type).toBe('number')
      expect(skill!.inputs![4].type).toBe('string') // Unknown types default to string
    })
  })
})
