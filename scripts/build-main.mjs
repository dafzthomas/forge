import * as esbuild from 'esbuild'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Get external dependencies (native modules and electron)
const pkg = require('../package.json')
const external = [
  'electron',
  'better-sqlite3',
  'chokidar',
  'electron-updater',
  'electron-log',
  'simple-git',
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]

const isDev = process.argv.includes('--dev')

await esbuild.build({
  entryPoints: ['src/main/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/main/index.js',
  format: 'esm',
  external,
  sourcemap: isDev,
  minify: !isDev,
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
    `.trim(),
  },
})

console.log('Main process built successfully!')
