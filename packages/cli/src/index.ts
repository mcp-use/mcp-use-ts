#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('mcp-use')
  .description('MCP CLI tool')
  .version('0.1.0');

program.parse();
