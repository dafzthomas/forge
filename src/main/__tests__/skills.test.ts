import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parseSkillFile, SkillLoader } from '../skills'
import type { Skill } from '../skills'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Helper to create a temp directory
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'forge-skills-test-'))
}

// Helper to clean up temp directory
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// Sample valid skill content
const validSkillContent = `---
name: code-review
description: Review code changes for quality and issues
triggers:
  - pr-created
  - manual
inputs:
  - name: focus_areas
    type: string[]
    default: ["security", "performance", "readability"]
  - name: max_issues
    type: number
    description: Maximum number of issues to report
    required: true
---

# Code Review Skill

## Context
You are reviewing code changes in a {{language}} project.

## Steps
1. Read the diff using \`git diff {{base_branch}}...{{head_branch}}\`
2. For each changed file, analyze for issues

## Output Format
Provide findings as:
- **Critical**: Must fix before merge
- **Suggestions**: Improvements to consider
`

const minimalValidSkill = `---
name: simple-skill
description: A simple skill with minimal fields
---

# Simple Skill Content
`

const invalidNoName = `---
description: Missing name field
---

Content here
`

const invalidNoDescription = `---
name: missing-description
---

Content here
`

const invalidBadTriggers = `---
name: bad-triggers
description: Has invalid triggers type
triggers: not-an-array
---

Content here
`

const invalidBadInputType = `---
name: bad-input
description: Has invalid input type
inputs:
  - name: param
    type: invalid-type
---

Content here
`

const invalidYaml = `---
name: [broken yaml
description: This won't parse
---

Content
`

