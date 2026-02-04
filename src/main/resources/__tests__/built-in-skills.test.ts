import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parseSkillFile } from '../../skills/parser'
import type { Skill } from '../../skills/types'

const SKILLS_DIR = path.join(__dirname, '../skills')

const EXPECTED_SKILLS = [
  'code-review',
  'implement-feature',
  'fix-bug',
  'write-tests',
  'document',
  'refactor',
]

describe('Built-in Skills', () => {
  let skillFiles: string[]

  beforeAll(() => {
    skillFiles = fs.readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.md'))
  })

  describe('skill files existence', () => {
    it('should have exactly 6 skill files', () => {
      expect(skillFiles).toHaveLength(6)
    })

    it.each(EXPECTED_SKILLS)('should have %s.md file', (skillName) => {
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
      expect(fs.existsSync(filePath)).toBe(true)
    })
  })

  describe('skill parsing', () => {
    it.each(EXPECTED_SKILLS)('%s should parse successfully', (skillName) => {
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
      const content = fs.readFileSync(filePath, 'utf-8')
      const skill = parseSkillFile(content, filePath, 'built-in')

      expect(skill).not.toBeNull()
    })

    it.each(EXPECTED_SKILLS)('%s should have required name field', (skillName) => {
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
      const content = fs.readFileSync(filePath, 'utf-8')
      const skill = parseSkillFile(content, filePath, 'built-in')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe(skillName)
    })

    it.each(EXPECTED_SKILLS)('%s should have required description field', (skillName) => {
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
      const content = fs.readFileSync(filePath, 'utf-8')
      const skill = parseSkillFile(content, filePath, 'built-in')

      expect(skill).not.toBeNull()
      expect(skill!.description).toBeTruthy()
      expect(typeof skill!.description).toBe('string')
    })

    it.each(EXPECTED_SKILLS)('%s should have non-empty content (prompt)', (skillName) => {
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
      const content = fs.readFileSync(filePath, 'utf-8')
      const skill = parseSkillFile(content, filePath, 'built-in')

      expect(skill).not.toBeNull()
      expect(skill!.content).toBeTruthy()
      expect(skill!.content.length).toBeGreaterThan(100) // Ensure substantial content
    })

    it.each(EXPECTED_SKILLS)('%s should have triggers defined', (skillName) => {
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
      const content = fs.readFileSync(filePath, 'utf-8')
      const skill = parseSkillFile(content, filePath, 'built-in')

      expect(skill).not.toBeNull()
      expect(skill!.triggers).toBeDefined()
      expect(Array.isArray(skill!.triggers)).toBe(true)
      expect(skill!.triggers!.length).toBeGreaterThan(0)
    })

    it.each(EXPECTED_SKILLS)('%s should have sourceType set to built-in', (skillName) => {
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
      const content = fs.readFileSync(filePath, 'utf-8')
      const skill = parseSkillFile(content, filePath, 'built-in')

      expect(skill).not.toBeNull()
      expect(skill!.sourceType).toBe('built-in')
    })
  })

  describe('specific skill configurations', () => {
    let skills: Map<string, Skill>

    beforeAll(() => {
      skills = new Map()
      for (const skillName of EXPECTED_SKILLS) {
        const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
        const content = fs.readFileSync(filePath, 'utf-8')
        const skill = parseSkillFile(content, filePath, 'built-in')
        if (skill) {
          skills.set(skillName, skill)
        }
      }
    })

    describe('code-review', () => {
      it('should have correct triggers', () => {
        const skill = skills.get('code-review')
        expect(skill?.triggers).toContain('review')
        expect(skill?.triggers).toContain('code review')
        expect(skill?.triggers).toContain('check code')
      })

      it('should have files input (required)', () => {
        const skill = skills.get('code-review')
        const filesInput = skill?.inputs?.find((i) => i.name === 'files')
        expect(filesInput).toBeDefined()
        expect(filesInput?.type).toBe('string[]')
        expect(filesInput?.required).toBe(true)
      })

      it('should have focus input (optional)', () => {
        const skill = skills.get('code-review')
        const focusInput = skill?.inputs?.find((i) => i.name === 'focus')
        expect(focusInput).toBeDefined()
        expect(focusInput?.type).toBe('string')
        expect(focusInput?.required).toBe(false)
      })
    })

    describe('implement-feature', () => {
      it('should have correct triggers', () => {
        const skill = skills.get('implement-feature')
        expect(skill?.triggers).toContain('implement')
        expect(skill?.triggers).toContain('add feature')
        expect(skill?.triggers).toContain('build')
      })

      it('should have description input (required)', () => {
        const skill = skills.get('implement-feature')
        const descInput = skill?.inputs?.find((i) => i.name === 'description')
        expect(descInput).toBeDefined()
        expect(descInput?.type).toBe('string')
        expect(descInput?.required).toBe(true)
      })

      it('should have files input (optional)', () => {
        const skill = skills.get('implement-feature')
        const filesInput = skill?.inputs?.find((i) => i.name === 'files')
        expect(filesInput).toBeDefined()
        expect(filesInput?.type).toBe('string[]')
        expect(filesInput?.required).toBe(false)
      })
    })

    describe('fix-bug', () => {
      it('should have correct triggers', () => {
        const skill = skills.get('fix-bug')
        expect(skill?.triggers).toContain('fix')
        expect(skill?.triggers).toContain('bug')
        expect(skill?.triggers).toContain('debug')
        expect(skill?.triggers).toContain('error')
      })

      it('should have description input (required)', () => {
        const skill = skills.get('fix-bug')
        const descInput = skill?.inputs?.find((i) => i.name === 'description')
        expect(descInput).toBeDefined()
        expect(descInput?.type).toBe('string')
        expect(descInput?.required).toBe(true)
      })

      it('should have error input (optional)', () => {
        const skill = skills.get('fix-bug')
        const errorInput = skill?.inputs?.find((i) => i.name === 'error')
        expect(errorInput).toBeDefined()
        expect(errorInput?.type).toBe('string')
        expect(errorInput?.required).toBe(false)
      })

      it('should have files input (optional)', () => {
        const skill = skills.get('fix-bug')
        const filesInput = skill?.inputs?.find((i) => i.name === 'files')
        expect(filesInput).toBeDefined()
        expect(filesInput?.type).toBe('string[]')
        expect(filesInput?.required).toBe(false)
      })
    })

    describe('write-tests', () => {
      it('should have correct triggers', () => {
        const skill = skills.get('write-tests')
        expect(skill?.triggers).toContain('test')
        expect(skill?.triggers).toContain('write tests')
        expect(skill?.triggers).toContain('add tests')
      })

      it('should have files input (required)', () => {
        const skill = skills.get('write-tests')
        const filesInput = skill?.inputs?.find((i) => i.name === 'files')
        expect(filesInput).toBeDefined()
        expect(filesInput?.type).toBe('string[]')
        expect(filesInput?.required).toBe(true)
      })

      it('should have type input (optional)', () => {
        const skill = skills.get('write-tests')
        const typeInput = skill?.inputs?.find((i) => i.name === 'type')
        expect(typeInput).toBeDefined()
        expect(typeInput?.type).toBe('string')
        expect(typeInput?.required).toBe(false)
      })
    })

    describe('document', () => {
      it('should have correct triggers', () => {
        const skill = skills.get('document')
        expect(skill?.triggers).toContain('document')
        expect(skill?.triggers).toContain('docs')
        expect(skill?.triggers).toContain('documentation')
      })

      it('should have files input (required)', () => {
        const skill = skills.get('document')
        const filesInput = skill?.inputs?.find((i) => i.name === 'files')
        expect(filesInput).toBeDefined()
        expect(filesInput?.type).toBe('string[]')
        expect(filesInput?.required).toBe(true)
      })

      it('should have format input (optional)', () => {
        const skill = skills.get('document')
        const formatInput = skill?.inputs?.find((i) => i.name === 'format')
        expect(formatInput).toBeDefined()
        expect(formatInput?.type).toBe('string')
        expect(formatInput?.required).toBe(false)
      })
    })

    describe('refactor', () => {
      it('should have correct triggers', () => {
        const skill = skills.get('refactor')
        expect(skill?.triggers).toContain('refactor')
        expect(skill?.triggers).toContain('clean up')
        expect(skill?.triggers).toContain('restructure')
      })

      it('should have files input (required)', () => {
        const skill = skills.get('refactor')
        const filesInput = skill?.inputs?.find((i) => i.name === 'files')
        expect(filesInput).toBeDefined()
        expect(filesInput?.type).toBe('string[]')
        expect(filesInput?.required).toBe(true)
      })

      it('should have goal input (optional)', () => {
        const skill = skills.get('refactor')
        const goalInput = skill?.inputs?.find((i) => i.name === 'goal')
        expect(goalInput).toBeDefined()
        expect(goalInput?.type).toBe('string')
        expect(goalInput?.required).toBe(false)
      })
    })
  })

  describe('content quality', () => {
    it.each(EXPECTED_SKILLS)('%s should contain Handlebars template syntax', (skillName) => {
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
      const content = fs.readFileSync(filePath, 'utf-8')
      const skill = parseSkillFile(content, filePath, 'built-in')

      // Skills should use Handlebars templating for inputs
      expect(skill!.content).toMatch(/\{\{[#/]?(if|each|this|[a-zA-Z]+)\}\}/)
    })

    it('all skills should have unique names', () => {
      const names = new Set<string>()

      for (const skillName of EXPECTED_SKILLS) {
        const filePath = path.join(SKILLS_DIR, `${skillName}.md`)
        const content = fs.readFileSync(filePath, 'utf-8')
        const skill = parseSkillFile(content, filePath, 'built-in')

        expect(names.has(skill!.name)).toBe(false)
        names.add(skill!.name)
      }

      expect(names.size).toBe(EXPECTED_SKILLS.length)
    })
  })
})
