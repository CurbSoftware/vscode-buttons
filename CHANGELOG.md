# Changelog

All notable changes to the Buttons extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [2.2.2] - 2026-09-08

### Added

- Markdown icon in the sidebar and editor headers to copy the Buttons AI skill or write `BUTTONS-SKILL.md` in the project root.
- Subtle hover highlight on command rows in the sidebar and the editor panel.

### Fixed

- Editor panel borders span the full row. Variant commands stay indented from the parent without shortening the line.
- Nested editor tables no longer stack extra bottom borders.

## [2.2.0] - 2026-09-07

### Added

- Command and script variants can nest to any depth, so a button can be both a parent and a child. **+ Add variant** on a variant appends more args to that variant's command.
- Color pickers for each action button, command text and background, the same pair for variants, odd/even command rows, and variant rows.
- Sidebar **Open in editor** control (header and view title) to open the full Buttons panel.
- The editor panel tab shows the Buttons logo.
- `Cargo.toml` and `go.mod` offer `cargo` / `go` build, test, and run buttons. Both types are on by default.

### Changed

- Variant dropdowns indent further from the parent row.

## [2.1.3] - 2026-09-05

### Added

- Closed parent chevrons show a badge with the number of variant commands.

## [2.1.2] - 2026-09-02

### Changed

- **✕** asks for a second click. The first click shows a **Confirm** tooltip; click again while it is showing to delete. Click anywhere else to cancel.
- **Generate** on an existing file adds any missing root-level scripts and leaves custom commands, notes, variants, and extra opted-in scripts in place.

## [2.1.1] - 2026-09-02

### Changed

- Replaced **Insert** / **Insert selected** and row checkboxes with per-command **+** (same line, space) and **↵** (new line). Neither runs the command; press Enter in the terminal when the line is ready.

## [2.1.0] - 2026-09-02

### Added

- **Command variants**: a button can nest one level of children in `.buttons.json`. Args children (`{ "args": "--include app1 app2" }`) append flags to the parent's live command, so they stay in sync if the package manager changes. Full command and script children are also allowed. The panel shows them as an expandable list of parameter options, with **+ Add variant**.
- **Insert** and **Insert selected**: write one or more commands into the current terminal as new lines **without running them**. Custom commands accept multi-line text.
- **Duplicate**: clone a button (including its variants) as a separate row.
- **Drag and drop** reorder among siblings; order is saved in `.buttons.json`.
- **`buttons.colors.background` / `foreground` / `hoverBackground`**: optional colors for Run buttons and launcher cards. Empty values inherit the active VS Code theme.

### Changed

- Panel actions now target a button by path so duplicates and nested variants stay distinct.

Buttons 2.0.1 and earlier drop `children`, `args`, and `id` if they write the file. Upgrade before editing a file that uses variants.

## [2.0.1] - 2026-08-20

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