describe('parseSkillFile', () => {
  describe('valid skill files', () => {
    it('should parse a complete skill file with all fields', () => {
      const skill = parseSkillFile(validSkillContent, '/test/skills/code-review.md')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('code-review')
      expect(skill!.description).toBe('Review code changes for quality and issues')
      expect(skill!.triggers).toEqual(['pr-created', 'manual'])
      expect(skill!.inputs).toHaveLength(2)
      expect(skill!.inputs![0].name).toBe('focus_areas')
      expect(skill!.inputs![0].type).toBe('string[]')
      expect(skill!.inputs![0].default).toEqual(['security', 'performance', 'readability'])
      expect(skill!.inputs![1].name).toBe('max_issues')
      expect(skill!.inputs![1].type).toBe('number')
      expect(skill!.inputs![1].required).toBe(true)
      expect(skill!.content).toContain('# Code Review Skill')
      expect(skill!.source).toBe('/test/skills/code-review.md')
      expect(skill!.sourceType).toBe('project')
    })

    it('should parse a minimal skill with only required fields', () => {
      const skill = parseSkillFile(minimalValidSkill, '/test/skills/simple.md')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('simple-skill')
      expect(skill!.description).toBe('A simple skill with minimal fields')
      expect(skill!.triggers).toBeUndefined()
      expect(skill!.inputs).toBeUndefined()
      expect(skill!.content).toBe('# Simple Skill Content')
    })

    it('should set the correct source type when provided', () => {
      const skill = parseSkillFile(minimalValidSkill, '/path/to/skill.md', 'global')

      expect(skill).not.toBeNull()
      expect(skill!.sourceType).toBe('global')
    })

    it('should set built-in source type', () => {
      const skill = parseSkillFile(minimalValidSkill, '/built-in/skill.md', 'built-in')

      expect(skill).not.toBeNull()
      expect(skill!.sourceType).toBe('built-in')
    })

    it('should trim markdown content whitespace', () => {
      const contentWithWhitespace = `---
name: test
description: test desc
---

   Content with spaces

`
      const skill = parseSkillFile(contentWithWhitespace, '/test.md')

      expect(skill!.content).toBe('Content with spaces')
    })
  })

  describe('invalid skill files', () => {
    it('should return null for missing name field', () => {
      const skill = parseSkillFile(invalidNoName, '/test.md')
      expect(skill).toBeNull()
    })

    it('should return null for missing description field', () => {
      const skill = parseSkillFile(invalidNoDescription, '/test.md')
      expect(skill).toBeNull()
    })

    it('should return null for non-array triggers', () => {
      const skill = parseSkillFile(invalidBadTriggers, '/test.md')
      expect(skill).toBeNull()
    })

    it('should return null for invalid input type', () => {
      const skill = parseSkillFile(invalidBadInputType, '/test.md')
      expect(skill).toBeNull()
    })

    it('should return null for invalid YAML', () => {
      const skill = parseSkillFile(invalidYaml, '/test.md')
      expect(skill).toBeNull()
    })

    it('should return null for empty content', () => {
      const skill = parseSkillFile('', '/test.md')
      expect(skill).toBeNull()
    })

    it('should return null for content without frontmatter', () => {
      const skill = parseSkillFile('# Just Markdown\n\nNo frontmatter here.', '/test.md')
      expect(skill).toBeNull()
    })

    it('should return null for inputs with missing name', () => {
      const content = `---
name: test
description: test
inputs:
  - type: string
---
Content
`
      const skill = parseSkillFile(content, '/test.md')
      expect(skill).toBeNull()
    })

    it('should return null for inputs that is not an array', () => {
      const content = `---
name: test
description: test
inputs:
  name: param
  type: string
---
Content
`
      const skill = parseSkillFile(content, '/test.md')
      expect(skill).toBeNull()
    })
  })

  describe('input validation', () => {
    it('should accept string type', () => {
      const content = `---
name: test
description: test
inputs:
  - name: param
    type: string
---
Content
`
      const skill = parseSkillFile(content, '/test.md')
      expect(skill).not.toBeNull()
      expect(skill!.inputs![0].type).toBe('string')
    })

    it('should accept string[] type', () => {
      const content = `---
name: test
description: test
inputs:
  - name: param
    type: string[]
---
Content
`
      const skill = parseSkillFile(content, '/test.md')
      expect(skill).not.toBeNull()
      expect(skill!.inputs![0].type).toBe('string[]')
    })

    it('should accept number type', () => {
      const content = `---
name: test
description: test
inputs:
  - name: param
    type: number
---
Content
`
      const skill = parseSkillFile(content, '/test.md')
      expect(skill).not.toBeNull()
      expect(skill!.inputs![0].type).toBe('number')
    })

    it('should accept boolean type', () => {
      const content = `---
name: test
description: test
inputs:
  - name: flag
    type: boolean
    default: true
---
Content
`
      const skill = parseSkillFile(content, '/test.md')
      expect(skill).not.toBeNull()
      expect(skill!.inputs![0].type).toBe('boolean')
      expect(skill!.inputs![0].default).toBe(true)
    })
  })
})

