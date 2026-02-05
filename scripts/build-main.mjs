import * as esbuild from 'esbuild'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Only externalize native modules and electron
const external = [
  'electron',
  'better-sqlite3',  // Native module
]

const isDev = process.argv.includes('--dev')

// Build main process
await esbuild.build({
  entryPoints: ['src/main/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/main/index.cjs',
  format: 'cjs',
  external,
  sourcemap: isDev,
  minify: !isDev,
})

// Build preload script
await esbuild.build({
  entryPoints: ['src/main/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/main/preload.js',
  format: 'cjs',
  external: ['electron'],
  sourcemap: isDev,
  minify: !isDev,
})

console.log('Main process built successfully!')
