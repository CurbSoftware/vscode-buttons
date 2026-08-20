# Changelog

All notable changes to the Buttons extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- The **Scan directories** card no longer opens the OS folder picker. Type or paste a path into the new Add field: relative paths resolve inside the project, full paths reach outside it.

### Added

- **Scanning outside the project**: `buttons.scanDirectories` now accepts absolute paths. Those directories are scanned and watched like in-project ones, and their buttons run with the terminal set to the script's own directory.
- **Add to Buttons** context menu on Explorer right-click of a `.sh` or Python entry file: adds it as a standalone project button without scanning its folder. Right-clicking a manifest (`package.json`, `Makefile`, `justfile`, `composer.json`) adds its folder as a scan directory instead.
- Standalone file entries in `.buttons.json` now resolve without a matching scan scope, so file buttons keep working wherever the file lives.

## [2.0.0] - 2026-08-19

### Breaking

- Script scanning is now **directory-scoped**: the project root is always scanned at its top level, and other directories are scanned only when listed in the new `buttons.scanDirectories` setting. Previously the whole workspace was scanned recursively. If buttons for nested packages now show "not found", add their parent directory as a (recursive) scan directory - e.g. `{ "path": "packages", "recursive": true }`.
- `buttons.scriptFiles` now defaults to `["package.json", "shell", "python"]`. Users who customized the setting should add `"shell"` and/or `"python"` to keep the new file types enabled.

### Added

- **Scan directories** card in the Project scripts tab: add directories via the OS folder picker, toggle each one's **recursive** scan, and remove them. Stored in the `buttons.scanDirectories` workspace setting.
- Discovery of standalone `.sh` files (run as `bash <file>`) and common Python entry files - `app.py`, `main.py`, `manage.py`, `run.py`, `server.py` (run as `python <file>`) - inside scan scopes. Commands run with the terminal's working directory set to the script file's directory.
- **Venv buttons**: when a `venv/` or `.venv/` directory is detected in the project root or a scan directory, Buttons offers **Activate venv** (`source venv/bin/activate`, or the Windows PowerShell/batch activate), **Deactivate**, and **Install requirements** (`venv/bin/pip install -r requirements.txt` via the venv's own pip, offered when a `requirements.txt` sits next to the venv).
- File watchers now also cover `.sh` files, Python entry files, and `requirements.txt`.
- Keyboard focus outlines for all interactive webview controls.

### Fixed

- README and docs now match Generate's actual behavior (root-level scripts only).

## [1.2.0] - 2026-08-18

### Added

- Select all / Unselect all toggle for the Project scripts tab, alongside the existing per-file and per-script checkboxes.

### Fixed

- `npm run package` now creates `release/` before packaging, fixing a failure on fresh clones.

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
