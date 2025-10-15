#!/usr/bin/env node
import { Command } from 'commander';
import { buildWidgets } from './build.js';
import { startDevServer } from './dev-server.js';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import terminalLink from 'terminal-link';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle ExitPromptError from Commander.js gracefully
process.on('uncaughtException', (error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log('\n👋 Until next time!');
    process.exit(0);
  } else {
    // Rethrow unknown errors
    throw error;
  }
});

const program = new Command();

// Render logo as ASCII art
function renderLogo(): void {
  console.log('\x1b[36m▛▛▌▛▘▛▌▄▖▌▌▛▘█▌\x1b[0m');
  console.log('\x1b[36m▌▌▌▙▖▙▌  ▙▌▄▌▙▖\x1b[0m');
  console.log('\x1b[36m     ▌         \x1b[0m');
}

// Get local network IP
function getNetworkIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netInterface = nets[name];
    if (!netInterface) continue;
    
    for (const net of netInterface) {
      // Skip internal and non-ipv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}


const packageContent = readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
const packageJson = JSON.parse(packageContent)
const packageVersion = packageJson.version || 'unknown'


program
  .name('mcp-use')
  .description('MCP CLI tool')
  .version(packageVersion);

// Helper to check if port is available
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    await fetch(`http://localhost:${port}`);
    return false; // Port is in use
  } catch {
    return true; // Port is available
  }
}

