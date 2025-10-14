# Version Management with Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) for coordinated version management and automatic changelog generation across all packages.

## Packages

The following packages are published to npm:

- **mcp-use** - Main library for MCP integration
- **@mcp-use/cli** - CLI tool for building MCP widgets  
- **@mcp-use/inspector** - MCP Inspector UI
- **create-mcp-use-app** - Project scaffolding tool

## Workflow

### 1. Making Changes

When you make changes that should be published:

```bash
# After making your changes, create a changeset
pnpm changeset
```

This will:
1. Ask which packages were affected
2. Ask whether it's a **major**, **minor**, or **patch** change
3. Ask you to write a summary of the changes

The changeset file will be created in `.changeset/` directory.

### 2. Version Types

Follow [Semantic Versioning](https://semver.org/):

- **Major** (x.0.0) - Breaking changes
- **Minor** (0.x.0) - New features (backward compatible)
- **Patch** (0.0.x) - Bug fixes (backward compatible)

### 3. Creating a Changeset

```bash
# Interactive mode (recommended)
pnpm changeset

# Example prompts:
# ? Which packages would you like to include? 
#   ✔ mcp-use
#   ✔ @mcp-use/cli
# 
# ? What kind of change is this for mcp-use?
#   ○ major (breaking)
#   ● minor (feature)
#   ○ patch (fix)
#
# ? Please enter a summary for this change:
#   Added support for custom headers in HTTP connections
```

### 4. Versioning Packages

When you're ready to release:

```bash
# Consume all changesets and update package versions
pnpm version

# This will:
# - Update version numbers in package.json files
# - Update CHANGELOG.md files
# - Delete consumed changeset files
# - Update pnpm-lock.yaml
```

### 5. Publishing to npm

```bash
# Build and publish all updated packages
pnpm release

# This will:
# - Build all packages
# - Publish updated packages to npm
# - Create git tags
```

### 6. Complete Release Flow

```bash
# 1. Make your changes
git checkout -b feat/my-new-feature

# 2. Create a changeset
pnpm changeset

# 3. Commit the changeset
git add .changeset
git commit -m "feat: add my new feature"

# 4. Push and create PR
git push origin feat/my-new-feature

# 5. After PR is merged to main, on main branch:
git checkout main
git pull

# 6. Version packages
pnpm version

# 7. Commit version changes
git add .
git commit -m "chore: version packages"
git push

# 8. Publish to npm
pnpm release
```

## Changeset Examples

### Adding a Feature

```bash
pnpm changeset
```

```
---
"mcp-use": minor
---

Added support for WebSocket reconnection with exponential backoff
```

### Fixing a Bug

```bash
pnpm changeset
```

```
---
"@mcp-use/cli": patch
---

Fixed TypeScript compilation errors in widget builder
```

### Breaking Change

```bash
pnpm changeset
```

```
---
"mcp-use": major
---

BREAKING: Changed `createMCPServer` API to require explicit configuration object
```

### Multiple Packages

```bash
pnpm changeset
```

```
---
"mcp-use": minor
"@mcp-use/cli": patch
"@mcp-use/inspector": patch
---

- Added new React hooks for MCP connections
- Fixed CLI build output paths
- Updated inspector UI dependencies
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm changeset` | Create a new changeset (interactive) |
| `pnpm version` | Apply changesets and update versions |
| `pnpm release` | Build and publish packages to npm |
| `pnpm version:check` | Check which packages have changesets |

## Advanced Configuration

### Linked Packages

If you want packages to always be versioned together:

```json
{
  "linked": [
    ["mcp-use", "@mcp-use/cli"]
  ]
}
```

### Fixed Packages

If you want packages to always have the same version:

```json
{
  "fixed": [
    ["@mcp-use/*"]
  ]
}
```

### Ignore Packages

Packages already ignored (in `.changeset/config.json`):
- add the package in `"ignore": []`

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 10.6.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Best Practices

1. **Create changesets with your PRs** - Add a changeset file with every PR that changes package behavior
2. **Be descriptive** - Write clear, user-focused changeset summaries
3. **Version appropriately** - Follow semver strictly to avoid breaking users
4. **Batch releases** - Accumulate multiple changesets before versioning
5. **Review CHANGELOGs** - Check generated changelogs before publishing

## Troubleshooting

### "No changesets present"

If you run `pnpm version` and see this message, you need to create changesets first:

```bash
pnpm changeset
```

### "Unable to find a workspace package"

Make sure all packages are in the workspace config (`pnpm-workspace.yaml`):

```yaml
packages:
  - 'packages/*'
```

### "Package is not published"

Ensure package has `publishConfig.access` set to `"public"` in its `package.json`.

## Examples of Generated CHANGELOGs

After running `pnpm version`, your CHANGELOG.md files will look like:

```markdown
# mcp-use

## 0.3.0

### Minor Changes

- abc1234: Added support for WebSocket reconnection with exponential backoff

### Patch Changes

- def5678: Fixed memory leak in session cleanup

## 0.2.0

### Minor Changes

- ghi9012: Added React hooks for MCP connections
```

## Package Dependencies

When updating internal dependencies (workspace packages), Changesets will automatically:

- Update version ranges in dependent packages
- Create appropriate changeset entries
- Maintain workspace protocol (`workspace:*`) in development

Example: If you update `mcp-use` with a minor change, and `@mcp-use/cli` depends on it, `@mcp-use/cli` will get a **patch** version bump (configured by `updateInternalDependencies: "patch"`).

