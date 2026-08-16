# Releasing

Buttons publishes to the **VS Code Marketplace** and **Open VSX** (VSCodium) automatically via GitHub Actions (`.github/workflows/publish.yml`).

## One-time setup - current status

| Step | Status |
|---|---|
| Marketplace publisher `CurbSoftware` | ✅ done - 1.1.0 published (manually) on 2026-08-15 |
| `VSCE_PAT` repo secret (Azure DevOps PAT, Marketplace → Manage scope) | ✅ done |
| Open VSX namespace `CurbSoftware` | ✅ done - claimed 2026-08-15 |
| `OVSX_PAT` repo secret | ✅ done |
| Open VSX extension listing | ✅ done - 1.1.0 published on 2026-08-15 |

One-time setup is **complete**: every future GitHub Release publishes to both registries automatically. To rotate a secret:

```bash
gh secret set OVSX_PAT -R CurbSoftware/vscode-buttons   # pastes securely, then Ctrl+D
```

> **Token rules**
> - Tokens live **only** in GitHub Actions secrets (repo Settings → Secrets and variables → Actions) - never in files, commits, or chat. This repo is public; a token in a file is compromised the moment it is pushed.
> - The Azure PAT has an expiry date (check it in Azure DevOps → Personal Access Tokens). Global Azure DevOps PATs retire **December 1, 2026** - after that, migrate the workflow to `vsce publish --azure-credential` (Entra ID).
> - A PAT must use scope **Marketplace: Manage** and organization **All accessible organizations**, or publishing fails with 401/403.

## Release checklist

1. Bump `version` in `package.json` to the next version.
2. Run `npm install` once so `package-lock.json` picks up the new version.
3. Add a `## [X.Y.Z] - YYYY-MM-DD` entry to `CHANGELOG.md` (replace the `- Unreleased` marker).
4. Commit and push to `main`.
5. Create a **GitHub Release** with tag `vX.Y.Z` - the tag must equal the `package.json` version; CI fails fast otherwise.
6. Watch the run: repo → **Actions** → **Publish**. It lints, tests, then publishes to both marketplaces.
7. Verify both pages show the new version (the Marketplace shows "verifying" for minutes to hours after upload - that's normal):
   - https://marketplace.visualstudio.com/items?itemName=CurbSoftware.buttons-vscode
   - https://open-vsx.org/extension/CurbSoftware/buttons-vscode

## Rules and gotchas

- **Marketplace versions are immutable.** A failed publish can't be retried at the same version - fix forward with a new patch version. Never re-publish a version that already exists.
- The workflow publishes the version from `package.json`, not from the tag; the guard step keeps them in lockstep.
- **Rollback:** unpublish via the [publisher management page](https://marketplace.visualstudio.com/manage/publishers/CurbSoftware) (More Actions → Unpublish keeps stats). "Remove" is irreversible and permanently burns the extension name - avoid it.

## Manual publishing (fallback)

```bash
npm run lint && npm test && npm run package
npx vsce publish -p <VSCE_PAT>          # Marketplace
npx ovsx publish buttons-vscode-X.Y.Z.vsix -p <OVSX_PAT>   # Open VSX
```

## Open VSX account notes (for token rotation)

Tokens are created at [open-vsx.org](https://open-vsx.org) → User Settings → Access Tokens (requires an Eclipse Foundation account linked to GitHub and a signed Publisher Agreement).
