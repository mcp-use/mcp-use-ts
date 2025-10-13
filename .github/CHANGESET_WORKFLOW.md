# Changeset Workflow Quick Reference

## 📦 Publishable Packages

- `mcp-use` - Main MCP integration library
- `@mcp-use/cli` - CLI tool for building MCP widgets
- `@mcp-use/inspector` - MCP Inspector UI
- `create-mcp-use-app` - Project scaffolding tool

## 🚀 Common Commands

### Development Workflow

```bash
# 1. Make your changes to the codebase
# ... edit files ...

# 2. Build to verify everything works
pnpm build

# 3. Create a changeset
pnpm changeset
# Follow prompts:
# - Select affected packages
# - Choose version bump (patch/minor/major)
# - Write a summary

# 4. Commit your changes + changeset
git add .
git commit -m "feat: your feature description"

# 5. Push and create PR
git push
```

### Release Workflow (Maintainers)

```bash
# After PRs with changesets are merged to main:

# 1. Check what will be released
pnpm version:check

# 2. Apply changesets (bump versions, update CHANGELOGs)
pnpm version

# 3. Review the changes
git diff

# 4. Commit version bumps
git add .
git commit -m "chore: version packages"
git push

# 5. Publish to npm (requires npm auth)
pnpm release
```

## 📝 Changeset Types

### Patch (0.0.X) - Bug Fixes

```bash
pnpm changeset
```

```md
---
"mcp-use": patch
---

Fixed memory leak in MCPSession cleanup
```

### Minor (0.X.0) - New Features

```bash
pnpm changeset
```

```md
---
"mcp-use": minor
"@mcp-use/cli": minor
---

Added support for custom headers in HTTP connections
```

### Major (X.0.0) - Breaking Changes

```bash
pnpm changeset
```

```md
---
"mcp-use": major
---

BREAKING: Renamed `createSession()` to `connect()` for consistency
```

### Multiple Packages

```md
---
"mcp-use": minor
"@mcp-use/cli": patch
"@mcp-use/inspector": patch
"create-mcp-use-app": patch
---

- Added React hooks for MCP connections (mcp-use)
- Fixed build output paths (cli)
- Updated dependencies (inspector, create-mcp-use-app)
```

### Empty Changeset (No Release)

For changes that don't need a release (docs, tests, internal):

```bash
pnpm changeset --empty
```

## 🔍 Useful Commands

```bash
# Check status of pending changesets
pnpm version:check

# Create a changeset interactively
pnpm changeset

# Create an empty changeset
pnpm changeset --empty

# Apply changesets (version bump)
pnpm version

# Build and publish
pnpm release

# Check what would be published
pnpm changeset status --verbose
```

## 📋 Checklist for Contributors

Before submitting a PR:

- [ ] Code changes are complete
- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] **Changeset created** (`pnpm changeset`) - if changes affect public API
- [ ] Changeset committed with PR

## 📋 Checklist for Maintainers

Before releasing:

- [ ] All PRs with changesets are merged
- [ ] Check pending changesets (`pnpm version:check`)
- [ ] Apply versions (`pnpm version`)
- [ ] Review generated CHANGELOGs
- [ ] Commit version changes
- [ ] Push to main
- [ ] Publish packages (`pnpm release`)
- [ ] Verify packages on npm
- [ ] Create GitHub release (optional)

## 🎯 Best Practices

1. **Create changesets with your PRs**
   - Always add a changeset for user-facing changes
   - Skip changesets for internal-only changes (add `--empty` if needed)

2. **Write clear summaries**
   - Focus on what changed from a user's perspective
   - Include migration steps for breaking changes
   - Link to relevant issues/PRs if applicable

3. **Use appropriate version bumps**
   - **Patch**: Bug fixes, performance improvements, internal changes
   - **Minor**: New features, new exports, enhancements
   - **Major**: Breaking API changes, removed features

4. **Review before publishing**
   - Always review the generated CHANGELOGs
   - Verify version numbers make sense
   - Test packages locally before publishing

## 🔄 Automated Releases (GitHub Actions)

The repository includes automated release workflows:

### `.github/workflows/release.yml`

- Runs on push to `main`
- Creates a "Version Packages" PR automatically
- Publishes packages when the Version PR is merged
- Requires `NPM_TOKEN` secret in GitHub

### `.github/workflows/ci.yml`

- Runs on all PRs
- Checks for lint errors
- Runs tests
- Verifies builds
- Reminds to add changesets

## 🐛 Troubleshooting

### "No changesets present"

You need to create a changeset first:
```bash
pnpm changeset
```

### "Package X is not found in the project"

The package name in ignore list doesn't match. Check:
1. Package name in `package.json`
2. Name in `.changeset/config.json` ignore list

### "Published packages are missing"

Make sure packages have:
1. `"private": false` (or omit it)
2. `"publishConfig": { "access": "public" }`
3. Not in the `ignore` list

### Dry Run

To test versioning without actually changing files:

```bash
# Preview what changesets would do
pnpm changeset status --verbose --since=main
```

## 📚 Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [Project VERSIONING.md](./VERSIONING.md) - Detailed guide
- [Changesets Tutorial](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)

