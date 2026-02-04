/**
 * Icon Generation Script for Forge
 *
 * Required icon sizes:
 * - macOS (icon.icns): 16, 32, 64, 128, 256, 512, 1024 pixels
 * - Windows (icon.ico): 16, 24, 32, 48, 64, 128, 256 pixels
 * - Linux (icon.png): 512x512 pixels
 *
 * Design Guidelines:
 * - Simple, recognizable shape (anvil/hammer for "Forge")
 * - Works well at small sizes
 * - Consistent with macOS/Windows design language
 * - Use purple/blue gradient matching app theme
 *
 * To generate icons from a source PNG:
 * 1. Create a 1024x1024 PNG source image
 * 2. Use a tool like:
 *    - macOS: iconutil (built-in)
 *    - Cross-platform: png2icons, electron-icon-builder
 *    - Online: cloudconvert.com, icoconvert.com
 *
 * Example using electron-icon-builder:
 * npm install -D electron-icon-builder
 * npx electron-icon-builder --input=./source-icon.png --output=./build
 */

const fs = require('fs')
const path = require('path')

const BUILD_DIR = path.join(__dirname, '..', 'build')

// Ensure build directory exists
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true })
}

// Create placeholder PNG (1x1 transparent pixel as base64)
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

// Write placeholder files if they don't exist
const files = ['icon.png', 'icon.ico', 'icon.icns']

files.forEach(file => {
  const filePath = path.join(BUILD_DIR, file)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, PLACEHOLDER_PNG)
    console.log(`Created placeholder: ${file}`)
  } else {
    console.log(`Skipped (exists): ${file}`)
  }
})

console.log('\nIcon generation complete!')
console.log('Replace placeholder files with actual icons before release.')
