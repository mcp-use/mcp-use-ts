#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const program = new Command()

program
  .name('create-mcp-app')
  .description('Create a new MCP server project')
  .version('1.0.0')
  .argument('<project-name>', 'Name of the MCP server project')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .option('--no-install', 'Skip installing dependencies')
  .action(async (projectName: string, options: { template: string, install: boolean }) => {
    try {
      console.log(`🚀 Creating MCP server "${projectName}"...`)

      const projectPath = resolve(process.cwd(), projectName)

      // Check if directory already exists
      if (existsSync(projectPath)) {
        console.error(`❌ Directory "${projectName}" already exists!`)
        process.exit(1)
      }

      // Create project directory
      mkdirSync(projectPath, { recursive: true })

      // Copy template files
      await copyTemplate(projectPath, options.template)

      // Update package.json with project name
      updatePackageJson(projectPath, projectName)

      // Install dependencies if requested
      if (options.install) {
        console.log('📦 Installing dependencies...')
        try {
          execSync('pnpm install', { cwd: projectPath, stdio: 'inherit' })
        }
        catch (error) {
          console.log('⚠️  pnpm not found, trying npm...')
          try {
            execSync('npm install', { cwd: projectPath, stdio: 'inherit' })
          }
          catch (npmError) {
            console.log('⚠️  npm install failed, please run "npm install" manually')
          }
        }
      }

      console.log('✅ MCP server created successfully!')
      console.log('')
      console.log('📁 Project structure:')
      console.log(`   ${projectName}/`)
      console.log('   ├── src/')
      console.log('   │   └── server.ts')
      console.log('   ├── package.json')
      console.log('   ├── tsconfig.json')
      console.log('   └── README.md')
      console.log('')
      console.log('🚀 To get started:')
      console.log(`   cd ${projectName}`)
      if (!options.install) {
        console.log('   npm install')
      }
      console.log('   npm run dev')
      console.log('')
      console.log('📚 Learn more: https://docs.mcp-use.io')
    }
    catch (error) {
      console.error('❌ Error creating MCP server:', error)
      process.exit(1)
    }
  })

async function copyTemplate(projectPath: string, template: string) {
  // Look for templates in the source directory
  const templatePath = join(__dirname, '..', '..', 'src', 'cli', 'templates', template)

  if (!existsSync(templatePath)) {
    console.error(`❌ Template "${template}" not found!`)
    console.log('Available templates: basic, filesystem, api, ui')
    console.log('Looking in:', templatePath)
    process.exit(1)
  }

  // Copy all template files
  copyDirectory(templatePath, projectPath)
}

function copyDirectory(src: string, dest: string) {
  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true })
      copyDirectory(srcPath, destPath)
    }
    else {
      copyFileSync(srcPath, destPath)
    }
  }
}

function updatePackageJson(projectPath: string, projectName: string) {
  const packageJsonPath = join(projectPath, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

  packageJson.name = projectName
  packageJson.description = `MCP server: ${projectName}`

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
}

program.parse()
