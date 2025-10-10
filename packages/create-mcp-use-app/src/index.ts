#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import { Command } from 'commander'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const program = new Command()

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
)

program
  .name('create-mcp-use-app')
  .description('Create a new MCP server project')
  .version(packageJson.version)
  .argument('[project-name]', 'Name of the MCP server project')
  .option('-t, --template <template>', 'Template to use', 'ui')
  .option('--no-install', 'Skip installing dependencies')
  .action(async (projectName: string | undefined, options: { template: string, install: boolean }) => {
    try {
      // If no project name provided, prompt for it
      if (!projectName) {
        console.log('🎯 Welcome to create-mcp-use-app!')
        console.log('')
        
        const promptedName = await promptForProjectName()
        
        if (!promptedName) {
          console.log('❌ Project creation cancelled.')
          process.exit(0)
        }
        
        projectName = promptedName
      }

      console.log(`🚀 Creating MCP server "${projectName}"...`)

      const projectPath = resolve(process.cwd(), projectName!)

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
      updatePackageJson(projectPath, projectName!)

      // Install dependencies if requested
      if (options.install) {
        console.log('📦 Installing dependencies...')
        try {
          execSync('pnpm install', { cwd: projectPath, stdio: 'inherit' })
        }
        catch {
          console.log('⚠️  pnpm not found, trying npm...')
          try {
            execSync('npm install', { cwd: projectPath, stdio: 'inherit' })
          }
          catch {
            console.log('⚠️  npm install failed, please run "npm install" manually')
          }
        }
      }

      console.log('✅ MCP server created successfully!')
      console.log('')
      console.log('📁 Project structure:')
      console.log(`   ${projectName}/`)
      if (options.template === 'ui') {
        console.log('   ├── src/')
        console.log('   │   └── server.ts')
        console.log('   ├── resources/')
        console.log('   │   ├── data-visualization.tsx')
        console.log('   │   ├── kanban-board.tsx')
        console.log('   │   └── todo-list.tsx')
        console.log('   ├── package.json')
        console.log('   ├── tsconfig.json')
        console.log('   └── README.md')
      } else {
        console.log('   ├── src/')
        console.log('   │   └── server.ts')
        console.log('   ├── package.json')
        console.log('   ├── tsconfig.json')
        console.log('   └── README.md')
      }
      console.log('')
      console.log('🚀 To get started:')
      console.log(`   cd ${projectName!}`)
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
  const templatePath = join(__dirname, 'templates', template)

  if (!existsSync(templatePath)) {
    console.error(`❌ Template "${template}" not found!`)
    console.log('Available templates: basic, filesystem, api, ui')
    console.log('💡 Tip: Use "ui" template for React components and modern UI features')
    process.exit(1)
  }

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

function promptForProjectName(): Promise<string | null> {
  return new Promise((resolvePromise) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const askForName = () => {
      rl.question('What is your project name? ', (answer) => {
        const trimmed = answer.trim()
        
        if (!trimmed) {
          console.log('❌ Project name is required')
          askForName()
          return
        }
        
        if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
          console.log('❌ Project name can only contain letters, numbers, hyphens, and underscores')
          askForName()
          return
        }
        
        if (existsSync(join(process.cwd(), trimmed))) {
          console.log(`❌ Directory "${trimmed}" already exists! Please choose a different name.`)
          askForName()
          return
        }
        
        rl.close()
        resolvePromise(trimmed)
      })
    }
    
    askForName()
  })
}

program.parse()

