# Changelog

All notable changes to the Buttons extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - Unreleased

### Added

- Parse a `.buttons` TOML file from the workspace root
- Render groups and buttons in a webview panel
- Run commands in the current or a new terminal
- Copy resolved commands to the clipboard
- Open related URLs and localhost ports
- Support static buttons and cartesian-generated buttons
- Simple variables and reusable macros with circular reference detection
- Prompt before running dangerous commands (heuristic and explicit)
- File watcher for automatic panel refresh on config changes
- Grid and rows layout modes
- Codicon icons and hex color support
- Example `.buttons` files for Node, Docker, Python, and Git workflows
