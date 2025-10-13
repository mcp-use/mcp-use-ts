# Beta Release Workflow

This guide explains how to release beta versions using the `beta` branch and automated GitHub Actions.

## 🎯 Overview

- **`main` branch** → Stable releases (automated via `release.yml`)
- **`beta` branch** → Beta/prerelease versions (automated via `release-beta.yml`)
- Feature branches → Work in progress (no releases)

## 🚀 Quick Start: Releasing a Beta

### 1. Create and Push to Beta Branch

```bash
# From your feature branch (e.g., feat/mcp-ui-apps)
git checkout -b beta

# Push to trigger the beta release workflow
git push origin beta
```

The GitHub Action will automatically:
- Enter prerelease mode (creates `.changeset/pre.json`)
- Create a "Version Packages (beta)" PR
- Publish beta versions when the PR is merged

### 2. Make Changes and Create Changesets

```bash
# Make your changes
# ... edit files ...

# Create a changeset
pnpm changeset

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin beta
```

### 3. The Automated Flow

When you push to `beta`:

1. **If no changesets exist**: Nothing happens (waiting for changesets)
2. **If changesets exist**: 
   - A PR is created with version bumps (e.g., `0.2.1-beta.0`)
   - Review and merge the PR
   - On merge, packages are automatically published to npm with `@beta` tag

## 📝 Manual Beta Release (Alternative)

If you prefer manual control:

```bash
# On beta branch
git checkout beta

# Enter prerelease mode (first time only)
pnpm changeset pre enter beta

# Create changesets
pnpm changeset

# Version packages
pnpm version

# Commit version changes
git add .
git commit -m "chore: version packages (beta)"
git push

# Publish to npm
pnpm release
```

## 🔄 Continuous Beta Releases

While on the `beta` branch, you can continue making changes:

```bash
# Make more changes
# ... edit code ...

# Create another changeset
pnpm changeset

# Push to trigger versioning
git push origin beta
```

Each release will increment the beta number: `0.2.1-beta.0` → `0.2.1-beta.1` → `0.2.1-beta.2`, etc.

## ✅ Promoting Beta to Stable

When beta testing is complete and you're ready for a stable release:

### Option 1: Merge Beta to Main (Recommended)

```bash
# Switch to main and merge beta
git checkout main
git pull origin main
git merge beta

# Exit prerelease mode
pnpm changeset pre exit

# Commit the pre.json removal
git add .changeset/pre.json
git commit -m "chore: exit prerelease mode"

# Push to main (triggers stable release workflow)
git push origin main
```

The stable release workflow will:
- Version packages as stable (e.g., `0.2.1`)
- Publish to npm with `@latest` tag

### Option 2: Cherry-pick Changes

If you only want specific changes from beta:

```bash
git checkout main
git cherry-pick <commit-hash>
# ... resolve any conflicts ...
git push origin main
```

## 📦 Installing Beta Versions

Users can install beta versions:

```bash
# Install latest beta
npm install mcp-use@beta
npm install @mcp-use/cli@beta

# Install specific beta version
npm install mcp-use@0.2.1-beta.0
```

## 🔍 Checking Beta Releases

View published versions and tags:

```bash
# See all versions
npm view mcp-use versions

# See dist-tags
npm view mcp-use dist-tags
# {
#   latest: '0.2.0',
#   beta: '0.2.1-beta.0'
# }
```

## 🛠️ Workflow Features

The `release-beta.yml` workflow includes:

- ✅ Automatic prerelease mode entry
- ✅ Version PR creation
- ✅ Automatic publishing on merge
- ✅ Comment on commits with published versions
- ✅ Manual trigger via GitHub UI (workflow_dispatch)

## 🔧 Manual Trigger

You can manually trigger a beta release from GitHub:

1. Go to **Actions** tab
2. Select **Release Beta** workflow
3. Click **Run workflow**
4. Select `beta` branch
5. Click **Run workflow** button

## 📋 Best Practices

1. **Keep beta branch up to date with main**
   ```bash
   git checkout beta
   git merge main
   git push
   ```

2. **Create meaningful changesets**
   - Describe what changed from a user's perspective
   - Mark breaking changes clearly

3. **Test beta versions thoroughly**
   - Install beta versions in test projects
   - Verify all packages work together
   - Check for breaking changes

4. **Clean up after stable release**
   ```bash
   # After merging to main and releasing stable
   git checkout beta
   git merge main  # Sync beta with main
   git push
   ```

## 🐛 Troubleshooting

### "Already in prerelease mode" Error

The workflow handles this automatically, but if you see this message, it means `.changeset/pre.json` already exists. This is normal and expected.

### Beta Branch Out of Sync

```bash
# Reset beta branch to match a starting point
git checkout beta
git reset --hard main  # or feat/your-feature
git push --force origin beta
```

### Want to Start Fresh

```bash
# Exit prerelease mode
pnpm changeset pre exit

# Remove all pending changesets
rm -rf .changeset/*.md

# Commit changes
git add .
git commit -m "chore: reset changesets"
git push
```

### Workflow Not Triggering

Check:
1. Branch name is exactly `beta`
2. You have changesets in `.changeset/*.md`
3. GitHub Actions is enabled in your repository
4. `NPM_TOKEN` secret is configured in GitHub Settings

## 📚 Resources

- [Changesets Prerelease Documentation](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)
- [Main Release Workflow](./VERSIONING.md)
- [Changeset Workflow Guide](./CHANGESET_WORKFLOW.md)

