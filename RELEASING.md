# Release Checklist

## A. Metadata

Confirm these fields in `package.json` before every release:

- [ ] `publisher` matches your Marketplace publisher ID
- [ ] `version` bumped appropriately (semver)
- [ ] `engines.vscode` reflects the oldest supported VS Code version
- [ ] `icon` points to a valid PNG (128x128 minimum)
- [ ] `repository`, `homepage`, `bugs`, `license` are correct
- [ ] `pricing` is set (`"Free"`)
- [ ] `galleryBanner` is set

## B. Build & Validation

```bash
npm ci
npm run compile
npm test
npm run lint
node scripts/validate-examples.js
```

## C. Packaging Hygiene

Ensure `.vscodeignore` excludes dev-only files. Verify with:

```bash
vsce ls
```

Confirm only runtime files are included: `dist/`, `media/`, `node_modules/` (production only), `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`.

Check for accidental secrets:

```bash
git ls-files | grep -iE '(^|/)\.env'
```

## D. Update CHANGELOG.md

- Set the release date: `[X.Y.Z] - YYYY-MM-DD`
- Document all changes since the last release

## E. Package & Test Locally

```bash
# Install vsce if needed
npm install -g @vscode/vsce

# Package
vsce package

# Install locally
code --install-extension buttons-vscode-*.vsix
```

Test in a clean workspace:

- [ ] Activity Bar icon appears
- [ ] Sidebar view loads
- [ ] Command palette commands work
- [ ] Root `.buttons` file renders correctly
- [ ] `~/.buttons` user file works
- [ ] File includes resolve
- [ ] All 5 layout modes render
- [ ] All 5 action buttons work (Run, New Terminal, Copy to Terminal, Copy to New Terminal, Copy)
- [ ] Accordion collapse/expand persists
- [ ] Eye toggle hides/shows buttons
- [ ] Source tabs switch between project and user
- [ ] Dangerous command confirmation appears
- [ ] Toolbar icon visible in editor title bar
- [ ] Behavior in empty workspace (no `.buttons`)
- [ ] Behavior in untrusted workspace

## F. One-Time Publisher Setup

### VS Code Marketplace

*(Skip if already done.)*

1. Create an Azure DevOps organization
2. Create a Personal Access Token (scope: **Marketplace > Manage**, org: **All accessible organizations**)
3. Create a publisher at the [Marketplace management page](https://marketplace.visualstudio.com/manage)
4. Put the publisher ID in `package.json`
5. Run: `vsce login <publisher-id>`

### Open VSX Registry (for VS Codium)

*(Skip if already done.)*

1. Create an account at [open-vsx.org](https://open-vsx.org)
2. Generate a personal access token in your account settings
3. Claim a namespace matching your publisher ID (or create one)

## G. Publish

### VS Code Marketplace

```bash
# Publish current version
vsce publish

# Or bump and publish in one step
vsce publish patch   # 0.1.0 → 0.1.1
vsce publish minor   # 0.1.0 → 0.2.0
vsce publish major   # 0.1.0 → 1.0.0
```

Or upload the `.vsix` manually via the [Marketplace management page](https://marketplace.visualstudio.com/manage).

### Open VSX Registry

```bash
# Install ovsx if needed
npm install -g ovsx

# Publish the .vsix (must run vsce package first)
ovsx publish buttons-vscode-*.vsix -p <open-vsx-token>
```

Or upload the `.vsix` manually at [open-vsx.org](https://open-vsx.org).

> **Note:** The same `.vsix` file works for both marketplaces. Package once, publish to both.

## H. Post-Release

- [ ] Create GitHub release with tag `vX.Y.Z`
- [ ] Verify extension appears on VS Code Marketplace
- [ ] Verify extension appears on Open VSX Registry
- [ ] Verify README images render correctly on both marketplace pages
- [ ] Announce release

## Version Strategy

Follow [semver](https://semver.org/):

| Bump | When |
|------|------|
| **patch** (0.1.1) | Bug fixes only |
| **minor** (0.2.0) | New features, backward compatible |
| **major** (1.0.0) | Breaking changes to `.buttons` format |