describe('SkillLoader', () => {
  let tempDir: string
  let builtInDir: string
  let globalDir: string
  let projectDir: string
  let loader: SkillLoader

  beforeEach(() => {
    tempDir = createTempDir()
    builtInDir = path.join(tempDir, 'built-in')
    globalDir = path.join(tempDir, 'global')
    projectDir = path.join(tempDir, 'project')

    fs.mkdirSync(builtInDir, { recursive: true })
    fs.mkdirSync(globalDir, { recursive: true })
    fs.mkdirSync(path.join(projectDir, '.forge', 'skills'), { recursive: true })

    loader = new SkillLoader({
      globalSkillsDir: globalDir,
      builtInSkillsDir: builtInDir,
    })
  })

  afterEach(() => {
    cleanupTempDir(tempDir)
  })

  // Helper to write a skill file
  function writeSkill(dir: string, filename: string, content: string): void {
    fs.writeFileSync(path.join(dir, filename), content)
  }

  describe('loadSkills', () => {
    it('should return empty array when no skills exist', async () => {
      const skills = await loader.loadSkills()
      expect(skills).toEqual([])
    })

    it('should load skills from built-in directory', async () => {
      writeSkill(builtInDir, 'builtin-skill.md', `---
name: builtin-skill
description: A built-in skill
---
Built-in content
`)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('builtin-skill')
      expect(skills[0].sourceType).toBe('built-in')
    })

    it('should load skills from global directory', async () => {
      writeSkill(globalDir, 'global-skill.md', `---
name: global-skill
description: A global skill
---
Global content
`)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('global-skill')
      expect(skills[0].sourceType).toBe('global')
    })

    it('should load skills from project directory', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')
      writeSkill(projectSkillsDir, 'project-skill.md', `---
name: project-skill
description: A project skill
---
Project content
`)

      const skills = await loader.loadSkills(projectDir)

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('project-skill')
      expect(skills[0].sourceType).toBe('project')
    })

    it('should load skills from all directories', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

      writeSkill(builtInDir, 'builtin.md', `---
name: builtin
description: Built-in skill
---
Built-in
`)
      writeSkill(globalDir, 'global.md', `---
name: global
description: Global skill
---
Global
`)
      writeSkill(projectSkillsDir, 'project.md', `---
name: project
description: Project skill
---
Project
`)

      const skills = await loader.loadSkills(projectDir)

      expect(skills).toHaveLength(3)
      const names = skills.map((s) => s.name)
      expect(names).toContain('builtin')
      expect(names).toContain('global')
      expect(names).toContain('project')
    })

    it('should have global skills override built-in skills', async () => {
      writeSkill(builtInDir, 'override-me.md', `---
name: common-skill
description: Built-in version
---
Built-in content
`)
      writeSkill(globalDir, 'override-me.md', `---
name: common-skill
description: Global version
---
Global content
`)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('common-skill')
      expect(skills[0].description).toBe('Global version')
      expect(skills[0].sourceType).toBe('global')
    })

    it('should have project skills override global skills', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

      writeSkill(globalDir, 'override-me.md', `---
name: common-skill
description: Global version
---
Global content
`)
      writeSkill(projectSkillsDir, 'override-me.md', `---
name: common-skill
description: Project version
---
Project content
`)

      const skills = await loader.loadSkills(projectDir)

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('common-skill')
      expect(skills[0].description).toBe('Project version')
      expect(skills[0].sourceType).toBe('project')
    })

    it('should have project skills override built-in skills', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

      writeSkill(builtInDir, 'override-me.md', `---
name: common-skill
description: Built-in version
---
Built-in content
`)
      writeSkill(projectSkillsDir, 'override-me.md', `---
name: common-skill
description: Project version
---
Project content
`)

      const skills = await loader.loadSkills(projectDir)

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('common-skill')
      expect(skills[0].description).toBe('Project version')
      expect(skills[0].sourceType).toBe('project')
    })

    it('should skip non-.md files', async () => {
      writeSkill(globalDir, 'valid.md', minimalValidSkill)
      fs.writeFileSync(path.join(globalDir, 'not-a-skill.txt'), 'Text file')
      fs.writeFileSync(path.join(globalDir, 'config.json'), '{}')

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('simple-skill')
    })

    it('should skip invalid skill files', async () => {
      writeSkill(globalDir, 'valid.md', minimalValidSkill)
      writeSkill(globalDir, 'invalid.md', invalidNoName)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('simple-skill')
    })

    it('should handle non-existent directories gracefully', async () => {
      const loaderWithBadPaths = new SkillLoader({
        globalSkillsDir: '/non/existent/path',
        builtInSkillsDir: '/another/bad/path',
      })

      const skills = await loaderWithBadPaths.loadSkills('/also/not/real')

      expect(skills).toEqual([])
    })

    it('should skip subdirectories', async () => {
      writeSkill(globalDir, 'valid.md', minimalValidSkill)
      const subDir = path.join(globalDir, 'subdir')
      fs.mkdirSync(subDir)
      writeSkill(subDir, 'nested.md', `---
name: nested
description: Nested skill
---
Nested
`)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('simple-skill')
    })
  })

  describe('getSkill', () => {
    it('should return null when skill not found', async () => {
      const skill = await loader.getSkill('non-existent')
      expect(skill).toBeNull()
    })

    it('should find a built-in skill', async () => {
      writeSkill(builtInDir, 'test.md', `---
name: test-skill
description: Test
---
Content
`)

      const skill = await loader.getSkill('test-skill')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.sourceType).toBe('built-in')
    })

    it('should find a global skill', async () => {
      writeSkill(globalDir, 'test.md', `---
name: test-skill
description: Test
---
Content
`)

      const skill = await loader.getSkill('test-skill')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.sourceType).toBe('global')
    })

    it('should find a project skill', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')
      writeSkill(projectSkillsDir, 'test.md', `---
name: test-skill
description: Test
---
Content
`)

      const skill = await loader.getSkill('test-skill', projectDir)

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.sourceType).toBe('project')
    })

    it('should return project skill when it overrides others', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

      writeSkill(builtInDir, 'test.md', `---
name: override-test
description: Built-in
---
Built-in
`)
      writeSkill(globalDir, 'test.md', `---
name: override-test
description: Global
---
Global
`)
      writeSkill(projectSkillsDir, 'test.md', `---
name: override-test
description: Project
---
Project
`)

      const skill = await loader.getSkill('override-test', projectDir)

      expect(skill).not.toBeNull()
      expect(skill!.description).toBe('Project')
      expect(skill!.sourceType).toBe('project')
    })

    it('should return global skill when no project skill exists', async () => {
      writeSkill(builtInDir, 'test.md', `---
name: override-test
description: Built-in
---
Built-in
`)
      writeSkill(globalDir, 'test.md', `---
name: override-test
description: Global
---
Global
`)

      const skill = await loader.getSkill('override-test', projectDir)

      expect(skill).not.toBeNull()
      expect(skill!.description).toBe('Global')
      expect(skill!.sourceType).toBe('global')
    })

    it('should return built-in skill when no higher priority skill exists', async () => {
      writeSkill(builtInDir, 'test.md', `---
name: builtin-only
description: Built-in only
---
Built-in
`)

      const skill = await loader.getSkill('builtin-only', projectDir)

      expect(skill).not.toBeNull()
      expect(skill!.description).toBe('Built-in only')
      expect(skill!.sourceType).toBe('built-in')
    })
  })

  describe('listSkillNames', () => {
    it('should return empty array when no skills exist', async () => {
      const names = await loader.listSkillNames()
      expect(names).toEqual([])
    })

    it('should list all unique skill names', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

      writeSkill(builtInDir, 'builtin.md', `---
name: builtin
description: Built-in
---
Content
`)
      writeSkill(globalDir, 'global.md', `---
name: global
description: Global
---
Content
`)
      writeSkill(projectSkillsDir, 'project.md', `---
name: project
description: Project
---
Content
`)

      const names = await loader.listSkillNames(projectDir)

      expect(names).toHaveLength(3)
      expect(names).toContain('builtin')
      expect(names).toContain('global')
      expect(names).toContain('project')
    })

    it('should not duplicate names when skills override', async () => {
      writeSkill(builtInDir, 'test.md', `---
name: common
description: Built-in
---
Content
`)
      writeSkill(globalDir, 'test.md', `---
name: common
description: Global
---
Content
`)

      const names = await loader.listSkillNames()

      expect(names).toHaveLength(1)
      expect(names[0]).toBe('common')
    })
  })

  describe('constructor options', () => {
    it('should use custom directories when provided', async () => {
      const customGlobalDir = path.join(tempDir, 'custom-global')
      const customBuiltInDir = path.join(tempDir, 'custom-builtin')

      fs.mkdirSync(customGlobalDir, { recursive: true })
      fs.mkdirSync(customBuiltInDir, { recursive: true })

      writeSkill(customGlobalDir, 'custom.md', `---
name: custom-global
description: Custom global
---
Content
`)
      writeSkill(customBuiltInDir, 'custom.md', `---
name: custom-builtin
description: Custom built-in
---
Content
`)

      const customLoader = new SkillLoader({
        globalSkillsDir: customGlobalDir,
        builtInSkillsDir: customBuiltInDir,
      })

      const skills = await customLoader.loadSkills()

      expect(skills).toHaveLength(2)
      const names = skills.map((s) => s.name)
      expect(names).toContain('custom-global')
      expect(names).toContain('custom-builtin')
    })
  })
})
