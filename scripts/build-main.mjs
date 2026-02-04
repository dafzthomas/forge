import * as esbuild from 'esbuild'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Only externalize native modules and electron
const external = [
  'electron',
  'better-sqlite3',  // Native module
]

const isDev = process.argv.includes('--dev')

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

console.log('Main process built successfully!')
