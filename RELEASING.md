# Releasing

Buttons publishes to the **VS Code Marketplace** and **Open VSX** (VSCodium). The same single `.vsix` serves both registries; they are just two publish targets.

> **Current state (checked 2026-08-20): publishing is manual.** The `publish.yml` workflow is committed and correct, but **Actions is disabled on this repository**, so release events never trigger it - the run history is empty, and 2.0.0 went out by hand. Until Actions is enabled (see [Re-enabling automation](#re-enabling-automation)), release with the checklist below.

## Release checklist

1. Bump `version` in `package.json` to the next version.
2. Run `npm install` once so `package-lock.json` picks up the new version.
3. Add a `## [X.Y.Z] - YYYY-MM-DD` entry to `CHANGELOG.md` (replace the `- Unreleased` marker).
4. Commit and push to `main`.
5. Build and test the package: `npm run lint && npm test && npm run package` (the `.vsix` lands in `release/`, gitignored).
6. Publish to both marketplaces from a machine with the PATs:
   ```bash
   npx vsce publish -p <VSCE_PAT>          # Marketplace (publishes the package.json version)
   npx ovsx publish release/buttons-vscode-X.Y.Z.vsix -p <OVSX_PAT>   # Open VSX
   ```
7. Create the **GitHub Release** with tag `vX.Y.Z` (must equal the `package.json` version) for the changelog notes and history. With Actions disabled this is documentation only, not a trigger.
8. Verify both pages show the new version (the Marketplace shows "verifying" for minutes to hours after upload - that's normal):
   - https://marketplace.visualstudio.com/items?itemName=CurbSoftware.buttons-vscode
   - https://open-vsx.org/extension/CurbSoftware/buttons-vscode

## Registry setup (done)

One-time setup completed 2026-08-15: publisher `CurbSoftware` on the Marketplace, Open VSX namespace claimed, secrets `VSCE_PAT` / `OVSX_PAT` stored in GitHub Actions. Versions 1.1.0 through 2.0.0 are live on both registries. To rotate a secret:

```bash
gh secret set OVSX_PAT -R CurbSoftware/vscode-buttons   # pastes securely, then Ctrl+D
```

GitHub secrets are write-only: if a PAT is lost, mint a new one (Azure DevOps for `VSCE_PAT`, [open-vsx.org](https://open-vsx.org) for `OVSX_PAT`) and update the secret to match. Never paste a token into chat, files, or commits - this repo is public, a token in a file is compromised the moment it is pushed.

> **Token rules**
> - The Azure PAT has an expiry date (check it in Azure DevOps → Personal Access Tokens). Global Azure DevOps PATs retire **December 1, 2026** - after that, migrate to `vsce publish --azure-credential` (Entra ID).
> - A PAT must use scope **Marketplace: Manage** and organization **All accessible organizations**, or publishing fails with 401/403.

## Rules and gotchas

- **Marketplace versions are immutable.** A failed publish can't be retried at the same version - fix forward with a new patch version. Never re-publish a version that already exists.
- **Rollback:** unpublish via the [publisher management page](https://marketplace.visualstudio.com/manage/publishers/CurbSoftware) (More Actions → Unpublish keeps stats). "Remove" is irreversible and permanently burns the extension name - avoid it.

## Re-enabling automation

1. Repo **Settings → Actions → General**: allow Actions for `CurbSoftware/vscode-buttons`.
2. The workflow triggers on `release: published`, and that event does not replay retroactively - to fire it for an existing release, delete the release (keep the tag) and re-create it:
   ```bash
   gh release delete vX.Y.Z -R CurbSoftware/vscode-buttons --yes
   gh release create vX.Y.Z -R CurbSoftware/vscode-buttons --target main --title "vX.Y.Z - <summary>" --notes "..."
   ```
3. Watch the run under **Actions → Publish** (it lints, tests, then publishes to both marketplaces), then verify both marketplace pages from step 8 above.

## Open VSX account notes (for token rotation)

Tokens are created at [open-vsx.org](https://open-vsx.org) → User Settings → Access Tokens (requires an Eclipse Foundation account linked to GitHub and a signed Publisher Agreement).
