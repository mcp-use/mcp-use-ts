#!/usr/bin/env node
import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

const program = new Command();

program
  .name('create-mcp-use-app')
  .description('Create a new MCP-Use application')
  .version('0.1.0')
  .argument('[project-name]', 'Name of the project')
  .option('-t, --template <template>', 'Template to use (basic, advanced)', 'basic')
  .option('--typescript', 'Use TypeScript', true)
  .option('--no-typescript', 'Use JavaScript')
  .option('--git', 'Initialize git repository', true)
  .option('--no-git', 'Skip git initialization')
  .action(async (projectName, options) => {
    if (!projectName) {
      const response = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'What is your project named?',
        initial: 'my-mcp-app'
      });
      projectName = response.projectName;
    }

    if (!projectName) {
      console.log(chalk.red('Project name is required'));
      process.exit(1);
    }

    const projectPath = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectPath)) {
      console.log(chalk.red(`Directory ${projectName} already exists`));
      process.exit(1);
    }

    console.log(chalk.green(`Creating ${projectName}...`));
    
    // Create project directory
    fs.ensureDirSync(projectPath);
    
    // Create package.json
    const packageJson = {
      name: projectName,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'node src/index.js',
        build: options.typescript ? 'tsc' : 'echo "No build step"',
        start: 'node dist/index.js'
      },
      dependencies: {
        'mcp-use': '^0.1.20'
      },
      devDependencies: options.typescript ? {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0'
      } : {}
    };

    fs.writeJsonSync(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

    // Create source files
    const srcDir = path.join(projectPath, 'src');
    fs.ensureDirSync(srcDir);

    const ext = options.typescript ? 'ts' : 'js';
    const indexContent = `import { MCPClient } from 'mcp-use';

async function main() {
  const client = new MCPClient({
    name: '${projectName}',
    version: '0.1.0'
  });

  // Add your MCP logic here
  
  console.log('MCP app initialized');
}

main().catch(console.error);
`;

    fs.writeFileSync(path.join(srcDir, `index.${ext}`), indexContent);

    // Create tsconfig if TypeScript
    if (options.typescript) {
      const tsconfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'commonjs',
          lib: ['ES2022'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
      };
      fs.writeJsonSync(path.join(projectPath, 'tsconfig.json'), tsconfig, { spaces: 2 });
    }

    // Create README
    const readme = `# ${projectName}

An MCP-Use application

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## License

MIT
`;
    fs.writeFileSync(path.join(projectPath, 'README.md'), readme);

    // Initialize git if requested
    if (options.git) {
      const gitignore = `node_modules/
dist/
.env
*.log
`;
      fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignore);
    }

    console.log(chalk.green('✓ Project created successfully!'));
    console.log();
    console.log('Next steps:');
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan('  npm install'));
    console.log(chalk.cyan('  npm run dev'));
  });

program.parse();
