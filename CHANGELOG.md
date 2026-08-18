# Changelog

All notable changes to the Buttons extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.1.1] - 2026-08-18

### Added

- `RELEASING.md` - release guide covering one-time registry setup and the release checklist.

### Changed

- Generate now activates only scripts from root-level script files by default; nested files remain available, unchecked, in the Project scripts tab.
- Publish workflow now fails fast when the release tag doesn't match the `package.json` version.
- `npm run package` now writes the `.vsix` into `release/` instead of the project root.

## [1.1.0] - 2026-08-15

### Added

- Grouped the **Project scripts** tab by file, with a bulk-select checkbox per file to include or remove all of its scripts at once.

### Changed

- Publisher is now `CurbSoftware` - Marketplace and Open VSX install links updated.
- Scanner docs and the empty-state message now cover all supported script files generically.

### Removed

- Dead `ready` webview message and the unused `source` field on resolved buttons (internal cleanup, no behavior change).
- Development-only files and unused screenshots; the README animation is served from GitHub, shrinking the packaged `.vsix` roughly 10x.

## [1.0.0] - 2026-08-14

Initial stable release.

### Added

- Scan `package.json`, `Makefile`, `composer.json`, and `justfile` for runnable scripts, including nested packages in monorepos.
- Package-manager detection from lockfiles (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `package-lock.json`).
- Two launcher surfaces kept in sync: an Activity Bar sidebar and a full-width editor panel.
- Run commands in the current or a new integrated terminal, copy the exact command, and attach inline notes.
- Custom commands stored verbatim, scoped to the project or the global profile.
- Project (`<workspace>/.buttons.json`) and global (`~/.buttons.json`) storage, with script references that recompute their command on every rescan.
- Generate vs Rescan workflow so scanning never discards existing selections, notes, or custom commands.
- Settings: `buttons.textSize` and `buttons.scriptFiles`.
- Five commands: Open Panel, Open in Editor, Rescan Scripts, Open Project Buttons File, Open Global Buttons File.
