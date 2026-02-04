import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SkillImporter } from '../importer'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// Helper to create a temp directory
async function createTempDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'forge-skill-importer-test-'))
}

// Helper to clean up temp directory
async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
}

// Helper to write a skill file
async function writeSkill(dir: string, filename: string, content: string): Promise<string> {
  const filePath = path.join(dir, filename)
  await fs.writeFile(filePath, content)
  return filePath
}

describe('SkillImporter', () => {
  let tempDir: string
  let sourceDir: string
  let targetDir: string
  let importer: SkillImporter

  beforeEach(async () => {
    tempDir = await createTempDir()
    sourceDir = path.join(tempDir, 'source')
    targetDir = path.join(tempDir, 'target')

    await fs.mkdir(sourceDir, { recursive: true })
    await fs.mkdir(targetDir, { recursive: true })

    importer = new SkillImporter()
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  describe('importSkill', () => {
    it('should import a Forge format skill', async () => {
      const skillContent = `---
name: test-skill
description: A test skill
---
Content`
      const sourcePath = await writeSkill(sourceDir, 'test.md', skillContent)

      const result = await importer.importSkill(sourcePath, targetDir, 'global')

      expect(result.skill.name).toBe('test-skill')
      expect(result.skill.description).toBe('A test skill')
      expect(result.targetPath).toBe(path.join(targetDir, 'test-skill.md'))
      expect(result.overwritten).toBe(false)

      // Verify file was copied
      const targetContent = await fs.readFile(result.targetPath, 'utf-8')
      expect(targetContent).toBe(skillContent)
    })

    it('should import a Claude Code format skill', async () => {
      const skillContent = `---
name: claude-skill
trigger: /cs
args:
  - name: arg1
    type: string
---
Content`
      const sourcePath = await writeSkill(sourceDir, 'claude.md', skillContent)

      const result = await importer.importSkill(sourcePath, targetDir, 'global')

      expect(result.skill.name).toBe('claude-skill')
      expect(result.skill.triggers).toEqual(['/cs'])
      expect(result.skill.inputs).toHaveLength(1)
      expect(result.skill.inputs![0].name).toBe('arg1')
      expect(result.overwritten).toBe(false)
    })

    it('should create target directory if it does not exist', async () => {
      const skillContent = `---
name: test-skill
description: Test
---
Content`
      const sourcePath = await writeSkill(sourceDir, 'test.md', skillContent)
      const newTargetDir = path.join(tempDir, 'new-target', 'nested')

      const result = await importer.importSkill(sourcePath, newTargetDir, 'global')

      expect(result.targetPath).toBe(path.join(newTargetDir, 'test-skill.md'))

      // Verify directory was created
      const stat = await fs.stat(newTargetDir)
      expect(stat.isDirectory()).toBe(true)
    })

    it('should refuse to overwrite by default', async () => {
      const skillContent = `---
name: test-skill
description: Test
---
Content`
      const sourcePath = await writeSkill(sourceDir, 'test.md', skillContent)

      // First import
      await importer.importSkill(sourcePath, targetDir, 'global')

      // Second import should fail
      await expect(
        importer.importSkill(sourcePath, targetDir, 'global')
      ).rejects.toThrow(/already exists/)
    })

    it('should overwrite when explicitly allowed', async () => {
      const originalContent = `---
name: test-skill
description: Original
---
Original content`
      const updatedContent = `---
name: test-skill
description: Updated
---
Updated content`

      const sourcePath1 = await writeSkill(sourceDir, 'original.md', originalContent)
      const result1 = await importer.importSkill(sourcePath1, targetDir, 'global')
      expect(result1.overwritten).toBe(false)

      const sourcePath2 = await writeSkill(sourceDir, 'updated.md', updatedContent)
      const result2 = await importer.importSkill(sourcePath2, targetDir, 'global', {
        overwrite: true,
      })
      expect(result2.overwritten).toBe(true)

      // Verify file was overwritten
      const targetContent = await fs.readFile(result2.targetPath, 'utf-8')
      expect(targetContent).toBe(updatedContent)
    })

    it('should respect format hint', async () => {
      const skillContent = `---
name: ambiguous-skill
description: Could be either format
---
Content`
      const sourcePath = await writeSkill(sourceDir, 'ambiguous.md', skillContent)

      const result = await importer.importSkill(sourcePath, targetDir, 'global', {
        format: 'forge',
      })

      expect(result.skill.name).toBe('ambiguous-skill')
    })

    it('should throw error for invalid skill file', async () => {
      const invalidContent = `---
description: Missing name
---
Content`
      const sourcePath = await writeSkill(sourceDir, 'invalid.md', invalidContent)

      await expect(
        importer.importSkill(sourcePath, targetDir, 'global')
      ).rejects.toThrow(/Failed to parse/)
    })

    it('should throw error for non-existent source file', async () => {
      await expect(
        importer.importSkill('/non/existent/file.md', targetDir, 'global')
      ).rejects.toThrow()
    })

    it('should handle skills with special characters in name', async () => {
      const skillContent = `---
name: skill-with_special123
description: Test
---
Content`
      const sourcePath = await writeSkill(sourceDir, 'special.md', skillContent)

      const result = await importer.importSkill(sourcePath, targetDir, 'global')

      expect(result.targetPath).toBe(path.join(targetDir, 'skill-with_special123.md'))
    })
  })

  describe('importDirectory', () => {
    it('should import multiple skills', async () => {
      await writeSkill(
        sourceDir,
        'skill1.md',
        `---
name: skill-1
description: First skill
---
Content 1`
      )
      await writeSkill(
        sourceDir,
        'skill2.md',
        `---
name: skill-2
description: Second skill
---
Content 2`
      )

      const results = await importer.importDirectory(sourceDir, targetDir, 'global')

      expect(results).toHaveLength(2)
      expect(results[0].skill.name).toBe('skill-1')
      expect(results[1].skill.name).toBe('skill-2')

      // Verify both files were copied
      const files = await fs.readdir(targetDir)
      expect(files).toContain('skill-1.md')
      expect(files).toContain('skill-2.md')
    })

    it('should only import .md files', async () => {
      await writeSkill(
        sourceDir,
        'skill.md',
        `---
name: valid-skill
description: Test
---
Content`
      )
      await fs.writeFile(path.join(sourceDir, 'not-skill.txt'), 'text file')
      await fs.writeFile(path.join(sourceDir, 'config.json'), '{}')

      const results = await importer.importDirectory(sourceDir, targetDir, 'global')

      expect(results).toHaveLength(1)
      expect(results[0].skill.name).toBe('valid-skill')
    })

    it('should skip invalid skill files but continue with others', async () => {
      await writeSkill(
        sourceDir,
        'valid.md',
        `---
name: valid-skill
description: Test
---
Content`
      )
      await writeSkill(
        sourceDir,
        'invalid.md',
        `---
description: Missing name
---
Content`
      )

      const results = await importer.importDirectory(sourceDir, targetDir, 'global')

      // Should only import the valid skill
      expect(results).toHaveLength(1)
      expect(results[0].skill.name).toBe('valid-skill')
    })

    it('should throw error for non-existent source directory', async () => {
      await expect(
        importer.importDirectory('/non/existent/dir', targetDir, 'global')
      ).rejects.toThrow(/does not exist/)
    })

    it('should handle empty directory', async () => {
      const results = await importer.importDirectory(sourceDir, targetDir, 'global')

      expect(results).toEqual([])
    })

    it('should respect overwrite option', async () => {
      await writeSkill(
        sourceDir,
        'skill.md',
        `---
name: test-skill
description: Original
---
Content`
      )

      // First import
      const results1 = await importer.importDirectory(sourceDir, targetDir, 'global')
      expect(results1).toHaveLength(1)
      expect(results1[0].overwritten).toBe(false)

      // Update the source file
      await writeSkill(
        sourceDir,
        'skill.md',
        `---
name: test-skill
description: Updated
---
New content`
      )

      // Second import with overwrite
      const results2 = await importer.importDirectory(sourceDir, targetDir, 'global', {
        overwrite: true,
      })
      expect(results2).toHaveLength(1)
      expect(results2[0].overwritten).toBe(true)
      expect(results2[0].skill.description).toBe('Updated')
    })

    it('should respect format hint', async () => {
      await writeSkill(
        sourceDir,
        'claude.md',
        `---
name: claude-skill
trigger: /cs
---
Content`
      )

      const results = await importer.importDirectory(sourceDir, targetDir, 'global', {
        format: 'claude-code',
      })

      expect(results).toHaveLength(1)
      expect(results[0].skill.triggers).toEqual(['/cs'])
    })

    it('should handle mixed format skills', async () => {
      await writeSkill(
        sourceDir,
        'forge.md',
        `---
name: forge-skill
description: Forge format
triggers:
  - /fs
---
Content`
      )
      await writeSkill(
        sourceDir,
        'claude.md',
        `---
name: claude-skill
trigger: /cs
---
Content`
      )

      const results = await importer.importDirectory(sourceDir, targetDir, 'global')

      expect(results).toHaveLength(2)
      // Both should be parsed correctly
      const forgeSkill = results.find((r) => r.skill.name === 'forge-skill')
      const claudeSkill = results.find((r) => r.skill.name === 'claude-skill')
      expect(forgeSkill).toBeDefined()
      expect(claudeSkill).toBeDefined()
    })
  })

  describe('importFromClaudeCode', () => {
    it('should throw error if Claude Code directory does not exist', async () => {
      // Use a non-existent directory
      const badTargetDir = path.join(tempDir, 'target')

      await expect(
        importer.importFromClaudeCode(badTargetDir, 'global')
      ).rejects.toThrow(/not found/)
    })

    // Note: Testing the actual Claude Code import would require setting up
    // a mock Claude Code directory at the expected system location, which
    // varies by platform. In a real test environment, you might mock the
    // getClaudeCodeSkillsDir method or set up test fixtures.
  })
})
