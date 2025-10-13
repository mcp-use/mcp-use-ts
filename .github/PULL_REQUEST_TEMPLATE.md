## Description

<!-- Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context. -->

Fixes # (issue)

## Type of change

<!-- Please delete options that are not relevant. -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Internal change (refactoring, tests, tooling)

## 📦 Changeset Required?

<!-- Most changes need a changeset! See the guide below for details. -->

**Does this PR need a changeset?**
- [ ] ✅ Yes - I have created a changeset (`pnpm changeset`)
- [ ] ❌ No - This is an internal-only change (docs, tests, tooling)

**Quick reminder:**
```bash
pnpm changeset  # Creates a changeset interactively
```

**📚 Full guide:** [Changeset Workflow Guide](.github/CHANGESET_WORKFLOW.md)  
**Need help?** See [when to create changesets](.github/CHANGESET_WORKFLOW.md#-changeset-types) and [examples](.github/CHANGESET_WORKFLOW.md#-changeset-types)

## 🚀 Release Target

- [ ] `main` branch → Stable release (default)
- [ ] `beta` branch → Beta/prerelease version
- [ ] Other feature branch → No release

**Releasing a beta?** See the [Beta Release Workflow Guide](.github/BETA_RELEASES.md) for instructions.

## Checklist

### Code Quality

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] Existing tests pass locally (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)

### Documentation

- [ ] The title of my pull request follows the [conventional commits](https://www.conventionalcommits.org/) standard
- [ ] Changes have been documented in the README/documentation (if applicable)
- [ ] Breaking changes are clearly documented with migration steps

### Release Preparation

- [ ] **I have created a changeset** (`pnpm changeset`) - if this affects published packages
- [ ] The changeset has a clear, user-focused description
- [ ] Version bump type is appropriate (patch/minor/major)
- [ ] All affected packages are included in the changeset

### Additional Notes

<!-- Optional: Add any additional context, screenshots, or notes for reviewers -->
