#!/usr/bin/env node
import { Command } from 'commander';
import { buildWidgets } from './build';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import open from 'open';

const program = new Command();

program
  .name('mcp-use')
  .description('MCP CLI tool')
  .version('0.1.0');

// Helper to check if server is ready
async function waitForServer(port: number, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/inspector`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

// Helper to run a command
function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

program
  .command('build')
  .description('Build TypeScript and MCP UI widgets')
  .option('-p, --path <path>', 'Path to project directory', process.cwd())
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.path);
      
      // Run tsc first
      console.log('🔨 Building TypeScript...');
      await runCommand('npx', ['tsc'], projectPath);
      console.log('✅ TypeScript build complete!');
      
      // Then build widgets
      await buildWidgets(projectPath, false);
    } catch (error) {
      console.error('Build failed:', error);
      process.exit(1);
    }
  });

program
  .command('dev')
  .description('Run development server with auto-reload and inspector')
  .option('-p, --path <path>', 'Path to project directory', process.cwd())
  .option('--port <port>', 'Server port', '3000')
  .option('--no-open', 'Do not auto-open inspector')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.path);
      const port = parseInt(options.port, 10);
      
      console.log('🚀 Starting development mode...\n');

      // Find the main source file
      let serverFile = 'src/server.ts';
      try {
        await fs.access(path.join(projectPath, serverFile));
      } catch {
        serverFile = 'src/index.ts';
      }

      // Start all processes concurrently
      const processes: any[] = [];
      
      // 1. TypeScript watch
      console.log('📦 Starting TypeScript compiler in watch mode...');
      const tscProc = spawn('npx', ['tsc', '--watch'], {
        cwd: projectPath,
        stdio: 'pipe',
        shell: true,
      });
      tscProc.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Watching for file changes')) {
          console.log('✅ TypeScript compiler watching...');
        }
      });
      processes.push(tscProc);

      // 2. Widget builder watch - run in background
      console.log('🎨 Starting widget builder in watch mode...');
      buildWidgets(projectPath, true).catch((error) => {
        console.error('Widget builder failed:', error);
      });

      // Wait a bit for initial builds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Server with tsx
      console.log(`🌐 Starting server at http://localhost:${port}...`);
      const serverProc = spawn('npx', ['tsx', 'watch', serverFile], {
        cwd: projectPath,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, PORT: String(port) },
      });
      processes.push(serverProc);

      // Auto-open inspector if enabled
      if (options.open) {
        console.log('⏳ Waiting for server to be ready...');
        const ready = await waitForServer(port);
        if (ready) {
          const inspectorUrl = `http://localhost:${port}/inspector`;
          console.log(`\n🔍 Opening inspector at ${inspectorUrl}...\n`);
          await open(inspectorUrl);
        } else {
          console.log('\n⚠️  Server did not start in time, skipping auto-open');
        }
      }

      // Handle cleanup
      const cleanup = () => {
        console.log('\n\n🛑 Shutting down...');
        processes.forEach(proc => proc.kill());
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Keep the process running
      await new Promise(() => {});
    } catch (error) {
      console.error('Dev mode failed:', error);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start production server')
  .option('-p, --path <path>', 'Path to project directory', process.cwd())
  .option('--port <port>', 'Server port', '3000')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.path);
      const port = parseInt(options.port, 10);

      // Find the built server file
      let serverFile = 'dist/server.js';
      try {
        await fs.access(path.join(projectPath, serverFile));
      } catch {
        serverFile = 'dist/index.js';
      }

      console.log('🚀 Starting production server...');
      const serverProc = spawn('node', [serverFile], {
        cwd: projectPath,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(port) },
      });

      // Handle cleanup
      const cleanup = () => {
        console.log('\n\n🛑 Shutting down...');
        serverProc.kill();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      serverProc.on('exit', (code) => {
        process.exit(code || 0);
      });
    } catch (error) {
      console.error('Start failed:', error);
      process.exit(1);
    }
  });

program.parse();
