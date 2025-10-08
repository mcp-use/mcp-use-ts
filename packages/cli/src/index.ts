#!/usr/bin/env node
import { Command } from 'commander';
import { buildWidgets } from './build';

const program = new Command();

program
  .name('mcp-use')
  .description('MCP CLI tool')
  .version('0.1.0');

program
  .command('build')
  .description('Build MCP UI widgets')
  .option('-p, --path <path>', 'Path to project directory', process.cwd())
  .action(async (options) => {
    try {
      await buildWidgets(options.path);
    } catch (error) {
      console.error('Build failed:', error);
      process.exit(1);
    }
  });

program.parse();
