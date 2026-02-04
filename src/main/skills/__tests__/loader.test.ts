import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SkillLoader } from '../loader'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Helper to create a temp directory
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'forge-skills-loader-test-'))
}

// Helper to clean up temp directory
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// Helper to write a skill file
function writeSkill(dir: string, filename: string, content: string): void {
  fs.writeFileSync(path.join(dir, filename), content)
}

// Sample valid skill content
const validSkill = `---
name: test-skill
description: A test skill
---
Content here
`

const anotherValidSkill = `---
name: another-skill
description: Another test skill
---
Different content
`

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

  describe('loadSkills', () => {
    it('should return empty array when directories do not exist', async () => {
      const nonExistentLoader = new SkillLoader({
        globalSkillsDir: '/non/existent/path',
        builtInSkillsDir: '/another/bad/path',
      })

      const skills = await nonExistentLoader.loadSkills()

      expect(skills).toEqual([])
    })

    it('should load skills from built-in directory', async () => {
      writeSkill(builtInDir, 'builtin.md', validSkill)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('test-skill')
      expect(skills[0].sourceType).toBe('built-in')
    })

    it('should load skills from global directory', async () => {
      writeSkill(globalDir, 'global.md', validSkill)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('test-skill')
      expect(skills[0].sourceType).toBe('global')
    })

    it('should load skills from project directory', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')
      writeSkill(projectSkillsDir, 'project.md', validSkill)

      const skills = await loader.loadSkills(projectDir)

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('test-skill')
      expect(skills[0].sourceType).toBe('project')
    })

    it('should load multiple skills from same directory', async () => {
      writeSkill(builtInDir, 'skill1.md', validSkill)
      writeSkill(builtInDir, 'skill2.md', anotherValidSkill)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(2)
      const names = skills.map((s) => s.name)
      expect(names).toContain('test-skill')
      expect(names).toContain('another-skill')
    })

    it('should skip non-.md files', async () => {
      writeSkill(builtInDir, 'valid.md', validSkill)
      fs.writeFileSync(path.join(builtInDir, 'not-skill.txt'), 'text file')
      fs.writeFileSync(path.join(builtInDir, 'config.json'), '{}')
      fs.writeFileSync(path.join(builtInDir, 'README'), 'readme')

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('test-skill')
    })

    it('should skip subdirectories', async () => {
      writeSkill(builtInDir, 'valid.md', validSkill)
      const subDir = path.join(builtInDir, 'subdir')
      fs.mkdirSync(subDir)
      writeSkill(subDir, 'nested.md', anotherValidSkill)

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('test-skill')
    })

    it('should gracefully handle malformed skill files', async () => {
      writeSkill(builtInDir, 'valid.md', validSkill)
      writeSkill(
        builtInDir,
        'malformed.md',
        `---
name: [broken yaml
description: This won't parse
---
Content`
      )
      writeSkill(
        builtInDir,
        'no-name.md',
        `---
description: Missing name
---
Content`
      )

      const skills = await loader.loadSkills()

      // Should only load the valid skill
      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('test-skill')
    })

    it('should gracefully handle unreadable files', async () => {
      writeSkill(builtInDir, 'valid.md', validSkill)
      const unreadablePath = path.join(builtInDir, 'unreadable.md')
      writeSkill(builtInDir, 'unreadable.md', validSkill)

      // Make file unreadable (only on Unix-like systems)
      if (process.platform !== 'win32') {
        fs.chmodSync(unreadablePath, 0o000)
      }

      const skills = await loader.loadSkills()

      // Should load at least the valid skill
      expect(skills.length).toBeGreaterThanOrEqual(1)
      expect(skills.some((s) => s.name === 'test-skill')).toBe(true)

      // Restore permissions for cleanup
      if (process.platform !== 'win32') {
        fs.chmodSync(unreadablePath, 0o644)
      }
    })

    describe('priority ordering', () => {
      it('should have global skills override built-in skills', async () => {
        writeSkill(
          builtInDir,
          'common.md',
          `---
name: common-skill
description: Built-in version
---
Built-in content`
        )
        writeSkill(
          globalDir,
          'common.md',
          `---
name: common-skill
description: Global version
---
Global content`
        )

        const skills = await loader.loadSkills()

        expect(skills).toHaveLength(1)
        expect(skills[0].name).toBe('common-skill')
        expect(skills[0].description).toBe('Global version')
        expect(skills[0].sourceType).toBe('global')
        expect(skills[0].content).toBe('Global content')
      })

      it('should have project skills override global skills', async () => {
        const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

        writeSkill(
          globalDir,
          'common.md',
          `---
name: common-skill
description: Global version
---
Global content`
        )
        writeSkill(
          projectSkillsDir,
          'common.md',
          `---
name: common-skill
description: Project version
---
Project content`
        )

        const skills = await loader.loadSkills(projectDir)

        expect(skills).toHaveLength(1)
        expect(skills[0].name).toBe('common-skill')
        expect(skills[0].description).toBe('Project version')
        expect(skills[0].sourceType).toBe('project')
        expect(skills[0].content).toBe('Project content')
      })

      it('should have project skills override built-in skills', async () => {
        const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

        writeSkill(
          builtInDir,
          'common.md',
          `---
name: common-skill
description: Built-in version
---
Built-in content`
        )
        writeSkill(
          projectSkillsDir,
          'common.md',
          `---
name: common-skill
description: Project version
---
Project content`
        )

        const skills = await loader.loadSkills(projectDir)

        expect(skills).toHaveLength(1)
        expect(skills[0].name).toBe('common-skill')
        expect(skills[0].description).toBe('Project version')
        expect(skills[0].sourceType).toBe('project')
      })

      it('should apply full priority chain: project > global > built-in', async () => {
        const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

        writeSkill(
          builtInDir,
          'common.md',
          `---
name: common-skill
description: Built-in version
---
Built-in`
        )
        writeSkill(
          globalDir,
          'common.md',
          `---
name: common-skill
description: Global version
---
Global`
        )
        writeSkill(
          projectSkillsDir,
          'common.md',
          `---
name: common-skill
description: Project version
---
Project`
        )

        const skills = await loader.loadSkills(projectDir)

        expect(skills).toHaveLength(1)
        expect(skills[0].description).toBe('Project version')
        expect(skills[0].sourceType).toBe('project')
      })

      it('should keep unique skills from all sources', async () => {
        const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

        writeSkill(
          builtInDir,
          'builtin-only.md',
          `---
name: builtin-only
description: Built-in
---
Content`
        )
        writeSkill(
          globalDir,
          'global-only.md',
          `---
name: global-only
description: Global
---
Content`
        )
        writeSkill(
          projectSkillsDir,
          'project-only.md',
          `---
name: project-only
description: Project
---
Content`
        )

        const skills = await loader.loadSkills(projectDir)

        expect(skills).toHaveLength(3)
        const names = skills.map((s) => s.name)
        expect(names).toContain('builtin-only')
        expect(names).toContain('global-only')
        expect(names).toContain('project-only')
      })
    })

    describe('symlink handling', () => {
      it('should skip symlinks that escape the directory', async () => {
        // Create a file outside the skills directory
        const outsideDir = path.join(tempDir, 'outside')
        fs.mkdirSync(outsideDir)
        writeSkill(outsideDir, 'outside.md', validSkill)

        // Create a symlink in the skills directory pointing outside
        const symlinkPath = path.join(builtInDir, 'escape.md')
        try {
          fs.symlinkSync(path.join(outsideDir, 'outside.md'), symlinkPath)

          const skills = await loader.loadSkills()

          // Should not load the skill from the escaped symlink
          expect(skills).toEqual([])
        } catch (error) {
          // Symlink creation might fail on some systems (e.g., Windows without admin)
          // Skip this test in that case
          if ((error as NodeJS.ErrnoException).code === 'EPERM') {
            console.log('Skipping symlink test due to insufficient permissions')
            return
          }
          throw error
        }
      })

      it('should allow symlinks within the same directory', async () => {
        // Create a real skill file
        const realPath = path.join(builtInDir, 'real.md')
        writeSkill(builtInDir, 'real.md', validSkill)

        // Create a symlink to it in the same directory
        const symlinkPath = path.join(builtInDir, 'link.md')
        try {
          fs.symlinkSync(realPath, symlinkPath)

          const skills = await loader.loadSkills()

          // Should load the skill (both real and symlink point to same file)
          expect(skills.length).toBeGreaterThanOrEqual(1)
          expect(skills.some((s) => s.name === 'test-skill')).toBe(true)
        } catch (error) {
          // Skip on systems where symlinks aren't supported
          if ((error as NodeJS.ErrnoException).code === 'EPERM') {
            console.log('Skipping symlink test due to insufficient permissions')
            return
          }
          throw error
        }
      })
    })
  })

  describe('getSkill', () => {
    it('should return null when skill not found', async () => {
      const skill = await loader.getSkill('non-existent')
      expect(skill).toBeNull()
    })

    it('should find a built-in skill', async () => {
      writeSkill(builtInDir, 'test.md', validSkill)

      const skill = await loader.getSkill('test-skill')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.sourceType).toBe('built-in')
    })

    it('should find a global skill', async () => {
      writeSkill(globalDir, 'test.md', validSkill)

      const skill = await loader.getSkill('test-skill')

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.sourceType).toBe('global')
    })

    it('should find a project skill', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')
      writeSkill(projectSkillsDir, 'test.md', validSkill)

      const skill = await loader.getSkill('test-skill', projectDir)

      expect(skill).not.toBeNull()
      expect(skill!.name).toBe('test-skill')
      expect(skill!.sourceType).toBe('project')
    })

    describe('priority ordering', () => {
      it('should return project skill over global and built-in', async () => {
        const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

        writeSkill(
          builtInDir,
          'test.md',
          `---
name: test-skill
description: Built-in
---
Built-in`
        )
        writeSkill(
          globalDir,
          'test.md',
          `---
name: test-skill
description: Global
---
Global`
        )
        writeSkill(
          projectSkillsDir,
          'test.md',
          `---
name: test-skill
description: Project
---
Project`
        )

        const skill = await loader.getSkill('test-skill', projectDir)

        expect(skill).not.toBeNull()
        expect(skill!.description).toBe('Project')
        expect(skill!.sourceType).toBe('project')
      })

      it('should return global skill over built-in when project skill does not exist', async () => {
        writeSkill(
          builtInDir,
          'test.md',
          `---
name: test-skill
description: Built-in
---
Built-in`
        )
        writeSkill(
          globalDir,
          'test.md',
          `---
name: test-skill
description: Global
---
Global`
        )

        const skill = await loader.getSkill('test-skill', projectDir)

        expect(skill).not.toBeNull()
        expect(skill!.description).toBe('Global')
        expect(skill!.sourceType).toBe('global')
      })

      it('should return built-in skill when no higher priority skill exists', async () => {
        writeSkill(
          builtInDir,
          'test.md',
          `---
name: test-skill
description: Built-in
---
Built-in`
        )

        const skill = await loader.getSkill('test-skill', projectDir)

        expect(skill).not.toBeNull()
        expect(skill!.description).toBe('Built-in')
        expect(skill!.sourceType).toBe('built-in')
      })
    })

    describe('input validation', () => {
      it('should reject skill names with path separators', async () => {
        writeSkill(builtInDir, 'valid.md', validSkill)

        const skill1 = await loader.getSkill('../escape')
        const skill2 = await loader.getSkill('path/traversal')
        const skill3 = await loader.getSkill('..\\windows\\escape')

        expect(skill1).toBeNull()
        expect(skill2).toBeNull()
        expect(skill3).toBeNull()
      })

      it('should reject skill names with special characters', async () => {
        writeSkill(builtInDir, 'valid.md', validSkill)

        const skill1 = await loader.getSkill('skill;rm -rf')
        const skill2 = await loader.getSkill('skill&whoami')
        const skill3 = await loader.getSkill('skill|cat /etc/passwd')
        const skill4 = await loader.getSkill('skill$variable')
        const skill5 = await loader.getSkill('skill`command`')

        expect(skill1).toBeNull()
        expect(skill2).toBeNull()
        expect(skill3).toBeNull()
        expect(skill4).toBeNull()
        expect(skill5).toBeNull()
      })

      it('should accept valid skill names with alphanumeric, hyphens, and underscores', async () => {
        writeSkill(
          builtInDir,
          'valid-skill.md',
          `---
name: valid-skill_123
description: Valid skill
---
Content`
        )

        const skill = await loader.getSkill('valid-skill_123')

        expect(skill).not.toBeNull()
        expect(skill!.name).toBe('valid-skill_123')
      })

      it('should reject empty skill names', async () => {
        const skill = await loader.getSkill('')

        expect(skill).toBeNull()
      })

      it('should reject skill names with only spaces', async () => {
        const skill = await loader.getSkill('   ')

        expect(skill).toBeNull()
      })
    })

    it('should handle non-existent directories gracefully', async () => {
      const loaderWithBadPaths = new SkillLoader({
        globalSkillsDir: '/non/existent/path',
        builtInSkillsDir: '/another/bad/path',
      })

      const skill = await loaderWithBadPaths.getSkill('test-skill', '/also/not/real')

      expect(skill).toBeNull()
    })

    it('should handle malformed skill files gracefully', async () => {
      writeSkill(
        builtInDir,
        'malformed.md',
        `---
name: [broken yaml
---
Content`
      )

      const skill = await loader.getSkill('test-skill')

      expect(skill).toBeNull()
    })
  })

  describe('listSkillNames', () => {
    it('should return empty array when no skills exist', async () => {
      const names = await loader.listSkillNames()
      expect(names).toEqual([])
    })

    it('should list all skill names', async () => {
      writeSkill(builtInDir, 'skill1.md', validSkill)
      writeSkill(builtInDir, 'skill2.md', anotherValidSkill)

      const names = await loader.listSkillNames()

      expect(names).toHaveLength(2)
      expect(names).toContain('test-skill')
      expect(names).toContain('another-skill')
    })

    it('should not duplicate names when skills override', async () => {
      writeSkill(
        builtInDir,
        'common.md',
        `---
name: common-skill
description: Built-in
---
Content`
      )
      writeSkill(
        globalDir,
        'common.md',
        `---
name: common-skill
description: Global
---
Content`
      )

      const names = await loader.listSkillNames()

      expect(names).toHaveLength(1)
      expect(names[0]).toBe('common-skill')
    })

    it('should list skills from all sources without duplicates', async () => {
      const projectSkillsDir = path.join(projectDir, '.forge', 'skills')

      writeSkill(
        builtInDir,
        'builtin.md',
        `---
name: builtin
description: Built-in
---
Content`
      )
      writeSkill(
        globalDir,
        'global.md',
        `---
name: global
description: Global
---
Content`
      )
      writeSkill(
        projectSkillsDir,
        'project.md',
        `---
name: project
description: Project
---
Content`
      )
      writeSkill(
        globalDir,
        'override.md',
        `---
name: override
description: Global
---
Content`
      )
      writeSkill(
        projectSkillsDir,
        'override.md',
        `---
name: override
description: Project
---
Content`
      )

      const names = await loader.listSkillNames(projectDir)

      expect(names).toHaveLength(4)
      expect(names).toContain('builtin')
      expect(names).toContain('global')
      expect(names).toContain('project')
      expect(names).toContain('override')
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle empty skill files', async () => {
      fs.writeFileSync(path.join(builtInDir, 'empty.md'), '')

      const skills = await loader.loadSkills()

      expect(skills).toEqual([])
    })

    it('should handle skill files with only frontmatter', async () => {
      writeSkill(
        builtInDir,
        'only-frontmatter.md',
        `---
name: only-frontmatter
description: Only has frontmatter
---`
      )

      const skills = await loader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('only-frontmatter')
      expect(skills[0].content).toBe('')
    })

    it('should handle concurrent loadSkills calls', async () => {
      writeSkill(builtInDir, 'skill1.md', validSkill)
      writeSkill(builtInDir, 'skill2.md', anotherValidSkill)

      const [result1, result2, result3] = await Promise.all([
        loader.loadSkills(),
        loader.loadSkills(),
        loader.loadSkills(),
      ])

      expect(result1).toHaveLength(2)
      expect(result2).toHaveLength(2)
      expect(result3).toHaveLength(2)
    })

    it('should handle concurrent getSkill calls', async () => {
      writeSkill(builtInDir, 'test.md', validSkill)

      const [result1, result2, result3] = await Promise.all([
        loader.getSkill('test-skill'),
        loader.getSkill('test-skill'),
        loader.getSkill('test-skill'),
      ])

      expect(result1).not.toBeNull()
      expect(result2).not.toBeNull()
      expect(result3).not.toBeNull()
      expect(result1!.name).toBe('test-skill')
    })

    it('should handle very long skill names', async () => {
      const longName = 'a'.repeat(500)

      // Should still pass validation
      const skill = await loader.getSkill(longName)

      expect(skill).toBeNull()
    })

    it('should handle unicode characters in directory paths', async () => {
      const unicodeDir = path.join(tempDir, 'unicode-测试-🎉')
      fs.mkdirSync(unicodeDir, { recursive: true })

      writeSkill(unicodeDir, 'test.md', validSkill)

      const unicodeLoader = new SkillLoader({
        globalSkillsDir: '/non/existent',
        builtInSkillsDir: unicodeDir,
      })

      const skills = await unicodeLoader.loadSkills()

      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('test-skill')
    })
  })
})
