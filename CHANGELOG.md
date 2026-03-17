# Changelog

All notable changes to the Buttons extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-03-17

### Added

- Parse `.buttons` TOML files from the workspace root
- Personal `~/.buttons` user config available across all projects
- Source tabs to toggle between project and user buttons
- 5 layout modes: grid, rows, columns, table, and flow
- Accordion groups with persistent collapse/expand state
- Eye toggle to hide individual buttons from the panel
- Per-group `[display]` blocks with independent layout, color, and visibility overrides
- Custom action button labels, icons, and sizes per group
- Click-to-copy on command preview text
- Run commands in the current or a new terminal
- Copy to terminal and copy to new terminal actions
- Copy resolved commands to the clipboard
- Open related URLs and localhost ports
- Static buttons and cartesian-generated buttons via `[generate]` blocks
- Simple variables and reusable macros with circular reference detection
- File includes for composing configs from multiple `.buttons` files
- Danger detection with heuristic keyword matching and explicit `danger` flag
- Confirmation prompt before running dangerous commands
- Custom hex colors per button, per group, and at document level
- Codicon icon support for buttons and groups
- File watcher for automatic panel refresh on config changes
- Activity Bar sidebar panel
- Toolbar icon in the editor title bar
- 29 example `.buttons` packs (Node, Docker, Python, Git, AWS, Kubernetes, and more)
- Template expansion with `{{base}}`, `{{arg1}}`, `{{arg2}}`, and variables
- Defaults cascade from document to group to button level
- Button ID deduplication (first wins, duplicates emit diagnostics)
- 1000-button explosion guard on cartesian generation