// Helper to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

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
      shell: false,
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
      
      console.log('');
      renderLogo();
      console.log(`\x1b[90mVersion: ${packageJson.version}\x1b[0m\n`);
      
      // Run tsc first
      console.log('Building TypeScript...');
      await runCommand('npx', ['tsc'], projectPath);
      console.log('\x1b[32m✓\x1b[0m TypeScript build complete!');
      
      // Then build widgets
      await buildWidgets(projectPath);
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
      let port = parseInt(options.port, 10);
      
      console.log('');
      renderLogo();
      console.log(`\x1b[90mVersion: ${packageJson.version}\x1b[0m\n`);

      // Check if port is available, find alternative if needed
      if (!(await isPortAvailable(port))) {
        console.log(`\x1b[33m⚠️  Port ${port} is already in use\x1b[0m`);
        const availablePort = await findAvailablePort(port);
        console.log(`\x1b[32m✓\x1b[0m Using port ${availablePort} instead`);
        port = availablePort;
      }

      // Find the main source file
      let serverFile = 'index.ts';
      try {
        await access(path.join(projectPath, serverFile));
      } catch {
        serverFile = 'src/server.ts';
      }

      // Start all processes concurrently
      const processes: any[] = [];
      
      // 1. TypeScript watch
      const tscProc = spawn('npx', ['tsc', '--watch'], {
        cwd: projectPath,
        stdio: 'pipe',
        shell: false,
        // Create a new process group on Unix to properly handle signals
        detached: false,
      });
      
      // Filter out npm warnings from tsc output
      tscProc.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Watching for file changes')) {
          console.log('\x1b[32m✓\x1b[0m TypeScript compiler watching...');
        }
      });
      
      tscProc.stderr?.on('data', (data) => {
        const output = data.toString();
        // Filter out npm warnings and tsx cleanup messages
        if (!output.includes('npm warn') && 
            !output.includes('[tsx]') &&
            !output.includes('Force killing')) {
          process.stderr.write(output);
        }
      });
      
      processes.push(tscProc);

      // 2. Start Vite dev server for widgets with HMR
      const vitePort = 5173;
      let viteServer: any;
      try {
        const result = await startDevServer(projectPath, vitePort);
        viteServer = result.server;
      } catch (error) {
        console.error('Failed to start Vite dev server:', error);
        process.exit(1);
      }

      // Wait a bit for initial builds
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Server with tsx - pipe output to filter duplicates
      const serverProc = spawn('npx', ['tsx', 'watch', serverFile], {
        cwd: projectPath,
        stdio: 'pipe',
        shell: false,
        env: { 
          ...process.env, 
          PORT: String(port),
          VITE_DEV_SERVER: `http://localhost:${vitePort}`,
          MCP_USE_DEV_MODE: 'true',
        },
        // Create a new process group on Unix to properly handle signals
        detached: false,
      });
      
      // Track seen log lines to avoid duplicates and shutdown state
      const seenLogs = new Set<string>();
      const logTimeout = new Map<string, NodeJS.Timeout>();
      let isShuttingDown = false;
      
      serverProc.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (!line.trim()) return;
          
          // Filter out server startup messages since CLI provides better formatted output
          if (line.includes('[MCP] Server mounted') ||
              line.includes('[SERVER] Listening') ||
              line.includes('[MCP] Endpoints:') ||
              line.includes('[INSPECTOR] UI available')) {
            return;
          }
          
          // Create a normalized key for the log line
          const normalizedLine = line.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g, '[TIME]');
          
          // If we've seen this line recently, skip it
          if (seenLogs.has(normalizedLine)) return;
          
          // Add to seen logs and set a timeout to remove it
          seenLogs.add(normalizedLine);
          
          // Clear existing timeout if any
          if (logTimeout.has(normalizedLine)) {
            clearTimeout(logTimeout.get(normalizedLine)!);
          }
          
          // Remove from seen logs after 1 second
          logTimeout.set(normalizedLine, setTimeout(() => {
            seenLogs.delete(normalizedLine);
            logTimeout.delete(normalizedLine);
          }, 1000));
          
          console.log(line);
        });
      });
      
      serverProc.stderr?.on('data', (data) => {
        // Suppress all output during shutdown
        if (isShuttingDown) return;
        
        const output = data.toString();
        // Filter out npm warnings about pnpm/yarn config and tsx cleanup messages
        if (!output.includes('npm warn') && 
            !output.includes('[tsx]') &&
            !output.includes('Force killing') &&
            !output.includes('Previous process')) {
          process.stderr.write(output);
        }
      });
      
      processes.push(serverProc);

      // Auto-open inspector if enabled
      if (options.open !== false) {
        const startTime = Date.now();
        const ready = await waitForServer(port);
        if (ready) {
          const networkIP = getNetworkIP();
          const mcpUrl = `http://localhost:${port}/mcp`;
          const inspectorUrl = `http://localhost:${port}/inspector?autoConnect=${encodeURIComponent(mcpUrl)}`;
          const readyTime = Date.now() - startTime;
          const networkMcpUrl = `http://${networkIP}:${port}/mcp`;
          console.log(`\n\x1b[32m✓\x1b[0m \x1b[1mReady in ${readyTime}ms\x1b[0m\n`);
          console.log(`\x1b[1m🌐 MCP Endpoints:\x1b[0m`);
          console.log(`   Local:     \x1b[36m${mcpUrl}\x1b[0m`);
          console.log(`   Network:   \x1b[36m${networkMcpUrl}\x1b[0m`);
          console.log(`   Inspector: \x1b[36m${inspectorUrl}\x1b[0m`);
          console.log('');
          
          // Create clickable links with fallback
          const docsLink = terminalLink('\x1b[1mhttps://docs.mcp-use.com\x1b[0m', 'https://docs.mcp-use.com', {
            fallback: (text, url) => `${text} \x1b[90m${url}\x1b[0m`
          });
          const githubLink = terminalLink('\x1b[1mhttps://github.com/mcp-use/mcp-use\x1b[0m', 'https://github.com/mcp-use/mcp-use', {
            fallback: (text, url) => `${text} \x1b[90m${url}\x1b[0m`
          });
          const websiteLink = terminalLink('https://mcp-use.com', 'https://mcp-use.com', {
            fallback: (text, url) => `${text} \x1b[90m${url}\x1b[0m`
          });
          
          console.log(`📚 ${docsLink}`);
          console.log(`💬 Feedback & bug reports: ${githubLink} or ${websiteLink}`);
          console.log('');
          await open(inspectorUrl);
        }
      }

      // Handle cleanup
      const cleanup = async (signal?: string) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        console.log('\n\n👋 Shutting down...');
        
        // Immediately suppress all stderr to prevent tsx cleanup messages
        process.stderr.write = (() => true) as any;
        
        // Remove all listeners from child process streams to prevent any buffered output
        processes.forEach(proc => {
          try {
            proc.stdout?.removeAllListeners();
            proc.stderr?.removeAllListeners();
          } catch (error) {
            // Ignore errors when removing listeners
          }
        });
        
        // Close Vite server and await it to ensure proper cleanup
        if (viteServer) {
          try {
            await viteServer.close();
          } catch (error) {
            // Ignore errors when closing Vite
          }
        }
        
        // Kill all child processes with SIGKILL for immediate termination
        processes.forEach(proc => {
          try {
            if (!proc.killed) {
              proc.kill('SIGKILL');
            }
          } catch (error) {
            // Ignore errors when killing processes
          }
        });
        
        // Give a bit more time for processes to clean up, then force exit
        setTimeout(() => {
          process.exit(0);
        }, 200);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      process.on('SIGHUP', cleanup);

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

      console.log('');
      renderLogo();
      console.log(`\x1b[90mVersion: ${packageJson.version}\x1b[0m\n`);

      // Find the built server file
      let serverFile = 'dist/index.js';
      try {
        await access(path.join(projectPath, serverFile));
      } catch {
        serverFile = 'dist/server.js';
      }

      console.log('Starting production server...');
      const serverProc = spawn('node', [serverFile], {
        cwd: projectPath,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(port) },
      });

      // Handle cleanup
      let isShuttingDown = false;
      const cleanup = () => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        console.log('\n\n👋 Shutting down...');
        
        try {
          if (!serverProc.killed) {
            serverProc.kill('SIGTERM');
            // Force kill after 1 second if still running
            setTimeout(() => {
              if (!serverProc.killed) {
                serverProc.kill('SIGKILL');
              }
            }, 1000);
          }
        } catch (error) {
          // Ignore errors when killing process
        }
        
        // Exit after giving process time to clean up
        setTimeout(() => {
          process.exit(0);
        }, 1500);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      process.on('SIGHUP', cleanup);

      serverProc.on('exit', (code) => {
        if (!isShuttingDown) {
          process.exit(code || 0);
        }
      });
    } catch (error) {
      console.error('Start failed:', error);
      process.exit(1);
    }
  });

program.parse();
