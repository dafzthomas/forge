#!/usr/bin/env node
/**
 * Rebuilds native modules for Electron.
 * This script ensures better-sqlite3 is compiled against Electron's Node.js ABI.
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

// Get Electron version from package.json
const packageJson = await import(join(projectRoot, 'package.json'), { with: { type: 'json' } })
const electronVersion = packageJson.default.devDependencies.electron.replace('^', '')

const betterSqlite3Path = join(projectRoot, 'node_modules', 'better-sqlite3')

if (!existsSync(betterSqlite3Path)) {
  console.log('better-sqlite3 not installed yet, skipping rebuild')
  process.exit(0)
}

console.log(`Rebuilding native modules for Electron ${electronVersion}...`)

try {
  // Build better-sqlite3 with Electron headers
  execSync(
    `npm run build-release`,
    {
      cwd: betterSqlite3Path,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_runtime: 'electron',
        npm_config_target: electronVersion,
        npm_config_arch: process.arch,
        npm_config_disturl: 'https://electronjs.org/headers',
      },
    }
  )
  console.log('Native modules rebuilt successfully!')
} catch (error) {
  console.error('Failed to rebuild native modules:', error.message)
  process.exit(1)
}
