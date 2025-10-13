# mcp-use

## 1.0.1

### Patch Changes

- 1310533: add MCP server feature to mcp-use + add mcp-use inspector + add mcp-use cli build and deployment tool + add create-mcp-use-app for scaffolding mcp-use apps
- Updated dependencies [1310533]
  - @mcp-use/inspector@0.3.3

## 1.0.0

### Patch Changes

- Updated dependencies
  - @mcp-use/inspector@0.3.0

## 0.3.0

### Minor Changes

- db54528: Added useMcpTools React hook for easier tool management

  ````

  ## Step 5: Commit Everything

  ```bash
  git add .
  git commit -m "feat: add useMcpTools React hook"
  git push origin feat/add-use-mcp-tools-hook
  ````

  ## Step 6: Create Pull Request

  Create a PR on GitHub with:

  **Title:** `feat: add useMcpTools React hook`

  **Description:**

  ```markdown
  ## What

  Adds a new `useMcpTools()` React hook for managing MCP tools.

  ## Why

  Simplifies tool management in React applications.

  ## Changes

  - Added `useMcpTools` hook in `packages/mcp-use/src/react/hooks/`
  - Exported from `mcp-use/react`
  - Added tests for the new hook

  ## Changeset

  ✅ Changeset included (minor bump for mcp-use)
  ```

  ## Step 7: Review & Merge

  After review and approval:

  ```bash
  # Merge the PR to main
  ```

  ## Step 8: Release (Maintainer Task)

  On the `main` branch after merge:

  ```bash
  # Switch to main and pull
  git checkout main
  git pull origin main

  # Check what will be versioned
  pnpm version:check
  ```

  **Output:**

  ```
  🦋  info Packages to be bumped at minor:
  🦋  - mcp-use (0.2.0 → 0.3.0)
  🦋
  🦋  info Packages to be bumped at patch:
  🦋  - @mcp-use/cli (2.0.1 → 2.0.2) ← depends on mcp-use
  🦋  - @mcp-use/inspector (0.1.0 → 0.1.1) ← depends on mcp-use
  ```

  ```bash
  # Apply the version changes
  pnpm version
  ```

  **This will:**
  1. Update `mcp-use/package.json` to `0.3.0`
  2. Update dependent packages (`@mcp-use/cli`, `@mcp-use/inspector`) with patch bumps
  3. Generate/update `CHANGELOG.md` in each package:

  ```markdown
  # mcp-use

  ## 0.3.0

  ### Minor Changes

  - abc1234: Added useMcpTools React hook for easier tool management

  ## 0.2.0

  ...
  ```

  4. Delete `.changeset/random-name-here.md`
  5. Update `pnpm-lock.yaml`

  ```bash
  # Review the changes
  git diff

  # Commit the version changes
  git add .
  git commit -m "chore: version packages"
  git push origin main
  ```

  ## Step 9: Publish to npm

  ```bash
  # Build everything
  pnpm build

  # Publish to npm
  pnpm release
  ```

  **This will:**
  1. Build all packages with tsup
  2. Run `changeset publish`
  3. Publish `mcp-use@0.3.0` to npm
  4. Publish `@mcp-use/cli@2.0.2` to npm
  5. Publish `@mcp-use/inspector@0.1.1` to npm
  6. Create git tags for each version

  **Output:**

  ```
  🦋  info npm info mcp-use
  🦋  info npm publish mcp-use@0.3.0
  🦋  success packages published successfully:
  🦋  - mcp-use@0.3.0
  🦋  - @mcp-use/cli@2.0.2
  🦋  - @mcp-use/inspector@0.1.1
  ```

  ```bash
  # Push tags
  git push --follow-tags
  ```

  ## Step 10: Verify Publication

  ```bash
  # Check on npm
  npm view mcp-use version
  # Output: 0.3.0

  npm view @mcp-use/cli version
  # Output: 2.0.2

  # Or visit:
  # https://www.npmjs.com/package/mcp-use
  # https://www.npmjs.com/package/@mcp-use/cli
  # https://www.npmjs.com/package/@mcp-use/inspector
  # https://www.npmjs.com/package/create-mcp-use-app
  ```

  ## 📊 Timeline Summary
  1. **Day 1**: Developer creates feature + changeset, pushes PR
  2. **Day 2-3**: Code review, changes, approval
  3. **Day 3**: PR merged to main
  4. **Day 3**: Maintainer runs `pnpm version` → Version PR created
  5. **Day 3**: Maintainer reviews and merges Version PR
  6. **Day 3**: Automated workflow publishes to npm
  7. **Done!** ✨

  ## 🤖 Automated Workflow (GitHub Actions)

  With the included GitHub Actions workflows:
  1. **Developer** creates PR with changeset
  2. **CI** validates build, tests, lint
  3. **Merge** to main triggers release workflow
  4. **Changesets Action** creates "Version Packages" PR automatically
  5. **Maintainer** reviews and merges Version PR
  6. **Action** automatically publishes to npm
  7. **Done!** No manual commands needed

  ## 🎓 Learning Resources
  - **Quick Reference**: See `CHANGESET_WORKFLOW.md`
  - **Detailed Guide**: See `VERSIONING.md`
  - **Changesets Docs**: https://github.com/changesets/changesets
  - **Semantic Versioning**: https://semver.org/

  ## 💡 Tips
  - **Batch related changes** - Create one changeset for related changes across packages
  - **Clear summaries** - Write what users need to know, not implementation details
  - **Link to PRs** - Reference PR numbers in changeset summaries
  - **Test before release** - Always build and test before publishing
  - **Coordinate major bumps** - Plan breaking changes with the team

  ***

  **Ready to get started?**

  ```bash
  # Make some changes, then:
  pnpm changeset
  ```

### Patch Changes

- db54528: Migrated build system from tsc to tsup for faster builds (10-100x improvement) with dual CJS/ESM output support. This is an internal change that improves build performance without affecting the public API.
- Updated dependencies [db54528]
  - @mcp-use/inspector@0.2.1
