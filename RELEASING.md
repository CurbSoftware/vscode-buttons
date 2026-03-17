# Release Checklist

## Pre-Release Validation

```bash
# 1. Clean compile
npm run compile

# 2. Run all tests
npm test

# 3. Type-check only (no emit)
npm run lint

# 4. Validate all example .buttons files
node -e "
const TOML = require('@iarna/toml');
const fs = require('fs');
const path = require('path');
const { validateDocument } = require('./dist/config/configHelpers');
const check = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) { check(fp); continue; }
    if (entry.name !== '.buttons') continue;
    const doc = TOML.parse(fs.readFileSync(fp, 'utf8'));
    const errors = validateDocument(doc).filter(d => d.severity === 'error');
    console.log(errors.length ? 'FAIL' : 'OK', fp);
  }
};
check('./examples');
check('./test-configs');
"

# 5. Verify no unused exports
# Review: src/config/configHelpers.ts exports should all be imported somewhere
```

## Version Bump

1. Update `version` in `package.json`
2. Follow [semver](https://semver.org/):
   - **patch** (0.1.1): bug fixes only
   - **minor** (0.2.0): new features, backward compatible
   - **major** (1.0.0): breaking changes to `.buttons` format

## Package

```bash
# Install vsce if needed
npm install -g @vscode/vsce

# Package the extension
npm run package
# Creates buttons-vscode-X.Y.Z.vsix
```

## Test the .vsix

```bash
# Install locally
code --install-extension buttons-vscode-*.vsix

# Test in a fresh workspace:
# 1. Create a .buttons file
# 2. Verify sidebar appears
# 3. Open panel (Buttons: Open Panel)
# 4. Test all 5 layout modes
# 5. Test all 5 action buttons
# 6. Test accordion collapse/expand
# 7. Test eye toggle hide/show
# 8. Test source tabs (project + user)
# 9. Test includes
# 10. Test custom labels, icons, colors
# 11. Test click-to-copy on command preview
# 12. Test toolbar icon (top-right)
```

## Publish

```bash
# Publish to VS Code Marketplace
vsce publish

# Or publish to Open VSX
npx ovsx publish buttons-vscode-*.vsix -p <token>
```

## Post-Release

- [ ] Create GitHub release with tag `vX.Y.Z`
- [ ] Update changelog (if maintained)
- [ ] Announce release
