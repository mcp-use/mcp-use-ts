# MCP-Use Monorepo

This is a monorepo containing multiple packages for the MCP-Use ecosystem.

## Packages

- **`mcp-use`** - Core MCP integration library
- **`@mcp-use/inspector`** - MCP Inspector package for debugging and inspecting MCP servers
- **`@mcp-use/cli`** - Command-line interface for MCP
- **`create-mcp-use-app`** - Create new MCP-Use applications with one command

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests for all packages
pnpm test

# Development mode (watch)
pnpm dev
```

## Publishing Packages

### Prerequisites

1. Ensure you're logged in to npm:
```bash
npm login
```

2. Verify package versions are updated in respective `package.json` files

### Publishing Individual Packages

#### Option 1: Publish from package directory

```bash
# Publish mcp-use
cd packages/mcp-use
pnpm publish --access public

# Publish inspector
cd packages/inspector
pnpm publish --access public

# Publish CLI
cd packages/cli
pnpm publish --access public

# Publish create-mcp-use-app
cd packages/create-mcp-use-app
pnpm publish --access public
```

#### Option 2: Publish from root using filters

```bash
# Publish specific package from root
pnpm --filter mcp-use publish --access public
pnpm --filter @mcp-use/inspector publish --access public
pnpm --filter @mcp-use/cli publish --access public
pnpm --filter create-mcp-use-app publish --access public
```

#### Option 3: Publish all packages at once

```bash
# Publish all public packages
pnpm -r publish --access public
```

### Version Management

#### Update versions individually

```bash
# Bump version for specific package
pnpm --filter mcp-use version patch
pnpm --filter @mcp-use/inspector version minor
pnpm --filter @mcp-use/cli version major
```

#### Update versions using changesets (recommended)

First, install changesets:
```bash
pnpm add -D @changesets/cli -w
pnpm changeset init
```

Then use changesets workflow:
```bash
# Create a changeset
pnpm changeset

# Version packages based on changesets
pnpm changeset version

# Publish packages that have changed
pnpm changeset publish
```

### Pre-publish Checklist

1. **Build all packages**: `pnpm build`
2. **Run tests**: `pnpm test`
3. **Check for lint errors**: `pnpm lint`
4. **Update CHANGELOG.md** (if applicable)
5. **Commit all changes**
6. **Create git tag** (optional): `git tag v0.1.0`

### Publishing with Different Access Levels

```bash
# Public scoped packages (default for @org/package)
pnpm publish --access public

# Private packages (requires npm paid account)
pnpm publish --access restricted

# Dry run (see what would be published)
pnpm publish --dry-run
```

### Troubleshooting

#### If workspace protocol causes issues during publish

The `workspace:*` protocol in dependencies will be automatically replaced with actual version numbers during publish. If this doesn't work:

1. Ensure you're using pnpm >= 7.0.0
2. Check that dependent packages are built first
3. Verify all workspace packages have valid version numbers

#### Authentication issues

```bash
# Check current npm user
npm whoami

# Set registry if using custom registry
npm config set registry https://registry.npmjs.org/
```

#### Scoped package issues

For scoped packages (@mcp-use/*), ensure your npm account has permission to publish to that scope:

```bash
# Add npm organization scope
npm org set mcp-use USERNAME add
```

## Using create-mcp-use-app

The `create-mcp-use-app` package is designed to be used with `npx` to scaffold new projects:

```bash
# Create a new MCP-Use app
npx create-mcp-use-app my-app

# With options
npx create-mcp-use-app my-app --template advanced --typescript

# Interactive mode (prompts for options)
npx create-mcp-use-app
```

### Publishing create-mcp-use-app

Since this is a CLI tool meant to be used with `npx`, ensure it's published publicly:

```bash
cd packages/create-mcp-use-app
pnpm publish --access public
```

After publishing, users can immediately use it with:
```bash
npx create-mcp-use-app@latest my-new-project
```

## License

See LICENSE file in the root directory.
